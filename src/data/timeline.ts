import type { TimelineEvent } from "@/lib/timeline"

/**
 * The timeline content, kept entirely out of the UI.
 *
 * Order here does not matter — `sortTimelineEvents` puts it newest-first, and
 * the tests run `assertValidTimeline` over this array. That function in
 * `src/lib/timeline.ts` is the authority on what is checked; read it rather than
 * a prose copy, which is what this comment used to point at.
 *
 * Conventions:
 *
 * - Dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; precision follows the shape,
 *   so do not restate it. **Never sharpen an unconfirmed date**: if the month is
 *   unknown store `YYYY`, if the day is unknown store `YYYY-MM`. A coarse label
 *   does not flag itself — `2026年` looks like any other date and sorts as
 *   January 1st — so this is a discipline, not something the UI will catch.
 * - `precision: "fiscal-year"` renders 年度, and only on a `YYYY` value: a 年度
 *   runs April to March, so store the fiscal year itself rather than a month
 *   inside it.
 * - Omit `end` for a point in time. Use `"ongoing"` for something still
 *   running. An omitted `end` does not mean ongoing.
 * - **There is no way to relate one entry to another.** `relatedTo` and
 *   `resolveRelated` existed for a detail view that was never built; nothing
 *   rendered them, so the tests passed and read as though the feature worked.
 *   Removed in #27 — `git log -S relatedTo` has the implementation if a detail
 *   view ever arrives. Say the connection in `description` instead, where a
 *   reader can actually see it.
 * - `description` is text, not HTML. Say what was done rather than how
 *   impressive it was, and keep proper nouns in their official spelling —
 *   `microbase` is lowercase.
 * - **An award goes in the title**, not in `details`: a reader scanning
 *   headings never opens the body. `type` still records what the event *was*
 *   (`hackathon`, not `award`). `timeline.test.ts` pins all three titles.
 * - **An ordinal is a confirmed fact, not a guess.** `第32回` is on the ANLP
 *   entry because 言語処理学会年次大会 is annual and 2026 is verifiably the
 *   32nd. EACL is not annual, so its 2026 ordinal is not derivable and is
 *   omitted — inventing one is sharpening a date by another name.
 * - **No entry currently uses `details`.** The renderer and
 *   `assertValidTimeline` still support it, and `timeline.test.tsx` covers it
 *   with fixtures, but nothing in this file exercises it — so a regression
 *   there would not show on the real page.
 */
export const timeline: TimelineEvent[] = [
  {
    id: "navis",
    date: { start: "2026-04" },
    type: "project",
    // The title drops the 学内 qualifier the description carries one line below:
    // repeating it reads as sloppy, and scope is a caveat rather than the
    // headline fact an award would be.
    title: "AI チャットシステム navis を開発",
    description:
      "シラバスや履修ガイド等に関する質問に回答する学内専用の AI チャットシステム navis を開発しました。",
    // Points at the university's syllabus page, not at navis: navis is reachable
    // only from the campus network, so that page is the only thing an outside
    // reader can open.
    //
    // Named rather than spelled as a path, like `Award` and `ACL Anthology`. The
    // path form tried first was `toyota-ti.ac.jp/student/jugyo/syllabus` — 38
    // characters, and in Chromium 141 at a 320px viewport it wrapped after the
    // hyphen (`toyota-` / `ti.ac.jp/...`), a UAX#14 break `/` would not have
    // offered. The column it has to fit is 248px: `px-5` on the page element in
    // `App.tsx` takes 40, and `TimelineItem`'s mobile grid another 32
    // (`grid-cols-[1.25rem_…]` plus `gap-x-3`). `toyota-ti.ac.jp/Lab/kde` is 23
    // and fits, which is why that one stays a path.
    links: [
      {
        label: "Syllabus",
        href: "https://www.toyota-ti.ac.jp/student/jugyo/syllabus.html",
      },
    ],
  },
  {
    id: "eacl-2026-presentation",
    date: { start: "2026-03" },
    type: "presentation",
    // "国際学会" and nothing more: the field is already obvious from the
    // surrounding entries, and the prefix repeats on the accepted entry right
    // below. The full name goes in the description, and only on this one. No
    // ordinal — EACL numbers its conferences, but which number 2026 is has not
    // been confirmed, and inventing one is the same mistake as sharpening a date.
    title: "国際学会 EACL 2026 で論文を発表",
    description:
      "“Mitigating Degree Bias in Hypergraphs via Attribute-as-Structure Approach” を EACL 2026（Conference of the European Chapter of the Association for Computational Linguistics）で発表しました。",
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
    title: "国際学会 EACL 2026 に論文が採択",
    description:
      "“Mitigating Degree Bias in Hypergraphs via Attribute-as-Structure Approach” が EACL 2026 に採択されました。",
  },
  {
    // Renders the same label as the EACL presentation and lands next to it, so
    // only the first of the two prints a date. Which one that is comes down to
    // the `id` tie-break, not a judgement. Give either an `end` and the labels
    // stop matching, at which point both print.
    id: "anlp-2026-award",
    date: { start: "2026-03" },
    type: "award",
    title: "言語処理学会第32回年次大会 若手奨励賞を受賞",
    description:
      "「マルチモーダル知識ハイパーグラフを利用した生物医学分野における知識拡張情報抽出」で、言語処理学会第32回年次大会の若手奨励賞を受賞しました。",
    // The `#y2026` fragment lands on 第32回; without it the reader arrives at
    // the top of a list running back to 1996.
    links: [
      { label: "Award", href: "https://www.anlp.jp/award/nenji.html#y2026" },
    ],
  },
  {
    id: "pksha-2025",
    date: { start: "2025-09" },
    type: "hackathon",
    // The award is in the title, matching anlp-2026-award above. It used to sit
    // in `details`, where a reader scanning headings never saw it. `type` stays
    // "hackathon" — the title now carries both facts, and the type is what the
    // event *was*.
    title: "PKSHA Technology 3days インターンハッカソン 最優秀賞を受賞",
    description:
      "4人チームにアルゴリズムエンジニアとして参加。AI エージェントの社会実装をテーマに、音声対話によって医療の問診や予約を自動化するエージェントを開発しました。",
  },
  {
    id: "project-links",
    date: { start: "2025-04", end: "2026-03" },
    type: "project",
    title: "ProjectLINKS 関連の開発を担当",
    description:
      "microbase のプロジェクトとして、国土交通省 ProjectLINKS 関連の開発を担当。データ構造化アルゴリズムの開発を含むフルスタックな開発に取り組みました。",
    links: [{ label: "ProjectLINKS", href: "https://www.mlit.go.jp/links/" }],
  },
  {
    id: "giiku-camp-2024",
    date: { start: "2024-04" },
    type: "hackathon",
    title: "サポーターズ 技育CAMP2024 努力賞を受賞",
    description:
      "2人チーム「にしもり」で参加。ネットワーク制約下でも利用できるローカル LLM を活用した災害時支援アプリを開発しました。",
  },
  {
    id: "tti-kde",
    date: { start: "2024-04", end: "ongoing" },
    type: "affiliation",
    title: "知識データ工学研究室",
    description:
      "2024年4月より所属。自然言語処理・知識表現に関する研究に取り組んでいます。",
    // The label names the destination rather than repeating the heading one
    // line above it. A preference, not a rule — `Award` and `ProjectLINKS`
    // above are the labels the content issue prescribed.
    links: [
      {
        label: "toyota-ti.ac.jp/Lab/kde",
        href: "https://www.toyota-ti.ac.jp/Lab/kde/ja/",
      },
    ],
  },
  {
    // Third of three entries dated 2024-04, with 技育CAMP and the lab
    // affiliation. All three currently show their own date, but not because the
    // affiliation's label differs — `Timeline` suppresses on `labels[i] ===
    // labels[i - 1]` over the *sorted* list, so what saves these is that the
    // affiliation sorts between the two point entries and separates their two
    // identical `2024.04` labels. That position comes from the `id` tie-break
    // and nothing else. Rename this entry to sort before `tti-kde`, or add a
    // fourth 2024-04 point entry, and one date becomes visually hidden (still
    // `sr-only`, so it is announced). No test covers this.
    id: "tti-kde-site",
    date: { start: "2024-04" },
    type: "project",
    title: "知識データ工学研究室のホームページを制作",
    description: "研究室の立ち上げに伴い、ホームページを設計・実装しました。",
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
