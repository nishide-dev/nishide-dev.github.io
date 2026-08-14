/**
 * Regenerates `src/styles/fonts.css` — the Noto Sans JP `@font-face` blocks this
 * site actually needs.
 *
 *     node scripts/fonts.mjs
 *
 * Fontsource ships one `index.css` declaring all **124** subsets, and importing
 * it put 124 `@font-face` blocks into the render-blocking stylesheet: 84% of its
 * gzipped bytes, for a page that requests 28 of them. `unicode-range` means the
 * browser never *downloads* the other 96, so this is not about transfer for the
 * fonts themselves — it is about the stylesheet that has to arrive before
 * anything paints, and about the 5MB of woff2 that shipped in `dist/` regardless.
 *
 * The needed set is derived, never listed: every non-ASCII character in every
 * non-binary, non-test file under `src/`, plus `index.html`, is looked up in the
 * package's own `unicode.json`. Fontsource renumbers these files when Noto's
 * coverage changes, so a number written down here would silently repoint on a
 * version bump — which is exactly how og.mjs came to embed a maths-symbol subset
 * as "the Japanese this card uses".
 *
 * Scanning source text rather than rendered output over-collects on purpose: a
 * kanji in a comment keeps its subset. The two directions fail very differently.
 * Under-collecting means a glyph falls back to the reader's system font, or to
 * tofu, with nothing to signal it. Over-collecting costs one `@font-face` block
 * (~655 B raw, ~230 B gzip) and one woff2 in `dist/` that no browser requests.
 *
 * `src/styles/fonts.test.ts` checks the committed file three ways — it matches
 * what this script would emit, it covers every character in the corpus, and it
 * carries no block the corpus does not need — so editing content without
 * rerunning this fails CI rather than shipping tofu.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * The codepoints one Fontsource `unicode-range` declaration admits.
 *
 * @param {string} declaration
 * @returns {[number, number][]}
 */
export function ranges(declaration) {
  return declaration.split(",").map((part) => {
    const [lo, hi] = part.trim().replace(/^U\+/i, "").split("-")
    return [Number.parseInt(lo, 16), Number.parseInt(hi ?? lo, 16)]
  })
}

/**
 * Binary and generated files, which carry no text destined for the page.
 *
 * An **exclude** list, not an allow list. The first version allowed
 * `.ts/.tsx/.css/.html`, which silently dropped a `.json` data file — Vite
 * imports those natively, so `{"note": "麒麟"}` rendered in Hiragino with the
 * guard test green. Excluding by extension means a new text-bearing file type is
 * in the corpus by default and the mistake costs an unrequested subset instead of
 * a missing glyph.
 *
 * `fonts.css` is this script's own output: its header is prose, and letting it in
 * would make the generated file an input to its own generation.
 */
const NOT_TEXT =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|pdf|zip|mp4|webm|lock)$/i

/**
 * Test files are excluded, matching the `@source not "../**\/*.test.{ts,tsx}"`
 * already in globals.css. Their text cannot reach a reader: a mock timeline entry
 * and a Unicode-normalisation fixture were between them pulling in three subsets
 * — 96, `cyrillic` and `vietnamese`, ~19KB of render-blocking CSS and 36KB of
 * woff2 nobody can request.
 */
const IS_TEST = /\.test\.(tsx?|[jm]s)$/

/**
 * Source files whose text can reach the page.
 *
 * @param {string} dir
 * @param {string[]} [acc]
 * @param {string} [stop] Root the fonts.css exclusion is measured from.
 * @returns {string[]}
 */
export function sourceFiles(dir, acc = [], stop = dir) {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      sourceFiles(path, acc, stop)
      continue
    }
    if (NOT_TEXT.test(entry) || IS_TEST.test(entry)) continue
    if (relative(stop, path) === join("styles", "fonts.css")) continue
    acc.push(path)
  }
  return acc
}

/**
 * Characters written as escapes rather than literally.
 *
 * A raw byte scan sees `"麒"` as ASCII, so the glyph it renders would have no
 * subset. Decoding is deliberately loose — `\d` in a regex is not hex and is
 * skipped, while a hex-looking escape that was never a character just adds a
 * subset nobody requests. The CSS form (`content: "\9e92"`) is only read in
 * stylesheets, because in JS `\9e92` is `\9` followed by `e92`.
 */
/**
 * @param {string} text
 * @param {boolean} isCss CSS escapes are read only in stylesheets — in JS,
 *   `\9e92` is `\9` followed by `e92`.
 * @returns {string}
 */
function decodeEscapes(text, isCss) {
  const found = []
  for (const [, braced, plain] of text.matchAll(
    /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})/g
  )) {
    const cp = Number.parseInt(braced ?? plain, 16)
    if (cp > 0x7f && cp <= 0x10ffff) found.push(String.fromCodePoint(cp))
  }
  if (isCss) {
    for (const [, hex] of text.matchAll(/\\([0-9a-fA-F]{4,6})\s?/g)) {
      const cp = Number.parseInt(hex, 16)
      if (cp > 0x7f && cp <= 0x10ffff) found.push(String.fromCodePoint(cp))
    }
  }
  return found.join("")
}

/**
 * Every character a Latin font cannot draw, across `src/` and index.html.
 *
 * ASCII is skipped because Geist covers it. (Noto's own `latin` subset happens to
 * as well, but that is incidental — it ships only because `é`, `—` and the curly
 * quotes fall in it, and the browser never requests it.)
 */
/**
 * @param {string} repoRoot
 * @returns {Set<string>}
 */
export function requiredCharacters(repoRoot) {
  const files = [
    ...sourceFiles(join(repoRoot, "src")),
    join(repoRoot, "index.html"),
  ]
  const text = files
    .map((file) => {
      const source = readFileSync(file, "utf8")
      return source + decodeEscapes(source, file.endsWith(".css"))
    })
    .join("")
  // Spreading a string yields non-empty units, so codePointAt(0) is always
  // defined here — but say so rather than casting past the check.
  return new Set(
    [...text].filter((ch) => {
      const cp = ch.codePointAt(0)
      return cp !== undefined && cp > 0x7f
    })
  )
}

/** Subset keys from `unicode.json` that between them cover `characters`. */
/**
 * @param {Record<string, string>} unicode The package's own unicode.json.
 * @param {Iterable<string>} characters
 * @returns {Set<string>}
 */
export function requiredSubsets(unicode, characters) {
  const parsed = Object.entries(unicode).map(([key, declaration]) => ({
    key,
    admits: ranges(declaration),
  }))

  const needed = new Set()
  const uncovered = []
  for (const ch of characters) {
    const cp = ch.codePointAt(0)
    // An empty string covers nothing and has no codepoint. Skipping it keeps the
    // "no subset covers X" throw below reachable — reading `.toString(16)` off
    // `undefined` would replace that message with a TypeError.
    if (cp === undefined) continue
    const hits = parsed.filter(({ admits }) =>
      admits.some(([lo, hi]) => cp >= lo && cp <= hi)
    )
    if (hits.length === 0) {
      uncovered.push(`${ch} U+${cp.toString(16)}`)
      continue
    }
    for (const { key } of hits) needed.add(key)
  }

  // Not a warning: a character no subset covers cannot be drawn by this font at
  // all, and the site would fall back to whatever the reader's OS provides.
  if (uncovered.length > 0) {
    throw new Error(
      `no Noto Sans JP subset covers ${uncovered.join(", ")} — remove the ` +
        "character or add a font that has it"
    )
  }
  return needed
}

/**
 * `[119]` and `latin` name their files differently; both appear as keys.
 *
 * @param {string} key
 * @returns {string}
 */
export function subsetFile(key) {
  const name = key.startsWith("[") ? key.slice(1, -1) : key
  return `noto-sans-jp-${name}-wght-normal.woff2`
}

/**
 * @param {string} repoRoot
 * @returns {string}
 */
export function generateFontCss(repoRoot) {
  const unicode = JSON.parse(
    readFileSync(
      join(
        repoRoot,
        "node_modules/@fontsource-variable/noto-sans-jp/unicode.json"
      ),
      "utf8"
    )
  )
  const needed = requiredSubsets(unicode, requiredCharacters(repoRoot))

  // Numeric first and in order, then the named ones, so a regeneration produces
  // the same bytes and the diff shows only what changed.
  const keys = [...needed].sort((a, b) => {
    const na = Number(a.replace(/[[\]]/g, ""))
    const nb = Number(b.replace(/[[\]]/g, ""))
    if (Number.isNaN(na) && Number.isNaN(nb)) return a < b ? -1 : 1
    if (Number.isNaN(na)) return 1
    if (Number.isNaN(nb)) return -1
    return na - nb
  })

  const blocks = keys.map(
    (key) => `@font-face {
  font-family: "Noto Sans JP Variable";
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url("@fontsource-variable/noto-sans-jp/files/${subsetFile(key)}")
    format("woff2-variations");
  unicode-range: ${unicode[key]};
}`
  )

  return `/*
 * GENERATED by scripts/fonts.mjs — do not edit by hand.
 *
 * The ${keys.length} Noto Sans JP subsets this site's text needs, out of the 124
 * Fontsource ships. Run \`pnpm fonts\` after adding any non-ASCII character under
 * src/ or to index.html — comments count, not just copy.
 * src/styles/fonts.test.ts fails while this file is stale.
 */
${blocks.join("\n\n")}
`
}

// `pathToFileURL`, not string concatenation: a repo path with a space or a
// non-ASCII segment percent-encodes in `import.meta.url`, and the comparison
// would fail silently — `pnpm fonts` would exit 0 having written nothing.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const css = generateFontCss(root)
  const out = join(root, "src/styles/fonts.css")
  writeFileSync(out, css)
  const count = (css.match(/@font-face/g) ?? []).length
  console.log(`wrote ${out} — ${count} subsets, ${css.length} B`)
}
