import { linkBehaviour } from "@/lib/links"
import { cn } from "@/lib/utils"

/**
 * The site's one link treatment, so the arrow and the screen-reader wording
 * cannot drift apart between the profile row and a timeline entry.
 *
 * `↗` (U+2197) means "this opens a new tab" and nothing else. A `mailto:` hands
 * off to a mail client, so it does not get one — showing the arrow there tells
 * a sighted user to expect a tab while the screen-reader text says otherwise.
 *
 * Geist Mono does not carry U+2197; the stack falls through to Noto Sans JP for
 * it, which is why Noto is in the mono stack too.
 */
export function ExternalLink({
  className,
  href,
  label,
}: {
  className?: string
  href: string
  label: string
}) {
  const { opensTab, hint } = linkBehaviour(href)

  return (
    <a
      // `-my-1 py-1` keeps the hit target ~32px tall without opening a gap in
      // whatever row it sits in.
      className={cn(
        "-my-1 inline-block py-1 font-mono text-micro text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      href={href}
      rel={opensTab ? "noreferrer" : undefined}
      target={opensTab ? "_blank" : undefined}
    >
      {label}
      {opensTab ? <span aria-hidden="true"> ↗</span> : null}
      {hint ? <span className="sr-only">（{hint}）</span> : null}
    </a>
  )
}
