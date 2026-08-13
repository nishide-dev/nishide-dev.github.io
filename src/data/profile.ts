import type { Link } from "@/lib/links"

/**
 * Identity and intro copy, kept out of the components so wording can change
 * without touching JSX. Paragraphs are plain text, not HTML.
 */

export const profile = {
  name: "Ryusei Nishide",
  /** The account the contribution graph and the GitHub link both point at. */
  github: "nishide-dev",
  avatar: {
    src: "/github-avatar.png",
    /** Empty: the name sits right next to it, so announcing it twice is noise. */
    alt: "",
  },
  /**
   * **M2 goes stale in April 2027**, and nothing here will notice. Revisit it
   * then, or drop to 修士課程, which stays true until 修了.
   *
   * It is written in **four** places, not one, and they are not equally
   * protected. `src/site.test.ts` fails if `index.html`'s two copies drift from
   * this string, so editing here surfaces those. The fourth is `public/og.png`,
   * where the words are **pixels** — no test reads them back, so a correct edit
   * everywhere else still ships a social card saying M2, with the suite green.
   * Run the generator in `scripts/og.mjs`, which says the same thing from its
   * own side.
   *
   * `profile.test.ts` still forbids a *year*: 「2026年」would be wrong on a
   * schedule of months rather than years, and unlike M2 it reads as a fact
   * rather than as a status someone might think to check.
   *
   * "ソフトウェアエンジニア" is deliberately not here. The second paragraph
   * already says software development is what the work is, so naming the role in
   * the first would be the same claim twice.
   */
  intro: [
    "豊田工業大学大学院 M2。",
    "ソフトウェア開発に携わりながら、自然言語処理・知識表現に関する研究に取り組んでいます。",
  ],
  /**
   * Only links whose target is confirmed. Scholar / ORCID are registered once
   * the identifiers are known — a placeholder that 404s is worse than an
   * absence.
   */
  links: [
    { label: "GitHub", href: "https://github.com/nishide-dev" },
    { label: "Email", href: "mailto:nishide.dev@gmail.com" },
  ] as const satisfies readonly Link[],
  location: "Japan",
} as const
