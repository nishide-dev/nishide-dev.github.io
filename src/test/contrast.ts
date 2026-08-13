/**
 * WCAG 2.1 contrast helpers, used to keep the semantic colour tokens in
 * `src/styles/globals.css` honest. Test-only: nothing in the app imports this.
 */

function channelToLinear(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Parses `#rgb` / `#rrggbb`. Throws on anything else, so a token that quietly
 * becomes `rgb(... / 14%)` fails loudly instead of scoring 0 contrast. */
export function parseHex(value: string): [number, number, number] {
  const hex = value.trim().replace(/^#/, "")
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${value}`)
  }

  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(channelToLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  )
  return (lighter + 0.05) / (darker + 0.05)
}

/** `/* ... *​/` spans, so a commented-out declaration cannot be harvested as if
 * it were live. Without this, commenting a token out keeps its assertion green
 * while the browser resolves nothing. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

/**
 * Collects `--custom-property` declarations from every top-level rule matching
 * `selector`. Later declarations win, mirroring the cascade for rules of equal
 * specificity in a single stylesheet.
 *
 * Deliberately simple: it only understands flat blocks. A block containing a
 * nested at-rule or selector yields nothing rather than partial results, which
 * the light/dark key-parity test is there to catch.
 */
export function collectCustomProperties(
  css: string,
  selector: string
): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const blocks = stripComments(css).matchAll(
    new RegExp(`(?:^|[\\s,}])${escaped}\\s*\\{([^{}]*)\\}`, "g")
  )

  const tokens: Record<string, string> = {}
  for (const block of blocks) {
    for (const [, name, value] of block[1].matchAll(
      /(--[\w-]+)\s*:\s*([^;}]+)(?:;|$)/g
    )) {
      tokens[name] = value.trim()
    }
  }
  return tokens
}

/**
 * Follows `var(--x)` indirection so a token defined as `var(--brand-navy)`
 * still resolves to a colour. Without this, deriving semantic tokens from the
 * palette primitives — which is the documented rule — would break every
 * contrast assertion.
 */
export function resolveToken(
  tokens: Record<string, string>,
  value: string | undefined,
  seen = new Set<string>()
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const match = value.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/)
  if (!match) {
    return value.trim()
  }

  const name = match[1]
  if (seen.has(name)) {
    throw new Error(`Circular var() reference at ${name}`)
  }
  seen.add(name)

  return resolveToken(tokens, tokens[name], seen)
}
