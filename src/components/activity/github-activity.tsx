import {
  ContributionGrid,
  GRID_HEIGHT,
} from "@/components/activity/contribution-grid"
import { useContributions } from "@/components/activity/use-contributions"
import { ExternalLink } from "@/components/external-link"
import type { ContributionCalendar } from "@/lib/github-activity"
import { formatTimelineDate } from "@/lib/timeline"

/**
 * The contribution calendar, as its own section between the intro and the
 * timeline. No card, no surface, no repository ranking — the graph is a texture
 * for the page, not a dashboard.
 *
 * The third-party API is allowed to fail. Loading and failure both keep the
 * heading and the GitHub link, and both reserve the graph's height, so the
 * timeline below never jumps.
 */
export function GitHubActivity({ login }: { login: string }) {
  const state = useContributions(login)

  return (
    <section aria-labelledby="activity-heading" className="mt-section">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          className="font-mono text-label text-muted-foreground uppercase"
          id="activity-heading"
        >
          Activity
        </h2>
        <ExternalLink href={`https://github.com/${login}`} label="GitHub" />
      </div>

      {/* Reserved whatever the state, so the page does not reflow when the
          request settles. The month row adds ~18px below the grid. */}
      <div style={{ minHeight: GRID_HEIGHT + 38 }}>
        {state.status === "ready" ? (
          <ContributionGrid
            days={state.calendar.days}
            label={summarise(state.calendar)}
          />
        ) : (
          <p className="mt-5 text-body text-muted-foreground">
            {state.status === "error"
              ? "GitHub の contribution graph を読み込めませんでした。"
              : ""}
          </p>
        )}
      </div>
    </section>
  )
}

/** What someone who never sees the cells gets instead. */
export function summarise(calendar: ContributionCalendar): string {
  const { days, total } = calendar
  if (days.length === 0) {
    return "GitHub の contribution はありません。"
  }

  const from = formatTimelineDate({ start: days[0].date })
  const to = formatTimelineDate({ start: days[days.length - 1].date })
  return `GitHub の contribution graph。${from} から ${to} までの合計 ${total.toLocaleString("en-US")} 件。`
}
