/**
 * Identity and intro copy, kept out of the components so wording can change
 * without touching JSX. Paragraphs are plain text, not HTML.
 */

export type ProfileLink = {
  label: string
  href: string
}

export const profile = {
  name: "Ryusei Nishide",
  avatar: {
    src: "/github-avatar.png",
    /** Empty: the name sits right next to it, so announcing it twice is noise. */
    alt: "",
  },
  intro: [
    "ソフトウェアエンジニア / 大学院生。",
    "Microbase でソフトウェア開発に携わりながら、知識データ工学研究室で自然言語処理・知識表現に関する研究に取り組んでいます。",
  ],
  /**
   * Only links whose target is confirmed. Scholar / ORCID / ACL Anthology are
   * registered under the content issue once the identifiers are known — a
   * placeholder that 404s is worse than an absence.
   */
  links: [
    { label: "GitHub", href: "https://github.com/nishide-dev" },
    { label: "Email", href: "mailto:nishide.dev@gmail.com" },
  ] as const satisfies readonly ProfileLink[],
  location: "Japan",
} as const
