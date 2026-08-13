import { ThemeToggle } from "@/components/theme-toggle"
import { profile } from "@/data/profile"

/**
 * Identity, not navigation: no nav landmark, no sticky positioning, no menu.
 * The page is one column and one screen deep at the top.
 *
 * The name is the page's `h1` and carries `text-name`, the one step nobody else
 * uses. It was `text-title` — byte-identical to all eight timeline headings and
 * smaller than the 24px avatar next to it — so the thing the document is about
 * read as a caption. Restrained is not the same as flat.
 */
export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <img
          alt={profile.avatar.alt}
          className="size-6 shrink-0 rounded-full"
          decoding="async"
          height={24}
          src={profile.avatar.src}
          width={24}
        />
        <h1 className="truncate font-medium text-name">{profile.name}</h1>
      </div>

      <ThemeToggle />
    </header>
  )
}
