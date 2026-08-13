import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GitHubActivity } from "@/components/activity/github-activity"

/**
 * 70 days from a Wednesday, spanning three months. Deliberately not a whole
 * number of Sunday-aligned weeks: a single-month fixture starting on a Sunday
 * renders no padding cells and no month boundaries, so three code paths never
 * run.
 */
const START = "2026-05-06"
const contributions = Array.from({ length: 70 }, (_, index) => ({
  date: new Date(Date.parse(`${START}T00:00:00Z`) + index * 86_400_000)
    .toISOString()
    .slice(0, 10),
  count: index,
  level: index % 5,
}))

const OK = { total: { lastYear: 7941 }, contributions }

function respondWith(body: unknown, ok = true) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 503,
    statusText: ok ? "OK" : "Service Unavailable",
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch
}

/** jsdom has no ResizeObserver, and the grid measures itself with one. */
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/**
 * jsdom reports `clientWidth: 0` for everything, so the measure short-circuits
 * and every week renders. Stubbing it is the only way to reach the responsive
 * branch at all.
 */
function stubWidth(px: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return px
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth")
})

function renderActivity(fetchImpl: typeof fetch, login = "nishide-dev") {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver)
  vi.stubGlobal("fetch", fetchImpl)
  return render(<GitHubActivity login={login} />)
}

const cells = (container: HTMLElement) =>
  container.querySelectorAll<HTMLElement>('[class*="bg-activity-"]')

const tooltip = () =>
  document.querySelector<HTMLElement>("p.absolute") as HTMLElement

describe("GitHubActivity", () => {
  it("asks for the calendar of the account it links to", async () => {
    const spy = respondWith(OK)
    renderActivity(spy, "some-one")
    await screen.findByRole("img")

    const [url] = (spy as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    // Checking only the link href lets the fetch target drift: the section
    // would render a stranger's graph under this account's heading.
    expect(url).toBe(
      "https://github-contributions-api.jogruber.de/v4/some-one?y=last"
    )
    expect(screen.getByRole("link", { name: /^GitHub/ })).toHaveAttribute(
      "href",
      "https://github.com/some-one"
    )
  })

  it("escapes the login in the request", async () => {
    const spy = respondWith(OK)
    renderActivity(spy, "a/b?c")
    await screen.findByRole("img")

    const [url] = (spy as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/v4/a%2Fb%3Fc?y=last")
  })

  it("sends no credentials", async () => {
    const spy = respondWith(OK)
    renderActivity(spy)
    await screen.findByRole("img")

    const [, init] = (spy as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    // A token in the client bundle is readable by anyone.
    expect(init).not.toHaveProperty("headers")
    expect(JSON.stringify(init ?? {})).not.toMatch(/token|authorization/i)
  })

  it("summarises the days it actually draws", async () => {
    stubWidth(1000)
    renderActivity(respondWith(OK))

    const grid = await screen.findByRole("img")
    await waitFor(() => {
      // The whole fixture fits, so the API's own total is the honest number.
      expect(grid).toHaveAccessibleName(/2026\.05\.06 から 2026\.07\.14 まで/)
      expect(grid).toHaveAccessibleName(/7,941 件/)
    })
  })

  it("does not claim a range wider than the cells on screen", async () => {
    // Room for ~11 weeks of the fixture's 11 — narrow enough to drop some.
    stubWidth(120)
    renderActivity(respondWith(OK))

    const grid = await screen.findByRole("img")
    await waitFor(() => {
      expect(grid.children.length).toBeLessThan(11)
    })
    // Neither the start date nor the year total may survive the slice.
    expect(grid).not.toHaveAccessibleName(/2026\.05\.06/)
    expect(grid).not.toHaveAccessibleName(/7,941/)
  })

  it("drops the oldest weeks as the width shrinks", async () => {
    stubWidth(1000)
    const wide = renderActivity(respondWith(OK))
    const wideColumns = (await screen.findByRole("img")).children.length
    wide.unmount()

    // 100px fits 7 columns of the fixture's 11.
    stubWidth(100)
    renderActivity(respondWith(OK))
    const narrow = await screen.findByRole("img")

    await waitFor(() => {
      expect(narrow.children.length).toBeLessThan(wideColumns)
    })
    expect(narrow.children.length).toBeGreaterThan(0)
  })

  it("maps each level to its own band", async () => {
    const { container } = renderActivity(
      respondWith({
        total: { lastYear: 10 },
        contributions: [0, 1, 2, 3, 4].map((level) => ({
          date: `2026-07-0${5 + level}`,
          count: level,
          level,
        })),
      })
    )
    await screen.findByRole("img")

    // Presence alone would survive swapping two bands.
    const painted = [...cells(container)].map((cell) => cell.className)
    for (const level of [0, 1, 2, 3, 4]) {
      expect(painted[level], `level ${level}`).toContain(`bg-activity-${level}`)
    }
  })

  it("leaves out-of-range cells unpainted", async () => {
    const { container } = renderActivity(respondWith(OK))
    await screen.findByRole("img")

    // The fixture starts on a Wednesday, so the first column has three padding
    // rows. Painting them as level 0 would read as activity with no date.
    const firstColumn = (await screen.findByRole("img"))
      .children[0] as HTMLElement
    const transparent = firstColumn.querySelectorAll(".bg-transparent")
    expect(transparent).toHaveLength(3)
    expect(cells(container).length).toBeGreaterThan(0)
  })

  it("labels the months the grid crosses", async () => {
    stubWidth(1000)
    renderActivity(respondWith(OK))
    await screen.findByRole("img")

    // The fixture spans May to July, so two boundaries fall inside it.
    await waitFor(() => {
      expect(screen.getByText("Jun")).toBeInTheDocument()
      expect(screen.getByText("Jul")).toBeInTheDocument()
    })
    // The first column's month began before the visible range.
    expect(screen.queryByText("May")).toBeNull()
  })

  it("names the exact day under the pointer", async () => {
    const user = userEvent.setup()
    const { container } = renderActivity(respondWith(OK))
    await screen.findByRole("img")

    // 2026-05-06 is a Wednesday, so it is the fourth cell of the first column.
    await user.hover(cells(container)[0])
    expect(tooltip()).toHaveTextContent("0 contributions · 2026.05.06")

    await user.hover(cells(container)[3])
    expect(tooltip()).toHaveTextContent("3 contributions · 2026.05.09")
  })

  it("says one contribution in the singular", async () => {
    const user = userEvent.setup()
    const { container } = renderActivity(
      respondWith({
        total: { lastYear: 1 },
        contributions: [{ date: "2026-07-05", count: 1, level: 1 }],
      })
    )
    await screen.findByRole("img")

    await user.hover(cells(container)[0])
    expect(tooltip()).toHaveTextContent("1 contribution · 2026.07.05")
  })

  it("hides the tooltip until a cell is hovered, and again after", async () => {
    const user = userEvent.setup()
    const { container } = renderActivity(respondWith(OK))
    await screen.findByRole("img")

    // jsdom loads no stylesheet, so `toBeVisible` cannot see `opacity-0`.
    expect(tooltip().className).toContain("opacity-0")
    await user.hover(cells(container)[0])
    expect(tooltip().className).toContain("opacity-100")
    await user.unhover(cells(container)[0])
    expect(tooltip().className).toContain("opacity-0")
  })

  it("keeps the section and the GitHub link when the API fails", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    renderActivity(respondWith({ error: "nope" }, false))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /読み込めませんでした/
      )
    })

    const section = screen.getByRole("region", { name: "Activity" })
    expect(
      within(section).getByRole("link", { name: /^GitHub/ })
    ).toHaveAttribute("href", "https://github.com/nishide-dev")
    // One warning, not a stream of them, and it names the account.
    expect(consoleWarn).toHaveBeenCalledTimes(1)
    expect(String(consoleWarn.mock.calls[0][0])).toContain("nishide-dev")
  })

  it("refuses a non-ok response even when the body parses", async () => {
    // The status check is the only thing standing between a cached 503 or a
    // proxy error page and the graph rendering it as real data.
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    renderActivity(respondWith(OK, false))

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument()
    })
    expect(screen.queryByRole("img")).toBeNull()
    expect(String(consoleWarn.mock.calls[0][1])).toMatch(/503/)
  })

  it("surfaces the failure body, which names the cause", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    renderActivity(
      respondWith({ error: 'GitHub user "ghost" not found.' }, false)
    )

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument()
    })
    expect(String(consoleWarn.mock.calls[0][1])).toContain("not found")
  })

  it("treats a malformed response as a failure, not as data", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    renderActivity(respondWith({ contributions: "not an array" }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument()
    })
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("survives the network rejecting outright", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const failing = vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    }) as unknown as typeof fetch
    renderActivity(failing)

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument()
    })
    expect(
      screen.getByRole("heading", { name: "Activity" })
    ).toBeInTheDocument()
  })

  it("gives up on a request that never answers", async () => {
    vi.useFakeTimers()
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    // A connection that opens and never replies is otherwise a permanent,
    // completely silent hole.
    const hanging = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          )
        })
    ) as unknown as typeof fetch
    renderActivity(hanging)

    expect(screen.queryByRole("status")).toBeNull()
    await vi.advanceTimersByTimeAsync(10_000)
    vi.useRealTimers()

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument()
    })
  })

  it("shows the heading and link before the request settles", () => {
    const pending = vi.fn(
      () => new Promise(() => {})
    ) as unknown as typeof fetch
    renderActivity(pending)

    expect(
      screen.getByRole("heading", { name: "Activity" })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^GitHub/ })).toBeInTheDocument()
    expect(screen.queryByRole("img")).toBeNull()
    // Loading is not failure; saying so before the request settles would be a
    // lie the user cannot act on.
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("reserves the graph's height in every state", () => {
    const pending = vi.fn(
      () => new Promise(() => {})
    ) as unknown as typeof fetch
    const { container } = renderActivity(pending)

    // Without this the timeline below jumps when the request settles. 132px is
    // the tooltip band, the seven cell rows and the month labels.
    const reserved = container.querySelector<HTMLElement>(
      "[style*='min-height']"
    )
    expect(reserved?.style.minHeight).toBe("132px")
  })

  it("ignores a response that arrives after the account changed", async () => {
    // Aborting does not un-settle a promise whose response already arrived.
    let resolveFirst: ((value: unknown) => void) | undefined
    const slow = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        })
    ) as unknown as typeof fetch

    const { rerender } = renderActivity(slow, "alice")
    vi.stubGlobal("fetch", respondWith(OK))
    rerender(<GitHubActivity login="bob" />)
    await screen.findByRole("img")
    const afterBob = screen.getByRole("img").getAttribute("aria-label")

    // A payload that would be unmistakable if it landed.
    resolveFirst?.({
      ok: true,
      json: async () => ({ total: { lastYear: 1 }, contributions: [] }),
      text: async () => "",
    })
    // `fetchContributions` awaits the response and then its body, so a single
    // microtask is not enough for the stale result to arrive.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByRole("img")).toHaveAttribute("aria-label", afterBob)
    expect(screen.getByRole("img")).not.toHaveAccessibleName(
      /contribution はありません/
    )
  })

  it("does not render a repository ranking", async () => {
    renderActivity(respondWith(OK))
    await screen.findByRole("img")

    // v1 is the graph and nothing else.
    expect(screen.queryAllByRole("list")).toHaveLength(0)
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})
