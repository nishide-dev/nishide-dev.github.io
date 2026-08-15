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
 * A date is hidden only when the entry directly above carries the same rendered
 * label. That is deliberately weaker than grouping on the period, and weaker in
 * the right direction:
 *
 * - Grouping would merge an affiliation and a point event that share the month
 *   `2024-04` but read `2024.04 — 現在` and `2024.04`, printing one label for
 *   both and losing the `— 現在`.
 * - Comparing labels can only hide a duplicate that is genuinely adjacent. It
 *   never reorders anything, and it never hides a label the reader still needs.
 *
 * It does *not* catch every duplicate. `compareTimelineEvents` orders a date tie
 * by rendered label, so events that tie on the date do land together — a
 * year-precision event can no longer separate two January entries, which it
 * could while ties broke on `id` alone. What survives is the case the sort
 * cannot reach: a declared coarser `precision` flattens two labels whose sort
 * keys differ, so `2024-04-01` and `2024-04-20` at month precision both read
 * `2024.04` while a plain `2024-04-10` sorts between them. That prints the
 * label twice — which is correct, because those entries are visually separated
 * and each still needs its date.
 */
export function Timeline({ events }: { events: readonly TimelineEvent[] }) {
  const sorted = sortTimelineEvents(events)

  if (sorted.length === 0) {
    return null
  }

  const labels = sorted.map((event) => formatTimelineDate(event.date))

  return (
    <PlainList as="ol" className="mt-6">
      {sorted.map((event, index) => (
        <TimelineItem
          event={event}
          key={event.id}
          label={labels[index]}
          repeatsDate={index > 0 && labels[index] === labels[index - 1]}
        />
      ))}
    </PlainList>
  )
}
