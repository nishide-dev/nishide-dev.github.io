import { linkBehaviour, profile } from "@/data/profile"

/**
 * Text links rather than a row of brand icons.
 *
 * `↗` (U+2197) marks "this opens a new tab" and nothing else. A `mailto:` hands
 * off to a mail client, so it does not get one — showing the arrow there tells
 * a sighted user to expect a tab while the screen-reader text correctly says
 * otherwise, and the two channels must not disagree.
 *
 * Geist Mono does not carry U+2197; the stack falls through to Noto Sans JP for
 * it, which is why Noto is in the mono stack too.
 */
export function ExternalLinks() {
  return (
    <nav aria-label="外部リンク">
      {/* biome-ignore lint/a11y/noRedundantRoles: redundant per spec, but
          Preflight sets `list-style: none` and WebKit then drops list semantics
          from the accessibility tree — VoiceOver announces the entries as loose
          text with no "list, 2 items" boundary. The role restores them. */}
      <ul className="flex flex-wrap gap-x-5 gap-y-1" role="list">
        {profile.links.map((link) => {
          const { opensTab, hint } = linkBehaviour(link.href)

          return (
            <li key={link.href}>
              <a
                // `-my-1 py-1` keeps the hit target ~32px tall without opening
                // a gap in the row.
                className="-my-1 inline-block py-1 font-mono text-micro text-muted-foreground transition-colors hover:text-foreground"
                href={link.href}
                rel={opensTab ? "noreferrer" : undefined}
                target={opensTab ? "_blank" : undefined}
              >
                {link.label}
                {opensTab ? <span aria-hidden="true"> ↗</span> : null}
                {hint ? <span className="sr-only">（{hint}）</span> : null}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
