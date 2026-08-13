import { Monitor, Moon, Sun } from "lucide-react"

import { type Theme, useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

/**
 * Cycles rather than toggles, so `system` stays reachable. A two-state toggle
 * is a one-way door: the first click pins a theme and the site stops following
 * the OS forever, with no control that undoes it.
 */
const ORDER: Theme[] = ["system", "light", "dark"]

const LABELS: Record<Theme, string> = {
  system: "システム設定",
  light: "ライト",
  dark: "ダーク",
}

const ICONS: Record<Theme, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  const Icon = ICONS[theme]

  return (
    <button
      // The name states the current value and what pressing it does — with a
      // cycling control, either one alone leaves the user guessing.
      aria-label={`テーマ: ${LABELS[theme]}。切り替えると${LABELS[next]}になります`}
      className={cn(
        // 32px keeps the hit target usable on touch while the icon stays small.
        "-m-1.5 inline-flex size-8 items-center justify-center rounded-md p-1.5",
        "text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      onClick={() => setTheme(next)}
      title={`テーマ: ${LABELS[theme]}`}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </button>
  )
}
