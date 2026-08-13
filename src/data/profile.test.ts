import { describe, expect, it } from "vitest"

import { profile } from "@/data/profile"
import { linkBehaviour } from "@/lib/links"

describe("profile", () => {
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

  it("is deeply readonly, links included", () => {
    // `satisfies` alone stops `as const` from reaching the array, leaving it
    // the one mutable property in an otherwise frozen module.
    // @ts-expect-error the array must be readonly
    profile.links.push({ label: "x", href: "https://example.com" })
    // @ts-expect-error the entries must be readonly
    profile.links[0].href = ""
  })
})
