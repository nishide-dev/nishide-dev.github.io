import { Monitor, Moon, Sun } from "lucide-react"

import { type Theme, useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
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

/**
 * The icon shows the *choice*, not what is currently painted. Showing the
 * resolved theme would make "system, resolving to light" and "light" render
 * identically, which is the one distinction this control exists to expose.
 */
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
    <Button
      // The name states the current value and what pressing it does — with a
      // cycling control, either one alone leaves the user guessing.
      aria-label={`テーマ: ${LABELS[theme]}。切り替えると${LABELS[next]}になります`}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(next)}
      size="icon"
      title={`テーマ: ${LABELS[theme]}`}
      variant="ghost"
    >
      <Icon aria-hidden="true" strokeWidth={1.75} />
    </Button>
  )
}
