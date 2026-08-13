import * as React from "react"

export type Theme = "dark" | "light" | "system"
export type ResolvedTheme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  storageKey?: string
  disableTransitionOnChange?: boolean
}

type ThemeProviderState = {
  /**
   * What the user chose. `"system"` means "follow the OS".
   *
   * The resolved theme is deliberately not exposed: it lives on `<html>` as the
   * `dark` class and is consumed by CSS, so nothing needs to read it in JS. A
   * control shows the *choice* — rendering the resolution would make "system,
   * currently light" and "light" identical, which is the distinction a theme
   * control exists to expose.
   */
  theme: Theme
  setTheme: (theme: Theme) => void
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"
const THEME_VALUES: Theme[] = ["dark", "light", "system"]

/**
 * Hardcoded rather than a prop. The pre-paint script in index.html has to make
 * the same decision before React exists and cannot read props, so a
 * configurable default would let first paint and hydration disagree — the exact
 * flash the script is there to prevent.
 */
const DEFAULT_THEME: Theme = "system"

const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined)

function isTheme(value: string | null): value is Theme {
  if (value === null) {
    return false
  }

  return THEME_VALUES.includes(value as Theme)
}

function prefersDark(): boolean {
  // jsdom has no matchMedia, and neither does a non-browser renderer.
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false
  }

  return window.matchMedia(COLOR_SCHEME_QUERY).matches
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme !== "system") {
    return theme
  }
  return prefersDark() ? "dark" : "light"
}

function readStoredTheme(storageKey: string): Theme {
  try {
    const stored = localStorage.getItem(storageKey)
    // Anything unrecognised means "system", matching the pre-paint script.
    // This origin is shared with every other nishide-dev.github.io project
    // page, so a stale key written by one of them is a real input.
    return isTheme(stored) ? stored : DEFAULT_THEME
  } catch (_error) {
    // Storage can throw outright (Safari with cookies blocked, sandboxed
    // iframes), not just return null.
    return DEFAULT_THEME
  }
}

/**
 * Points every `theme-color` meta at the theme actually in effect.
 *
 * index.html declares two of them keyed on `prefers-color-scheme`, which is the
 * best a static file can do — but the theme here is an explicit stored choice,
 * so on an OS set to light with `dark` picked the page is navy while the UA
 * paints cream in the chrome and the overscroll gutter. Writing the resolved
 * colour into both makes the media queries redundant rather than wrong,
 * whichever one the UA selects.
 *
 * The colours are read from the page's own computed `--background` instead of
 * being restated here — this is a component, and CLAUDE.md's design system
 * forbids a hex value in one.
 */
function syncThemeColor() {
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  )
  if (metas.length === 0) {
    return
  }

  const background = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim()
  if (background === "") {
    // The stylesheet has not arrived yet (or this is jsdom). Leaving the static
    // pair in place beats blanking it.
    return
  }

  for (const meta of metas) {
    meta.setAttribute("content", background)
    // Both now carry the same value, so a stale `media` could only make the UA
    // skip a meta that says the right thing.
    meta.removeAttribute("media")
  }
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
    )
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }
}

export function ThemeProvider({
  children,
  storageKey = "theme",
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() =>
    readStoredTheme(storageKey)
  )

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, nextTheme)
      } catch (_error) {
        // ignore: localStorage unavailable, fall back to in-memory state
      }
      setThemeState(nextTheme)
    },
    [storageKey]
  )

  // The pre-paint script already applied the right class, so the first run is a
  // no-op — but the transition suppression it would trigger is not: it appends
  // `*,*::before,*::after{transition:none}` to <head>, forces a synchronous
  // recalc, and removes it two frames later, invalidating the whole document
  // twice while the browser is still parsing the stylesheet.
  const hasApplied = React.useRef(false)

  const applyTheme = React.useCallback(
    (nextTheme: Theme) => {
      const resolved = resolve(nextTheme)
      const suppressTransitions =
        disableTransitionOnChange && hasApplied.current
      const restoreTransitions = suppressTransitions
        ? disableTransitionsTemporarily()
        : null

      // Only ever toggles `dark`, exactly like the pre-paint script. Adding a
      // `light` class here too would give React a state the script cannot
      // produce, so the first `.light`-scoped rule would break only first paint.
      document.documentElement.classList.toggle("dark", resolved === "dark")
      // After the class, so the computed `--background` is the new theme's.
      syncThemeColor()
      hasApplied.current = true

      restoreTransitions?.()
    },
    [disableTransitionOnChange]
  )

  React.useEffect(() => {
    applyTheme(theme)

    if (theme !== "system" || typeof window.matchMedia !== "function") {
      return undefined
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY)
    const handleChange = () => {
      applyTheme("system")
    }

    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme, applyTheme])

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return
      }

      // `storageArea` is checked only when present: a synthetic StorageEvent
      // carries none, and sessionStorage — the thing this guards against —
      // always does.
      if (event.storageArea && event.storageArea !== localStorage) {
        return
      }

      setThemeState(isTheme(event.newValue) ? event.newValue : DEFAULT_THEME)
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [storageKey])

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
