import { parseDateString, type TimelineDateString } from "@/lib/timeline"

/**
 * The contribution calendar, fetched from a third party in the browser.
 *
 * Kept apart from the components so it can become a build-time step later
 * without touching anything that renders: the presentational layer takes
 * `ContributionCalendar`, not a URL.
 *
 * No token is involved, and none may be — this runs in the client bundle.
 */
const ENDPOINT = "https://github-contributions-api.jogruber.de/v4"

/** 0 = no contributions, 4 = the busiest band. The API assigns these. */
export type ContributionLevel = 0 | 1 | 2 | 3 | 4

export type ContributionDay = {
  /** `YYYY-MM-DD`, already validated, so the site's date formatter accepts it. */
  date: TimelineDateString
  count: number
  level: ContributionLevel
}

export type ContributionCalendar = {
  total: number
  /** Chronological, oldest first. */
  days: ContributionDay[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
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
    const parsed = parseDateString(date)
    if (parsed.day === undefined) {
      throw new Error(`Contribution ${index} date "${date}" is not a full date`)
    }
    if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
      throw new Error(`Contribution ${date} has no usable count`)
    }
    if (
      typeof level !== "number" ||
      !Number.isInteger(level) ||
      level < 0 ||
      level > 4
    ) {
      throw new Error(`Contribution ${date} has level ${String(level)}`)
    }

    return {
      date: date as TimelineDateString,
      count,
      level: level as ContributionLevel,
    }
  })

  return { total, days }
}

export async function fetchContributions(
  login: string,
  signal?: AbortSignal
): Promise<ContributionCalendar> {
  const response = await fetch(
    `${ENDPOINT}/${encodeURIComponent(login)}?y=last`,
    { signal }
  )

  if (!response.ok) {
    throw new Error(
      `Contribution API responded ${response.status} ${response.statusText}`
    )
  }

  return parseContributions(await response.json())
}

/** A calendar column: seven days, Sunday first, padded at the start. */
export type ContributionWeek = (ContributionDay | null)[]

function weekday(date: string): number {
  const { year, month, day } = parseDateString(date)
  return new Date(
    Date.UTC(year, (month as number) - 1, day as number)
  ).getUTCDay()
}

/**
 * Splits the run of days into calendar weeks. The first week is padded with
 * nulls so every column starts on a Sunday — without that the rows stop
 * meaning "weekday" the moment the range does not begin on one.
 */
export function toWeeks(days: readonly ContributionDay[]): ContributionWeek[] {
  if (days.length === 0) {
    return []
  }

  const weeks: ContributionWeek[] = []
  let current: ContributionWeek = Array.from(
    { length: weekday(days[0].date) },
    () => null
  )

  for (const day of days) {
    current.push(day)
    if (current.length === 7) {
      weeks.push(current)
      current = []
    }
  }

  if (current.length > 0) {
    while (current.length < 7) current.push(null)
    weeks.push(current)
  }

  return weeks
}

/** The last `count` weeks, so narrow viewports drop the oldest rather than
 * scrolling or shrinking the cells. */
export function latestWeeks(
  weeks: readonly ContributionWeek[],
  count: number
): ContributionWeek[] {
  return weeks.slice(Math.max(0, weeks.length - Math.max(1, count)))
}
