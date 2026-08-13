import { profile } from "@/data/profile"

/**
 * The year is read at render rather than hardcoded, so the page does not go
 * stale on January 1st. Accepted as a prop so tests do not depend on the clock.
 */
export function SiteFooter({
  year = new Date().getFullYear(),
}: {
  year?: number
}) {
  return (
    <footer className="mt-section font-mono text-meta text-muted-foreground">
      {profile.location} — {year}
    </footer>
  )
}
