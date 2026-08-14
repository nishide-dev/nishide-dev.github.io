/// <reference types="node" />
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { meta, notoFaces, token } from "./og-tokens.mjs"

/**
 * These functions were untestable until they were split out of `og.mjs`, and in
 * that time one of them shipped a bug that put a dark card under a comment
 * claiming light. So the tests below aim at the *properties that broke*, not at
 * restating what the code does — `expect(token(css, ":root", "--x")).toBe("#111")`
 * on a fixture written two lines above proves nothing.
 */

const root = join(import.meta.dirname, "..")

describe("token", () => {
  const css = `
    :root { --brand-navy: #30364f; --background: #f8f8ee; --fg: var(--brand-navy); }
    .dark { --background: var(--brand-navy); --fg: #f0f0db; }
  `

  it("keeps selectors apart", () => {
    // THE bug. One flat map of every `--*` in the file let `.dark` overwrite
    // `:root`, and the card came out dark while its comment said light. What
    // matters is that the two resolve *differently*, not what either value is.
    expect(token(css, ":root", "--background")).not.toBe(
      token(css, ".dark", "--background")
    )
    expect(token(css, ":root", "--background")).toBe("#f8f8ee")
    expect(token(css, ".dark", "--background")).toBe("#30364f")
  })

  it("follows var() into the primitives, which only :root declares", () => {
    // A `.dark` token pointing at a `:root` primitive has to resolve, or scoping
    // the lookup would have broken the palette instead of fixing it.
    expect(token(css, ".dark", "--background")).toBe("#30364f")
    expect(token(css, ":root", "--fg")).toBe("#30364f")
  })

  it("throws rather than returning undefined for a missing token", () => {
    // The card is generated once and committed; `undefined` would reach the CSS
    // as the string "undefined" and paint something arbitrary.
    expect(() => token(css, ":root", "--nope")).toThrow(/has no --nope/)
    expect(() => token(css, ".sidebar", "--background")).toThrow()
  })

  it("throws on a circular var() instead of hanging", () => {
    expect(() =>
      token(":root { --a: var(--b); --b: var(--a); }", ":root", "--a")
    ).toThrow(/circular/)
  })

  it("returns color-mix() as raw text — a documented limit, not a resolution", () => {
    // Pinned so the limit is visible: the value comes back unresolved rather
    // than throwing, so a future caller reading `--activity-*` gets CSS text.
    const mixed =
      ":root { --activity-1: color-mix(in oklab, var(--x) 18%, #fff); }"
    expect(token(mixed, ":root", "--activity-1")).toBe(
      "color-mix(in oklab, var(--x) 18%, #fff)"
    )
  })

  it("resolves the real globals.css the card actually reads", () => {
    const real = readFileSync(join(root, "src/styles/globals.css"), "utf8")
    for (const name of ["--background", "--foreground", "--muted-foreground"]) {
      expect(token(real, ".dark", name)).toMatch(/^#[0-9a-f]{6}$/i)
    }
    expect(token(real, ":root", "--brand-sand")).toMatch(/^#[0-9a-f]{6}$/i)
    // The four the card reads must not collapse onto one another.
    const drawn = [
      token(real, ".dark", "--background"),
      token(real, ".dark", "--foreground"),
      token(real, ".dark", "--muted-foreground"),
      token(real, ":root", "--brand-sand"),
    ]
    expect(new Set(drawn).size).toBe(4)
  })
})

describe("meta", () => {
  it("reads a tag whether or not the formatter split it", () => {
    // Biome rewraps long tags, so both shapes appear in index.html over time.
    // Both are handled by the *first* pattern — `\s+` spans newlines — which is
    // why neither of these reaches the fallback below.
    expect(meta('<meta property="og:title" content="X" />', "og:title")).toBe(
      "X"
    )
    expect(
      meta('<meta\n  property="og:title"\n  content="X"\n/>', "og:title")
    ).toBe("X")
  })

  it("reads a tag with another attribute before property", () => {
    // This is what the fallback is actually for. The first pattern anchors on
    // `<meta\s+property`, so anything between them defeats it. Deleting the
    // fallback passed every other test in this file.
    expect(
      meta(
        '<meta\n  charset="utf-8"\n  property="og:title"\n  content="X"\n/>',
        "og:title"
      )
    ).toBe("X")
  })

  it("throws when the tag is absent", () => {
    expect(() => meta("<meta />", "og:title")).toThrow(/no og:title/)
  })

  it("does not bleed into the next tag", () => {
    // A greedy match would take the following tag's content and put the wrong
    // words on the card.
    const html =
      '<meta property="og:title" content="A" />\n<meta property="og:description" content="B" />'
    expect(meta(html, "og:title")).toBe("A")
    expect(meta(html, "og:description")).toBe("B")
  })

  it("reads the real index.html", () => {
    const html = readFileSync(join(root, "index.html"), "utf8")
    expect(meta(html, "og:title")).toBe("Ryusei Nishide")
    expect(meta(html, "og:description")).toContain("豊田工業大学大学院")
  })
})

describe("notoFaces", () => {
  const manifest = `
    @font-face { src: url(./files/noto-sans-jp-1-wght-normal.woff2); unicode-range: U+3042; }
    @font-face { src: url(./files/noto-sans-jp-2-wght-normal.woff2); unicode-range: U+4e00-4e10; }
    @font-face { src: url(./files/noto-sans-jp-58-wght-normal.woff2); unicode-range: U+2194-2199; }
  `

  it("selects by unicode-range, not by subset number", () => {
    // Subset 58 was once embedded by number as "the Japanese this card uses";
    // it holds arrows and covered none of the characters drawn.
    const faces = notoFaces(manifest, "あ")
    expect(faces.map((f) => f.file)).toEqual([
      "noto-sans-jp-1-wght-normal.woff2",
    ])
    expect(faces.map((f) => f.file)).not.toContain(
      "noto-sans-jp-58-wght-normal.woff2"
    )
  })

  it("keeps each face's own range so the browser can choose per character", () => {
    const faces = notoFaces(manifest, "あ一")
    expect(faces).toHaveLength(2)
    expect(faces.map((f) => f.declaration)).toEqual(["U+3042", "U+4e00-4e10"])
  })

  it("throws on a character no subset covers", () => {
    // Without this the script screenshots tofu and exits 0 over a committed PNG.
    expect(() => notoFaces(manifest, "🎉")).toThrow(
      /no Noto Sans JP subset covers/
    )
    expect(() => notoFaces(manifest, "🎉")).toThrow(/U\+1f389/)
  })

  it("covers every character the real card draws", () => {
    const real = readFileSync(
      join(root, "node_modules/@fontsource-variable/noto-sans-jp/index.css"),
      "utf8"
    )
    const html = readFileSync(join(root, "index.html"), "utf8")
    const drawn = `${meta(html, "og:title")}${meta(html, "og:description")}`
    // The assertion is that it does not throw; the throw is what would tell you
    // the committed card is tofu.
    expect(() => notoFaces(real, drawn)).not.toThrow()
    expect(notoFaces(real, drawn).length).toBeGreaterThan(0)
  })
})
