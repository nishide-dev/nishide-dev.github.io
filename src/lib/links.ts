/**
 * Where a link can point.
 *
 * A template literal rather than `string`, for the same reason
 * `TimelineDateString` is one: a typo compiles otherwise, and this one does not
 * even throw — `"github.com/nishide-dev"` is a *valid relative path*, so it
 * silently resolves against this origin and 404s. It is a coarse filter, not a
 * validator; `linkBehaviour` still decides how a well-formed href behaves.
 */
export type Href =
  | `https://${string}`
  | `http://${string}`
  | `mailto:${string}`
  | `tel:${string}`
  | `/${string}`
  | `#${string}`

/** A labelled destination. One shape for profile links and timeline links —
 * they were never different, and `ExternalLink` renders both. */
export type Link = {
  label: string
  href: Href
}

export type LinkBehaviour = {
  /** Whether following it leaves this page for a new tab. */
  opensTab: boolean
  /** Announced to screen readers when the destination is not a web page. */
  hint: string | null
}

const OPENS_TAB: LinkBehaviour = { opensTab: true, hint: "新しいタブで開く" }

/**
 * Derived from the scheme rather than a flag on the data, so a link cannot be
 * added with the wrong one.
 *
 * Every scheme is enumerated deliberately. A `startsWith("http")` test has only
 * two outcomes, so anything that is not http silently becomes the other one —
 * a `/cv.pdf` link would announce itself as sending an email.
 *
 * Schemes are matched case-insensitively: RFC 3986 §3.1 makes them so, and the
 * browser honours that. `HTTPS://example.com` navigates off-site whatever this
 * function decides, so a case-sensitive test would send someone off the page
 * with no `rel="noreferrer"`, no arrow and no announcement.
 */
export function linkBehaviour(href: Href): LinkBehaviour {
  const normalised = href.trim().toLowerCase()

  if (/^https?:/.test(normalised)) {
    return OPENS_TAB
  }
  // Protocol-relative: `/${string}` in the type, but it leaves the origin.
  if (normalised.startsWith("//")) {
    return OPENS_TAB
  }
  if (normalised.startsWith("mailto:")) {
    return { opensTab: false, hint: "メールを送信" }
  }
  if (normalised.startsWith("tel:")) {
    return { opensTab: false, hint: "電話をかける" }
  }
  // What the type leaves: a same-origin path or an in-page anchor. Ordinary
  // navigation, with nothing a reader needs warning about.
  return { opensTab: false, hint: null }
}
