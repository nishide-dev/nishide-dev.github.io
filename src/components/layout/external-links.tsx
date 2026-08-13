import { ExternalLink } from "@/components/external-link"
import { PlainList } from "@/components/plain-list"
import { profile } from "@/data/profile"

/** Text links rather than a row of brand icons. */
export function ExternalLinks() {
  return (
    <nav aria-label="外部リンク">
      <PlainList className="flex flex-wrap gap-x-5 gap-y-1">
        {profile.links.map((link) => (
          <li key={link.href}>
            <ExternalLink href={link.href} label={link.label} />
          </li>
        ))}
      </PlainList>
    </nav>
  )
}
