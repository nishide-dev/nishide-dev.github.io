import { profile } from "@/data/profile"

/**
 * Text links with a `↗` marker rather than a row of brand icons. The arrow is
 * U+2197, which Geist Mono does not carry — the font stack falls through to
 * Noto Sans JP for it, which is why Noto is in the mono stack too.
 */
export function ExternalLinks() {
  return (
    <nav aria-label="外部リンク">
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {profile.links.map((link) => (
          <li key={link.href}>
            <a
              // `-my-1 py-1` keeps the hit target ~32px tall without opening a
              // gap in the row.
              className="-my-1 inline-block py-1 font-mono text-micro text-muted-foreground transition-colors hover:text-foreground"
              href={link.href}
              rel="noreferrer"
              target="_blank"
            >
              {link.label} <span aria-hidden="true">↗</span>
              <span className="sr-only">（新しいタブで開く）</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
