import { ExternalLinks } from "@/components/layout/external-links"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { profile } from "@/data/profile"

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

          <section className="mt-section">
            <h2 className="font-mono text-label text-muted-foreground uppercase">
              Activity
            </h2>
            <p className="mt-3 text-body text-muted-foreground">
              GitHub の contribution graph を表示します。
            </p>
          </section>

          <section className="mt-section">
            <h2 className="font-mono text-label text-muted-foreground uppercase">
              Timeline
            </h2>
            <p className="mt-3 text-body text-muted-foreground">
              所属・研究・受賞・プロジェクトを時系列で表示します。
            </p>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  )
}
