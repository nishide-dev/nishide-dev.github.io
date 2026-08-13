import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"

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
})
