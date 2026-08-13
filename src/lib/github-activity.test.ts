import { describe, expect, it } from "vitest"

import {
  type ContributionDay,
  type FullDateString,
  latestWeeks,
  parseContributions,
  toWeeks,
} from "@/lib/github-activity"

/** A real response, trimmed. */
const payload = {
  total: { lastYear: 7941 },
  contributions: [
    { date: "2025-08-10", count: 0, level: 0 },
    { date: "2025-08-11", count: 4, level: 1 },
    { date: "2025-08-12", count: 12, level: 3 },
  ],
}

function day(date: string, count = 1): ContributionDay {
  return { date: date as FullDateString, count, level: 1 }
}

/** `count` consecutive days from `start`. */
function run(start: string, count: number): ContributionDay[] {
  const from = new Date(`${start}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) =>
    day(new Date(from.getTime() + i * 86_400_000).toISOString().slice(0, 10), i)
  )
}

/** Which weekday row each day landed in, as `YYYY-MM-DD` or `-`. */
function rows(week: readonly (ContributionDay | null)[]) {
  return week.map((cell) => cell?.date ?? "-")
}

describe("parseContributions", () => {
  it("narrows a well-formed response", () => {
    expect(parseContributions(payload)).toEqual({
      total: 7941,
      days: [
        { date: "2025-08-10", count: 0, level: 0 },
        { date: "2025-08-11", count: 4, level: 1 },
        { date: "2025-08-12", count: 12, level: 3 },
      ],
    })
  })

  it.each([
    ["null", null],
    ["a string", "nope"],
    ["no contributions array", { total: { lastYear: 1 } }],
    [
      "contributions as an object",
      { total: { lastYear: 1 }, contributions: {} },
    ],
    ["no total", { contributions: [] }],
    ["a non-numeric total", { total: { lastYear: "7941" }, contributions: [] }],
  ])("rejects %s", (_name, input) => {
    // A third-party API is not a contract. Casting `unknown` into a component
    // surfaces as `undefined` in the DOM rather than as a handleable failure.
    expect(() => parseContributions(input)).toThrow()
  })

  it.each([
    ["a malformed date", { date: "2025-8-10", count: 0, level: 0 }],
    ["a month-only date", { date: "2025-08", count: 0, level: 0 }],
    ["a year-only date", { date: "2025", count: 0, level: 0 }],
    ["a missing count", { date: "2025-08-10", level: 0 }],
    ["a negative count", { date: "2025-08-10", count: -1, level: 0 }],
    ["a level above 4", { date: "2025-08-10", count: 1, level: 5 }],
    ["a fractional level", { date: "2025-08-10", count: 1, level: 1.5 }],
    ["a string level", { date: "2025-08-10", count: 1, level: "1" }],
  ])("rejects an entry with %s", (_name, entry) => {
    expect(() =>
      parseContributions({ total: { lastYear: 1 }, contributions: [entry] })
    ).toThrow()
  })

  it("names the offending date in the message", () => {
    expect(() =>
      parseContributions({
        total: { lastYear: 1 },
        contributions: [{ date: "2025-08-10", count: 1, level: 9 }],
      })
    ).toThrow(/2025-08-10/)
  })
})

describe("toWeeks", () => {
  it("puts each day in its own weekday row", () => {
    // 2025-08-13 is a Wednesday, so rows 0–2 stay empty.
    expect(rows(toWeeks([day("2025-08-13"), day("2025-08-14")])[0])).toEqual([
      "-",
      "-",
      "-",
      "2025-08-13",
      "2025-08-14",
      "-",
      "-",
    ])
  })

  it("keeps rows meaning weekday when days are missing", () => {
    // Placing by weekday rather than pushing in sequence: a gap used to shift
    // every later row, so a Wednesday rendered in Monday's line.
    expect(rows(toWeeks([day("2026-07-05"), day("2026-07-08")])[0])).toEqual([
      "2026-07-05",
      "-",
      "-",
      "2026-07-08",
      "-",
      "-",
      "-",
    ])
  })

  it("does not scramble a descending payload", () => {
    const ascending = toWeeks(run("2026-07-05", 7))
    const descending = toWeeks([...run("2026-07-05", 7)].reverse())

    expect(rows(descending[0])).toEqual(rows(ascending[0]))
  })

  it("pads both ends, so every column has seven rows", () => {
    const weeks = toWeeks(run("2026-07-08", 3)) // Wed–Fri

    expect(weeks).toHaveLength(1)
    expect(weeks[0]).toHaveLength(7)
    expect(weeks[0].filter(Boolean)).toHaveLength(3)
  })

  it("starts a new column on each Sunday", () => {
    const weeks = toWeeks(run("2026-07-08", 14)) // Wed through two Sundays

    expect(weeks).toHaveLength(3)
    expect(weeks[1][0]?.date).toBe("2026-07-12")
    expect(weeks[2][0]?.date).toBe("2026-07-19")
  })

  it("keeps every day exactly once", () => {
    const weeks = toWeeks(run("2025-08-10", 369))

    expect(weeks.flat().filter(Boolean)).toHaveLength(369)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it("returns nothing for no days", () => {
    expect(toWeeks([])).toEqual([])
  })
})

describe("latestWeeks", () => {
  const weeks = toWeeks(run("2025-08-10", 70))

  it("keeps the most recent weeks, not the oldest", () => {
    const kept = latestWeeks(weeks, 3)

    expect(kept).toHaveLength(3)
    expect(kept.at(-1)).toEqual(weeks.at(-1))
    expect(kept[0]).not.toEqual(weeks[0])
  })

  it("never returns nothing", () => {
    expect(latestWeeks(weeks, 0)).toHaveLength(1)
    expect(latestWeeks(weeks, -5)).toHaveLength(1)
  })

  it("caps at what exists", () => {
    expect(latestWeeks(weeks, 999)).toHaveLength(weeks.length)
  })
})
