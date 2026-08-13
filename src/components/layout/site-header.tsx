import { ThemeToggle } from "@/components/theme-toggle"
import { profile } from "@/data/profile"

/**
 * Identity, not navigation: no nav landmark, no sticky positioning, no menu.
 * The page is one column and one screen deep at the top.
 *
 * The name is the page's `h1`. It is styled small, but it is what the document
 * is about — without it the outline starts at `h2` and there is nothing for a
 * screen-reader user to jump to.
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
        <h1 className="truncate font-medium text-title">{profile.name}</h1>
      </div>

      <ThemeToggle />
    </header>
  )
}
