import {
  ACTIVITY_BLOCK_HEIGHT,
  ContributionGrid,
} from "@/components/activity/contribution-grid"
import { useContributions } from "@/components/activity/use-contributions"
import { ErrorBoundary } from "@/components/error-boundary"
import { ExternalLink } from "@/components/external-link"

/**
 * The contribution calendar, as its own section between the intro and the
 * timeline. No card, no surface, no repository ranking — the graph is a texture
 * for the page, not a dashboard.
 *
 * The third-party API is allowed to fail. Loading and failure both keep the
 * heading and the GitHub link, and both reserve the graph's height, so the
 * timeline below never jumps. The boundary sits *inside* the section for the
 * same reason: wrapping the section would take the heading and the link with it
 * and leave the page's outline missing a level 2.
 */
export function GitHubActivity({ login }: { login: string }) {
  const state = useContributions(login)

  return (
    <section aria-labelledby="activity-heading" className="mt-section">
      <div className="flex items-baseline justify-between gap-4">
        {/* The document is `lang="ja"`; an English section label read by a
            Japanese voice is mangled. */}
        <h2
          className="font-mono text-label text-muted-foreground uppercase"
          id="activity-heading"
          lang="en"
        >
          Activity
        </h2>
        <ExternalLink href={`https://github.com/${login}`} label="GitHub" />
      </div>

      <div style={{ minHeight: ACTIVITY_BLOCK_HEIGHT }}>
        {state.status === "ready" ? (
          <ErrorBoundary section="Activity">
            <ContributionGrid calendar={state.calendar} />
          </ErrorBoundary>
        ) : state.status === "error" ? (
          // `status` so a reader already past this point is told, rather than
          // being left with a silent hole.
          <p className="pt-5 text-body text-muted-foreground" role="status">
            GitHub の contribution graph を読み込めませんでした。
          </p>
        ) : null}
      </div>
    </section>
  )
}
