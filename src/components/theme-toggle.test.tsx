import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"

/** Lets a test say what the OS preference is, and flip it mid-test. */
function stubColorScheme(prefersDark: boolean) {
  const listeners = new Set<() => void>()

  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        matches: prefersDark,
        media: query,
        onchange: null,
        addEventListener: (_: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
          listeners.delete(listener),
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList
  )

  return {
    change(nextPrefersDark: boolean) {
      prefersDark = nextPrefersDark
      for (const listener of listeners) listener()
    },
  }
}

const isDark = () => document.documentElement.classList.contains("dark")

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ""
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ThemeToggle", () => {
  it("starts on the system preference", () => {
    stubColorScheme(true)
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    expect(screen.getByRole("button")).toHaveAccessibleName(
      /テーマ: システム設定/
    )
    expect(isDark()).toBe(true)
  })

  it("cycles system → light → dark → system", async () => {
    const user = userEvent.setup()
    stubColorScheme(false)
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByRole("button")

    await user.click(button)
    expect(button).toHaveAccessibleName(/テーマ: ライト/)
    expect(isDark()).toBe(false)

    await user.click(button)
    expect(button).toHaveAccessibleName(/テーマ: ダーク/)
    expect(isDark()).toBe(true)

    // The point of cycling: a two-state toggle pins a theme forever.
    await user.click(button)
    expect(button).toHaveAccessibleName(/テーマ: システム設定/)
    expect(isDark()).toBe(false)
  })

  it("is operable by keyboard alone", async () => {
    const user = userEvent.setup()
    stubColorScheme(false)
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    await user.tab()
    expect(screen.getByRole("button")).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(screen.getByRole("button")).toHaveAccessibleName(/テーマ: ライト/)
  })

  it("persists the choice so a reload keeps it", async () => {
    const user = userEvent.setup()
    stubColorScheme(false)
    const { unmount } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    await user.click(screen.getByRole("button")) // → light
    await user.click(screen.getByRole("button")) // → dark
    expect(localStorage.getItem("theme")).toBe("dark")

    unmount()
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    expect(screen.getByRole("button")).toHaveAccessibleName(/テーマ: ダーク/)
    expect(isDark()).toBe(true)
  })

  it("follows the OS when set to system, icon included", async () => {
    const media = stubColorScheme(false)
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    expect(isDark()).toBe(false)

    // Painting the class without updating React state would leave the label
    // and icon showing the old theme until something else re-rendered.
    await Promise.resolve()
    media.change(true)

    expect(isDark()).toBe(true)
  })

  it("ignores the OS once the user has chosen", async () => {
    const user = userEvent.setup()
    const media = stubColorScheme(false)
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    await user.click(screen.getByRole("button")) // → light
    media.change(true)

    expect(isDark()).toBe(false)
  })

  it("treats an unrecognised stored value as system", () => {
    localStorage.setItem("theme", "Dark")
    stubColorScheme(true)
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // Must match the pre-paint script in index.html, or the page paints one
    // theme and then flips to the other.
    expect(screen.getByRole("button")).toHaveAccessibleName(
      /テーマ: システム設定/
    )
    expect(isDark()).toBe(true)
  })
})
