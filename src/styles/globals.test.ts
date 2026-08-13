// Node types are pulled in for this file alone: it reads the stylesheet off
// disk. Importing `./globals.css?raw` does not work — Vitest stubs CSS out, so
// the import resolves to an empty string and every assertion passes vacuously.
/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { collectCustomProperties, contrastRatio } from "@/test/contrast"

const css = readFileSync(join(import.meta.dirname, "globals.css"), "utf8")

const themes = {
  light: collectCustomProperties(css, ":root"),
  dark: collectCustomProperties(css, ".dark"),
} as const

/** WCAG 2.1 AA for normal-size text. */
const AA = 4.5

/** Every pair where one token is painted as text on the other. */
const TEXT_PAIRS = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["selection-foreground", "selection"],
  ["destructive", "background"],
] as const

describe.each(["light", "dark"] as const)("%s theme", (theme) => {
  const tokens = themes[theme]

  it.each(TEXT_PAIRS)("%s on %s meets WCAG AA", (fg, bg) => {
    const foreground = tokens[`--${fg}`]
    const background = tokens[`--${bg}`]

    expect(foreground, `--${fg} is not defined for ${theme}`).toBeDefined()
    expect(background, `--${bg} is not defined for ${theme}`).toBeDefined()

    const ratio = contrastRatio(foreground, background)
    expect(
      Number(ratio.toFixed(2)),
      `--${fg} (${foreground}) on --${bg} (${background})`
    ).toBeGreaterThanOrEqual(AA)
  })
})

describe("typography", () => {
  const theme = collectCustomProperties(css, "@theme inline")

  // Geist covers Latin/Cyrillic/Vietnamese only, and Geist Mono additionally
  // lacks U+2197 "↗". Dropping Noto from either stack silently hands those
  // glyphs to whatever the OS picks, which is the "unnatural fallback" the
  // design brief rules out.
  it.each(["--font-sans", "--font-mono"])(
    "%s falls back to Noto Sans JP for glyphs Geist lacks",
    (token) => {
      const stack = theme[token]
      expect(stack, `${token} is not defined`).toBeDefined()
      expect(stack).toContain("Noto Sans JP Variable")
    }
  )

  it("orders Geist ahead of Noto so Latin keeps Geist's shapes", () => {
    for (const token of ["--font-sans", "--font-mono"]) {
      const stack = theme[token]
      const geist = stack.indexOf("Geist")
      const noto = stack.indexOf("Noto Sans JP")
      expect(geist, token).toBeGreaterThanOrEqual(0)
      expect(geist, token).toBeLessThan(noto)
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

  it("does not leave the shadcn neutral defaults in place", () => {
    // The template shipped an achromatic oklch ramp; the rebuild is Cream x Navy.
    expect(css).not.toContain("oklch(")
  })

  it("is the only place raw colours are written", () => {
    const offenders = appSourceFiles().filter((file) =>
      /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/.test(readFileSync(file, "utf8"))
    )

    expect(
      offenders.map((f) => f.replace(`${SRC}/`, "")),
      "components must use semantic tokens, not palette hex values"
    ).toEqual([])
  })
})

const SRC = join(import.meta.dirname, "..")

/** App source only: the stylesheet owns the palette, and tests may name it. */
function appSourceFiles(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "styles" || entry.name === "test"
        ? []
        : appSourceFiles(path)
    }
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes(".test.")) {
      return []
    }
    return [path]
  })
}
