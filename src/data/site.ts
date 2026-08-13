import { profile } from "@/data/profile"

/**
 * Metadata that has to exist in two places: `index.html`, which is what a
 * crawler and an unfurler read before any JavaScript runs, and here, where the
 * tests can compare the two. Vite does not template `index.html`, so the strings
 * are duplicated by necessity — `src/site.test.ts` fails when they drift.
 */
export const site = {
  url: "https://nishide-dev.github.io/",
  title: profile.name,
  /** The intro, joined: one sentence of who and one of what. */
  description: profile.intro.join(""),
  /** 1200×630, generated from the design tokens by scripts/og.mjs. */
  ogImage: "/og.png",
} as const
