import { useLayoutEffect, useRef, useState } from "react"

import {
  type ContributionCalendar,
  type ContributionDay,
  type ContributionLevel,
  type ContributionWeek,
  latestWeeks,
  toWeeks,
} from "@/lib/github-activity"
import { formatTimelineDate, parseDateString } from "@/lib/timeline"
import { cn } from "@/lib/utils"

/** Written out rather than composed, because Tailwind scans for literal class
 * names — `bg-activity-${level}` compiles to nothing. */
const LEVEL_CLASS: Record<ContributionLevel, string> = {
  0: "bg-activity-0",
  1: "bg-activity-1",
  2: "bg-activity-2",
  3: "bg-activity-3",
  4: "bg-activity-4",
}

/** 10px cell + 3px gap. Fixed, so a narrow viewport drops weeks instead of
 * shrinking the cells past the point of being readable. */
const CELL = 10
const GAP = 3
const COLUMN = CELL + GAP
const GRID_HEIGHT = 7 * COLUMN - GAP

/** The band the tooltip occupies, as *padding* on the positioned wrapper. A
 * margin on the grid would collapse straight out of it and leave the tooltip
 * painted on top of the first row of cells. */
const TOOLTIP_BAND = 20

/** Month names are absolutely positioned, so the row itself lays out as 0px —
 * this is the space their line boxes paint into. */
const MONTH_ROW = 6 + 18

/** What the section reserves, so nothing below it moves when the request
 * settles. Exported so the reservation cannot drift from the layout. */
export const ACTIVITY_BLOCK_HEIGHT = TOOLTIP_BAND + GRID_HEIGHT + MONTH_ROW

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** Weeks that fit the measured width, or all of them until it is measured. */
function useVisibleWeekCount(total: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(total)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return undefined
    }

    const measure = () => {
      const width = element.clientWidth
      if (width === 0) return
      setCount(Math.max(1, Math.floor((width + GAP) / COLUMN)))
    }

    // Before the guard: a browser without ResizeObserver still deserves the one
    // measurement it can have. Without it the grid renders every week, which at
    // 53 columns is 686px inside a 680px measure.
    measure()

    if (typeof ResizeObserver !== "function") {
      return undefined
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, count }
}

type Hovered = ContributionDay | null

export function ContributionGrid({
  calendar,
}: {
  calendar: ContributionCalendar
}) {
  const allWeeks = toWeeks(calendar.days)
  const { ref, count } = useVisibleWeekCount(allWeeks.length)
  const weeks = latestWeeks(allWeeks, count)
  const [hovered, setHovered] = useState<Hovered>(null)

  return (
    // `pt-` not `mt-` on the grid: padding does not margin-collapse, so the
    // tooltip's band stays inside the positioned box.
    <div className="relative pt-5" ref={ref}>
      {/* A readout in one fixed place rather than a tooltip anchored to the
          cell. The label is ~200px wide against a 350px column on a phone, so
          any column-anchored position overflows the measure for some cell; and
          a predictable spot is easier to read than one that moves under the
          pointer. `truncate` is belt and braces. */}
      <p
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 left-0 max-w-full truncate font-mono text-meta text-muted-foreground",
          hovered ? "opacity-100" : "opacity-0"
        )}
      >
        {hovered ? describeDay(hovered) : " "}
      </p>

      <div
        aria-label={summarise(calendar, weeks)}
        className="flex gap-x-[3px]"
        role="img"
      >
        {weeks.map((week, column) => (
          <div
            className="flex flex-col gap-y-[3px]"
            // Weeks have no identity beyond their position, and the array is
            // rebuilt on every resize.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            key={column}
          >
            {week.map((day, row) => (
              <div
                aria-hidden="true"
                className={cn(
                  "rounded-[2px]",
                  // A day outside the range is not a level-0 day: level 0 is a
                  // real band, and painting the padding with it would read as
                  // activity that has no date.
                  day ? LEVEL_CLASS[day.level] : "bg-transparent"
                )}
                // Same: a padding cell has no identity at all.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={row}
                onMouseEnter={day ? () => setHovered(day) : undefined}
                onMouseLeave={day ? () => setHovered(null) : undefined}
                style={{ height: CELL, width: CELL }}
              />
            ))}
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="mt-1.5 flex gap-x-[3px] font-mono text-micro text-muted-foreground"
      >
        {weeks.map((_, column) => {
          const month = monthLabel(weeks, column)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: as above
            <span className="relative" key={column} style={{ width: CELL }}>
              {month && <span className="absolute top-0 left-0">{month}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** `12 contributions · 2026.08.04` */
function describeDay(day: ContributionDay): string {
  const unit = day.count === 1 ? "contribution" : "contributions"
  return `${day.count} ${unit} · ${formatTimelineDate({ start: day.date })}`
}

/**
 * What someone who never sees the cells gets instead — describing the weeks
 * actually drawn, not the whole payload. A narrow viewport shows roughly six
 * months, and announcing a year of it would make the alternative text
 * non-equivalent to the image.
 */
export function summarise(
  calendar: ContributionCalendar,
  weeks: readonly ContributionWeek[]
): string {
  const visible = weeks.flatMap((week) =>
    week.filter((day): day is ContributionDay => day !== null)
  )
  if (visible.length === 0) {
    return "GitHub の contribution はありません。"
  }

  // The API's own total is authoritative when nothing was dropped; once weeks
  // are sliced away it would overstate what is on screen.
  const complete = visible.length === calendar.days.length
  const total = complete
    ? calendar.total
    : visible.reduce((sum, day) => sum + day.count, 0)

  const from = formatTimelineDate({ start: visible[0].date })
  const to = formatTimelineDate({ start: visible[visible.length - 1].date })
  return `GitHub の contribution graph。${from} から ${to} までの合計 ${total.toLocaleString("en-US")} 件。`
}

/** The month name, on the first column that belongs to a new month. */
function monthLabel(
  weeks: readonly ContributionWeek[],
  column: number
): string | null {
  // Column 0's month almost always began before the visible range — always,
  // once weeks have been sliced off — so a label there would mark a boundary
  // that is not in the graph.
  if (column === 0) {
    return null
  }

  const first = weeks[column].find((day) => day !== null)
  const previous = weeks[column - 1].find((day) => day !== null)
  if (!first || !previous) return null

  const month = parseDateString(first.date).month as number
  return parseDateString(previous.date).month === month
    ? null
    : MONTHS[month - 1]
}
