import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { colorScheme } from "@/test/setup"

const isDark = () => document.documentElement.classList.contains("dark")

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  )
}

describe("ThemeToggle", () => {
  it("starts on the system preference", () => {
    colorScheme.setPrefersDark(true)
    renderToggle()

    expect(screen.getByRole("button")).toHaveAccessibleName(
      /テーマ: システム設定/
    )
    expect(isDark()).toBe(true)
  })

  it("cycles system → light → dark → system", async () => {
    const user = userEvent.setup()
    renderToggle()

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

  it("shows the choice rather than what is painted", async () => {
    const user = userEvent.setup()
    colorScheme.setPrefersDark(true)
    renderToggle()

    // Both of these paint dark. If the icon tracked the resolved theme they
    // would be indistinguishable, and the control could not say whether the
    // site is following the OS.
    expect(screen.getByRole("button")).toHaveAccessibleName(
      /テーマ: システム設定/
    )
    expect(isDark()).toBe(true)

    await user.click(screen.getByRole("button")) // → light
    await user.click(screen.getByRole("button")) // → dark
    expect(screen.getByRole("button")).toHaveAccessibleName(/テーマ: ダーク/)
    expect(isDark()).toBe(true)
  })

  it("is operable by keyboard alone", async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.tab()
    expect(screen.getByRole("button")).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(screen.getByRole("button")).toHaveAccessibleName(/テーマ: ライト/)
  })

  it("persists the choice so a reload keeps it", async () => {
    const user = userEvent.setup()
    const { unmount } = renderToggle()

    await user.click(screen.getByRole("button")) // → light
    await user.click(screen.getByRole("button")) // → dark
    expect(localStorage.getItem("theme")).toBe("dark")

    unmount()
    renderToggle()

    expect(screen.getByRole("button")).toHaveAccessibleName(/テーマ: ダーク/)
    expect(isDark()).toBe(true)
  })

  it("repaints when the OS flips while set to system", () => {
    renderToggle()
    expect(isDark()).toBe(false)

    act(() => {
      colorScheme.setPrefersDark(true)
    })
    expect(isDark()).toBe(true)

    act(() => {
      colorScheme.setPrefersDark(false)
    })
    expect(isDark()).toBe(false)
  })

  it("ignores the OS once the user has chosen", async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole("button")) // → light

    act(() => {
      colorScheme.setPrefersDark(true)
    })
    expect(isDark()).toBe(false)
  })

  it("treats an unrecognised stored value as system", () => {
    // The whole nishide-dev.github.io origin shares one localStorage, so a key
    // left by another project page is a real input. The pre-paint script and
    // the provider must reach the same verdict or the page flashes.
    localStorage.setItem("theme", "Dark")
    colorScheme.setPrefersDark(true)
    renderToggle()

    expect(screen.getByRole("button")).toHaveAccessibleName(
      /テーマ: システム設定/
    )
    expect(isDark()).toBe(true)
  })

  it("keeps working when storage throws", () => {
    // Safari with cookies blocked, or a sandboxed iframe: getItem throws rather
    // than returning null.
    const throwing = {
      getItem: () => {
        throw new DOMException("denied", "SecurityError")
      },
      setItem: () => {
        throw new DOMException("denied", "SecurityError")
      },
    }
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      writable: true,
      value: throwing,
    })

    colorScheme.setPrefersDark(true)
    expect(() => renderToggle()).not.toThrow()
    expect(isDark()).toBe(true)
  })

  it("follows a theme change made in another tab", () => {
    renderToggle()
    expect(isDark()).toBe(false)

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "theme", newValue: "dark" })
      )
    })
    expect(screen.getByRole("button")).toHaveAccessibleName(/テーマ: ダーク/)
    expect(isDark()).toBe(true)

    // A key cleared elsewhere, or set to something unrecognised, falls back to
    // system rather than sticking on the old value.
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "theme", newValue: null })
      )
    })
    expect(screen.getByRole("button")).toHaveAccessibleName(
      /テーマ: システム設定/
    )
  })

  it("ignores storage events for other keys", () => {
    renderToggle()

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "unrelated", newValue: "dark" })
      )
    })
    expect(screen.getByRole("button")).toHaveAccessibleName(
      /テーマ: システム設定/
    )
  })
})
