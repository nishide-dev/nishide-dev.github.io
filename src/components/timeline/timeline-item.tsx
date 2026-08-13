import { ExternalLink } from "@/components/external-link"
import { PlainList } from "@/components/plain-list"
import type { TimelineEvent } from "@/lib/timeline"
import { cn } from "@/lib/utils"

type TimelineItemProps = {
  event: TimelineEvent
  /** Already formatted — the row does not decide how a date reads. */
  label: string
  /**
   * True when the entry above carries this exact label, whether or not that one
   * is itself visible. In a run of three, only the first shows the date; the
   * other two keep it in the accessibility tree, so no entry loses its date
   * context just because a neighbour shares it.
   */
  repeatsDate: boolean
}

export function TimelineItem({ event, label, repeatsDate }: TimelineItemProps) {
  // The `<time>` machine value is the start. A range has no single valid one,
  // and the start is what the entry is filed under. One deliberate divergence:
  // a `fiscal-year` entry reads `2025年度` (Apr 2025 – Mar 2026) while exposing
  // the calendar year `2025`, because HTML has no fiscal-year form either.
  const dateTime = event.date.start

  return (
    <li
      className={cn(
        // Mobile: the date sits above a marker + content row, so the text keeps
        // the full width. Desktop: date / marker / content in one row.
        "group grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3",
        // 7.5rem, not 7: a closed month range — `2025.04 — 2026.03` — measures
        // 112.2px and wrapped to two lines at 112. Every future closed range is
        // that wide, so this is the column's real minimum.
        "md:grid-cols-[7.5rem_1.25rem_minmax(0,1fr)] md:gap-x-5",
        // The gap between entries is padding, not margin, so the connecting
        // line can span it. `:last-child` decides where it stops, rather than a
        // flag a caller could pass inconsistently with the actual position.
        "pb-entry last:pb-0"
      )}
    >
      <div
        className={cn(
          "col-span-2 mb-2 md:col-span-1 md:mb-0",
          // Hidden on mobile so the rows close up; kept as an empty grid cell on
          // desktop so the marker and content stay in their columns.
          repeatsDate && "hidden md:block"
        )}
      >
        {repeatsDate ? null : (
          <time
            className="font-mono text-meta text-muted-foreground"
            dateTime={dateTime}
          >
            {label}
          </time>
        )}
      </div>

      {/* Decorative: the entry order and the dates carry this information. */}
      <div aria-hidden="true" className="relative flex justify-center">
        {/* Lead-in, from the top of the row down to the dot. It completes the
            line the previous entry drew, which stops at the row boundary. On
            mobile it is drawn only when this entry has no date label of its
            own — otherwise it would run through that text. */}
        <span
          className={cn(
            "absolute top-0 h-[9px] w-px bg-border group-first:hidden",
            repeatsDate ? "block" : "hidden md:block"
          )}
        />
        {/* 9px puts the dot on the centre line of the title's first line box
            (15px text at line-height 1.6 = 24px; 12px − 3px radius). A pixel
            value because it tracks one specific type token, not whatever
            inherits here. */}
        <span className="mt-[9px] size-1.5 rounded-full bg-muted-foreground" />
        {/* Runs from below the dot to the row boundary, which is past this
            entry's own content because the gap is padding. */}
        <span className="absolute top-[calc(9px+0.375rem)] -bottom-entry w-px bg-border group-last:hidden" />
      </div>

      <div>
        {repeatsDate && (
          <time className="sr-only" dateTime={dateTime}>
            {label}
          </time>
        )}

        <h3 className="font-medium text-title">{event.title}</h3>

        {event.description && (
          <p className="mt-1.5 text-body text-muted-foreground">
            {event.description}
          </p>
        )}

        {event.details && event.details.length > 0 && (
          <PlainList className="mt-1.5 text-body text-muted-foreground">
            {event.details.map((detail, index) => (
              <li
                className="before:mr-1.5 before:content-['—']"
                // Indexed on purpose: these lists are static and never
                // reordered, and two award citations can legitimately read the
                // same. Keying by content drops the second one in production,
                // where React's duplicate-key warning is stripped.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={index}
              >
                {detail}
              </li>
            ))}
          </PlainList>
        )}

        {event.links && event.links.length > 0 && (
          <PlainList className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {event.links.map((link, index) => (
              <li
                // As above: an abstract and a PDF can legitimately share one
                // href, and keying by it would drop the second link.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={index}
              >
                <ExternalLink href={link.href} label={link.label} />
              </li>
            ))}
          </PlainList>
        )}
      </div>
    </li>
  )
}
