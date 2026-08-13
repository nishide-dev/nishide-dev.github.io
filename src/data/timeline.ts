import type { TimelineEvent } from "@/lib/timeline"

/**
 * The timeline content, kept entirely out of the UI.
 *
 * Empty on purpose: the model lands here, the actual entries are registered
 * under the content issue. Add events in any order — `sortTimelineEvents`
 * orders them, and `assertValidTimeline` (exercised in the tests) reports
 * duplicate ids, malformed dates, backwards ranges and dangling `relatedTo`
 * references all at once.
 *
 * Conventions:
 *
 * - Dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; precision follows the shape,
 *   so do not restate it. Never widen a date you are unsure of into a
 *   specific month or day — store the coarser value instead.
 * - `precision: "fiscal-year"` renders 年度, and only on a `YYYY` value: a 年度
 *   runs April to March, so store the fiscal year itself rather than a month
 *   inside it.
 * - Omit `end` for a point in time. Use `"ongoing"` for something still
 *   running. An omitted `end` does not mean ongoing.
 * - `relatedTo` is written once, on whichever side reads more naturally;
 *   `resolveRelated` closes the edge from both directions.
 * - `description` is text, not HTML.
 *
 * `EXAMPLE` below is a real typechecked value rather than a comment, so it
 * cannot drift from the type — copy its shape, not the array itself.
 */
export const EXAMPLE: TimelineEvent[] = [
  {
    id: "example-lab",
    date: { start: "2024-04", end: "ongoing" },
    type: "affiliation",
    title: "○○研究室",
    description: "一行の説明。",
  },
  {
    id: "example-paper",
    date: { start: "2026-03" },
    type: "publication",
    title: "論文タイトル",
    relatedTo: ["example-lab"],
    links: [{ label: "ACL Anthology", href: "https://aclanthology.org/" }],
  },
]

export const timeline: TimelineEvent[] = []
