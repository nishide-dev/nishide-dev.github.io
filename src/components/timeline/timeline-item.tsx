import { ExternalLink } from "@/components/external-link"
import { PlainList } from "@/components/plain-list"
import type { TimelineEvent } from "@/lib/timeline"
import { cn } from "@/lib/utils"

type TimelineItemProps = {
  event: TimelineEvent
  /** Already formatted — the row does not decide how a date reads. */
  label: string
  /**
   * True when the entry above already shows this exact label. The date is then
   * hidden from sight but kept in the accessibility tree, so no entry loses its
   * date context just because a neighbour shares it.
   */
  repeatsDate: boolean
  isLast: boolean
}

export function TimelineItem({
  event,
  label,
  repeatsDate,
  isLast,
}: TimelineItemProps) {
  // The `<time>` machine value is the start. A range has no single valid one,
  // and the start is what the entry is filed under.
  const dateTime = event.date.start

  return (
    <li
      className={cn(
        // Mobile: the date sits above a marker + content row, so the text keeps
        // the full width. Desktop: date / marker / content in one row.
        "grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3",
        "md:grid-cols-[7rem_1.25rem_minmax(0,1fr)] md:gap-x-5",
        // The gap between entries is padding, not margin, so the connecting
        // line can span it.
        !isLast && "pb-entry"
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
        {/* 9px puts the dot on the centre line of the title's first line box
            (15px text at line-height 1.6 = 24px; 12px − 3px radius). */}
        <span className="mt-[9px] size-1.5 rounded-full bg-muted-foreground" />
        {!isLast && (
          // The gap between entries is the li's padding, which sits outside the
          // grid row — so the line has to reach past the cell by exactly that
          // much to join the next dot instead of stopping short.
          <span className="absolute top-[calc(9px+0.375rem)] -bottom-entry w-px bg-border" />
        )}
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
            {event.details.map((detail) => (
              <li className="before:mr-1.5 before:content-['—']" key={detail}>
                {detail}
              </li>
            ))}
          </PlainList>
        )}

        {event.links && event.links.length > 0 && (
          <PlainList className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {event.links.map((link) => (
              <li key={link.href}>
                <ExternalLink href={link.href} label={link.label} />
              </li>
            ))}
          </PlainList>
        )}
      </div>
    </li>
  )
}
