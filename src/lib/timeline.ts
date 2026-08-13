/**
 * The timeline is an activity log, not a CV: an affiliation and an award that
 * happened during it are peers on the same axis rather than parent and child.
 *
 * Everything here is a pure function over plain data. Nothing formats, sorts or
 * groups inside a component.
 */

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
 * How much of a stored date is meaningful. Derived from the string's shape, so
 * `2026-03` is a month and `2026` is a year without anyone saying so.
 * `fiscal-year` is the exception — `2025` and 2025年度 look identical — so it
 * has to be declared.
 */
export type TimelinePrecision = "day" | "month" | "year" | "fiscal-year"

export type TimelineLink = {
  label: string
  href: string
}

/** Not rendered in v1. The model carries it so a later detail view can. */
export type TimelineMedia = {
  src: string
  alt: string
  caption?: string
}

export type TimelineDate = {
  /** `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
  start: string
  /**
   * Omit for a point in time — an award, a talk, a release.
   * `"ongoing"` for a period that has not ended.
   * A date string for a closed period.
   *
   * An omitted `end` deliberately does NOT mean ongoing. A point event has no
   * end either, so the two would be indistinguishable and every award would
   * render as `2026.03 — 現在`.
   */
  end?: string | "ongoing"
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
  /** Ids of other events this one belongs with, e.g. a paper to the lab. */
  relatedTo?: string[]
  links?: TimelineLink[]
  media?: TimelineMedia[]
}

/** Events sharing one date label, so the UI can print it once. */
export type TimelineGroup = {
  key: string
  label: string
  events: TimelineEvent[]
}

const DATE_PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/

export type ParsedDate = {
  year: number
  month?: number
  day?: number
}

/** Throws rather than coercing: a malformed date should fail the build's tests,
 * not render as `NaN.NaN`. */
export function parseDateString(value: string): ParsedDate {
  const match = DATE_PATTERN.exec(value)
  if (!match) {
    throw new Error(
      `Invalid timeline date "${value}": expected YYYY, YYYY-MM or YYYY-MM-DD`
    )
  }

  const [, rawYear, rawMonth, rawDay] = match
  const year = Number(rawYear)
  if (rawMonth === undefined) {
    return { year }
  }

  const month = Number(rawMonth)
  if (month < 1 || month > 12) {
    throw new Error(`Invalid timeline date "${value}": month out of range`)
  }
  if (rawDay === undefined) {
    return { year, month }
  }

  const day = Number(rawDay)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day < 1 || day > lastDay) {
    throw new Error(`Invalid timeline date "${value}": day out of range`)
  }
  return { year, month, day }
}

function shapePrecision(
  value: string
): Exclude<TimelinePrecision, "fiscal-year"> {
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

/** The granularity a date should be displayed at. */
export function datePrecision(date: TimelineDate): TimelinePrecision {
  const shape = shapePrecision(date.start)
  if (date.precision === undefined) {
    return shape
  }
  if (GRANULARITY[date.precision] > GRANULARITY[shape]) {
    throw new Error(
      `Timeline date "${date.start}" declares precision "${date.precision}", which is finer than the value stored`
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
    case "fiscal-year":
      return `${year}年度`
    default:
      return `${year}年`
  }
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
  return `${start} — ${formatPoint(date.end, precision)}`
}

/**
 * Comparable key padded to the *earliest* instant the value can mean, so a
 * year-precision start sorts as the start of that year rather than jumping
 * ahead of every dated event in it.
 */
export function sortKey(date: TimelineDate): number {
  const { year, month = 1, day = 1 } = parseDateString(date.start)
  return year * 10000 + month * 100 + day
}

/** Newest first, with `id` breaking ties so the order is total and stable. */
export function compareTimelineEvents(
  a: TimelineEvent,
  b: TimelineEvent
): number {
  return sortKey(b.date) - sortKey(a.date) || a.id.localeCompare(b.id)
}

export function sortTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(compareTimelineEvents)
}

/**
 * Groups by the period the date label names, so a month with three events
 * prints `2026.03` once. Year and fiscal-year keys stay distinct even for the
 * same number — 2025年 and 2025年度 are different periods.
 */
export function groupTimelineEvents(events: TimelineEvent[]): TimelineGroup[] {
  const groups: TimelineGroup[] = []

  for (const event of sortTimelineEvents(events)) {
    const precision = datePrecision(event.date)
    const { year, month } = parseDateString(event.date.start)
    const key =
      precision === "day" || precision === "month"
        ? `${year}-${String(month).padStart(2, "0")}`
        : precision === "fiscal-year"
          ? `FY${year}`
          : `${year}`

    const last = groups.at(-1)
    if (last?.key === key) {
      last.events.push(event)
      continue
    }

    groups.push({
      key,
      label: formatPoint(
        event.date.start,
        precision === "day" ? "month" : precision
      ),
      events: [event],
    })
  }

  return groups
}

/** Related events in timeline order. Unknown ids are dropped, not thrown —
 * `assertValidTimeline` is where a dangling reference is caught. */
export function resolveRelated(
  events: TimelineEvent[],
  event: TimelineEvent
): TimelineEvent[] {
  const byId = new Map(events.map((e) => [e.id, e]))
  const related = (event.relatedTo ?? [])
    .map((id) => byId.get(id))
    .filter((e): e is TimelineEvent => e !== undefined)
  return sortTimelineEvents(related)
}

/** Data hygiene for the whole set. Called from tests over the real content, so
 * a typo in an id or a backwards date range fails CI. */
export function assertValidTimeline(events: TimelineEvent[]): void {
  const seen = new Set<string>()

  for (const event of events) {
    if (seen.has(event.id)) {
      throw new Error(`Duplicate timeline id "${event.id}"`)
    }
    seen.add(event.id)

    // Throws on a malformed date or an over-declared precision.
    datePrecision(event.date)

    if (event.date.end !== undefined && event.date.end !== "ongoing") {
      if (sortKey({ start: event.date.end }) < sortKey(event.date)) {
        throw new Error(
          `Timeline event "${event.id}" ends (${event.date.end}) before it starts (${event.date.start})`
        )
      }
    }
  }

  for (const event of events) {
    for (const id of event.relatedTo ?? []) {
      if (!seen.has(id)) {
        throw new Error(
          `Timeline event "${event.id}" relates to unknown id "${id}"`
        )
      }
      if (id === event.id) {
        throw new Error(`Timeline event "${event.id}" relates to itself`)
      }
    }
  }
}
