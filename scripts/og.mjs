/**
 * Renders `public/og.png` — the 1200×630 card unfurlers show for this site.
 *
 * **Playwright is deliberately not a dependency of this repo.** A Chromium
 * download is 356MB, or 196MB for the headless shell (measured under
 * `~/Library/Caches/ms-playwright`), for an image that changes when the name or
 * the palette does. Carrying it in `devDependencies` would also need an
 * `allowBuilds` entry in pnpm-workspace.yaml before its postinstall could fetch
 * that at all — this repo allowlists only esbuild and lefthook.
 * Run it ad hoc instead. Node resolves a bare import from the *script's* own
 * directory rather than the working directory, so pointing a playwright-having
 * shell at this path does not work — copy the files next to that install and
 * point `SITE_ROOT` back here. **All three**: this file imports `og-tokens.mjs`,
 * which imports `ranges` from `fonts.mjs`. Copying only this one fails with
 * `ERR_MODULE_NOT_FOUND`.
 *
 *     cp scripts/og.mjs scripts/og-tokens.mjs scripts/fonts.mjs /somewhere/with/playwright/
 *     cd /somewhere/with/playwright && SITE_ROOT=<repo> node og.mjs
 *
 * The PNG is committed, so nothing in `pnpm build` or the deploy runs this
 * script. The image itself is of course copied out of `public/` like any other
 * asset.
 *
 * Nothing here is restated: the colours come out of src/styles/globals.css and
 * the words out of index.html's own `og:` tags, which `src/site.test.ts` already
 * pins to `profile.intro`. That removes the drift at *generation* time — it does
 * not make the committed PNG self-updating. **Editing the description or the
 * palette means running this script again**, or the card advertises the old copy
 * while every test stays green: the words are pixels by then, and nothing reads
 * them back.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { chromium } from "playwright"

// The pure string work lives in og-tokens.mjs so it can be tested without a
// browser; this file is the part that genuinely needs one.
import { meta, notoFaces, token } from "./og-tokens.mjs"

const root =
  process.env.SITE_ROOT ??
  join(dirname(new URL(import.meta.url).pathname), "..")

const css = readFileSync(join(root, "src/styles/globals.css"), "utf8")
const html = readFileSync(join(root, "index.html"), "utf8")

/**
 * The **dark** palette for the three semantic tokens, deliberately. A cream card
 * on a white Slack or X background all but disappears; navy reads on either. The
 * card is one fixed image, so it does not follow the reader's theme and has to
 * pick the one that survives both.
 */
const background = token(css, ".dark", "--background")
const foreground = token(css, ".dark", "--foreground")
const muted = token(css, ".dark", "--muted-foreground")
// Sand, read as the primitive off `:root` — not a dark semantic like the three
// above. Do not "fix" this to `token(css, ".dark", "--accent")`: in dark, sand is
// `--primary`, and `--accent` is #3e4661, which would paint a navy bar on a
// navy card.
const sand = token(css, ":root", "--brand-sand")

const fontDir = join(root, "node_modules/@fontsource-variable")
const dataUri = (path) =>
  `data:font/woff2;base64,${readFileSync(path).toString("base64")}`
const geist = dataUri(
  join(fontDir, "geist/files/geist-latin-wght-normal.woff2")
)

const title = meta(html, "og:title")
const description = meta(html, "og:description")

const notoManifest = readFileSync(
  join(fontDir, "noto-sans-jp/index.css"),
  "utf8"
)
const notoFaceRules = notoFaces(notoManifest, `${title}${description}`)
  .map(
    ({ file, declaration }) =>
      `@font-face { font-family: N; src: url(${dataUri(
        join(fontDir, "noto-sans-jp/files", file)
      )}) format("woff2-variations"); font-weight: 100 900; unicode-range: ${declaration}; }`
  )
  .join("\n  ")

const page = `<!doctype html>
<meta charset="utf-8" />
<style>
  @font-face { font-family: G; src: url(${geist}) format("woff2-variations"); font-weight: 100 900; }
  ${notoFaceRules}
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    background: ${background};
    /* No generic fallback: the two embedded families cover every character
       drawn (notoFaces throws otherwise), and a fallback here would let the
       host machine's fonts into the card without saying so. */
    font-family: G, N;
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
    <span style="background:${sand}"></span>
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
