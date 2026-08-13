import type { TimelineEvent } from "@/lib/timeline"

/**
 * The timeline content, kept entirely out of the UI.
 *
 * Empty on purpose: the model lands here, the actual entries are registered
 * under the content issue. Add events in any order — `sortTimelineEvents`
 * orders them, and `assertValidTimeline` (exercised in the tests) rejects
 * duplicate ids, malformed dates, backwards ranges and dangling `relatedTo`
 * references.
 *
 * Shape reference:
 *
 * ```ts
 * {
 *   id: "example-lab",
 *   date: { start: "2024-04", end: "ongoing" },
 *   type: "affiliation",
 *   title: "○○研究室",
 *   description: "一行の説明。HTML は入れない。",
 *   details: ["補足があれば箇条書きで"],
 *   relatedTo: ["example-paper"],
 *   links: [{ label: "Lab site", href: "https://example.com" }],
 * }
 * ```
 *
 * Dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; precision follows the shape.
 * Set `precision: "fiscal-year"` for 年度. Omit `end` for a point in time, use
 * `"ongoing"` for something still running — an omitted `end` does not mean
 * ongoing.
 */
export const timeline: TimelineEvent[] = []
