import { describe, expect, it } from "vitest"

import { linkBehaviour, profile } from "@/data/profile"

describe("linkBehaviour", () => {
  it.each([
    ["https://github.com/nishide-dev", true, "新しいタブで開く"],
    ["http://example.com", true, "新しいタブで開く"],
    ["mailto:nishide.dev@gmail.com", false, "メールを送信"],
    ["tel:+81000000000", false, "電話をかける"],
  ])("classifies %s", (href, opensTab, hint) => {
    expect(linkBehaviour(href)).toEqual({ opensTab, hint })
  })

  it.each(["/cv.pdf", "#contact", "//cdn.example.com/x"])(
    "treats %s as ordinary navigation",
    (href) => {
      // A `startsWith("http")` test has only two outcomes, so anything that is
      // not http silently becomes "mailto" — a CV link would announce itself as
      // sending an email.
      expect(linkBehaviour(href)).toEqual({ opensTab: false, hint: null })
    }
  )
})

describe("profile", () => {
  it("only carries links whose scheme the UI knows", () => {
    for (const link of profile.links) {
      expect(
        /^(?:https?:|mailto:|tel:|\/|#)/.test(link.href),
        `${link.label}: ${link.href}`
      ).toBe(true)
    }
  })

  it("is deeply readonly, links included", () => {
    // `satisfies` alone stops `as const` from reaching the array, leaving it the
    // one mutable property in an otherwise frozen module.
    // @ts-expect-error the array must be readonly
    profile.links.push({ label: "x", href: "https://example.com" })
    // @ts-expect-error the entries must be readonly
    profile.links[0].href = ""
  })
})
