import type { TimelineEvent } from "@/lib/timeline"

/**
 * The timeline content, kept entirely out of the UI.
 *
 * Order here does not matter — `sortTimelineEvents` puts it newest-first, and
 * `assertValidTimeline` (run over this array in the tests) reports duplicate
 * ids, malformed dates, backwards ranges, empty or duplicated detail lines,
 * links with no label, and dangling `relatedTo` references, all at once.
 *
 * Conventions:
 *
 * - Dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; precision follows the shape,
 *   so do not restate it. **Never widen an unconfirmed date into a specific
 *   month** — store the coarser value instead. A year-precision date renders as
 *   `2026年` and sorts at the start of that year.
 * - `precision: "fiscal-year"` renders 年度, and only on a `YYYY` value: a 年度
 *   runs April to March, so store the fiscal year itself rather than a month
 *   inside it.
 * - Omit `end` for a point in time. Use `"ongoing"` for something still
 *   running. An omitted `end` does not mean ongoing.
 * - `relatedTo` is written once, on whichever side reads more naturally;
 *   `resolveRelated` closes the edge from both directions.
 * - `description` is text, not HTML. Say what was done rather than how
 *   impressive it was, and keep proper nouns in their official spelling —
 *   `microbase` is lowercase.
 */
export const timeline: TimelineEvent[] = [
  {
    id: "eacl-2026-presentation",
    date: { start: "2026-03" },
    type: "presentation",
    title: "EACL 2026 で論文を発表",
    description:
      "“Mitigating Degree Bias in Hypergraphs via Attribute-as-Structure Approach” を EACL 2026 で発表しました。",
    relatedTo: ["tti-kde"],
    links: [
      {
        label: "ACL Anthology",
        href: "https://aclanthology.org/2026.eacl-long.81/",
      },
    ],
  },
  {
    id: "eacl-2026-accepted",
    date: { start: "2026-01" },
    type: "publication",
    title: "EACL 2026 に論文が採択",
    description:
      "“Mitigating Degree Bias in Hypergraphs via Attribute-as-Structure Approach” が EACL 2026 に採択されました。",
    relatedTo: ["tti-kde"],
  },
  {
    // Same month as the EACL presentation, so the two share one date label.
    // Which of them comes first is the `id` tie-break, not a judgement.
    id: "anlp-2026-award",
    date: { start: "2026-03" },
    type: "award",
    title: "言語処理学会第32回年次大会 若手奨励賞を受賞",
    description:
      "「マルチモーダル知識ハイパーグラフを利用した生物医学分野における知識拡張情報抽出」で、言語処理学会第32回年次大会の若手奨励賞を受賞しました。",
    relatedTo: ["tti-kde"],
    links: [{ label: "Award", href: "https://www.anlp.jp/award/nenji.html" }],
  },
  {
    id: "pksha-2025",
    date: { start: "2025-09" },
    type: "hackathon",
    title: "PKSHA Technology 3days インターンハッカソン",
    description:
      "4人チームにアルゴリズムエンジニアとして参加。AI エージェントの社会実装をテーマに、音声対話によって医療の問診や予約を自動化するエージェントを開発しました。",
    details: ["最優秀賞"],
  },
  {
    id: "project-links",
    date: { start: "2025-04", end: "2026-03" },
    type: "project",
    title: "ProjectLINKS 関連の開発を担当",
    description:
      "microbase のプロジェクトとして、国土交通省 ProjectLINKS 関連の開発を担当。データ構造化アルゴリズムの開発を含むフルスタックな開発に取り組みました。",
    relatedTo: ["microbase"],
    links: [{ label: "ProjectLINKS", href: "https://www.mlit.go.jp/links/" }],
  },
  {
    id: "giiku-camp-2024",
    date: { start: "2024-04" },
    type: "hackathon",
    title: "サポーターズ 技育CAMP2024",
    description:
      "2人チーム「にしもり」で参加。ネットワーク制約下でも利用できるローカル LLM を活用した災害時支援アプリを開発しました。",
    details: ["努力賞"],
  },
  {
    id: "tti-kde",
    date: { start: "2024-04", end: "ongoing" },
    type: "affiliation",
    title: "知識データ工学研究室",
    description:
      "2024年4月より所属。自然言語処理・知識表現に関する研究に取り組んでいます。",
    // The label is the destination rather than the title again — repeating the
    // heading one line below it says nothing.
    links: [
      {
        label: "toyota-ti.ac.jp/Lab/kde",
        href: "https://www.toyota-ti.ac.jp/Lab/kde/ja/",
      },
    ],
  },
  {
    id: "microbase",
    date: { start: "2022-11", end: "ongoing" },
    type: "affiliation",
    title: "microbase",
    description:
      "2022年11月より長期インターン生として参加。複数のプロジェクトでソフトウェア開発を担当しています。",
    links: [{ label: "microgeo.biz", href: "https://www.microgeo.biz/jp" }],
  },
]
