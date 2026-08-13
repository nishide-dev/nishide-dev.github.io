/**
 * Regenerates `src/styles/fonts.css` — the Noto Sans JP `@font-face` blocks this
 * site actually needs.
 *
 *     node scripts/fonts.mjs
 *
 * Fontsource ships one `index.css` declaring all **124** subsets, and importing
 * it put 124 `@font-face` blocks into the render-blocking stylesheet: 82% of its
 * gzipped bytes, for a page that requests 28 of them. `unicode-range` means the
 * browser never *downloads* the other 96, so this is not about transfer for the
 * fonts themselves — it is about the stylesheet that has to arrive before
 * anything paints, and about the 5MB of woff2 that shipped in `dist/` regardless.
 *
 * The needed set is derived, never listed: every non-ASCII character appearing
 * anywhere under `src/` or in `index.html` is looked up in the package's own
 * `unicode.json`. Scanning source text rather than rendered output deliberately
 * over-collects — a kanji in a comment keeps its subset — because the failure
 * mode of under-collecting is a glyph silently falling back to a system font,
 * and the failure mode of over-collecting is a few hundred bytes.
 *
 * `src/styles/fonts.test.ts` asserts the committed file both covers every such
 * character and contains no block no character needs, so editing content without
 * rerunning this fails CI rather than shipping tofu.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

/** The codepoints one Fontsource `unicode-range` declaration admits. */
export function ranges(declaration) {
  return declaration.split(",").map((part) => {
    const [lo, hi] = part.trim().replace(/^U\+/i, "").split("-")
    return [Number.parseInt(lo, 16), Number.parseInt(hi ?? lo, 16)]
  })
}

/**
 * Source files whose text can reach the page.
 *
 * `fonts.css` is skipped because it is this script's own output: its header
 * comment is prose, and letting it into the corpus would make the generated file
 * an input to its own generation.
 */
export function sourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sourceFiles(path, acc)
    else if (/\.(tsx?|css|html)$/.test(entry) && entry !== "fonts.css")
      acc.push(path)
  }
  return acc
}

/**
 * Every character a Latin font cannot draw, across `src/` and index.html.
 *
 * ASCII is excluded because Geist covers it and Noto's own `latin` subset backs
 * it up; what matters here is which CJK blocks have to be present.
 */
export function requiredCharacters(repoRoot) {
  const files = [
    ...sourceFiles(join(repoRoot, "src")),
    join(repoRoot, "index.html"),
  ]
  const text = files.map((file) => readFileSync(file, "utf8")).join("")
  return new Set([...text].filter((ch) => ch.codePointAt(0) > 0x7f))
}

/** Subset keys from `unicode.json` that between them cover `characters`. */
export function requiredSubsets(unicode, characters) {
  const parsed = Object.entries(unicode).map(([key, declaration]) => ({
    key,
    admits: ranges(declaration),
  }))

  const needed = new Set()
  const uncovered = []
  for (const ch of characters) {
    const cp = ch.codePointAt(0)
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

/** `[119]` and `latin` name their files differently; both appear as keys. */
export function subsetFile(key) {
  const name = key.startsWith("[") ? key.slice(1, -1) : key
  return `noto-sans-jp-${name}-wght-normal.woff2`
}

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
 * Fontsource ships. Rerun the script after changing any Japanese copy;
 * src/styles/fonts.test.ts fails while this file is stale.
 */
${blocks.join("\n\n")}
`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const css = generateFontCss(root)
  const out = join(root, "src/styles/fonts.css")
  writeFileSync(out, css)
  const count = (css.match(/@font-face/g) ?? []).length
  console.log(`wrote ${out} — ${count} subsets, ${css.length} B`)
}
