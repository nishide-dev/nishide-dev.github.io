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

      {/* `aria-busy` is the robust half of announcing the wait: it needs no live
          region and no text, and it is on the wrapper rather than the grid so it
          survives the grid swapping its own role from nothing to `img`. */}
      <div
        aria-busy={state.status === "loading" || undefined}
        style={{ minHeight: ACTIVITY_BLOCK_HEIGHT }}
      >
        {state.status === "error" ? (
          // `status` so a reader already past this point is told, rather than
          // being left with a silent hole.
          <p className="pt-5 text-body text-muted-foreground" role="status">
            GitHub の contribution graph を読み込めませんでした。
          </p>
        ) : (
          <ErrorBoundary section="Activity">
            {/* Mounted while loading too, drawing noise until the calendar
                arrives. The grid is one element for the whole request, which is
                what lets the settle be a CSS transition and what makes the
                column count already correct when the data lands — see
                ContributionGrid's docblock. */}
            <ContributionGrid
              calendar={state.status === "ready" ? state.calendar : null}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* The cells are `aria-hidden` while they are noise, so without this the
          wait is silent. Not visible text: the noise already says "loading" to
          anyone who can see it, and a caption would be a second thing to unwind
          on arrival.

          Rendered only while loading rather than kept mounted and emptied. An
          always-present live region is the more reliable way to announce a
          *change*, but this is the first state, so there is no earlier text to
          change from — and an empty `role="status"` left behind would make the
          failure message below ambiguous to anything looking the role up. */}
      {state.status === "loading" && (
        <p className="sr-only" role="status">
          GitHub の contribution graph を読み込んでいます。
        </p>
      )}
    </section>
  )
}
