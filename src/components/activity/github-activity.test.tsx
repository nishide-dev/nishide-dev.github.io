import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GitHubActivity } from "@/components/activity/github-activity"

/** 21 days from a Sunday, one of each level plus a repeat. */
const contributions = Array.from({ length: 21 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 6, 5 + index)).toISOString().slice(0, 10),
  count: index,
  level: index % 5,
}))

function respondWith(body: unknown, ok = true) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 503,
    statusText: ok ? "OK" : "Service Unavailable",
    json: async () => body,
  })) as unknown as typeof fetch
}

/** jsdom has no ResizeObserver, and the grid measures itself with one. */
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function renderActivity(fetchImpl: typeof fetch) {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver)
  vi.stubGlobal("fetch", fetchImpl)
  const result = render(<GitHubActivity login="nishide-dev" />)
  return result
}

describe("GitHubActivity", () => {
  it("renders the grid once the calendar arrives", async () => {
    await renderActivity(
      respondWith({ total: { lastYear: 7941 }, contributions })
    )

    const grid = await screen.findByRole("img")
    // The summary is what anyone who never sees the cells gets.
    expect(grid).toHaveAccessibleName(/2026\.07\.05 から 2026\.07\.25 まで/)
    expect(grid).toHaveAccessibleName(/7,941 件/)
  })

  it("draws every level with its own band", async () => {
    const { container } = await renderActivity(
      respondWith({ total: { lastYear: 10 }, contributions })
    )
    await screen.findByRole("img")

    // Level 0 must be a real band too, or "no activity" reads as "no cell".
    for (const level of [0, 1, 2, 3, 4]) {
      expect(
        container.querySelectorAll(`.bg-activity-${level}`).length,
        `level ${level}`
      ).toBeGreaterThan(0)
    }
  })

  it("shows the count and date of a hovered day", async () => {
    const user = userEvent.setup()
    const { container } = await renderActivity(
      respondWith({ total: { lastYear: 10 }, contributions })
    )
    await screen.findByRole("img")

    const cells = container.querySelectorAll<HTMLElement>(
      '[class*="bg-activity-"]'
    )
    await user.hover(cells[3])

    expect(screen.getByText(/contributions · 2026\.07/)).toBeInTheDocument()
  })

  it("says one contribution in the singular", async () => {
    const user = userEvent.setup()
    const { container } = await renderActivity(
      respondWith({
        total: { lastYear: 1 },
        contributions: [{ date: "2026-07-05", count: 1, level: 1 }],
      })
    )
    await screen.findByRole("img")

    await user.hover(
      container.querySelector<HTMLElement>(".bg-activity-1") as HTMLElement
    )
    expect(screen.getByText("1 contribution · 2026.07.05")).toBeInTheDocument()
  })

  it("keeps the section and the GitHub link when the API fails", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    await renderActivity(respondWith({}, false))

    await waitFor(() => {
      expect(screen.getByText(/読み込めませんでした/)).toBeInTheDocument()
    })

    const section = screen.getByRole("region", { name: "Activity" })
    expect(
      within(section).getByRole("link", { name: /^GitHub/ })
    ).toHaveAttribute("href", "https://github.com/nishide-dev")
    // One warning, not a stream of them.
    expect(consoleWarn).toHaveBeenCalledTimes(1)
  })

  it("treats a malformed response as a failure, not as data", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    await renderActivity(respondWith({ contributions: "not an array" }))

    await waitFor(() => {
      expect(screen.getByText(/読み込めませんでした/)).toBeInTheDocument()
    })
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("survives the network rejecting outright", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const failing = vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    }) as unknown as typeof fetch
    await renderActivity(failing)

    await waitFor(() => {
      expect(screen.getByText(/読み込めませんでした/)).toBeInTheDocument()
    })
    expect(
      screen.getByRole("heading", { name: "Activity" })
    ).toBeInTheDocument()
  })

  it("shows the heading and link before the request settles", async () => {
    // Never resolves: this is the loading state.
    const pending = vi.fn(
      () => new Promise(() => {})
    ) as unknown as typeof fetch
    await renderActivity(pending)

    expect(
      screen.getByRole("heading", { name: "Activity" })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^GitHub/ })).toBeInTheDocument()
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("reserves the graph's height in every state", async () => {
    const pending = vi.fn(
      () => new Promise(() => {})
    ) as unknown as typeof fetch
    const { container } = await renderActivity(pending)

    // Without this the timeline below jumps when the request settles.
    const reserved = container.querySelector<HTMLElement>(
      "[style*='min-height']"
    )
    expect(reserved).not.toBeNull()
    expect(
      Number.parseInt(reserved?.style.minHeight ?? "0", 10)
    ).toBeGreaterThan(80)
  })

  it("sends no credentials with the request", async () => {
    const spy = respondWith({ total: { lastYear: 1 }, contributions })
    await renderActivity(spy)
    await screen.findByRole("img")

    const [, init] = (spy as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    // A token in the client bundle is readable by anyone.
    expect(init).not.toHaveProperty("headers")
    expect(JSON.stringify(init ?? {})).not.toMatch(/token|authorization/i)
  })

  it("does not render a repository ranking", async () => {
    await renderActivity(
      respondWith({ total: { lastYear: 10 }, contributions })
    )
    await screen.findByRole("img")

    // v1 is the graph and nothing else.
    expect(screen.queryAllByRole("list")).toHaveLength(0)
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})
