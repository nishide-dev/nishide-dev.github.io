/**
 * The timeline is an activity log, not a CV: an affiliation and an award that
 * happened during it are peers on the same axis rather than parent and child.
 *
 * Everything here is a pure function over plain data. Nothing formats, sorts or
 * groups inside a component.
 */

// No `linkBehaviour` check here: every inhabitant of `Href` already satisfies
// one of its branches, so a scheme test could only ever fire for a value that
// was cast past the type.
import type { Link } from "@/lib/links"

export type TimelineEventType =
  | "affiliation"
  | "project"
  | "publication"
  | "presentation"
  | "award"
  | "hackathon"
  | "career"
  | "other"

/**
 * `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. A template literal type rather than
 * `string`, so that `end?: TimelineDateString | "ongoing"` keeps the sentinel
 * distinct — a plain `string | "ongoing"` collapses to `string` and a typo like
 * `"onging"` compiles, then throws mid-render. It is a coarse filter, not a
 * validator: `parseDateString` still rejects `2026-3` and `2026-02-30`.
 */
export type TimelineDateString =
  | `${number}`
  | `${number}-${number}`
  | `${number}-${number}-${number}`

/**
 * How much of a stored date is meaningful. Derived from the string's shape, so
 * `2026-03` is a month and `2026` is a year without anyone saying so.
 *
 * `fiscal-year` is the exception — 2025年 and 2025年度 are the same digits — so
 * it must be declared, and only on a `YYYY` value. A 年度 runs April to March,
 * so `2026-03` is 2025年度, not 2026年度; rather than infer that boundary,
 * store the fiscal year itself.
 */
export type TimelinePrecision = "day" | "month" | "year" | "fiscal-year"

/** Same shape as a profile link, and rendered by the same component. */
export type TimelineLink = Link

/** Not rendered in v1. The model carries it so a later detail view can. */
export type TimelineMedia = {
  src: string
  alt: string
  caption?: string
}

export type TimelineDate = {
  start: TimelineDateString
  /**
   * Omit for a point in time — an award, a talk, a release.
   * `"ongoing"` for a period that has not ended.
   * A date string for a closed period.
   *
   * An omitted `end` deliberately does NOT mean ongoing. A point event has no
   * end either, so the two would be indistinguishable and every award would
   * render as `2026.03 — 現在`.
   *
   * `end` may be coarser than `start` — "started April 2024, ended sometime in
   * 2025" is a real thing to know — and is formatted at its own granularity.
   */
  end?: TimelineDateString | "ongoing"
  /** Display granularity. May be coarser than `start`, never finer. */
  precision?: TimelinePrecision
}

export type TimelineEvent = {
  id: string
  date: TimelineDate
  type: TimelineEventType
  title: string
  description?: string
  details?: string[]
  links?: TimelineLink[]
  media?: TimelineMedia[]
}

/** Events sharing one date label, so the UI can print it once. */
export type TimelineGroup = {
  key: string
  label: string
  events: TimelineEvent[]
}

export type ParsedDate = {
  year: number
  month?: number
  day?: number
}

const DATE_PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/

/** Date strings repeat across events and are parsed by formatting, sorting and
 * grouping alike, so the regex work is done once per distinct string. */
const parsed = new Map<string, ParsedDate>()

/** Throws rather than coercing: a malformed date should fail the tests, not
 * render as `NaN.NaN`. */
export function parseDateString(value: string): ParsedDate {
  const cached = parsed.get(value)
  if (cached !== undefined) {
    return cached
  }

  const match = DATE_PATTERN.exec(value)
  if (!match) {
    throw new Error(
      `Invalid timeline date "${value}": ` +
        "expected YYYY, YYYY-MM or YYYY-MM-DD"
    )
  }

  const [, rawYear, rawMonth, rawDay] = match
  const year = Number(rawYear)
  let result: ParsedDate = { year }

  if (rawMonth !== undefined) {
    const month = Number(rawMonth)
    if (month < 1 || month > 12) {
      throw new Error(`Invalid timeline date "${value}": month out of range`)
    }
    result = { year, month }

    if (rawDay !== undefined) {
      const day = Number(rawDay)
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
      if (day < 1 || day > lastDay) {
        throw new Error(`Invalid timeline date "${value}": day out of range`)
      }
      result = { year, month, day }
    }
  }

  parsed.set(value, result)
  return result
}

type ShapePrecision = Exclude<TimelinePrecision, "fiscal-year">

function shapePrecision(value: string): ShapePrecision {
  const { month, day } = parseDateString(value)
  if (day !== undefined) return "day"
  if (month !== undefined) return "month"
  return "year"
}

const GRANULARITY: Record<TimelinePrecision, number> = {
  day: 3,
  month: 2,
  year: 1,
  "fiscal-year": 1,
}

function assertNever(value: never): never {
  throw new Error(`Unhandled timeline precision: ${String(value)}`)
}

/** The granularity `start` should be displayed at. */
export function datePrecision(date: TimelineDate): TimelinePrecision {
  const shape = shapePrecision(date.start)
  if (date.precision === undefined) {
    return shape
  }

  if (date.precision === "fiscal-year") {
    if (shape !== "year") {
      throw new Error(
        `Timeline date "${date.start}" declares fiscal-year precision, ` +
          "but a 年度 runs April to March — store the fiscal year as YYYY"
      )
    }
    return "fiscal-year"
  }

  if (GRANULARITY[date.precision] > GRANULARITY[shape]) {
    throw new Error(
      `Timeline date "${date.start}" declares precision ` +
        `"${date.precision}", which is finer than the value stored`
    )
  }
  return date.precision
}

function formatPoint(value: string, precision: TimelinePrecision): string {
  const { year, month, day } = parseDateString(value)
  const pad = (n: number) => String(n).padStart(2, "0")

  switch (precision) {
    case "day":
      return `${year}.${pad(month as number)}.${pad(day as number)}`
    case "month":
      return `${year}.${pad(month as number)}`
    case "year":
      return `${year}年`
    case "fiscal-year":
      return `${year}年度`
    default:
      return assertNever(precision)
  }
}

/**
 * `end` is formatted at its own granularity, never at `start`'s. Borrowing
 * `start`'s precision reads a month or a day off a value that has none and
 * prints the literal string "undefined".
 */
function endPrecision(
  end: string,
  startPrecision: TimelinePrecision
): TimelinePrecision {
  if (startPrecision === "fiscal-year") {
    return "fiscal-year"
  }
  const shape = shapePrecision(end)
  return GRANULARITY[shape] <= GRANULARITY[startPrecision]
    ? shape
    : startPrecision
}

/** `2026.03`, `2025年度`, `2024.04 — 現在`. */
export function formatTimelineDate(date: TimelineDate): string {
  const precision = datePrecision(date)
  const start = formatPoint(date.start, precision)

  if (date.end === undefined) {
    return start
  }
  if (date.end === "ongoing") {
    return `${start} — 現在`
  }
  const end = formatPoint(date.end, endPrecision(date.end, precision))
  return `${start} — ${end}`
}

/**
 * A date names a span, not an instant. `first` is its earliest moment and
 * `last` its latest, so a start can be compared against another start and an
 * end against another end without a year-precision value silently becoming
 * January 1st in both roles.
 */
function bounds(value: string): { first: number; last: number } {
  const { year, month, day } = parseDateString(value)
  const key = (m: number, d: number) => year * 10000 + m * 100 + d

  if (day !== undefined) {
    return { first: key(month as number, day), last: key(month as number, day) }
  }
  if (month !== undefined) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return { first: key(month, 1), last: key(month, lastDay) }
  }
  return { first: key(1, 1), last: key(12, 31) }
}

/**
 * Comparable key padded to the *earliest* instant the value can mean, so a
 * year-precision start sorts as the start of that year rather than jumping
 * ahead of every dated event in it.
 */
export function sortKey(date: TimelineDate): number {
  return bounds(date.start).first
}

/** Newest first. Ties break on `id` by code unit — `localeCompare` returns 0
 * for distinct strings that differ only by Unicode normalisation, and its
 * ordering varies with the runtime's ICU data. */
export function compareTimelineEvents(
  a: TimelineEvent,
  b: TimelineEvent
): number {
  const byDate = sortKey(b.date) - sortKey(a.date)
  if (byDate !== 0) return byDate
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Copies before sorting, so a `readonly` source array is fine to hand over. */
export function sortTimelineEvents(
  events: readonly TimelineEvent[]
): TimelineEvent[] {
  return [...events].sort(compareTimelineEvents)
}

function groupKey(date: TimelineDate): string {
  const precision = datePrecision(date)
  const { year, month } = parseDateString(date.start)

  switch (precision) {
    case "day":
    case "month":
      return `${year}-${String(month).padStart(2, "0")}`
    case "fiscal-year":
      return `FY${year}`
    case "year":
      return `${year}`
    default:
      return assertNever(precision)
  }
}

/**
 * Groups by the period the date label names, so a month with three events
 * prints `2026.03` once. Year and fiscal-year keys stay distinct even for the
 * same number — 2025年 and 2025年度 are different periods.
 *
 * Keyed by a map rather than by comparing against the previous group: dates of
 * differing precision tie in the sort, so two events of one month can end up
 * separated by a year-precision event and would otherwise emit that month
 * twice — a repeated heading and duplicate React keys.
 */
export function groupTimelineEvents(
  events: readonly TimelineEvent[]
): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>()

  for (const event of sortTimelineEvents(events)) {
    const key = groupKey(event.date)
    const existing = groups.get(key)
    if (existing) {
      existing.events.push(event)
      continue
    }

    const precision = datePrecision(event.date)
    groups.set(key, {
      key,
      label: formatPoint(
        event.date.start,
        precision === "day" ? "month" : precision
      ),
      events: [event],
    })
  }

  return [...groups.values()]
}

function describe(event: TimelineEvent, problem: string): string {
  return `Timeline event "${event.id || "(empty id)"}": ${problem}`
}

/**
 * Data hygiene for the whole set, run over the real content in the tests so a
 * typo fails CI rather than reaching a page. Reports every problem at once —
 * a content author should not spend one CI round-trip per typo.
 */
export function assertValidTimeline(events: readonly TimelineEvent[]): void {
  const problems: string[] = []
  const seen = new Set<string>()

  for (const event of events) {
    if (event.id.trim() === "") {
      problems.push("An event has an empty id")
    } else if (seen.has(event.id)) {
      problems.push(`Duplicate timeline id "${event.id}"`)
    }
    seen.add(event.id)

    if (event.title.trim() === "") {
      problems.push(describe(event, "title is empty"))
    }

    try {
      // Throws on a malformed date or an over-declared precision. Rethrown
      // with the id attached, which the raw message has no way to know.
      datePrecision(event.date)

      if (event.date.end !== undefined && event.date.end !== "ongoing") {
        // An end is compared at its latest moment, a start at its earliest, so
        // "started April 2024, ended sometime in 2024" is not a contradiction.
        if (bounds(event.date.end).last < bounds(event.date.start).first) {
          problems.push(
            describe(
              event,
              `ends (${event.date.end}) before it starts (${event.date.start})`
            )
          )
        }
      }
    } catch (error) {
      problems.push(describe(event, (error as Error).message))
    }

    // Empty entries are what the UI cannot defend against: a blank `details`
    // line renders as a dangling em-dash, and a link with no label renders as a
    // bare `↗` with no accessible name.
    //
    // *Duplicates* are not checked, deliberately. An earlier version rejected
    // them on the grounds that the renderer keyed these lists by content — it
    // keys by index, and `timeline.test.tsx` asserts that two award citations
    // reading the same and an abstract sharing a PDF's href both survive. The
    // validator was forbidding what the renderer is tested to support.
    for (const detail of event.details ?? []) {
      if (detail.trim() === "") {
        problems.push(describe(event, "details contains an empty line"))
      }
    }

    for (const link of event.links ?? []) {
      if (link.label.trim() === "") {
        problems.push(describe(event, `link "${link.href}" has no label`))
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid timeline data:\n  ${problems.join("\n  ")}`)
  }
}
