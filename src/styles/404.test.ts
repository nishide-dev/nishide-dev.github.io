// Node types for this file alone: public/404.html is copied to dist/ verbatim
// and is never imported, so nothing else would read it.
/// <reference types="node" />
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { profile } from "@/data/profile"
import { collectCustomProperties, resolveToken } from "@/test/contrast"

/**
 * `public/404.html` hand-copies eight colours out of globals.css because it has
 * to render before, and without, the app — nothing there can import a
 * stylesheet.
 *
 * That makes it the one file in the project where the design system's "never a
 * hex value" rule cannot hold, and `globals.test.ts` does not cover it:
 * `appSourceFiles()` matches `.tsx?` under `src/`, so `public/` is outside the
 * guard entirely. Without this file a palette edit leaves the whole 404 page
 * stale — and it is the page carrying the inbound traffic from the old Next.js
 * URLs, on a path `vite preview` will not even serve, so nobody would notice.
 */
const root = join(import.meta.dirname, "..", "..")
const html = readFileSync(join(root, "public/404.html"), "utf8")
const css = readFileSync(join(root, "src/styles/globals.css"), "utf8")

const doc = new DOMParser().parseFromString(html, "text/html")

function token(selector: string, name: string): string {
  const scope = collectCustomProperties(css, selector)
  const primitives = collectCustomProperties(css, ":root")
  const value = resolveToken({ ...primitives, ...scope }, scope[name])
  if (value === undefined) throw new Error(`${selector} has no ${name}`)
  return value.toLowerCase()
}

/** The inlined value of one custom property under the light or dark block. */
function inlined(theme: "light" | "dark", name: string): string | undefined {
  const style = doc.querySelector("style")?.textContent ?? ""
  // The dark block is the one nested inside the media query; taking the light
  // value from the whole sheet would match the dark override too.
  const dark = style.match(/@media \(prefers-color-scheme: dark\) \{([\s\S]*)/)
  const scope =
    theme === "dark" ? (dark?.[1] ?? "") : style.slice(0, dark?.index)
  return scope
    .match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1]
    ?.trim()
    .toLowerCase()
}

describe("public/404.html", () => {
  it("inlines the same three tokens as globals.css, per theme", () => {
    for (const name of [
      "--background",
      "--foreground",
      "--muted-foreground",
    ] as const) {
      expect(inlined("light", name), `light ${name}`).toBe(token(":root", name))
      expect(inlined("dark", name), `dark ${name}`).toBe(token(".dark", name))
    }
  })

  it("matches index.html's theme-color values", () => {
    // `getAttribute`, not `.media` — jsdom's IDL has no such property.
    const byMedia = new Map(
      [
        ...doc.head.querySelectorAll<HTMLMetaElement>(
          'meta[name="theme-color"]'
        ),
      ].map((element) => [
        element.getAttribute("media"),
        element.content.toLowerCase(),
      ])
    )

    expect(byMedia.get("(prefers-color-scheme: light)")).toBe(
      token(":root", "--background")
    )
    expect(byMedia.get("(prefers-color-scheme: dark)")).toBe(
      token(".dark", "--background")
    )
  })

  it("is a real 404, not an SPA fallback", () => {
    // A script here would be the beginning of the routing the deploy issue
    // rules out — and it must render with JS off regardless.
    expect(doc.querySelectorAll("script")).toHaveLength(0)
    expect(
      doc.querySelector('meta[name="robots"]')?.getAttribute("content")
    ).toBe("noindex")
  })

  it("is in Japanese and offers one way back", () => {
    expect(doc.documentElement.lang).toBe("ja")
    expect(doc.title).toContain(profile.name)

    const links = [...doc.querySelectorAll("a")]
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toBe("/")
  })
})
