import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Timeline } from "@/components/timeline/timeline"
import type { TimelineEvent } from "@/lib/timeline"

const lab: TimelineEvent = {
  id: "kde-lab",
  date: { start: "2024-04", end: "ongoing" },
  type: "affiliation",
  title: "知識データ工学研究室",
  description: "2024年4月より所属。",
}

const paper: TimelineEvent = {
  id: "eacl-2026",
  date: { start: "2026-03" },
  type: "publication",
  title: "EACL 2026 で論文を発表",
  description: "論文タイトル。",
  links: [{ label: "ACL Anthology", href: "https://aclanthology.org/" }],
}

const award: TimelineEvent = {
  id: "young-researcher",
  date: { start: "2026-03" },
  type: "award",
  title: "若手奨励賞を受賞",
  details: ["対象発表"],
}

const older: TimelineEvent = {
  id: "hackathon",
  date: { start: "2025-09" },
  type: "hackathon",
  title: "ハッカソンで最優秀賞",
}

/** The entry list, not the nested detail/link lists inside an entry. */
function entryList(): HTMLElement {
  const list = document.querySelector("ol")
  if (!list) throw new Error("no timeline list rendered")
  return list
}

function items() {
  return (
    within(entryList())
      .getAllByRole("listitem", { hidden: false })
      // Nested detail/link items are also listitems; keep only direct children.
      .filter((item) => item.parentElement === entryList())
  )
}

describe("Timeline", () => {
  it("orders events newest first", () => {
    render(<Timeline events={[older, lab, paper]} />)

    expect(
      items().map((item) => within(item).getByRole("heading").textContent)
    ).toEqual([paper.title, older.title, lab.title])
  })

  it("does not depend on the order it is handed", () => {
    render(<Timeline events={[paper, older, lab]} />)

    expect(
      items().map((item) => within(item).getByRole("heading").textContent)
    ).toEqual([paper.title, older.title, lab.title])
  })

  it("shows the title, description, details and links of an event", () => {
    render(<Timeline events={[paper, award]} />)

    expect(screen.getByRole("heading", { name: paper.title })).toBeVisible()
    expect(screen.getByText("論文タイトル。")).toBeVisible()
    expect(screen.getByText("対象発表")).toBeVisible()

    const link = screen.getByRole("link", { name: /^ACL Anthology/ })
    expect(link).toHaveAttribute("href", "https://aclanthology.org/")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
    // The site's one external-link treatment: arrow for sight, words for
    // screen readers.
    expect(link.textContent).toContain("↗")
    expect(link).toHaveAccessibleName("ACL Anthology（新しいタブで開く）")
  })

  it("renders an ongoing affiliation as an open period", () => {
    render(<Timeline events={[lab]} />)

    expect(screen.getByText("2024.04 — 現在")).toBeVisible()
  })

  it("gives every event a machine-readable date", () => {
    const { container } = render(<Timeline events={[paper, award, lab]} />)
    const times = [...container.querySelectorAll("time")]

    // One per event, none skipped because a neighbour shares the label.
    expect(times).toHaveLength(3)
    expect(times.map((time) => time.getAttribute("dateTime"))).toEqual([
      "2026-03",
      "2026-03",
      "2024-04",
    ])
  })

  it("prints a repeated date once but keeps it for screen readers", () => {
    render(<Timeline events={[paper, award]} />)

    // Two entries in 2026.03: one label on screen, two dates announced.
    // Asserted structurally — jsdom loads no stylesheet, so `toBeVisible` can
    // see neither `sr-only` nor `hidden md:block`.
    const [first, second] = items()
    expect(within(first).getByText("2026.03")).not.toHaveClass("sr-only")
    expect(within(second).getByText("2026.03")).toHaveClass("sr-only")

    // The repeated one moves into the content cell, so the date column stays
    // empty rather than printing the label again.
    expect(
      within(second).getByText("2026.03").closest("h3, p, div")
    ).toContainElement(within(second).getByRole("heading"))
  })

  it("does not merge labels that only share a month", () => {
    // The affiliation and the point event are both filed under 2024-04 but read
    // differently, so grouping on the period would print one label for both.
    const sameMonth: TimelineEvent = {
      id: "joined",
      date: { start: "2024-04" },
      type: "career",
      title: "入学",
    }
    render(<Timeline events={[lab, sameMonth]} />)

    expect(screen.getByText("2024.04 — 現在")).toBeVisible()
    expect(screen.getByText("2024.04")).toBeVisible()
  })

  it("keeps same-month events separate in the DOM", () => {
    render(<Timeline events={[paper, award]} />)
    const [first, second] = items()

    expect(first).not.toContainElement(second)
    expect(within(first).getByRole("heading").textContent).toBe(paper.title)
    expect(within(second).getByRole("heading").textContent).toBe(award.title)
  })

  it("exposes the entries as an ordered list", () => {
    render(<Timeline events={[paper, award, lab]} />)

    // `role="list"` is deliberate: Preflight's `list-style: none` makes WebKit
    // drop list semantics from the accessibility tree.
    const list = entryList()
    expect(list.tagName).toBe("OL")
    expect(list).toHaveAttribute("role", "list")
    expect(items()).toHaveLength(3)
  })

  it("hides the line and dot from assistive technology", () => {
    const { container } = render(<Timeline events={[paper, award]} />)

    // The order and the dates carry this information; announcing "graphic"
    // twice per entry does not.
    expect(
      container.querySelectorAll('[aria-hidden="true"]').length
    ).toBeGreaterThan(0)
    for (const item of items()) {
      expect(within(item).queryByRole("img")).toBeNull()
    }
  })

  it("renders nothing when there are no events", () => {
    const { container } = render(<Timeline events={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("does not render media in v1", () => {
    const withMedia: TimelineEvent = {
      ...paper,
      media: [{ src: "/works/x.png", alt: "screenshot" }],
    }
    const { container } = render(<Timeline events={[withMedia]} />)

    expect(container.querySelector("img")).toBeNull()
  })

  it("does not label events with their type", () => {
    render(<Timeline events={[paper, award, lab]} />)

    // Categories are a data concern; badges would compete with the titles.
    for (const type of ["publication", "award", "affiliation", "PUBLICATION"]) {
      expect(screen.queryByText(type)).toBeNull()
    }
  })
})
