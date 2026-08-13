/**
 * Types for the plain-JS generator, so `src/styles/fonts.test.ts` can import it
 * without an `@ts-expect-error` — which would suppress real errors at that import
 * along with the missing-types one.
 *
 * The script stays `.mjs` so `node scripts/fonts.mjs` runs it with no build step
 * and no dependency on the TypeScript version.
 */

/** The codepoints one Fontsource `unicode-range` declaration admits. */
export function ranges(declaration: string): [number, number][]

/** Source files whose text can reach the page. */
export function sourceFiles(
  dir: string,
  acc?: string[],
  stop?: string
): string[]

/** Every character a Latin font cannot draw, across `src/` and index.html. */
export function requiredCharacters(repoRoot: string): Set<string>

/**
 * Subset keys from `unicode.json` that between them cover `characters`.
 *
 * Throws when a character no subset covers reaches it — that is the one
 * diagnostic the artifact assertions cannot produce, since "not covered" and
 * "file is stale" look identical from the committed CSS alone.
 */
export function requiredSubsets(
  unicode: Record<string, string>,
  characters: Iterable<string>
): Set<string>

/** `[119]` and `latin` name their files differently; both appear as keys. */
export function subsetFile(key: string): string

/** The full contents `src/styles/fonts.css` should have. */
export function generateFontCss(repoRoot: string): string
