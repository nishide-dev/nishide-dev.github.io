import { profile } from "@/data/profile"

/**
 * Metadata that has to exist in two places: `index.html`, which is what a
 * crawler and an unfurler read before any JavaScript runs, and here, where the
 * tests can compare the two.
 *
 * Vite gives `index.html` no way to import a TS module — `%ENV%` substitution
 * and a `transformIndexHtml` plugin are the two routes, and both mean build
 * plumbing — so the strings are duplicated by choice, and `src/site.test.ts`
 * fails when they drift. Note that `title` and `description` are *derived* from
 * `profile` here, so comparing them back to it proves nothing; only the tags in
 * `index.html` are a second copy that can rot.
 */
export const site = {
  url: "https://nishide-dev.github.io/",
  title: profile.name,
  /** The intro, joined: one sentence of who and one of what. */
  description: profile.intro.join(""),
  /** 1200×630, generated from the design tokens by scripts/og.mjs. */
  ogImage: "/og.png",
} as const
