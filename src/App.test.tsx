import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { profile } from "@/data/profile"
import { App } from "./App"

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}

describe("App", () => {
  it("shows the identity", () => {
    renderApp()
    expect(screen.getByText(profile.name)).toBeInTheDocument()
  })

  it("shows the intro copy from the profile data", () => {
    renderApp()
    for (const paragraph of profile.intro) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
  })

  it("renders each external link with its href", () => {
    renderApp()
    const links = within(
      screen.getByRole("navigation", { name: "外部リンク" })
    ).getAllByRole("link")

    expect(links).toHaveLength(profile.links.length)
    for (const [index, link] of links.entries()) {
      expect(link).toHaveAttribute("href", profile.links[index].href)
    }
  })

  it("opens http links in a new tab, safely", () => {
    renderApp()
    const link = screen.getByRole("link", { name: /^GitHub/ })

    expect(link).toHaveAttribute("target", "_blank")
    // Without noreferrer the opened page gets a handle on this one.
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
  })

  it("hands a mailto to the mail client instead of a tab", () => {
    renderApp()
    const link = screen.getByRole("link", { name: /^Email/ })

    // target=_blank on a mailto leaves a blank tab behind in some browsers.
    expect(link).not.toHaveAttribute("target")
    expect(link).toHaveAccessibleName("Email （メールを送信）")
  })

  it("marks external links with ↗ decoratively", () => {
    renderApp()
    const link = screen.getByRole("link", { name: /^GitHub/ })

    // The arrow carries no information a screen reader needs; the wording does.
    expect(link.textContent).toContain("↗")
    expect(link).toHaveAccessibleName("GitHub （新しいタブで開く）")
  })

  it("gives the decorative avatar an empty alt", () => {
    const { container } = renderApp()
    const avatar = container.querySelector("img")
    expect(avatar).toHaveAttribute("alt", "")
  })

  it("does not present the header as navigation", () => {
    renderApp()
    // Identity, not a nav bar: the only navigation landmark is the link list.
    expect(screen.getAllByRole("navigation")).toHaveLength(1)
  })

  it("has a single main landmark and one footer", () => {
    renderApp()
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1)
  })
})
