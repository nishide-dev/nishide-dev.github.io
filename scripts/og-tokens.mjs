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
// byte-identical versions, and fonts.test.ts already documents what happens when
// one rule lives in two places — both copies agree while being wrong.
import { ranges } from "./fonts.mjs"

export { ranges }

/**
 * The value of one custom property under `selector`, `var()` followed.
 *
 * **Scoped on purpose.** Collecting every `--*` into one map lets a later block
 * silently overwrite an earlier one, which is the bug above.
 *
 * Two limits, both fine for the four tokens the card reads, and neither detected
 * if they stop being: indirection is followed only when the value *starts with*
 * `var(`, so a `color-mix(in oklab, var(…) …)` value — every `--activity-*` —
 * comes back as raw CSS text; and the `--brand-*` pass is file-global, so the
 * very shadowing this fixes would return for a primitive redefined per theme.
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

  // Primitives live on `:root`, so a `.dark` token can point at one.
  /** @type {Record<string, string>} */
  const primitives = {}
  for (const [, key, value] of flat.matchAll(
    /(--brand-[\w-]+)\s*:\s*([^;]+);/g
  )) {
    primitives[key] = value.trim()
  }

  let value = scoped[name]
  const seen = new Set()
  while (value?.startsWith("var(")) {
    const ref = value.slice(4, -1).trim()
    // A cycle would otherwise spin forever with no output. `resolveToken` in
    // src/test/contrast.ts throws on the same condition.
    if (seen.has(ref)) throw new Error(`circular var() reference at ${ref}`)
    seen.add(ref)
    value = scoped[ref] ?? primitives[ref]
  }
  if (!value) throw new Error(`${selector} has no ${name}`)
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
