/**
 * The pure half of `scripts/og.mjs` — string in, string out, no Playwright.
 *
 * It lives here so it can be tested. `og.mjs` ends in a top-level
 * `await chromium.launch()`, so importing anything from it drags in a browser
 * these functions never touch, and the whole file was therefore unreachable from
 * the suite. That mattered: `token` shipped a real bug — it collected every
 * `--*` in the file into one map, so `.dark` overwrote `:root` and the card came
 * out dark under a comment claiming light. A test would have caught it.
 *
 * Each function takes its source text as an argument rather than reading a
 * module-scope `css`/`html`. That is the change that makes them testable at all.
 */

// `ranges` is imported rather than copied: og.mjs and fonts.mjs held
// byte-identical versions of it. Not re-exported — nothing imports it from here,
// and `fonts.test.ts` keeps its own copy on purpose, as an oracle independent of
// the code under test.
import { ranges } from "./fonts.mjs"

/**
 * The value of one custom property under `selector`, `var()` followed.
 *
 * **Scoped on purpose.** Collecting every `--*` into one map lets a later block
 * silently overwrite an earlier one, which is the bug above.
 *
 * The `--brand-*` fallback is scoped to `:root` for the same reason. It used to
 * be file-global, which brought the whole bug back one level down: with
 * `.high-contrast { --brand-navy: #000 }` anywhere in the file,
 * `token(css, ".dark", "--background")` returned black. Worse, it was
 * *ordering*-dependent — putting `:root` last made it right again — so the
 * answer depended on where in globals.css someone added a block.
 *
 * Indirection is followed only when a value *starts with* `var(`, so a
 * `color-mix(in oklab, var(…) …)` never resolves. Rather than return that as raw
 * text, this throws: og.mjs interpolates the result straight into a `<style>`
 * block where `--x` is undefined, so the declaration would be invalid at
 * computed-value time and paint nothing — a transparent bar on a card that
 * exits 0.
 *
 * @param {string} css Stylesheet text.
 * @param {string} selector Exact selector, e.g. `:root` or `.dark`.
 * @param {string} name Custom property name, including the leading `--`.
 * @returns {string} The resolved value.
 */
export function token(css, selector, name) {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, "")
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  /** @type {Record<string, string>} */
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

  // Primitives live on `:root`, so a `.dark` token can point at one. Two rules,
  // both there to make the answer independent of where a block sits in the file:
  // only `:root` blocks are read, and the **first** definition of each name
  // wins. A regex cannot tell `:root` at the top level from one inside
  // `@media print`, and the card has no media context — it wants the base
  // value. Last-wins gave `#ffffff` for `--brand-navy` from a print block.
  /** @type {Record<string, string>} */
  const primitives = {}
  for (const block of flat.matchAll(/(?:^|[\s,}]):root\s*\{([^{}]*)\}/g)) {
    /** @type {Record<string, string>} */
    const declared = {}
    for (const [, key, value] of block[1].matchAll(
      /(--brand-[\w-]+)\s*:\s*([^;]+);/g
    )) {
      // Last-wins *within* one block, which is what CSS itself does.
      declared[key] = value.trim()
    }
    for (const [key, value] of Object.entries(declared)) {
      primitives[key] ??= value
    }
  }

  let value = scoped[name]
  /** @type {Set<string>} */
  const seen = new Set()
  while (value?.startsWith("var(")) {
    const ref = value.slice(4, -1).trim()
    // A cycle would otherwise spin forever with no output. `resolveToken` in
    // src/test/contrast.ts throws on the same condition.
    if (seen.has(ref)) throw new Error(`circular var() reference at ${ref}`)
    seen.add(ref)
    // The selector's own declaration wins over a primitive of the same name.
    value = scoped[ref] ?? primitives[ref]
  }
  if (!value) throw new Error(`${selector} has no ${name}`)
  if (value.includes("var(")) {
    throw new Error(
      `${selector} ${name} resolves to ${value}, which still contains var() — ` +
        "og.mjs would emit it into a <style> block where that name is undefined"
    )
  }
  return value
}

/**
 * The content of one `<meta property="…">`.
 *
 * @param {string} html Document text.
 * @param {string} property The `property` attribute value, e.g. `og:title`.
 * @returns {string} The `content` attribute value.
 */
export function meta(html, property) {
  // The closing quote is part of the match: without it `og:image` also matches
  // `og:image:width` and the card would read 1200 as its image URL.
  const pattern = new RegExp(
    `<meta\\s+property="${property}"\\s+content="([^"]*)"`,
    "s"
  )
  const inline = html.match(pattern)
  if (inline) return inline[1]
  // NOT for line breaks — `\s+` above already spans those, so a tag Biome
  // rewrapped still matches the first pattern. This fallback exists for a tag
  // carrying another attribute *before* `property`, which the `<meta\s+property`
  // anchor rejects. Mutation-tested: without it, `<meta charset="utf-8"
  // property="og:x" content="y">` throws.
  const multiline = html.match(
    new RegExp(`property="${property}"\\s*\\n\\s*content="([^"]*)"`, "s")
  )
  if (!multiline) throw new Error(`index.html has no ${property}`)
  return multiline[1]
}

/**
 * The Noto Sans JP faces needed to draw `text`, each keeping its own
 * `unicode-range` so the browser picks between them per character.
 *
 * **Subset numbers are read from the manifest, never written down.** Fontsource
 * splits this font into 124 files and renumbers them when Noto's coverage
 * changes, so a pinned number silently repoints on a version bump — and one was
 * already wrong: subset 58 was embedded as "the Japanese this card uses" while
 * holding maths and enclosed alphanumerics, covering **none** of the characters
 * drawn. Every kana fell through to `sans-serif`.
 *
 * @param {string} manifest The package's own `index.css`.
 * @param {string} text Every character the card will draw.
 * @returns {{ file: string, declaration: string }[]}
 */
export function notoFaces(manifest, text) {
  // Narrowed rather than cast. A `@type {number}` assertion here would silence
  // exactly the check that matters: `undefined` flows into the range comparison
  // as a silent false and then into `.toString(16)` as a TypeError, replacing
  // the "no subset covers X" message this function exists to produce.
  const wanted = [...new Set(text)].flatMap((ch) => {
    const cp = ch.codePointAt(0)
    return cp === undefined ? [] : [cp]
  })
  /** @type {{ file: string, declaration: string }[]} */
  const faces = []
  /** @type {Set<number>} */
  const covered = new Set()

  for (const block of manifest.split("@font-face").slice(1)) {
    const file = block.match(/noto-sans-jp-[^"')]+\.woff2/)?.[0]
    const declaration = block.match(/unicode-range:\s*([^;]+);/)?.[1]
    if (!file || !declaration) continue
    const admits = ranges(declaration)
    const hits = wanted.filter((cp) =>
      admits.some(([lo, hi]) => cp >= lo && cp <= hi)
    )
    if (!hits.length) continue
    for (const cp of hits) covered.add(cp)
    faces.push({ file, declaration })
  }

  // No face covers these, so no embed can draw them. Fail here rather than
  // screenshotting tofu and exiting 0 over a committed PNG.
  const missing = wanted.filter((cp) => !covered.has(cp))
  if (missing.length) {
    throw new Error(
      `no Noto Sans JP subset covers ${missing
        .map((cp) => `${String.fromCodePoint(cp)} U+${cp.toString(16)}`)
        .join(", ")}`
    )
  }
  return faces
}
