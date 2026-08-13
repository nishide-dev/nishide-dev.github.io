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
  type TimelineDate,
  type TimelineDateString,
  type TimelineEvent,
} from "@/lib/timeline"

function event(
  id: string,
  date: TimelineDate,
  type: TimelineEvent["type"] = "other"
): TimelineEvent {
  return { id, date, type, title: id }
}

/** The type is a coarse filter, so a deliberately malformed value needs a cast
 * to reach the runtime validation under test. */
const bad = (value: string) => value as TimelineDateString

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

  it("refuses fiscal-year on anything but a bare year", () => {
    // 2026-03 falls in 2025年度, not 2026年度. Rather than infer the April
    // boundary, the fiscal year itself has to be what is stored.
    expect(() =>
      datePrecision({ start: "2026-03", precision: "fiscal-year" })
    ).toThrow(/April to March/)
    expect(() =>
      datePrecision({ start: "2025-04-01", precision: "fiscal-year" })
    ).toThrow()
  })
})

describe("formatTimelineDate", () => {
  it.each([
    [{ start: "2026-03-14" }, "2026.03.14"],
    [{ start: "2026-03" }, "2026.03"],
    [{ start: "2026" }, "2026年"],
    [{ start: "2025", precision: "fiscal-year" }, "2025年度"],
    [{ start: "2024-04", end: "2025-03" }, "2024.04 — 2025.03"],
    [{ start: "2024-04", end: "ongoing" }, "2024.04 — 現在"],
    [
      { start: "2024", end: "2025", precision: "fiscal-year" },
      "2024年度 — 2025年度",
    ],
  ] satisfies [TimelineDate, string][])("formats %j", (date, expected) => {
    expect(formatTimelineDate(date)).toBe(expected)
  })

  it("formats a coarser end at its own granularity", () => {
    // Borrowing the start's precision reads a month off a value that has none
    // and prints the literal string "undefined".
    expect(formatTimelineDate({ start: "2024-04", end: "2025" })).toBe(
      "2024.04 — 2025年"
    )
    expect(formatTimelineDate({ start: "2024-04-01", end: "2025-03" })).toBe(
      "2024.04.01 — 2025.03"
    )
    expect(formatTimelineDate({ start: "2024-04-01", end: "2025" })).toBe(
      "2024.04.01 — 2025年"
    )
  })

  it("never renders undefined", () => {
    const ranges: TimelineDate[] = [
      { start: "2024-04", end: "2025" },
      { start: "2024-04-01", end: "2025-03" },
      { start: "2024-04-01", end: "2025" },
      { start: "2024", end: "2025" },
    ]
    for (const range of ranges) {
      expect(formatTimelineDate(range)).not.toContain("undefined")
    }
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

  it("orders ids by code unit, not by locale", () => {
    // localeCompare returns 0 for these, collapsing a total order into
    // insertion order — and it varies with the runtime's ICU data.
    const nfc = "café-talk"
    const nfd = "café-talk"
    const sorted = sortTimelineEvents([
      event(nfd, { start: "2026-03" }),
      event(nfc, { start: "2026-03" }),
    ])
    expect(sorted[0].id).not.toBe(sorted[1].id)
    expect(sortTimelineEvents([...sorted].reverse()).map((e) => e.id)).toEqual(
      sorted.map((e) => e.id)
    )
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

  it("never emits the same period twice", () => {
    // Dates of differing precision tie in the sort, so a year-precision event
    // can land between two events of the same month.
    const groups = groupTimelineEvents([
      event("a-jan-talk", { start: "2025-01" }),
      event("b-year-award", { start: "2025" }),
      event("c-jan-paper", { start: "2025-01" }),
    ])
    expect(groups.map((g) => g.key)).toEqual(["2025-01", "2025"])
    expect(new Set(groups.map((g) => g.key)).size).toBe(groups.length)
    expect(groups[0].events.map((e) => e.id)).toEqual([
      "a-jan-talk",
      "c-jan-paper",
    ])
  })

  it("keeps a year and a fiscal year apart", () => {
    const groups = groupTimelineEvents([
      event("calendar", { start: "2025" }),
      event("fiscal", { start: "2025", precision: "fiscal-year" }),
    ])
    expect(groups.map((g) => g.key).sort()).toEqual(["2025", "FY2025"])
    expect(groups.map((g) => g.label).sort()).toEqual(["2025年", "2025年度"])
  })

  it("returns nothing for no events", () => {
    expect(groupTimelineEvents([])).toEqual([])
  })
})

describe("resolveRelated", () => {
  const lab = event("lab", { start: "2024-04", end: "ongoing" }, "affiliation")
  const paper = { ...event("paper", { start: "2026-03" }), relatedTo: ["lab"] }
  const talk = { ...event("talk", { start: "2026-05" }), relatedTo: ["lab"] }
  const all = [lab, paper, talk]

  it("resolves ids to events in timeline order", () => {
    expect(resolveRelated(all, paper).map((e) => e.id)).toEqual(["lab"])
  })

  it("closes the relation from the other side", () => {
    // The edge is written once, on the paper. Without this the lab — the hub
    // everything hangs off — resolves to nothing.
    expect(resolveRelated(all, lab).map((e) => e.id)).toEqual(["talk", "paper"])
  })

  it("never includes the event itself", () => {
    const selfish = { ...paper, relatedTo: ["lab", "paper"] }
    expect(resolveRelated([lab, selfish], selfish).map((e) => e.id)).toEqual([
      "lab",
    ])
  })

  it("is empty when nothing is related", () => {
    const lone = event("lone", { start: "2020-01" })
    expect(resolveRelated([...all, lone], lone)).toEqual([])
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

  it("accepts an end coarser than its start", () => {
    // "Started April 2024, ended sometime that year" is not a contradiction —
    // an end has to be compared at its latest moment, not its earliest.
    expect(() =>
      assertValidTimeline([event("x", { start: "2024-04", end: "2024" })])
    ).not.toThrow()
    expect(() =>
      assertValidTimeline([event("y", { start: "2024-06-15", end: "2024-06" })])
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
    ["an empty id", [event("", { start: "2026-03" })], /empty id/],
    ["a whitespace-only id", [event("   ", { start: "2026-03" })], /empty id/],
    [
      "an empty title",
      [{ ...event("x", { start: "2026-03" }), title: "  " }],
      /title is empty/,
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
      "a duplicated relation",
      [
        event("lab", { start: "2024-04" }),
        { ...event("paper", { start: "2026-03" }), relatedTo: ["lab", "lab"] },
      ],
      /duplicate id/,
    ],
    [
      "a malformed date",
      [event("x", { start: bad("2026/03") })],
      /Invalid timeline date/,
    ],
    [
      "an over-declared precision",
      [event("x", { start: "2026-03", precision: "day" })],
      /finer than the value stored/,
    ],
    [
      "fiscal-year on a month",
      [event("x", { start: "2026-03", precision: "fiscal-year" })],
      /April to March/,
    ],
  ])("rejects %s", (_name, events, message) => {
    expect(() => assertValidTimeline(events)).toThrow(message)
  })

  it("names the offending event in a date error", () => {
    // A bare parse error gives a content author no way to find the typo.
    expect(() =>
      assertValidTimeline([event("eacl-2026", { start: bad("2026-3") })])
    ).toThrow(/eacl-2026/)
  })

  it("reports every problem at once", () => {
    let message = ""
    try {
      assertValidTimeline([
        event("dup", { start: "2024-04" }),
        event("dup", { start: "2025-04" }),
        event("backwards", { start: "2025-04", end: "2024-04" }),
        { ...event("dangling", { start: "2026-03" }), relatedTo: ["ghost"] },
      ])
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain("Duplicate timeline id")
    expect(message).toContain("before it starts")
    expect(message).toContain("unknown id")
  })
})

describe("the real timeline data", () => {
  // Empty until the content issue lands. These guard it from then on, and are
  // written so they exercise every event rather than just the collection.
  it("is valid", () => {
    expect(() => assertValidTimeline(timeline)).not.toThrow()
  })

  it("formats every event without leaking undefined", () => {
    for (const entry of timeline) {
      const label = formatTimelineDate(entry.date)
      expect(label, entry.id).not.toContain("undefined")
      expect(label, entry.id).not.toContain("NaN")
    }
  })

  it("can be sorted and grouped without the UI", () => {
    const groups = groupTimelineEvents(timeline)
    expect(new Set(groups.map((g) => g.key)).size).toBe(groups.length)
    expect(groups.flatMap((g) => g.events)).toHaveLength(timeline.length)
  })
})
