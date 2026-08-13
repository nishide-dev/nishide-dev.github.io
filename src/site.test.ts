// Node types for this file alone: it reads index.html off disk.
//
// `dist/index.html` is what a crawler actually fetches, but Vite copies the head
// through verbatim and only appends the hashed script and stylesheet, so
// asserting against the source is equivalent and does not need a build.
/// <reference types="node" />
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { profile } from "@/data/profile"
import { site } from "@/data/site"
import { collectCustomProperties, resolveToken } from "@/test/contrast"

const root = join(import.meta.dirname, "..")
const html = readFileSync(join(root, "index.html"), "utf8")
const css = readFileSync(join(root, "src/styles/globals.css"), "utf8")

/**
 * Parsed rather than matched with a regex.
 *
 * The first version of this file read the tags with `new RegExp(...)`, which let
 * five mutations through — a stale value left in an HTML comment above the live
 * tag satisfied it, the whole tag could be moved into `<noscript>` or out of
 * `<head>`, and swapping the two `theme-color` media queries went unnoticed —
 * while three semantically identical reformattings (`content` before `name`, a
 * second attribute on `<html>`, `href="…"/>` without the space) failed it. A
 * document object has none of those failure modes, and jsdom is already the test
 * environment.
 */
const doc = new DOMParser().parseFromString(html, "text/html")

/** The content of one `<meta>` in `<head>`, whichever attribute names it. */
function meta(key: string): string | undefined {
  const attr = key.startsWith("og:") ? "property" : "name"
  return (
    doc.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      ?.content ?? undefined
  )
}

/** A semantic token resolved through `var()`, as the browser would compute it. */
function token(selector: string, name: string): string {
  const scope = collectCustomProperties(css, selector)
  const primitives = collectCustomProperties(css, ":root")
  const value = resolveToken({ ...primitives, ...scope }, scope[name])
  if (value === undefined) throw new Error(`${selector} has no ${name}`)
  return value.toLowerCase()
}

describe("index.html", () => {
  it("declares Japanese as the document language", () => {
    // The body copy is Japanese; without this a screen reader reads it with an
    // English voice.
    expect(doc.documentElement.lang).toBe("ja")
  })

  it("carries a title, a description and a canonical URL", () => {
    expect(doc.title).toBe(site.title)
    expect(meta("description")).toBe(site.description)
    expect(
      doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
    ).toBe(site.url)
  })

  it("keeps its metadata in step with the profile data", () => {
    // Vite gives index.html no access to a TS module — `%ENV%` substitution and
    // a `transformIndexHtml` plugin are the two routes, and both mean plumbing
    // rather than an import — so these strings are duplicated. Asserting
    // `site.title === profile.name` would be a tautology (that is how site.ts
    // defines it); only the tags on the left are a second copy that can rot.
    expect(meta("og:title")).toBe(profile.name)
    expect(meta("og:description")).toBe(profile.intro.join(""))
    expect(doc.title).toBe(profile.name)
    expect(meta("description")).toBe(profile.intro.join(""))
  })

  it("describes itself as a profile page to unfurlers", () => {
    expect(meta("og:type")).toBe("profile")
    expect(meta("og:locale")).toBe("ja_JP")
    expect(meta("og:url")).toBe(site.url)
  })

  it("gives unfurlers an absolute image with its dimensions", () => {
    // A relative og:image is ignored by most unfurlers. The declared dimensions
    // are an Open Graph optimisation — Facebook can lay the card out before it
    // has fetched the image; X sizes from the file itself and reads only
    // `twitter:card`.
    expect(meta("og:image")).toBe(
      `${site.url.replace(/\/$/, "")}${site.ogImage}`
    )
    expect(meta("twitter:card")).toBe("summary_large_image")

    // Declared against the real file, so a regenerated card of another size
    // cannot keep advertising these numbers. Width and height are the two
    // big-endian uint32s of the PNG's IHDR chunk.
    const png = readFileSync(join(root, "public", site.ogImage))
    expect(png.readUInt32BE(16)).toBe(Number(meta("og:image:width")))
    expect(png.readUInt32BE(20)).toBe(Number(meta("og:image:height")))
    expect(meta("og:image:width")).toBe("1200")
    expect(meta("og:image:height")).toBe("630")
  })

  it("pairs each theme-color with the background of that theme", () => {
    // Read off globals.css rather than restated: a hardcoded pair here would
    // pin index.html to this test instead of to the palette, and a palette edit
    // would leave the browser chrome stale with the suite green.
    // `getAttribute`, not `.media`: jsdom's HTMLMetaElement IDL predates the
    // attribute and the property reads `undefined`, which would pair every
    // meta under the same key and assert nothing.
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

  it("claims only what is confirmed in its structured data", () => {
    const block = doc.head.querySelector(
      'script[type="application/ld+json"]'
    )?.textContent
    expect(block).toBeDefined()
    const person = JSON.parse(block as string)

    expect(person["@type"]).toBe("Person")
    expect(person.name).toBe(profile.name)
    expect(person.url).toBe(site.url)
    expect(person.sameAs).toEqual([`https://github.com/${profile.github}`])
    // No employer, affiliation or jobTitle: the timeline carries those with
    // their dates, and structured data that guesses is structured data that
    // lies.
    expect(Object.keys(person).sort()).toEqual([
      "@context",
      "@type",
      "name",
      "sameAs",
      "url",
    ])
  })
})
