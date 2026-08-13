/**
 * The contribution calendar: fetching it, and reshaping it into calendar weeks.
 *
 * Deliberately free of components — everything here is a pure function over
 * plain data plus one network call, so a build-time step could replace
 * `fetchContributions` and leave the rest untouched. (The section component
 * still owns the request today; moving to build time means changing its props,
 * not this file.)
 *
 * No token is involved, and none may be added: this runs in the client bundle.
 */
import { parseDateString } from "@/lib/timeline"

const ENDPOINT = "https://github-contributions-api.jogruber.de/v4"

/** A connection that opens and never answers is otherwise indistinguishable
 * from a component that renders nothing, and the browser's own timeout is
 * minutes to never. */
const TIMEOUT_MS = 8000

/** 0 = no contributions, 4 = the busiest band. The API assigns these. */
export type ContributionLevel = 0 | 1 | 2 | 3 | 4

/**
 * `YYYY-MM-DD`. Narrower than `TimelineDateString`, which also admits `YYYY`
 * and `YYYY-MM` — the grid reads a weekday off every date, and a coarse one
 * produces `NaN` and silently misplaces the row rather than throwing.
 */
export type FullDateString = `${number}-${number}-${number}`

export type ContributionDay = {
  date: FullDateString
  count: number
  level: ContributionLevel
}

export type ContributionCalendar = {
  /** The API's own year total, which is not the sum of `days` when the graph
   * is later sliced to fit a viewport. */
  total: number
  days: readonly ContributionDay[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Narrows to the four bands by comparison rather than by range, so the check
 * *is* the proof — a range test leaves `number` and needs a cast that can then
 * outlive the check that justified it. */
function isLevel(value: unknown): value is ContributionLevel {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4
}

/** Delete the call and the assignment stops compiling, which is the point. */
function isFullDate(value: string): value is FullDateString {
  return parseDateString(value).day !== undefined
}

/**
 * Narrows the response rather than trusting it. A third-party API is not a
 * contract: it can change shape, and `unknown` cast into a component surfaces
 * as `undefined` in the DOM instead of as an error the caller can handle.
 */
export function parseContributions(payload: unknown): ContributionCalendar {
  if (!isRecord(payload) || !Array.isArray(payload.contributions)) {
    throw new Error("Contribution response has no contributions array")
  }

  const total = isRecord(payload.total) ? payload.total.lastYear : undefined
  if (typeof total !== "number" || !Number.isFinite(total)) {
    throw new Error("Contribution response has no total.lastYear")
  }

  const days = payload.contributions.map((entry, index): ContributionDay => {
    if (!isRecord(entry)) {
      throw new Error(`Contribution ${index} is not an object`)
    }

    const { date, count, level } = entry
    if (typeof date !== "string") {
      throw new Error(`Contribution ${index} has no date`)
    }
    // Throws on anything the site's own formatter would reject.
    if (!isFullDate(date)) {
      throw new Error(`Contribution ${index} date "${date}" is not a full date`)
    }
    if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
      throw new Error(`Contribution ${date} has no usable count`)
    }
    if (!isLevel(level)) {
      throw new Error(`Contribution ${date} has level ${String(level)}`)
    }

    return { date, count, level }
  })

  return { total, days }
}

export async function fetchContributions(
  login: string,
  signal?: AbortSignal
): Promise<ContributionCalendar> {
  const url = `${ENDPOINT}/${encodeURIComponent(login)}?y=last`

  // A local controller chained to the caller's, so the timeout works even where
  // `AbortSignal.any`/`AbortSignal.timeout` are unavailable.
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new Error(`Contribution API timed out at ${url}`)),
    TIMEOUT_MS
  )
  signal?.addEventListener("abort", () => controller.abort(), { once: true })

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      // The body carries the only message that names the cause — a mistyped or
      // deleted account reads as `GitHub user "..." not found`, and throwing
      // the bare status makes a developer reproduce the request by hand.
      const detail = await response.text().catch(() => "")
      throw new Error(
        `Contribution API responded ${response.status} for ${url}` +
          (detail ? `: ${detail.slice(0, 200)}` : "")
      )
    }

    return parseContributions(await response.json())
  } finally {
    clearTimeout(timer)
  }
}

/** A calendar column: seven rows, Sunday first. A row is `null` when that day
 * is outside the range — which can be at either end. */
export type ContributionWeek = readonly (ContributionDay | null)[]

function utc(date: FullDateString): Date {
  const { year, month, day } = parseDateString(date)
  return new Date(Date.UTC(year, (month as number) - 1, day as number))
}

/** The Sunday that opens this date's calendar week, as `YYYY-MM-DD`. */
function weekStart(date: FullDateString): string {
  const at = utc(date)
  at.setUTCDate(at.getUTCDate() - at.getUTCDay())
  return at.toISOString().slice(0, 10)
}

/**
 * Splits the days into calendar weeks, keyed by the Sunday that opens each one
 * and placing every day at its own weekday row.
 *
 * Neither the column nor the row is derived from position in the input.
 * `parseContributions` does not check that the payload is contiguous or
 * ascending, and a third-party API does not promise it — pushing in sequence
 * would let one missing day shift every later row, and the grid's rows would
 * stop meaning "weekday" with nothing to signal it.
 */
export function toWeeks(days: readonly ContributionDay[]): ContributionWeek[] {
  const columns = new Map<string, (ContributionDay | null)[]>()

  for (const day of days) {
    const key = weekStart(day.date)
    let column = columns.get(key)
    if (!column) {
      column = Array.from({ length: 7 }, () => null)
      columns.set(key, column)
    }
    column[utc(day.date).getUTCDay()] = day
  }

  return [...columns.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, column]) => column)
}

/** The last `count` weeks, so narrow viewports drop the oldest rather than
 * scrolling or shrinking the cells. */
export function latestWeeks(
  weeks: readonly ContributionWeek[],
  count: number
): ContributionWeek[] {
  return weeks.slice(Math.max(0, weeks.length - Math.max(1, count)))
}
