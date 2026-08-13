import { GitHubActivity } from "@/components/activity/github-activity"
import { ErrorBoundary } from "@/components/error-boundary"
import { ExternalLinks } from "@/components/layout/external-links"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { Timeline } from "@/components/timeline/timeline"
import { profile } from "@/data/profile"
import { timeline } from "@/data/timeline"

export function App() {
  return (
    // Padding sits on the outer element so `max-w-page` is the measure of the
    // text column itself. With both on one border-box element the column caps
    // at 632px, and it narrows by 7px the moment `sm:` engages.
    <div className="px-5 pt-10 pb-16 sm:px-6">
      <div className="mx-auto max-w-page">
        <SiteHeader />

        <main>
          <section className="mt-8">
            {profile.intro.map((paragraph) => (
              <p className="mt-3 text-lead first:mt-0" key={paragraph}>
                {paragraph}
              </p>
            ))}

            <div className="mt-5">
              <ExternalLinks />
            </div>
          </section>

          {/* The section owns its own boundary, so a failure keeps the heading
              and the GitHub link rather than taking the whole section. */}
          <GitHubActivity login={profile.github} />

          {timeline.length > 0 && (
            <section aria-labelledby="timeline-heading" className="mt-section">
              {/* The document is `lang="ja"`; an English section label read by a
                  Japanese voice is mangled. */}
              <h2
                className="font-mono text-label text-muted-foreground uppercase"
                id="timeline-heading"
                lang="en"
              >
                Timeline
              </h2>
              <ErrorBoundary section="Timeline">
                <Timeline events={timeline} />
              </ErrorBoundary>
            </section>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  )
}
