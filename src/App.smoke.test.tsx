import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { profile } from "@/data/profile"
import { timeline } from "@/data/timeline"
import { App } from "./App"

/**
 * The whole page at once, with the activity request succeeding.
 *
 * `profile` and `timeline` are the real data; the contributions are synthetic,
 * because `src/test/setup.ts` rejects every fetch. That is what this file adds
 * over the other App specs: they only ever see the activity *error* path, and
 * `github-activity.test.tsx` renders the component outside the page. Four
 * assertions here fail nowhere else — the grid and the timeline rendered
 * together, `lang="en"` on both English headings, the keyboard reaching and
 * cycling the toggle, and a failed activity request staying inside its section.
 *
 * The rest overlaps `App.test.tsx` on purpose: this is the file that answers
 * "does the page still work", so it reads top to bottom as the page does.
 */

const contributions = Array.from({ length: 14 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 6, 5 + index)).toISOString().slice(0, 10),
  count: index,
  level: index % 5,
}))

function renderSite({ activityFails = false } = {}) {
  // No ResizeObserver stub: jsdom has none, and the grid's own guard skips
  // constructing one — its single measurement already bails at clientWidth 0.
  // A no-op stub could not have changed anything here.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (activityFails) throw new TypeError("Failed to fetch")
      return {
        ok: true,
        status: 200,
        json: async () => ({ total: { lastYear: 42 }, contributions }),
        text: async () => "",
      }
    }) as unknown as typeof fetch
  )

  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("the page", () => {
  it("shows the identity, the intro, the activity graph and the timeline", async () => {
    renderSite()

    expect(
      screen.getByRole("heading", { level: 1, name: profile.name })
    ).toBeInTheDocument()
    for (const paragraph of profile.intro) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
    expect(await screen.findByRole("img")).toHaveAccessibleName(
      /contribution graph/
    )
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(
      timeline.length
    )
  })

  it("shows representative timeline entries with their dates", async () => {
    renderSite()
    await screen.findByRole("img")

    // One of each shape the model supports: a point event, a closed range and an
    // open one.
    expect(
      screen.getByRole("heading", { level: 3, name: /EACL 2026 で論文を発表/ })
    ).toBeInTheDocument()
    expect(screen.getByText("2025.04 — 2026.03")).toBeInTheDocument()
    expect(screen.getByText("2022.11 — 現在")).toBeInTheDocument()
  })

  it("offers the external links", async () => {
    renderSite()
    await screen.findByRole("img")

    const intro = within(screen.getByRole("navigation", { name: "外部リンク" }))
    expect(intro.getByRole("link", { name: /^GitHub/ })).toHaveAttribute(
      "href",
      `https://github.com/${profile.github}`
    )
    expect(intro.getByRole("link", { name: /^Email/ })).toHaveAttribute(
      "href",
      "mailto:nishide.dev@gmail.com"
    )
    // Every link that leaves the page does so safely. Filtered before the
    // assertion, not guarded inside the loop: an `if (target === "_blank")`
    // body is skipped in exactly the case that matters — `target` regressing —
    // so the test would pass by never running.
    const external = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("target") === "_blank")
    expect(external.length).toBeGreaterThan(0)
    for (const link of external) {
      expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
    }
  })

  it("lets the keyboard reach the theme toggle and cycle it", async () => {
    const user = userEvent.setup()
    renderSite()

    // Named rather than "the only button", and reachable rather than first:
    // asserting focus after a single Tab would fail on an added control or a
    // skip link, neither of which is a regression.
    const toggle = screen.getByRole("button", { name: /テーマ:/ })
    expect(toggle).toHaveAccessibleName(/テーマ: システム設定/)

    for (let stops = 0; stops < 10 && !toggle.matches(":focus"); stops++) {
      await user.tab()
    }
    expect(toggle).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(toggle).toHaveAccessibleName(/テーマ: ライト/)
  })

  it("keeps the timeline when the activity API fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    renderSite({ activityFails: true })

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /読み込めませんでした/
      )
    })

    // The failure is contained to its own section: the page keeps its heading,
    // its links and every timeline entry.
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(
      timeline.length
    )
    expect(screen.queryByText(/Timeline を表示できませんでした/)).toBeNull()
  })

  it("labels its English section headings as English", async () => {
    renderSite()
    await screen.findByRole("img")

    // The document is lang="ja"; a Japanese voice mangles these otherwise.
    for (const name of ["Activity", "Timeline"]) {
      expect(screen.getByRole("heading", { name })).toHaveAttribute(
        "lang",
        "en"
      )
    }
  })

  it("has one main landmark, one footer and no stray navigation", async () => {
    renderSite()
    await screen.findByRole("img")

    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1)
    expect(screen.getAllByRole("navigation")).toHaveLength(1)
  })
})
