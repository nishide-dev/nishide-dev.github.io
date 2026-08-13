import { describe, expect, it } from "vitest"

import { linkBehaviour } from "@/lib/links"

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

  it("does not mistake a host containing 'mailto' for a mail link", () => {
    expect(linkBehaviour("https://mailto.example.com").opensTab).toBe(true)
  })
})
