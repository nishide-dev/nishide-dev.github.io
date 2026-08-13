import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { profile } from "@/data/profile"
import { timeline } from "@/data/timeline"
import { App } from "./App"

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}

/** The intro's link row. The Activity section carries a GitHub link too, so an
 * unscoped `getByRole("link", { name: /^GitHub/ })` matches two. */
function profileLink(name: RegExp) {
  return within(
    screen.getByRole("navigation", { name: "外部リンク" })
  ).getByRole("link", { name })
}

describe("App", () => {
  it("names the page with a level-1 heading", () => {
    renderApp()
    // Not `getByText`: the name is what the document is about, and without an
    // h1 the outline starts at h2.
    expect(
      screen.getByRole("heading", { level: 1, name: profile.name })
    ).toBeInTheDocument()
  })

  it("gives the h1 the one type step nothing else uses", () => {
    renderApp()
    // jsdom loads no stylesheet, so the computed size is out of reach — the
    // class is what can be asserted, and it is enough. The h1 was `text-title`,
    // i.e. byte-identical to all eight timeline headings, and switching it back
    // otherwise passes lint, typecheck and the whole suite.
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading.className).toContain("text-name")
    expect(heading.className).not.toContain("text-title")
  })

  it("starts its heading outline at level 1", () => {
    renderApp()
    const levels = screen
      .getAllByRole("heading")
      .map((h) => Number(h.tagName.slice(1)))

    expect(Math.min(...levels)).toBe(1)
    expect(levels.filter((level) => level === 1)).toHaveLength(1)
  })

  it("shows the intro copy from the profile data", () => {
    renderApp()
    // Read back from the module the component imports, so this only checks the
    // wiring — `profile.test.ts` is where the copy itself is constrained.
    expect(profile.intro.length).toBeGreaterThan(0)
    for (const paragraph of profile.intro) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
  })

  it("renders every real timeline entry", () => {
    // This file does NOT mock `@/data/timeline` (nor do App.timeline.test.tsx
    // and App.smoke.test.tsx, which assert this too). Without an assertion of
    // this shape somewhere, one malformed date is swallowed by the section's
    // ErrorBoundary and the whole timeline is replaced by a failure message
    // with the suite still green.
    renderApp()

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(
      timeline.length
    )
    expect(screen.queryByText(/Timeline を表示できませんでした/)).toBeNull()
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

  it("points the links at the intended destinations", () => {
    // Spelled out rather than read back from the same module the component
    // imports, which would pass for any URL the data happens to hold.
    expect(screen.queryByRole("link")).toBeNull()
    renderApp()
    expect(profileLink(/^GitHub/)).toHaveAttribute(
      "href",
      "https://github.com/nishide-dev"
    )
    expect(profileLink(/^Email/)).toHaveAttribute(
      "href",
      "mailto:nishide.dev@gmail.com"
    )
  })

  it("opens http links in a new tab, safely, and marks them with ↗", () => {
    renderApp()
    const link = profileLink(/^GitHub/)

    expect(link).toHaveAttribute("target", "_blank")
    // Without noreferrer the opened page gets a handle on this one.
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
    // The arrow carries no information a screen reader needs; the wording does.
    expect(link.textContent).toContain("↗")
    // The arrow is aria-hidden, so it is absent from the name a screen reader
    // announces even though it is present in the text.
    expect(link).toHaveAccessibleName("GitHub（新しいタブで開く）")
  })

  it("hands a mailto to the mail client, without the new-tab arrow", () => {
    renderApp()
    const link = profileLink(/^Email/)

    // target=_blank on a mailto leaves a blank tab behind in some browsers.
    expect(link).not.toHaveAttribute("target")
    // ↗ means "opens a new tab" everywhere else on the site. Showing it here
    // would tell a sighted user something the screen-reader text contradicts.
    expect(link.textContent).not.toContain("↗")
    expect(link).toHaveAccessibleName("Email（メールを送信）")
  })

  it("keeps the link list a list for VoiceOver", () => {
    renderApp()
    // Preflight strips list-style, which drops list semantics in Safari.
    const list = within(
      screen.getByRole("navigation", { name: "外部リンク" })
    ).getByRole("list")

    expect(within(list).getAllByRole("listitem")).toHaveLength(
      profile.links.length
    )
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
