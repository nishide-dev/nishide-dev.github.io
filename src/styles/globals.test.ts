// Node types are pulled in for this file alone: it reads the stylesheet off
// disk. Importing `./globals.css?raw` does not work — Vitest stubs CSS out, so
// the import resolves to an empty string and every assertion passes vacuously.
/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  collectCustomProperties,
  contrastRatio,
  resolveToken,
} from "@/test/contrast"

const SRC = join(import.meta.dirname, "..")
const css = readFileSync(join(import.meta.dirname, "globals.css"), "utf8")

const themes = {
  light: collectCustomProperties(css, ":root"),
  dark: {
    // `.dark` only overrides; anything it does not restate is inherited.
    ...collectCustomProperties(css, ":root"),
    ...collectCustomProperties(css, ".dark"),
  },
} as const

/** WCAG 2.1 AA for normal-size text. */
const AA = 4.5

/** Anything text can legitimately sit on. */
const SURFACES = [
  "background",
  "card",
  "popover",
  "muted",
  "secondary",
  "accent",
] as const

/** Anything painted as text. Each must clear AA on *every* surface, because
 * nothing stops a component from combining them — `text-muted-foreground`
 * inside a `bg-accent` row is ordinary shadcn markup. */
const INK = ["foreground", "muted-foreground", "destructive"] as const

/** Pairs that are explicitly designed to go together. */
const PAIRED = [
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["selection-foreground", "selection"],
] as const

function colour(theme: keyof typeof themes, token: string): string {
  const value = resolveToken(themes[theme], themes[theme][`--${token}`])
  if (value === undefined) {
    throw new Error(`--${token} is not defined for the ${theme} theme`)
  }
  return value
}

function expectAA(theme: keyof typeof themes, fg: string, bg: string) {
  const foreground = colour(theme, fg)
  const background = colour(theme, bg)
  expect(
    Number(contrastRatio(foreground, background).toFixed(2)),
    `--${fg} (${foreground}) on --${bg} (${background})`
  ).toBeGreaterThanOrEqual(AA)
}

describe.each(["light", "dark"] as const)("%s theme", (theme) => {
  const combinations = INK.flatMap((ink) =>
    SURFACES.map((surface) => [ink, surface] as const)
  )

  it.each(combinations)("%s on %s meets WCAG AA", (ink, surface) => {
    expectAA(theme, ink, surface)
  })

  it.each(PAIRED)("%s on %s meets WCAG AA", (fg, bg) => {
    expectAA(theme, fg, bg)
  })

  // Not a WCAG gate — decorative rules are exempt from 1.4.11. This is a design
  // floor so a hairline cannot silently become invisible against the page.
  it.each(["border", "input"])(
    "%s is perceptible against the page",
    (token) => {
      const ratio = contrastRatio(
        colour(theme, token),
        colour(theme, "background")
      )
      expect(Number(ratio.toFixed(2)), `--${token}`).toBeGreaterThanOrEqual(1.4)
    }
  )

  // The ring is drawn as an offset outline, so it lands on whatever is *behind*
  // the focused element rather than on its own fill.
  it("ring is visible against the page", () => {
    const ratio = contrastRatio(
      colour(theme, "ring"),
      colour(theme, "background")
    )
    expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(3)
  })
})

describe("themes", () => {
  it("define the same token set", () => {
    const light = Object.keys(collectCustomProperties(css, ":root")).sort()
    const dark = Object.keys(collectCustomProperties(css, ".dark")).sort()
    // `.dark` legitimately omits the primitives and --radius.
    const inherited = ["--brand-", "--radius"]
    const expected = light.filter(
      (key) => !inherited.some((prefix) => key.startsWith(prefix))
    )
    expect(dark).toEqual(expected)
  })

  it("parses non-empty blocks", () => {
    // Guards the regex in collectCustomProperties: a selector it cannot handle
    // returns {}, which would make every assertion above vacuous.
    expect(Object.keys(themes.light).length).toBeGreaterThan(15)
    expect(
      Object.keys(collectCustomProperties(css, ".dark")).length
    ).toBeGreaterThan(15)
  })
})

describe("typography", () => {
  // Pinned to `@theme static` on purpose: without `static` Tailwind prunes the
  // tokens no utility references, so losing the keyword should fail here.
  const theme = collectCustomProperties(css, "@theme static")

  it("self-hosts all three families", () => {
    // The stacks below are inert without these. Fontsource is also what keeps
    // the site off Google Fonts.
    for (const pkg of [
      "@fontsource-variable/geist",
      "@fontsource-variable/geist-mono",
      "@fontsource-variable/noto-sans-jp",
    ]) {
      expect(css, `missing @import for ${pkg}`).toContain(`@import "${pkg}"`)
    }
  })

  it("leads the sans stack with Geist and backs it with Noto", () => {
    const stack = theme["--font-sans"]
    expect(stack, "--font-sans is not defined").toBeDefined()
    expect(stack).toMatch(/^"Geist Variable"\s*,/)
    expect(stack).toContain('"Noto Sans JP Variable"')
  })

  it("leads the mono stack with Geist Mono and backs it with Noto", () => {
    const stack = theme["--font-mono"]
    expect(stack, "--font-mono is not defined").toBeDefined()
    // Geist Mono covers neither Japanese nor U+2197 "↗", so Noto has to be
    // here too — and the proportional Geist must not stand in for Geist Mono.
    expect(stack).toMatch(/^"Geist Mono Variable"\s*,/)
    expect(stack).toContain('"Noto Sans JP Variable"')
  })

  it("keeps the semantic sizes registered with tailwind-merge", () => {
    const utils = readFileSync(join(SRC, "lib/utils.ts"), "utf8")
    for (const name of Object.keys(theme)) {
      const size = name.match(/^--text-([\w-]+)$/)?.[1]
      if (!size || size.includes("--")) continue
      expect(
        utils,
        `text-${size} is unknown to tailwind-merge, so cn() will drop it`
      ).toContain(`"${size}"`)
    }
  })
})

describe("palette", () => {
  it("keeps the Color Hunt primitives as the only raw hex source", () => {
    const primitives = collectCustomProperties(css, ":root")
    expect(primitives["--brand-navy"]).toBe("#30364f")
    expect(primitives["--brand-slate"]).toBe("#acbac4")
    expect(primitives["--brand-sand"]).toBe("#e1d9bc")
    expect(primitives["--brand-cream"]).toBe("#f0f0db")
  })

  it("actually derives semantic tokens from the primitives", () => {
    // CLAUDE.md says the primitives exist to derive the semantic tokens. If
    // nothing references them they are decoration, and editing one changes
    // nothing.
    const references = css.match(/var\(--brand-[\w-]+\)/g) ?? []
    expect(references.length).toBeGreaterThan(10)
  })

  it("does not leave the shadcn neutral defaults in place", () => {
    // The template shipped an achromatic oklch ramp; this is Cream x Navy.
    expect(css).not.toContain("oklch(")
  })

  it("is the only place colours are written", () => {
    const forbidden = [
      /#[0-9a-fA-F]{3,8}\b/, // hex literal, including 8-digit alpha
      /\bvar\(--brand-/, // primitives are for globals.css only
      /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/,
    ]
    const files = appSourceFiles()

    expect(files.length, "found no app sources to scan").toBeGreaterThan(0)

    const offenders = files.filter((file) => {
      const source = stripCommentsAndAnchors(readFileSync(file, "utf8"))
      return forbidden.some((pattern) => pattern.test(source))
    })

    expect(
      offenders.map((f) => f.replace(`${SRC}/`, "")),
      "components must use semantic tokens, not colour literals"
    ).toEqual([])
  })
})

/** Comments carry issue references like `#123`, and `href="#anchor"` is not a
 * colour. Both would otherwise trip the hex pattern. */
function stripCommentsAndAnchors(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/(?:href|to)=\{?["'`]#[^"'`]*["'`]\}?/g, "")
}

/** App source only: the stylesheet owns the palette, and tests may name it. */
function appSourceFiles(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return dir === SRC && (entry.name === "styles" || entry.name === "test")
        ? []
        : appSourceFiles(path)
    }
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes(".test.")) {
      return []
    }
    return [path]
  })
}
