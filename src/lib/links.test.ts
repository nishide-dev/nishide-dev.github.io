import { describe, expect, it } from "vitest"

import { type Href, linkBehaviour } from "@/lib/links"

/** The type is a coarse filter, so a shape it rejects needs a cast to reach the
 * runtime behaviour under test. */
const href = (value: string) => value as Href

describe("linkBehaviour", () => {
  it.each([
    ["https://github.com/nishide-dev", true, "新しいタブで開く"],
    ["http://example.com", true, "新しいタブで開く"],
    ["mailto:nishide.dev@gmail.com", false, "メールを送信"],
    ["tel:+81000000000", false, "電話をかける"],
  ])("classifies %s", (value, opensTab, hint) => {
    expect(linkBehaviour(href(value))).toEqual({ opensTab, hint })
  })

  it.each(["/cv.pdf", "#contact"])(
    "treats %s as ordinary navigation",
    (value) => {
      // A `startsWith("http")` test has only two outcomes, so anything that is
      // not http silently becomes the other one — a CV link would announce
      // itself as sending an email.
      expect(linkBehaviour(href(value))).toEqual({
        opensTab: false,
        hint: null,
      })
    }
  )

  it("matches the scheme case-insensitively", () => {
    // RFC 3986 §3.1: schemes are case-insensitive, and the browser navigates
    // regardless. A case-sensitive test sends someone off-site in the same tab
    // with no rel="noreferrer", no arrow and nothing announced.
    expect(linkBehaviour(href("HTTPS://example.com")).opensTab).toBe(true)
    expect(linkBehaviour(href("MailTo:x@example.com")).hint).toBe(
      "メールを送信"
    )
    expect(linkBehaviour(href("TEL:+81000000000")).hint).toBe("電話をかける")
  })

  it("anchors the scheme at the start", () => {
    // Unanchored, `/docs?ref=http://x` becomes an external link: a same-origin
    // path would get target="_blank" and an arrow.
    expect(linkBehaviour(href("/docs?ref=http://x"))).toEqual({
      opensTab: false,
      hint: null,
    })
  })

  it.each(["/mailto-policy", "#mailto"])(
    "does not mistake %s for a mail link",
    (value) => {
      // A substring test would announce "sends an email" on a page link.
      expect(linkBehaviour(href(value))).toEqual({
        opensTab: false,
        hint: null,
      })
    }
  )

  it("does not mistake a host containing 'mailto' for a mail link", () => {
    expect(linkBehaviour(href("https://mailto.example.com")).opensTab).toBe(
      true
    )
  })

  it("treats a protocol-relative url as leaving the origin", () => {
    // It matches `/${string}` in the type but is cross-origin in practice.
    expect(linkBehaviour(href("//cdn.example.com/x"))).toEqual({
      opensTab: true,
      hint: "新しいタブで開く",
    })
  })
})
