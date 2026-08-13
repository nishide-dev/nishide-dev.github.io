/**
 * Renders `public/og.png` — the 1200×630 card unfurlers show for this site.
 *
 * **Playwright is deliberately not a dependency of this repo.** It is ~100MB
 * with a browser, for an image that changes when the name or the palette does;
 * carrying that in `devDependencies` would mean installing it on every CI run.
 * Run this ad hoc instead, from a directory that has it:
 *
 *     SITE_ROOT=<repo> node scripts/og.mjs
 *
 * The PNG is committed, so `pnpm build` and the deploy never touch this file.
 *
 * Nothing here is restated: the colours come out of src/styles/globals.css and
 * the words out of index.html's own `og:` tags, which `src/site.test.ts` already
 * pins to `profile.intro`. So the card cannot drift from the page it advertises.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { chromium } from "playwright"

const root =
  process.env.SITE_ROOT ??
  join(dirname(new URL(import.meta.url).pathname), "..")

const css = readFileSync(join(root, "src/styles/globals.css"), "utf8")
const html = readFileSync(join(root, "index.html"), "utf8")

/**
 * The value of one custom property under `selector`, `var()` followed.
 *
 * Scoped on purpose: collecting every `--*` in the file into one map lets
 * `.dark` silently overwrite `:root`, which is how the first version of this
 * script produced a dark card while its comment claimed light.
 */
function token(selector, name) {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, "")
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const scoped = {}
  for (const block of flat.matchAll(
    new RegExp(`(?:^|[\\s,}])${escaped}\\s*\\{([^{}]*)\\}`, "g")
  )) {
    for (const [, key, value] of block[1].matchAll(
      /(--[\w-]+)\s*:\s*([^;]+);/g
    )) {
      scoped[key] = value.trim()
    }
  }

  // Primitives live on `:root`, so a `.dark` token can point at one.
  const primitives = {}
  for (const [, key, value] of flat.matchAll(
    /(--brand-[\w-]+)\s*:\s*([^;]+);/g
  )) {
    primitives[key] = value.trim()
  }

  let value = scoped[name]
  while (value?.startsWith("var(")) {
    const ref = value.slice(4, -1).trim()
    value = scoped[ref] ?? primitives[ref]
  }
  if (!value) throw new Error(`${selector} has no ${name}`)
  return value
}

function meta(property) {
  const pattern = new RegExp(
    `<meta\\s+property="${property}"\\s+content="([^"]*)"`,
    "s"
  )
  const inline = html.match(pattern)
  if (inline) return inline[1]
  // The formatter breaks long tags across lines, attribute order preserved.
  const multiline = html.match(
    new RegExp(`property="${property}"\\s*\\n\\s*content="([^"]*)"`, "s")
  )
  if (!multiline) throw new Error(`index.html has no ${property}`)
  return multiline[1]
}

/**
 * The **dark** palette, deliberately. A cream card on a white Slack or X
 * background all but disappears; navy reads on either. The card is one fixed
 * image, so it does not follow the reader's theme and has to pick the one that
 * survives both.
 */
const background = token(".dark", "--background")
const foreground = token(".dark", "--foreground")
const muted = token(".dark", "--muted-foreground")
const accent = token(":root", "--brand-sand")

const fontDir = join(root, "node_modules/@fontsource-variable")
const dataUri = (path) =>
  `data:font/woff2;base64,${readFileSync(path).toString("base64")}`
const geist = dataUri(
  join(fontDir, "geist/files/geist-latin-wght-normal.woff2")
)
// Subset 58 carries the Japanese this card uses.
const noto = dataUri(
  join(fontDir, "noto-sans-jp/files/noto-sans-jp-58-wght-normal.woff2")
)

const title = meta("og:title")
const description = meta("og:description")

const page = `<!doctype html>
<meta charset="utf-8" />
<style>
  @font-face { font-family: G; src: url(${geist}) format("woff2-variations"); font-weight: 100 900; }
  @font-face { font-family: N; src: url(${noto}) format("woff2-variations"); font-weight: 100 900; }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    background: ${background};
    font-family: G, N, sans-serif;
    display: flex; flex-direction: column; justify-content: center;
    padding: 96px 112px;
  }
  h1 { font-size: 64px; font-weight: 500; color: ${foreground}; letter-spacing: -0.01em; }
  p { margin-top: 28px; font-size: 30px; font-weight: 400; line-height: 1.75; color: ${muted}; max-width: 900px; }
  .rule { margin-top: 56px; display: flex; gap: 10px; }
  .rule span { width: 56px; height: 10px; border-radius: 3px; }
</style>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <div class="rule">
    <span style="background:${foreground}"></span>
    <span style="background:${muted}"></span>
    <span style="background:${accent}"></span>
  </div>
</body>`

const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await tab.setContent(page, { waitUntil: "load" })
await tab.evaluate(() => document.fonts.ready)
const png = await tab.screenshot({ type: "png" })
await browser.close()

const out = join(root, "public/og.png")
writeFileSync(out, png)
console.log(`wrote ${out} — ${(png.length / 1024).toFixed(0)}KB`)
