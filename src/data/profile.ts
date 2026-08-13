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
   * Deliberately names no organisation and no year — `profile.test.ts` asserts
   * both. The timeline carries the affiliations worth dating, so repeating one
   * here would be a second place to keep current.
   *
   * This decays far more slowly than the earlier draft's "修士2年", which was
   * wrong every April, but 大学院生 is still a fixed-term status: it becomes
   * false at 修了 with nobody having edited anything.
   */
  intro: [
    "ソフトウェアエンジニア / 大学院生。",
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
