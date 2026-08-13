import { describe, expect, it } from "vitest"

import { timeline } from "@/data/timeline"
import {
  assertValidTimeline,
  datePrecision,
  formatTimelineDate,
  groupTimelineEvents,
  parseDateString,
  resolveRelated,
  sortTimelineEvents,
  type TimelineEvent,
} from "@/lib/timeline"

function event(
  id: string,
  date: TimelineEvent["date"],
  type: TimelineEvent["type"] = "other"
): TimelineEvent {
  return { id, date, type, title: id }
}

describe("parseDateString", () => {
  it.each([
    ["2026", { year: 2026 }],
    ["2026-03", { year: 2026, month: 3 }],
    ["2026-03-14", { year: 2026, month: 3, day: 14 }],
    ["2024-02-29", { year: 2024, month: 2, day: 29 }],
  ])("parses %s", (input, expected) => {
    expect(parseDateString(input)).toEqual(expected)
  })

  it.each([
    "26",
    "2026-3",
    "2026/03",
    "2026-13",
    "2026-00",
    "2026-02-30",
    "2025-02-29",
    "",
  ])("rejects %s", (input) => {
    expect(() => parseDateString(input)).toThrow()
  })
})

describe("datePrecision", () => {
  it("follows the shape of the stored value", () => {
    expect(datePrecision({ start: "2026-03-14" })).toBe("day")
    expect(datePrecision({ start: "2026-03" })).toBe("month")
    expect(datePrecision({ start: "2026" })).toBe("year")
  })

  it("lets an explicit precision widen the display", () => {
    expect(datePrecision({ start: "2026-03-14", precision: "month" })).toBe(
      "month"
    )
    expect(datePrecision({ start: "2025", precision: "fiscal-year" })).toBe(
      "fiscal-year"
    )
  })

  it("refuses a precision finer than the value stored", () => {
    // Claiming day precision on a `YYYY-MM` value would invent a day.
    expect(() => datePrecision({ start: "2026-03", precision: "day" })).toThrow(
      /finer than the value stored/
    )
    expect(() => datePrecision({ start: "2026", precision: "month" })).toThrow()
  })
})

describe("formatTimelineDate", () => {
  it.each([
    [{ start: "2026-03-14" }, "2026.03.14"],
    [{ start: "2026-03" }, "2026.03"],
    [{ start: "2026" }, "2026年"],
    [{ start: "2025", precision: "fiscal-year" as const }, "2025年度"],
    [{ start: "2024-04", end: "2025-03" }, "2024.04 — 2025.03"],
    [{ start: "2024-04", end: "ongoing" as const }, "2024.04 — 現在"],
  ])("formats %j", (date, expected) => {
    expect(formatTimelineDate(date)).toBe(expected)
  })

  it("does not turn a point in time into an open period", () => {
    // The whole reason `end` is not overloaded: an award has no end either.
    expect(formatTimelineDate({ start: "2026-03" })).toBe("2026.03")
    expect(formatTimelineDate({ start: "2026-03" })).not.toContain("現在")
  })
})

describe("sortTimelineEvents", () => {
  it("puts the newest event first", () => {
    const sorted = sortTimelineEvents([
      event("old", { start: "2023-05" }),
      event("newest", { start: "2026-03" }),
      event("middle", { start: "2025-11" }),
    ])
    expect(sorted.map((e) => e.id)).toEqual(["newest", "middle", "old"])
  })

  it("places an ongoing affiliation by its start, not at the top", () => {
    const sorted = sortTimelineEvents([
      event("award", { start: "2026-03" }, "award"),
      event("lab", { start: "2024-04", end: "ongoing" }, "affiliation"),
    ])
    expect(sorted.map((e) => e.id)).toEqual(["award", "lab"])
  })

  it("treats a year-precision date as the start of that year", () => {
    const sorted = sortTimelineEvents([
      event("june", { start: "2025-06" }),
      event("whole-year", { start: "2025" }),
    ])
    expect(sorted.map((e) => e.id)).toEqual(["june", "whole-year"])
  })

  it("is stable and total for same-day events", () => {
    const input = [
      event("b", { start: "2026-03" }),
      event("a", { start: "2026-03" }),
    ]
    expect(sortTimelineEvents(input).map((e) => e.id)).toEqual(["a", "b"])
    expect(sortTimelineEvents([...input].reverse()).map((e) => e.id)).toEqual([
      "a",
      "b",
    ])
  })

  it("does not mutate its input", () => {
    const input = [
      event("old", { start: "2023-05" }),
      event("new", { start: "2026-03" }),
    ]
    sortTimelineEvents(input)
    expect(input.map((e) => e.id)).toEqual(["old", "new"])
  })
})

describe("groupTimelineEvents", () => {
  it("collapses same-month events under one label", () => {
    const groups = groupTimelineEvents([
      event("award", { start: "2026-03" }),
      event("paper", { start: "2026-03" }),
      event("earlier", { start: "2026-01" }),
    ])
    expect(groups.map((g) => [g.label, g.events.map((e) => e.id)])).toEqual([
      ["2026.03", ["award", "paper"]],
      ["2026.01", ["earlier"]],
    ])
  })

  it("groups day-precision events by their month", () => {
    const groups = groupTimelineEvents([
      event("a", { start: "2026-03-05" }),
      event("b", { start: "2026-03-20" }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe("2026.03")
  })

  it("keeps a year and a fiscal year apart", () => {
    const groups = groupTimelineEvents([
      event("calendar", { start: "2025" }),
      event("fiscal", { start: "2025", precision: "fiscal-year" }),
    ])
    expect(groups.map((g) => g.key)).toEqual(["2025", "FY2025"])
    expect(groups.map((g) => g.label)).toEqual(["2025年", "2025年度"])
  })

  it("returns nothing for no events", () => {
    expect(groupTimelineEvents([])).toEqual([])
  })
})

describe("resolveRelated", () => {
  const lab = event("lab", { start: "2024-04", end: "ongoing" }, "affiliation")
  const paper = { ...event("paper", { start: "2026-03" }), relatedTo: ["lab"] }
  const talk = { ...event("talk", { start: "2026-05" }), relatedTo: ["lab"] }

  it("resolves ids to events in timeline order", () => {
    const both = { ...paper, relatedTo: ["lab", "talk"] }
    expect(resolveRelated([lab, paper, talk], both).map((e) => e.id)).toEqual([
      "talk",
      "lab",
    ])
  })

  it("is empty when nothing is related", () => {
    expect(resolveRelated([lab, paper], lab)).toEqual([])
  })
})

describe("assertValidTimeline", () => {
  it("accepts a well-formed set", () => {
    expect(() =>
      assertValidTimeline([
        event("lab", { start: "2024-04", end: "ongoing" }, "affiliation"),
        { ...event("paper", { start: "2026-03" }), relatedTo: ["lab"] },
      ])
    ).not.toThrow()
  })

  it.each([
    [
      "duplicate ids",
      [
        event("same", { start: "2024-04" }),
        event("same", { start: "2025-04" }),
      ],
      /Duplicate timeline id/,
    ],
    [
      "a backwards range",
      [event("bad", { start: "2025-04", end: "2024-04" })],
      /ends .* before it starts/,
    ],
    [
      "a dangling relation",
      [{ ...event("paper", { start: "2026-03" }), relatedTo: ["ghost"] }],
      /unknown id/,
    ],
    [
      "a self relation",
      [{ ...event("loop", { start: "2026-03" }), relatedTo: ["loop"] }],
      /relates to itself/,
    ],
    [
      "a malformed date",
      [event("bad", { start: "2026/03" })],
      /Invalid timeline date/,
    ],
  ])("rejects %s", (_name, events, message) => {
    expect(() => assertValidTimeline(events)).toThrow(message)
  })
})

describe("the real timeline data", () => {
  it("is valid", () => {
    expect(() => assertValidTimeline(timeline)).not.toThrow()
  })

  it("can be sorted and grouped without the UI", () => {
    expect(() => groupTimelineEvents(timeline)).not.toThrow()
  })
})
