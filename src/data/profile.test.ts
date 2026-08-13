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

  it("says what the intro is meant to say, and nothing dated", () => {
    const copy = profile.intro.join("")

    // Affirmed, not just prohibited. Without this the intro can lose the
    // university — or name a different one — and every test stays green, which
    // is the whole point of the change that introduced it.
    expect(copy, "the intro names the university").toContain("豊田工業大学")
    // The second paragraph already says software development is the work, so
    // the role in the first would be the same claim twice (see profile.ts).
    expect(copy).not.toContain("ソフトウェアエンジニア")

    // The timeline carries these with their dates; a second place to keep
    // current is exactly what the intro is not.
    for (const name of ["知識データ工学研究室", "microbase"]) {
      expect(copy, name).not.toContain(name)
    }

    // `M2` is exempted by removing it and then refusing *every* remaining
    // digit — not by a regex that lists the year shapes it can imagine. The
    // list version passed `'26`, `R8`, and a silent `M2`→`M3`; this one does
    // not, and it makes the grade a literal the test names, so editing it
    // trips here rather than shipping.
    //
    // Still ASCII-only, as `/\d/` always was: `２０２６年` and `二〇二六年`
    // pass. Neither is a shape this copy would take, and neither was caught
    // before.
    expect(
      copy.replace("M2", ""),
      "M2 is the only number the intro may carry"
    ).not.toMatch(/\d/)
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
