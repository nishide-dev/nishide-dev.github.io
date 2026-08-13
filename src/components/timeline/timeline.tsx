import { PlainList } from "@/components/plain-list"
import { TimelineItem } from "@/components/timeline/timeline-item"
import {
  formatTimelineDate,
  sortTimelineEvents,
  type TimelineEvent,
} from "@/lib/timeline"

/**
 * One flat, ordered list. An affiliation and an award that happened during it
 * are peers here, exactly as they are in the data — no nested timeline, no
 * separate lane.
 *
 * Repeated dates are suppressed by comparing the *rendered label* with the one
 * above, not by grouping on the period. The two differ: an affiliation and an
 * award can share the month `2024-04` while reading `2024.04 — 現在` and
 * `2024.04`, and grouping would print one of those labels for both. Comparing
 * labels can only ever hide a genuine duplicate, and it never reorders anything.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = sortTimelineEvents(events)
  const labels = sorted.map((event) => formatTimelineDate(event.date))

  if (sorted.length === 0) {
    return null
  }

  return (
    <PlainList as="ol" className="mt-6">
      {sorted.map((event, index) => (
        <TimelineItem
          event={event}
          isLast={index === sorted.length - 1}
          key={event.id}
          label={labels[index]}
          repeatsDate={index > 0 && labels[index] === labels[index - 1]}
        />
      ))}
    </PlainList>
  )
}
