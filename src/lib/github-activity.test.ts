import { describe, expect, it } from "vitest"

import {
  type ContributionDay,
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
  return { date: date as ContributionDay["date"], count, level: 1 }
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
    ["a missing count", { date: "2025-08-10", level: 0 }],
    ["a negative count", { date: "2025-08-10", count: -1, level: 0 }],
    ["a level above 4", { date: "2025-08-10", count: 1, level: 5 }],
    ["a fractional level", { date: "2025-08-10", count: 1, level: 1.5 }],
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
  it("pads the first week so every column starts on a Sunday", () => {
    // 2025-08-13 is a Wednesday, so three leading cells are empty.
    const weeks = toWeeks([day("2025-08-13"), day("2025-08-14")])

    expect(weeks).toHaveLength(1)
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null])
    expect(weeks[0][3]?.date).toBe("2025-08-13")
    expect(weeks[0][4]?.date).toBe("2025-08-14")
  })

  it("pads the last week too, so every column has seven rows", () => {
    const weeks = toWeeks([day("2025-08-10")]) // a Sunday

    expect(weeks).toHaveLength(1)
    expect(weeks[0]).toHaveLength(7)
    expect(weeks[0].filter(Boolean)).toHaveLength(1)
  })

  it("keeps every day exactly once", () => {
    const days = Array.from({ length: 369 }, (_, i) => {
      const date = new Date(Date.UTC(2025, 7, 10 + i))
      return day(date.toISOString().slice(0, 10))
    })
    const weeks = toWeeks(days)

    expect(weeks.flat().filter(Boolean)).toHaveLength(369)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it("returns nothing for no days", () => {
    expect(toWeeks([])).toEqual([])
  })
})

describe("latestWeeks", () => {
  const weeks = toWeeks(
    Array.from({ length: 70 }, (_, i) => {
      const date = new Date(Date.UTC(2025, 7, 10 + i))
      return day(date.toISOString().slice(0, 10))
    })
  )

  it("keeps the most recent weeks, not the oldest", () => {
    const kept = latestWeeks(weeks, 3)

    expect(kept).toHaveLength(3)
    expect(kept.at(-1)).toEqual(weeks.at(-1))
  })

  it("never returns nothing", () => {
    expect(latestWeeks(weeks, 0)).toHaveLength(1)
    expect(latestWeeks(weeks, -5)).toHaveLength(1)
  })

  it("caps at what exists", () => {
    expect(latestWeeks(weeks, 999)).toHaveLength(weeks.length)
  })
})
