// Node types for this file alone: it reads index.html off disk, which is the
// only copy a crawler or an unfurler ever sees.
/// <reference types="node" />
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { profile } from "@/data/profile"
import { site } from "@/data/site"

const html = readFileSync(join(import.meta.dirname, "..", "index.html"), "utf8")

/** The content of one `<meta>`, whichever attribute names it, tolerating the
 * line breaks the formatter inserts into long tags. */
function meta(key: string): string | undefined {
  const attr = key.startsWith("og:") ? "property" : "name"
  const pattern = new RegExp(
    `${attr}="${key}"\\s*\\n?\\s*content="([^"]*)"`,
    "s"
  )
  return html.match(pattern)?.[1]
}

describe("index.html", () => {
  it("declares Japanese as the document language", () => {
    // The body copy is Japanese; without this a screen reader reads it with an
    // English voice.
    expect(html).toMatch(/<html lang="ja">/)
  })

  it("carries a title, a description and a canonical URL", () => {
    expect(html).toContain(`<title>${site.title}</title>`)
    expect(meta("description")).toBe(site.description)
    expect(html).toContain(`<link rel="canonical" href="${site.url}" />`)
  })

  it("keeps its metadata in step with the profile data", () => {
    // Vite does not template index.html, so these strings are duplicated by
    // necessity. This is the only thing stopping them drifting apart.
    expect(site.title).toBe(profile.name)
    expect(site.description).toBe(profile.intro.join(""))
    expect(meta("og:title")).toBe(profile.name)
    expect(meta("og:description")).toBe(profile.intro.join(""))
  })

  it("gives unfurlers an absolute image with its dimensions", () => {
    // A relative og:image is ignored by most unfurlers, and omitting the size
    // makes X fall back to the small card.
    expect(meta("og:image")).toBe(
      `${site.url.replace(/\/$/, "")}${site.ogImage}`
    )
    expect(meta("og:image:width")).toBe("1200")
    expect(meta("og:image:height")).toBe("630")
    expect(meta("og:url")).toBe(site.url)
    expect(meta("twitter:card")).toBe("summary_large_image")
  })

  it("gives theme-color a value per theme", () => {
    // The UA paints this behind the page, so one value shows the wrong ground in
    // whichever theme it does not match.
    const colours = [
      ...html.matchAll(/name="theme-color"[\s\S]*?content="([^"]*)"/g),
    ]
    expect(colours.map((m) => m[1])).toEqual(["#f8f8ee", "#30364f"])
    expect(html).toContain('media="(prefers-color-scheme: light)"')
    expect(html).toContain('media="(prefers-color-scheme: dark)"')
  })

  it("claims only what is confirmed in its structured data", () => {
    const block = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    )?.[1]
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
