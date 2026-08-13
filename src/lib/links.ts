export type LinkBehaviour = {
  /** Whether following it leaves this page for a new tab. */
  opensTab: boolean
  /** Announced to screen readers when the destination is not a web page. */
  hint: string | null
}

/**
 * Derived from the scheme rather than a flag on the data, so a link cannot be
 * added with the wrong one. Deliberately enumerates every scheme it knows: a
 * `startsWith("http")` test has only two outcomes, so anything that is not http
 * silently becomes "mailto" — a `/cv.pdf` link would announce itself as sending
 * an email.
 */
export function linkBehaviour(href: string): LinkBehaviour {
  if (/^https?:/.test(href)) {
    return { opensTab: true, hint: "新しいタブで開く" }
  }
  if (href.startsWith("mailto:")) {
    return { opensTab: false, hint: "メールを送信" }
  }
  if (href.startsWith("tel:")) {
    return { opensTab: false, hint: "電話をかける" }
  }
  // Same-origin path or in-page anchor: ordinary navigation, nothing to warn
  // about.
  return { opensTab: false, hint: null }
}
