import { describe, expect, it } from "vitest"

import { profile } from "@/data/profile"
import { linkBehaviour } from "@/lib/links"

describe("profile", () => {
  it("names the person and the GitHub account", () => {
    expect(profile.name).toBe("Ryusei Nishide")
    expect(profile.github).toBe("nishide-dev")
  })

  it("points its links at the intended destinations", () => {
    // Spelled out rather than read back: reading the same module the component
    // imports would pass for whatever the file happens to hold.
    expect(profile.links.map((link) => [link.label, link.href])).toEqual([
      ["GitHub", "https://github.com/nishide-dev"],
      ["Email", "mailto:nishide.dev@gmail.com"],
    ])
  })

  it("only carries links the UI knows how to present", () => {
    for (const link of profile.links) {
      const { opensTab, hint } = linkBehaviour(link.href)
      // An unrecognised scheme silently renders with no arrow and no hint,
      // which is right for a same-origin path and wrong for anything else.
      expect(opensTab || hint !== null, `${link.label}: ${link.href}`).toBe(
        true
      )
    }
  })

  it("keeps the intro to two non-empty paragraphs", () => {
    // `App.test.tsx` reads these back off this module, so an emptied array or a
    // dropped paragraph would pass there — its loop would simply run less.
    expect(profile.intro).toHaveLength(2)
    for (const paragraph of profile.intro) {
      expect(paragraph.trim()).not.toBe("")
    }
    expect(new Set(profile.intro).size).toBe(profile.intro.length)
  })

  it("names no calendar year in the intro", () => {
    // The university is named here on purpose, so the blanket "no organisation"
    // rule this replaced no longer holds. A *year* is still refused: it reads as
    // a fact rather than as a status, so nobody thinks to re-check it, and it is
    // wrong from a specific month rather than gradually.
    //
    // `M2` is the one number allowed, and only because it is a status the
    // docblock in profile.ts dates. Everything else the timeline carries.
    const copy = profile.intro.join("")
    for (const name of ["知識データ工学研究室", "microbase"]) {
      expect(copy, name).not.toContain(name)
    }
    expect(
      copy,
      "a year in the intro is a second place to keep current"
    ).not.toMatch(/(?:19|20)\d{2}/)
    expect(copy, "no 年/年度 in the intro").not.toMatch(/\d+\s*年/)
  })

  it("is deeply readonly, links included", () => {
    // `satisfies` alone stops `as const` from reaching the array, leaving it
    // the one mutable property in an otherwise frozen module.
    // @ts-expect-error the array must be readonly
    profile.links.push({ label: "x", href: "https://example.com" })
    // @ts-expect-error the entries must be readonly
    profile.links[0].href = ""
  })
})
