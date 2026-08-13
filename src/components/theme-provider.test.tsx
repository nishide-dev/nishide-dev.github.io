import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { colorScheme } from "@/test/setup"

/**
 * index.html's two `theme-color` metas and the `--background` they mirror. The
 * real stylesheet never loads in jsdom, so without this the provider's
 * `background === ""` guard short-circuits and the assertions below pass on an
 * untouched document.
 */
function installThemeColorMetas() {
  const style = document.createElement("style")
  style.textContent = ":root{--background:#f8f8ee}.dark{--background:#30364f}"
  document.head.appendChild(style)

  for (const media of [
    "(prefers-color-scheme: light)",
    "(prefers-color-scheme: dark)",
  ]) {
    const meta = document.createElement("meta")
    meta.name = "theme-color"
    meta.content = media.includes("dark") ? "#30364f" : "#f8f8ee"
    meta.setAttribute("media", media)
    document.head.appendChild(meta)
  }
}

const themeColors = () =>
  [...document.head.querySelectorAll('meta[name="theme-color"]')].map((meta) =>
    meta.getAttribute("content")
  )

afterEach(() => {
  for (const node of document.head.querySelectorAll(
    'style, meta[name="theme-color"]'
  )) {
    node.remove()
  }
})

describe("ThemeProvider", () => {
  it("renders children and resolves the system theme onto <html>", () => {
    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>
    )

    expect(screen.getByText("child")).toBeInTheDocument()
    // The matchMedia stub in src/test/setup.ts reports matches: false. Only
    // `dark` is ever toggled — the pre-paint script in index.html cannot
    // produce a `light` class, so React must not either.
    expect(document.documentElement).not.toHaveClass("dark")
    expect(document.documentElement).not.toHaveClass("light")
  })

  it("points theme-color at the chosen theme, not the OS", () => {
    // The case the media-query pair in index.html cannot express: an OS set to
    // light with `dark` stored. Statically the UA would pick the light meta and
    // paint cream chrome around a navy page.
    installThemeColorMetas()
    colorScheme.setPrefersDark(false)
    localStorage.setItem("theme", "dark")

    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>
    )

    expect(document.documentElement).toHaveClass("dark")
    expect(themeColors()).toEqual(["#30364f", "#30364f"])
    // The media attributes go too, so a UA cannot skip a meta that is now right.
    for (const meta of document.head.querySelectorAll(
      'meta[name="theme-color"]'
    )) {
      expect(meta.hasAttribute("media")).toBe(false)
    }
  })

  it("follows the OS for theme-color while the choice is system", () => {
    installThemeColorMetas()
    colorScheme.setPrefersDark(true)

    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>
    )

    expect(themeColors()).toEqual(["#30364f", "#30364f"])
  })
})
