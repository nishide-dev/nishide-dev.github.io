import { useLayoutEffect, useRef, useState } from "react"

import {
  type ContributionDay,
  type ContributionLevel,
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
export const GRID_HEIGHT = 7 * COLUMN - GAP

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
    if (!element || typeof ResizeObserver !== "function") {
      return undefined
    }

    const measure = () => {
      const width = element.clientWidth
      if (width === 0) return
      setCount(Math.max(1, Math.min(total, Math.floor((width + GAP) / COLUMN))))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [total])

  return { ref, count }
}

type Hovered = { day: ContributionDay; column: number } | null

export function ContributionGrid({
  days,
  label,
}: {
  days: readonly ContributionDay[]
  /** Summary of the whole graph, for anyone who never sees the cells. */
  label: string
}) {
  const allWeeks = toWeeks(days)
  const { ref, count } = useVisibleWeekCount(allWeeks.length)
  const weeks = latestWeeks(allWeeks, count)
  const [hovered, setHovered] = useState<Hovered>(null)

  return (
    <div className="relative" ref={ref}>
      {/* One tooltip, positioned from the column index — no per-cell node, and
          nothing that can overflow the 680px measure. */}
      <p
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-1 whitespace-nowrap font-mono text-meta text-muted-foreground",
          hovered ? "opacity-100" : "opacity-0"
        )}
        style={{
          left: `min(${hovered ? hovered.column * COLUMN : 0}px, calc(100% - 12rem))`,
        }}
      >
        {hovered ? describeDay(hovered.day) : " "}
      </p>

      <div className="mt-5 flex gap-x-[3px]" role="img" aria-label={label}>
        {weeks.map((week, column) => (
          <div
            className="flex flex-col gap-y-[3px]"
            // Weeks have no identity of their own beyond their position, and
            // the array is rebuilt on every resize.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            key={column}
          >
            {week.map((day, row) => (
              <div
                aria-hidden="true"
                className={cn(
                  "rounded-[2px]",
                  day ? LEVEL_CLASS[day.level] : "bg-transparent"
                )}
                // Same: a padding cell has no identity at all.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={row}
                onMouseEnter={
                  day ? () => setHovered({ day, column }) : undefined
                }
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

/** The month name, on the first column that belongs to a new month. */
function monthLabel(
  weeks: readonly (readonly (ContributionDay | null)[])[],
  column: number
): string | null {
  const first = weeks[column].find((day) => day !== null)
  if (!first) return null

  const month = parseDateString(first.date).month as number
  if (column === 0) {
    // The leading column is usually a partial month; labelling it puts the name
    // over cells that do not belong to it.
    return null
  }

  const previous = weeks[column - 1].find((day) => day !== null)
  if (!previous) return null

  return parseDateString(previous.date).month === month
    ? null
    : MONTHS[month - 1]
}
