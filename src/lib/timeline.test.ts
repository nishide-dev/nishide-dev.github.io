import { describe, expect, it } from "vitest"

import { timeline } from "@/data/timeline"
import {
  assertValidTimeline,
  datePrecision,
  formatTimelineDate,
  groupTimelineEvents,
  parseDateString,
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

  it("keeps events rendering the same label adjacent", () => {
    // The ids interleave deliberately: by `id` alone the order is a, b, c and
    // the two `2024.04` entries are split by the range, so the UI prints that
    // label twice. Breaking the tie on the label first pairs them.
    const sorted = sortTimelineEvents([
      event("a-point", { start: "2024-04" }),
      event("b-range", { start: "2024-04", end: "ongoing" }),
      event("c-point", { start: "2024-04" }),
    ])
    expect(sorted.map((e) => e.id)).toEqual(["a-point", "c-point", "b-range"])
    expect(sorted.map((e) => formatTimelineDate(e.date))).toEqual([
      "2024.04",
      "2024.04",
      "2024.04 — 現在",
    ])
  })

  it("still falls through to the id when the labels match", () => {
    // The label step must not swallow the `id` step: these render identically,
    // so without the fall-through the order would be insertion order and the
    // sort would stop being total.
    const sorted = sortTimelineEvents([
      event("b", { start: "2026-03" }),
      event("a", { start: "2026-03" }),
    ])
    expect(sorted.map((e) => e.id)).toEqual(["a", "b"])
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

describe("assertValidTimeline", () => {
  it("accepts a well-formed set", () => {
    expect(() =>
      assertValidTimeline([
        event("lab", { start: "2024-04", end: "ongoing" }, "affiliation"),
        event("paper", { start: "2026-03" }),
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
    [
      // Renders as a dangling em-dash with nothing after it.
      "an empty details line",
      [{ ...event("x", { start: "2026-03" }), details: ["賞", "  "] }],
      /details contains an empty line/,
    ],
    [
      // Renders as a bare `↗` whose accessible name is only the hint.
      "a link with no label",
      [
        {
          ...event("x", { start: "2026-03" }),
          links: [{ label: " ", href: "https://example.com" as const }],
        },
      ],
      /has no label/,
    ],
  ])("rejects %s", (_name, events, message) => {
    expect(() => assertValidTimeline(events)).toThrow(message)
  })

  it("allows the duplicates the renderer is built to keep", () => {
    // Two award citations can read the same, and an abstract can share a PDF's
    // href. The renderer keys both lists by index for exactly this reason, and
    // `timeline.test.tsx` asserts it keeps them — so rejecting them here would
    // forbid what the UI supports.
    expect(() =>
      assertValidTimeline([
        {
          ...event("x", { start: "2026-03" }),
          details: ["同じ文言", "同じ文言"],
          links: [
            { label: "Abstract", href: "https://example.com/p" },
            { label: "PDF", href: "https://example.com/p" },
          ],
        },
      ])
    ).not.toThrow()
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
        { ...event("untitled", { start: "2026-03" }), title: "" },
      ])
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain("Duplicate timeline id")
    expect(message).toContain("before it starts")
    expect(message).toContain("title is empty")
  })
})

describe("the real timeline data", () => {
  const byId = new Map(timeline.map((entry) => [entry.id, entry]))

  it("holds every entry the content issue calls for", () => {
    // Spelled out rather than counted: a count passes when one entry is
    // replaced by another, and every loop below would pass over an empty array.
    expect([...byId.keys()].sort()).toEqual([
      "anlp-2026-award",
      "eacl-2026-accepted",
      "eacl-2026-presentation",
      "giiku-camp-2024",
      "microbase",
      "navis",
      "pksha-2025",
      "project-links",
      "tti-kde",
      "tti-kde-site",
    ])
  })

  it("is valid", () => {
    // Carries the well-formedness checks: dates, ids, titles, ranges, empty
    // detail lines and unlabelled links.
    expect(() => assertValidTimeline(timeline)).not.toThrow()
  })

  it.each([
    ["anlp-2026-award", "言語処理学会第32回年次大会 若手奨励賞を受賞"],
    [
      "pksha-2025",
      "PKSHA Technology 3days インターンハッカソン 最優秀賞を受賞",
    ],
    ["giiku-camp-2024", "サポーターズ 技育CAMP2024 努力賞を受賞"],
    ["eacl-2026-presentation", "国際学会 EACL 2026 で論文を発表"],
    ["eacl-2026-accepted", "国際学会 EACL 2026 に論文が採択"],
  ])("titles %s as %s", (id, title) => {
    // Spelled out, like the dates and hrefs above, and for the same reason: the
    // titles ARE the content, and until this existed nothing asserted one.
    // `assertValidTimeline` only refuses an empty title, and the smoke test's
    // `/EACL 2026 で論文を発表/` matches the longer string either way.
    //
    // All three awards are pinned here because the convention is that an award
    // lives in the title rather than in `details` — silently moving one back
    // would otherwise cost nothing.
    expect(byId.get(id)?.title).toBe(title)
  })

  it.each([
    ["navis", "2026.04"],
    ["eacl-2026-presentation", "2026.03"],
    ["anlp-2026-award", "2026.03"],
    ["eacl-2026-accepted", "2026.01"],
    ["pksha-2025", "2025.09"],
    ["project-links", "2025.04 — 2026.03"],
    ["giiku-camp-2024", "2024.04"],
    ["tti-kde", "2024.04 — 現在"],
    // The point-in-time counterpart the comment below asks for: with no row
    // here, `{ start: "2026-04" }` could gain a day or an `end: "ongoing"` and
    // ship a sharpened date or a period on a delivered project, and only the
    // ordering test's tie-break could notice — which it would not.
    ["tti-kde-site", "2024.04"],
    ["microbase", "2022.11 — 現在"],
  ])("renders %s as %s", (id, label) => {
    // The confirmed dates, written out. Reading them back off `entry.date`
    // would pass for whatever the file happens to hold, and the two `ongoing`
    // affiliations are the only thing pinning the three-valued `end`.
    expect(formatTimelineDate(byId.get(id)?.date as never)).toBe(label)
  })

  it("says navis is campus-only, in the description", () => {
    // Affirmed rather than merely not-contradicted, on the same reasoning as
    // `profile.test.ts` affirming the intro names the university. The title
    // deliberately drops the qualifier, and the link points at a syllabus page
    // rather than at navis, so this sentence is the only place a reader is told
    // the system is not something they can open. Reword it away and the page
    // claims an internal tool as though it were public — a factual regression
    // with nothing else to catch it.
    expect(byId.get("navis")?.description).toContain("学内専用")
  })

  it.each([
    ["eacl-2026-presentation", "https://aclanthology.org/2026.eacl-long.81/"],
    ["anlp-2026-award", "https://www.anlp.jp/award/nenji.html#y2026"],
    ["project-links", "https://www.mlit.go.jp/links/"],
    ["tti-kde", "https://www.toyota-ti.ac.jp/Lab/kde/ja/"],
    // Deliberately the same href as `tti-kde`: this entry is about building that
    // site, so its own artifact is the link. Nothing validates hrefs across
    // entries — `assertValidTimeline`'s only link check is an empty label — so
    // this is a content decision, not a case the validator blessed. Its
    // documented allowance for duplicates concerns one event's own lists, which
    // the renderer keys by index.
    ["tti-kde-site", "https://www.toyota-ti.ac.jp/Lab/kde/ja/"],
    // The university's syllabus page rather than navis itself; the entry in
    // `src/data/timeline.ts` has the reason.
    ["navis", "https://www.toyota-ti.ac.jp/student/jugyo/syllabus.html"],
    ["microbase", "https://www.microgeo.biz/jp"],
  ])("points %s at %s", (id, href) => {
    // Also spelled out: a shape check like `/^https:/` passes for
    // `https://example.com/nope`.
    expect(byId.get(id)?.links?.map((link) => link.href)).toEqual([href])
  })

  it("orders newest first, with the two March entries together", () => {
    // The 2024-04 run is ordered by rendered label first: the two bare
    // `2024.04` entries come as a pair (`giiku-camp-2024` then `tti-kde-site`,
    // by `id`), then `tti-kde` at `2024.04 — 現在`, since `"2024.04"` is a
    // prefix of it. That pairing is what lets the UI print the label once.
    // Nothing about the content decides the order within the pair.
    expect(sortTimelineEvents(timeline).map((entry) => entry.id)).toEqual([
      "navis",
      "anlp-2026-award",
      "eacl-2026-presentation",
      "eacl-2026-accepted",
      "pksha-2025",
      "project-links",
      "giiku-camp-2024",
      "tti-kde-site",
      "tti-kde",
      "microbase",
    ])
  })
})
