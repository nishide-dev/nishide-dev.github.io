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
   * "修士2年" goes stale on its own — there is no enrolment date here to derive
   * it from, and computing an academic year would silently roll it over every
   * April whether or not that is still true. It lives in this one string on
   * purpose: a data file is the cheapest place to correct it.
   */
  intro: [
    "ソフトウェアエンジニア / 大学院生。豊田工業大学大学院 修士2年、知識データ工学研究室で自然言語処理・知識表現に関する研究に取り組んでいます。",
    "「食わず嫌いをしない」ことを大事にしていて、フロントエンドからインフラ、AI まで、課題解決に必要な技術は領域を問わず学んでいます。",
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
