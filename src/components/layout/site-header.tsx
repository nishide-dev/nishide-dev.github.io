import { ThemeToggle } from "@/components/theme-toggle"
import { profile } from "@/data/profile"

/**
 * Identity, not navigation: no nav landmark, no sticky positioning, no menu.
 * The page is one column and one screen deep at the top.
 */
export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <img
          alt={profile.avatar.alt}
          className="size-6 rounded-full"
          decoding="async"
          height={24}
          src={profile.avatar.src}
          width={24}
        />
        <p className="font-medium text-title">{profile.name}</p>
      </div>

      <ThemeToggle />
    </header>
  )
}
