import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import type { TimelineEvent } from "@/lib/timeline"

/**
 * The cases the real data cannot show: no entries at all, and an entry the
 * formatter rejects. `App.test.tsx` renders the real array unmocked and asserts
 * every entry appears; this file mocks the data module so the other two states
 * can be driven — which is why it lives apart, since the mock has to be hoisted
 * above the App import.
 */
const events: TimelineEvent[] = []

vi.mock("@/data/timeline", () => ({
  get timeline() {
    return events
  },
}))

const { App } = await import("./App")

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}

beforeEach(() => {
  events.length = 0
})

describe("App timeline section", () => {
  it("is absent when there is no data", () => {
    renderApp()

    expect(screen.queryByRole("heading", { name: "Timeline" })).toBeNull()
    expect(document.querySelector("ol")).toBeNull()
  })

  it("renders the entries under a labelled section", () => {
    events.push({
      id: "eacl-2026",
      date: { start: "2026-03" },
      type: "publication",
      title: "EACL 2026 で論文を発表",
    })
    renderApp()

    const section = screen.getByRole("region", { name: "Timeline" })
    expect(
      within(section).getByRole("heading", {
        level: 3,
        name: "EACL 2026 で論文を発表",
      })
    ).toBeInTheDocument()
    expect(within(section).getByText("2026.03")).toBeInTheDocument()
  })

  it("keeps the heading outline intact once entries exist", () => {
    events.push({
      id: "eacl-2026",
      date: { start: "2026-03" },
      type: "publication",
      title: "EACL 2026 で論文を発表",
    })
    renderApp()

    const levels = screen
      .getAllByRole("heading")
      .map((h) => Number(h.tagName.slice(1)))

    // h1 name, h2 section, h3 entries — no level skipped.
    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(new Set(levels)).toEqual(new Set([1, 2, 3]))
  })

  it("loses only the timeline when an entry cannot be formatted", () => {
    events.push({
      id: "broken",
      // Typechecks — `${number}-${number}` admits a one-digit month — and
      // throws in `formatTimelineDate`. Without a boundary React unmounts the
      // whole tree and the page goes blank.
      date: { start: "2026-3" },
      type: "other",
      title: "壊れた日付",
    })

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    renderApp()
    consoleError.mockRestore()

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(
      screen.getByRole("navigation", { name: "外部リンク" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Timeline を表示できませんでした/)
    ).toBeInTheDocument()
  })
})
