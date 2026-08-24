import { useEffect, useLayoutEffect, useRef, useState } from "react"

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

/** Columns to draw before the calendar arrives. 53 is the widest a year's graph
 * gets, and the layout effect clamps it to the measured width before paint, so
 * the placeholder is never *wider* than the viewport allows. It is not clamped
 * against the payload: an account with less than a year of history narrows the
 * grid on arrival, and the surplus noise columns unmount rather than fade. The
 * API returns a full year, so that is theoretical. */
const MAX_WEEKS = 53

/** Must match `--animate-activity-noise` in globals.css: cells are spread
 * across the cycle by a negative delay, which needs the cycle's length. */
const NOISE_CYCLE = 1900

/**
 * The settle, in ms: per-column stagger, per-cell jitter, and the fade itself.
 *
 * `background-color` cannot carry this, and the reason is the *end* of the
 * transition rather than its start. css-transitions-1 computes the after-change
 * style using the `animation-*` values from the before-change style, and says so
 * explicitly: it "does not differ from the before-change style due to newly
 * created or canceled CSS Animations". Cancelling the animation therefore
 * produces no computed change for `background-color`, no transition is ever
 * generated, and the property jumps when the animation stops applying. (The
 * start value is not the problem — before-change style *does* include the
 * running animation's current value.) Measured in Chromium 141: 169 frames after
 * the class swap held exactly one colour, with `transition-duration: 0.42s` and
 * a per-cell `transition-delay` both correctly applied and both doing nothing.
 *
 * So the noise is a layer of its own over the real grid, and what transitions is
 * its `opacity` — which nothing is animating, so no animation suppresses it.
 * The real cells underneath are already correct by the time it clears.
 *
 * That is the whole reason. It is *not* a compositing win: this design still
 * ends with one opacity transition per cell, and adds an infinite
 * `background-color` animation per cell on top, which composites not at all. The
 * paint is affordable either way — 371 cells of 10x10px is ~37,000px² — so the
 * argument for the layer is that the other version does not work, not that this
 * one is cheaper.
 */
const SETTLE_STAGGER = 7
const SETTLE_JITTER = 90
const SETTLE_FADE = 420

/** When the last cell has finished fading, so the noise layer can be dropped
 * rather than left running an infinite animation behind an invisible element. */
const SETTLE_TOTAL = MAX_WEEKS * SETTLE_STAGGER + SETTLE_JITTER + SETTLE_FADE

/**
 * A stable 0..1 from a cell's position in the grid.
 *
 * Not `Math.random()`: the placeholder would differ between renders, so React
 * re-running a render would visibly reshuffle the noise, and a test could not
 * assert anything about it. Position is the only identity a cell has before the
 * calendar arrives — a padding cell has no date, which is why `toWeeks` keys by
 * weekday rather than by day.
 */
function cellPhase(column: number, row: number): number {
  const hashed = Math.imul(column * 73 + row * 151 + 1, 2654435761) >>> 0
  return (hashed % 1000) / 1000
}

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

/** Seven nulls, so a placeholder column renders the same seven nodes a real one
 * does. A fresh array per column would work too; this one is never mutated. */
const EMPTY_WEEK: ContributionWeek = [null, null, null, null, null, null, null]

/**
 * Whether the noise layer should still be in the tree.
 *
 * It outlives `calendar` arriving by one full settle, because the layer *is* the
 * transition — unmount it the moment the data lands and the fade never runs.
 * Once clear it goes, so an infinite animation is not left painting behind an
 * invisible element for the life of the page.
 *
 * Tracks `settled` rather than `mounted`, and depends on `loading` alone. The
 * first version latched: once the timer had fired, the guard it needed to re-arm
 * (`!mounted`) was exactly the state it had just entered, so a second wait drew a
 * flat grid with no noise and no fade. `login` is a constant here so nothing
 * reached it, but a hook whose job is to re-arm should not work only once.
 */
function useNoiseLayer(loading: boolean): boolean {
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (loading) {
      setSettled(false)
      return undefined
    }
    const timer = setTimeout(() => setSettled(true), SETTLE_TOTAL)
    return () => clearTimeout(timer)
  }, [loading])

  return !settled
}

type Hovered = ContributionDay | null

/**
 * `calendar` is null while the request is in flight, and the grid draws noise.
 *
 * One component rather than a skeleton beside a graph, because the settle is a
 * CSS transition and a transition needs the *same* DOM node either side of the
 * change. React only reuses a node when its type, position and key all match, so
 * the placeholder has to render the identical tree — same wrapper, same columns,
 * seven cells each, same keys — and change nothing but the class. Split it into
 * a second component and the nodes are replaced, the transition never fires, and
 * the graph snaps in exactly as it does today.
 *
 * It also means the measurement is shared by construction: this element is
 * mounted for the whole request, so the column count is already correct when the
 * data lands. A separate skeleton would have to guess, and guessing wrong
 * re-flows the grid on arrival — worse than the gap it set out to fill.
 */
export function ContributionGrid({
  calendar,
}: {
  calendar: ContributionCalendar | null
}) {
  const allWeeks = calendar ? toWeeks(calendar.days) : null
  const { ref, count } = useVisibleWeekCount(allWeeks?.length ?? MAX_WEEKS)
  const weeks = allWeeks ? latestWeeks(allWeeks, count) : null
  const columns = weeks ?? Array.from({ length: count }, () => null)
  const [hovered, setHovered] = useState<Hovered>(null)
  const noise = useNoiseLayer(weeks === null)

  /* Built as one object because biome's useAriaPropsSupportedByRole cannot see
     that two ternaries share a condition: written as separate conditional
     attributes it reads the div as label-without-role and flags it, even though
     that combination is unreachable here. `aria-label` on the generic role
     really is invalid, which is why the rule exists — this spread moves the pair
     beyond its analysis rather than fixing a bug. Announced as an image only
     once it *is* one: while
     `calendar` is null the cells are noise, and labelling noise with a
     contribution summary would state a number nothing measured, the same
     mistake as structured data that guesses. `GitHubActivity` announces the
     wait, which is where the failure announces itself too. */
  const gridAria = weeks
    ? {
        "aria-label": summarise(calendar as ContributionCalendar, weeks),
        role: "img",
      }
    : { "aria-hidden": true }

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

      <div className="relative">
        <div {...gridAria} className="flex gap-x-[3px]">
          {columns.map((week, column) => (
            <div
              className="flex flex-col gap-y-[3px]"
              // Weeks have no identity beyond their position, and the array is
              // rebuilt on every resize.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              key={column}
            >
              {(week ?? EMPTY_WEEK).map((day, row) => (
                <div
                  aria-hidden="true"
                  className={cn(
                    "rounded-[2px]",
                    // Before the calendar arrives every cell rests at the empty
                    // band rather than `bg-transparent`. Nothing ever sees it:
                    // the layer above is opaque, and under reduced motion it
                    // reverts to this same colour rather than disappearing, so
                    // the two are indistinguishable until it clears. Keeping
                    // them equal is the point — a `bg-transparent` grid would
                    // show through as a hole the moment the flips begin.
                    week
                      ? // A day outside the range is not a level-0 day: level 0
                        // is a real band, and painting the padding with it would
                        // read as activity that has no date.
                        day
                        ? LEVEL_CLASS[day.level]
                        : "bg-transparent"
                      : "bg-activity-0"
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

        {/* The noise, over the real grid rather than instead of it. Same fixed
            cell and gap sizes, so `inset-0` lines the two up exactly.

            `pointer-events-none` because this layer outlives the graph becoming
            visible by a full settle, and an `opacity-0` element is still the
            topmost hit target. Without it, measured in Chromium 141, hovering a
            cell did nothing for ~880ms after the data landed — the readout stayed
            blank through the exact window a reader first reaches for the graph.
            The hover readout above carries the same class for the same reason. */}
        {noise && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex gap-x-[3px]"
            data-testid="activity-noise"
          >
            {columns.map((_, column) => (
              <div
                className="flex flex-col gap-y-[3px]"
                // biome-ignore lint/suspicious/noArrayIndexKey: as above
                key={column}
              >
                {EMPTY_WEEK.map((_, row) => {
                  const phase = cellPhase(column, row)
                  return (
                    <div
                      className={cn(
                        "rounded-[2px] transition-opacity ease-out",
                        // `bg-activity-0` is the base the animation paints over,
                        // and the colour a cell reverts to when the
                        // reduced-motion kill-switch ends the animation in
                        // 0.01ms — a still empty grid rather than whichever
                        // keyframe happened to be last.
                        "animate-activity-noise bg-activity-0",
                        weeks ? "opacity-0" : "opacity-100"
                      )}
                      // biome-ignore lint/suspicious/noArrayIndexKey: as above
                      key={row}
                      style={{
                        height: CELL,
                        width: CELL,
                        // Negative: every cell is already mid-cycle on the first
                        // frame. A positive delay would hold cells at the base
                        // colour and fill the grid in from the left, which is
                        // the wait this replaces.
                        animationDelay: `-${((phase * 0.75 + column * 0.035) % 1) * NOISE_CYCLE}ms`,
                        transitionDuration: `${SETTLE_FADE}ms`,
                        // Left to right, so the reveal reads as a sweep rather
                        // than one cross-fade, with enough jitter that the front
                        // is ragged instead of a moving line.
                        transitionDelay: `${column * SETTLE_STAGGER + phase * SETTLE_JITTER}ms`,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        aria-hidden="true"
        className="mt-1.5 flex gap-x-[3px] font-mono text-micro text-muted-foreground"
      >
        {columns.map((_, column) => {
          const month = weeks ? monthLabel(weeks, column) : null
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
