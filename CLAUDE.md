# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses `pnpm` as the package manager. Do not add `package-lock.json` or `yarn.lock`.

```bash
pnpm dev         # Vite dev server (http://localhost:5173)
pnpm build       # tsc -b && vite build → dist/
pnpm preview     # Serve the built dist/ locally
pnpm lint        # biome check .
pnpm format      # biome check --write .
pnpm typecheck   # tsc -b --noEmit
pnpm test        # vitest run
```

Every PR must pass `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

`typecheck` must stay `tsc -b` (not plain `tsc`): the root `tsconfig.json` is solution-style
(`"files": []` + `references`), and plain `tsc` does not follow project references — it would check
zero files and pass vacuously.

## Architecture Overview

A personal portfolio built as a **single-page** React + Vite static site, deployed to GitHub
Pages. The structure is based on [`nishide-dev/react-template`](https://github.com/nishide-dev/react-template).

There is no router: `index.html` → `src/main.tsx` → `src/App.tsx` is the whole entry path. Do not
introduce routing, MDX, or a content-collection layer without a corresponding issue.

```
index.html              # Vite entry; also inlines the pre-hydration theme script
src/
├─ components/
│  ├─ activity/         # github-activity, contribution-grid, use-contributions
│  ├─ layout/           # site-header, external-links, site-footer
│  ├─ timeline/         # timeline, timeline-item
│  ├─ ui/               # shadcn/ui components (Base UI primitives)
│  ├─ error-boundary.tsx # keeps one broken section off the rest of the page
│  ├─ external-link.tsx # the one link treatment (↗ + screen-reader wording)
│  ├─ plain-list.tsx    # list that keeps its semantics under Preflight
│  ├─ theme-provider.tsx
│  └─ theme-toggle.tsx
├─ data/
│  ├─ profile.ts        # identity, intro copy, external links
│  └─ timeline.ts       # timeline content — data only, never JSX
├─ lib/
│  ├─ github-activity.ts # contribution fetch + reshape, no components
│  ├─ links.ts          # Href, Link, and href scheme → link behaviour
│  ├─ timeline.ts       # timeline types + pure format/sort/group helpers
│  └─ utils.ts          # cn()
├─ styles/globals.css   # Tailwind v4 entry + design tokens
├─ test/setup.ts        # Vitest setup (jest-dom, matchMedia, localStorage)
├─ App.tsx
└─ main.tsx
public/                 # Copied verbatim to dist/ (favicon, images)
```

### Timeline data

The timeline is an **activity log, not a CV**: an affiliation and an award that happened during it
are peers on the same axis, not parent and child. Content lives in `src/data/timeline.ts` and never
in JSX; `src/lib/timeline.ts` holds the types and pure functions that format, sort and group it.
There is no CMS, no fetch layer and no markdown parser — and `description` carries text, not HTML.

Dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, and **precision follows the string's shape** — do not
restate it. `precision` exists to display something *coarser* than what is stored; declaring
something finer throws rather than inventing a month or a day. `fiscal-year` is the one precision
that must be declared (2025年 and 2025年度 are the same digits) and it is only valid on a bare
`YYYY`: a 年度 runs April to March, so store the fiscal year itself rather than a month inside it.

`end` is three-valued and this matters: **omitted means a point in time**, `"ongoing"` means still
running, a date means a closed period. The obvious-looking alternative — omitted means ongoing —
cannot express an award, which would render as `2026.03 — 現在`. `end` may be *coarser* than
`start`, and is formatted at its own granularity; borrowing the start's precision reads a month off
a value that has none and prints the literal string `undefined`.

Dates are template-literal typed rather than `string`, so `end: "onging"` is a compile error with a
did-you-mean rather than a throw during render. It is a coarse filter — `parseDateString` still
rejects `2026-3`.

Sorting is newest-first from the date alone, with `id` breaking ties **by code unit, not
`localeCompare`** — that returns 0 for strings differing only by Unicode normalisation, and its
order varies with the runtime's ICU data. A year-precision date sorts as the *start* of its year.
Never hand-order events in a component.

Grouping is keyed by a map, not by comparing against the previous group: dates of differing
precision tie in the sort, so two events of one month can end up separated by a year-precision event
and would otherwise emit that month twice, with duplicate React keys.

`relatedTo` is written once, on whichever side reads more naturally; `resolveRelated` closes the
edge from both directions, so the hub an event hangs off does not resolve to nothing.

`assertValidTimeline` runs over the real data in the tests and reports **every** problem at once,
each named with its event id — duplicate or empty ids, empty titles, malformed dates,
over-declared precision, backwards ranges, self-references, duplicated and dangling `relatedTo`,
plus the things the UI cannot defend against on its own: an empty or duplicated `details` line, a
link with no label, and two links sharing an href. The suite also asserts the array is **non-empty**,
since every other check over it loops and would pass vacuously.

### Writing timeline content

The content issue is the authority on what may be said. Two rules carry real weight:

- **Never widen an unconfirmed date.** A month you are not sure of is stored as `YYYY`, which renders
  `2026年` and sorts at the *start* of that year — visibly out of place among dated neighbours, which
  is the point. Ask, then narrow it.
- **Say what was done, not how impressive it was**, and keep proper nouns exact. `microbase` is
  lowercase; the affiliation is 豊田工業大学大学院 and the lab is 知識データ工学研究室.

A link label names the *destination*, not the entry — repeating the heading one line below it says
nothing, so the two affiliation links read `toyota-ti.ac.jp/Lab/kde` and `microgeo.biz`.

Entries that share a month share one date label, and their order within it is the `id` tie-break, not
a judgement about which matters more. Nothing hand-orders the timeline.

`profile.intro` names no organisation and no year. The timeline carries every affiliation with its
dates, so repeating them in the intro would be a second place to keep current — and nothing in those
two lines goes stale on its own, which an earlier draft's "修士2年" did.

### GitHub activity

`src/components/activity/` renders the contribution calendar between the intro and the timeline.
`src/lib/github-activity.ts` holds the fetch and the reshaping, with no components in it, so a
build-time step could replace `fetchContributions` and leave the rest alone. The *section* still owns
the request — moving to build time means changing its props, not that file.

The endpoint is `github-contributions-api.jogruber.de`, called from the browser with **no token** —
this is the client bundle, so a token would be readable by anyone. `parseContributions` narrows the
response rather than trusting it; a third-party API is not a contract, and `unknown` cast into a
component surfaces as `undefined` in the DOM instead of as a failure the caller can handle.
`FullDateString` is narrower than `TimelineDateString` for the same reason the latter exists: the
grid reads a weekday off every date, and `2026-03` yields `NaN` and misplaces a row rather than
throwing.

**A third party going down is a normal outcome, not an exception.** `useContributions` is
three-valued and `error` is as ordinary as `ready`. Both states keep the heading and the GitHub link
and both reserve the graph's height, so nothing below moves when the request settles. Three details
make that true rather than approximately true:

- **There is an 8s timeout.** A connection that opens and never answers is otherwise a permanent,
  completely silent hole — the browser's own limit is minutes to never.
- **The success path checks `aborted` too.** Aborting does not un-settle a promise whose response has
  already arrived, so without it a superseded request can paint one account's graph under another's
  heading.
- **The `ErrorBoundary` sits inside the section.** Wrapping the section would take the heading, the
  link and a level-2 out of the outline with it.

`toWeeks` keys columns by the Sunday that opens each week and places every day at its own weekday
row. Neither is derived from position in the input: nothing checks that the payload is contiguous or
ascending, and pushing in sequence would let one missing day shift every later row with nothing to
signal it.

Bands are `--activity-0..4`. Bands 1–4 are `color-mix`ed from the palette primitives so editing one
moves them together; band 0 is `--muted`, which is a literal, so it does not follow. Navy in light,
**sand in dark** — the page is already navy there, so the scale has to climb away from the background
rather than into it. `LEVEL_CLASS` spells the class names out because Tailwind scans for literal
strings: `bg-activity-${level}` compiles to nothing.

Cell size is fixed and the *week count* is what responds — a narrow viewport drops the oldest weeks
rather than scrolling or shrinking cells past legibility. Measured 52 columns at 1280px, 48 at 680px,
27 at 390px, 15 at 240px, with no document overflow at any width. The one measurement happens before
the `ResizeObserver` guard, so a browser without one still gets it; skipping it renders all 53 weeks
at 686px inside a 680px measure.

The hovered day is read out in **one fixed spot**, not in a tooltip anchored to the cell. The label
is ~200px against a 350px column on a phone, so any column-anchored position overflows the measure
for some cell — and a predictable place is easier to read than one that moves. The band it occupies
is `pt-` on the positioned wrapper, not `mt-` on the grid: a margin collapses straight out and leaves
the readout painted over the first row of cells.

The grid is one `role="img"` whose label describes **the weeks actually drawn**, not the whole
payload — a phone shows about six months, and announcing a year of it would make the alternative text
non-equivalent to the image. The API's own total is used only when nothing was sliced away.
Per-day counts are hover-only, a deliberate trade: the alternatives are a tab stop or an announced
table cell for every day in the range, and neither serves a reader better than the summary does.

### Timeline UI

`src/components/timeline/` renders one flat `<ol>`: date / marker / content on desktop, date stacked
above marker + content below `md`. An affiliation and an award that happened during it are peers in
the markup, exactly as they are in the data. No card, no badge, no nested *timeline*, no scroll
reveal — an entry's `details` and `links` are nested lists, but the timeline itself has one level.

**Repeated dates are suppressed by comparing the rendered label with the one directly above, not by
calling `groupTimelineEvents`.** Grouping on the period would merge an affiliation and a point event
that share the month `2024-04` but read `2024.04 — 現在` and `2024.04`, printing one label for both
and losing the `— 現在`.

The comparison is deliberately weak, and weak in the right direction: it can only hide a duplicate
that is genuinely adjacent, and it never reorders anything. It does **not** catch every duplicate —
sorting does not guarantee identical labels land next to each other. `sortKey` floors the *stored*
value, not the displayed period, so equal keys break on `id` (a year-precision event ties with
January) and a declared coarser `precision` flattens labels the sort still separates. Both print the
label twice, which is correct: those entries are visually separated and each still needs its date.

A suppressed date is not deleted: it moves into the content cell as `sr-only`, so **every** entry
still announces its own date. On desktop the date cell stays in the grid (empty) so the marker and
content keep their columns; on mobile it is `display: none` so the rows close up.

The connecting line is drawn in two pieces because the entry gap is the `<li>`'s padding, which sits
outside the grid row: one segment runs from the dot to the row boundary, and the next entry draws a
9px lead-in down to its own dot. On mobile that lead-in is drawn only when the entry has no date
label — otherwise the line would run through that text, and the label is the separator there anyway.
Which entry ends the line is decided by `:first-child`/`:last-child`, not by a prop, so there is no
value a caller can pass inconsistently with the actual position.

`PlainList` exists because Preflight sets `list-style: none`, and WebKit responds by dropping list
semantics from the accessibility tree — VoiceOver reads the entries as loose text. `role="list"` is
redundant per spec and load-bearing in practice, so it lives in one component rather than being
re-argued at every call site. It is spread-first and `role` is off its prop type: a component whose
whole purpose is that role must not let a caller hand it away.

`ExternalLink` is the site's one link treatment, so the `↗` and the screen-reader wording cannot
drift apart between the profile row and a timeline entry. Its props are a closed set with no spread,
so `target` and `rel` cannot be overridden either. `Href` (`src/lib/links.ts`) is a template literal
for the same reason `TimelineDateString` is: `"github.com/x"` is a *valid relative path*, so without
it a missing scheme silently resolves against this origin and 404s rather than throwing.

The timeline is the one part of the page rendered from data that can throw — `formatTimelineDate`
rejects rather than coerces — so it sits inside an `ErrorBoundary`. React unmounts the whole tree on
an uncaught render error, and `main.tsx` has nothing above `<App/>`, so one malformed date would
otherwise blank the identity and the links as well. `pnpm test` runs `assertValidTimeline` over the
real data and the deploy workflow tests before it builds, so this is for `pnpm dev`.

### Theming

Dark mode is class-based (`.dark` on `<html>`). Two pieces cooperate:

- The inline script in `index.html` applies the stored/system theme before first paint to avoid a
  flash.
- `src/components/theme-provider.tsx` owns the runtime state, persists to `localStorage` under the
  `theme` key, follows `prefers-color-scheme` when set to `system`, and syncs across tabs.

The two duplicate the same decision, so nothing links them mechanically and three rules keep them
from drifting:

- **Only `dark` is ever toggled.** The script cannot produce a `light` class, so React must not
  either, or the first `.light`-scoped rule breaks first paint alone.
- **Any stored value that is not `light`/`dark` means system.** The whole `nishide-dev.github.io`
  origin shares one `localStorage`, so a stale key from another project page is a real input, and
  disagreeing about it paints one theme then flips.
- **The default theme and the storage key are not props.** The script has to decide before React
  exists and cannot read props, so a configurable default would guarantee the flash it prevents.
  `DEFAULT_THEME` is a module constant for that reason.

The script guards only the storage *read*: reading can throw outright (Safari with cookies blocked,
a sandboxed iframe), and letting that skip the whole block would drop the system preference too and
paint light on a dark OS.

`useTheme()` exposes the **choice**, not the resolved theme. The resolution lives on `<html>` as the
`dark` class and is consumed by CSS, so nothing reads it in JS — and a control should render the
choice anyway, since showing the resolution makes "system, currently light" and "light" identical.

`ThemeToggle` **cycles** system → light → dark rather than toggling. A two-state toggle is a one-way
door out of `system`: the first press pins a theme and nothing in the UI ever restores following the
OS. The template's global `d` keydown shortcut was removed — it fired on Shift+D and during IME
composition on a Japanese page, could not see Base UI's typeahead targets, and was itself a one-way
door out of `system`.

Color tokens live in `src/styles/globals.css` as CSS custom properties under `:root` and `.dark`,
surfaced to Tailwind via `@theme inline`.

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite` — there is no `tailwind.config.js` and no PostCSS config.
- shadcn/ui is configured in `components.json` (`base-nova` style, `neutral` base color, lucide
  icons). Add components with `pnpm dlx shadcn@latest add <name>`, then **read the diff before
  committing**: `cssVariables: true` + `baseColor: neutral` makes the CLI append its own achromatic
  `oklch()` ramp to `globals.css`, which lands after our `:root`/`.dark` blocks at equal specificity
  and silently reverts the palette. `pnpm test` catches it (`expect(css).not.toContain("oklch(")`).
  Components that expect `--sidebar-*` or `--chart-*` will also render unstyled — those token groups
  were dropped, since the design uses neither.
- `src/styles/globals.css` imports `shadcn/tailwind.css`, so the `shadcn` package must stay a
  runtime dependency.
- Source scanning is pinned: `@import "tailwindcss" source(none)` plus explicit `@source` roots.
  With automatic detection on, Tailwind scans the whole repo and compiles class names out of prose
  and config — `contents: read` in `ci.yml` became `.contents{display:contents}`, and rewording
  CLAUDE.md changed the shipped stylesheet.

### Design system

Everything lives in `src/styles/globals.css`. `src/styles/globals.test.ts` enforces the rules below,
so a violation fails `pnpm test` rather than shipping.

**Colour.** Four Color Hunt primitives (`--brand-navy #30364F`, `--brand-slate #ACBAC4`,
`--brand-sand #E1D9BC`, `--brand-cream #F0F0DB`) are the only literal colours; the semantic tokens
reference them with `var()` wherever they are an exact match, so editing a primitive actually
propagates. Components use `bg-background`, `text-muted-foreground`, `border-border` and so on —
**never a hex value**, and never a `--brand-*` primitive.

Dark mode is a separate set of semantic values, not a filter or an inversion. Note that sand is
`--primary` in dark, **not** `--accent`: shadcn treats `--accent` as a subtle hover surface and
inherits body text onto it, so a light sand accent renders cream-on-sand at 1.2:1.

Every ink (`foreground`, `muted-foreground`, `destructive`) is asserted at WCAG AA against *every*
surface (`background`, `card`, `popover`, `muted`, `secondary`, `accent`) in both themes, not just
against the page — `text-muted-foreground` inside a `bg-accent` row is ordinary shadcn markup. That
is why light `--muted-foreground` is navy-toward-slate rather than slate: slate cannot clear 4.5:1
on the sand accent.

**Focus** is one offset outline defined in the base layer, deliberately not per-component. The
template's `outline-none` + `focus-visible:ring-*` painted the ring inside the button, on its own
fill, where `--ring` and `--primary` are both navy — a 1:1 indicator. Do not reintroduce
`outline-none`; it sits in the utilities layer and cancels the base rule.

**Type.** `font-sans` is Geist → Noto Sans JP; `font-mono` is Geist Mono → Noto Sans JP. Noto is in
*both* stacks on purpose: Geist ships no CJK, and Geist Mono additionally lacks U+2197 `↗`, which is
the site's external-link marker and appears inside mono links and `2024.04 — 現在` date labels.
Reordering or dropping Noto hands those glyphs to an arbitrary system font.

The scale is semantic rather than numeric — `text-label`, `text-meta`, `text-micro`, `text-body`,
`text-title`, `text-lead` — each carrying its own line-height. Japanese body copy stays at weight
400/500; 700 is not a default. **A new `--text-*` name must also be registered in
`src/lib/utils.ts`.** tailwind-merge only knows Tailwind's stock scales, so an unregistered name
reads as a text *colour* and `cn("text-title", "text-muted-foreground")` silently drops the size.

**Layout.** `max-w-page` is the 680px measure, and it must sit on its own element with padding on an
ancestor — put both on one border-box element and the column caps at 632px instead. `mt-section`
(48px) separates page sections and `mt-entry` (40px) separates timeline entries. Everything else
uses Tailwind's default spacing scale — do not add tokens for one-off gaps.

**Token emission.** The type/space/radius block is `@theme static`; only the `--color-*` aliases are
`@theme inline`. `inline` compiles a token away into literals, so `var(--container-page)` would
resolve to nothing, and without `static` Tailwind prunes whichever tokens no utility happens to
reference yet.

Fonts are self-hosted through Fontsource; there is no Google Fonts request. Noto Sans JP arrives as
124 unicode-range subsets, so the browser fetches only the chunks a page actually needs, but all of
them ship in `dist/` (~5MB of woff2 across 124 files) and their `@font-face` blocks are the bulk of
the render-blocking stylesheet (~40KB gzipped). Revisit under the quality issue, not here.

### Code Quality

Biome handles both linting and formatting (`biome.json`):

- Double quotes, semicolons as needed, ES5 trailing commas
- 2-space indentation, 80 character line width
- `noUnusedVariables` / `noUnusedImports` are errors
- `useSortedClasses` sorts Tailwind classes in `cn()` and `cva()` calls. It is **warn**-level and
  `biome check` exits 0 on warnings, so CI does not fail on it — it is fixed by `pnpm format` and
  by the pre-commit hook, not by the Lint gate.
- `useIgnoreFile` is on, so `.gitignore` also governs what Biome sees

lefthook runs `biome check --write` on staged files at pre-commit. Note that the `prepare` script
guards on `[ ! -d .git ]`, and `.git` is a *file* inside a git worktree — so working in a worktree
silently gets no pre-commit hook. Run `pnpm lint` manually there.

### Path Aliases

`@/*` resolves to `src/*` — configured in both `vite.config.ts` (bundler) and `tsconfig.app.json`
(types). Keep the two in sync.

### TypeScript

Project references: `tsconfig.json` → `tsconfig.app.json` (`src/`, DOM libs) and
`tsconfig.node.json` (`vite.config.ts`, node types). `strict`, `noUnusedLocals`,
`noUnusedParameters`, and `verbatimModuleSyntax` are all on.

### Testing

Vitest with the jsdom environment and React Testing Library. Co-locate tests next to the code
(`App.test.tsx`, `components/ui/button.test.tsx`).

`src/test/setup.ts` patches four gaps, each of which otherwise fails silently rather than loudly:

- **RTL auto-cleanup.** Vitest runs without `globals: true`, so RTL cannot find a global `afterEach`
  to register with and rendered trees accumulate across tests in a file.
- **The act environment.** The same missing globals mean `setReactActEnvironment` never runs, so
  React's "not wrapped in act(...)" warning is off for the whole suite.
- **`window.matchMedia`.** The stub tracks its listeners and exports `colorScheme` so any test can
  flip the OS preference; a stub whose `addEventListener` is a no-op silently drops the subscription
  and makes that behaviour unobservable.
- **`localStorage`.** Node ships its own global that needs `--localstorage-file` and otherwise
  resolves to an object with *no methods*, shadowing jsdom's. Since `ThemeProvider` wraps storage
  access in try/catch, the resulting `TypeError` was swallowed and theme persistence was never
  actually exercised. An in-memory `Storage` replaces it, which also keeps runs deterministic across
  Node versions.
- **`fetch`.** Replaced with an immediate rejection, so no test can reach the network. A test that
  needs a response stubs it with `vi.stubGlobal` and restores it itself — unlike `localStorage`, this
  one is installed at module scope and not reinstalled by `beforeEach`.

jsdom reports `clientWidth: 0` for everything and has no `ResizeObserver`, so anything that measures
itself is unreachable there until both are stubbed. `github-activity.test.tsx` stubs
`HTMLElement.prototype.clientWidth`; without it the responsive branch never runs and its assertions
pass on the unmeasured fallback.

Storage, the OS preference and the `<html>` class are all global, so `beforeEach` reinstalls them —
reinstalls rather than clears, since a test may have swapped in a throwing stub.

## Deployment

GitHub Pages, from GitHub Actions — there is no Jekyll step and no `gh-pages` branch.

**The Pages publishing source must stay "GitHub Actions"** (`build_type: "workflow"`; check with
`gh api repos/nishide-dev/nishide-dev.github.io/pages`). Switching it back to "Deploy from a
branch" silently breaks the site rather than reverting it: the legacy `pages-build-deployment`
publisher serves `main`'s root verbatim, which means the **unbuilt** `index.html` — it loads
`/src/main.tsx`, which no browser can execute, so the page renders blank while the whole source
tree becomes publicly fetchable. `actions/configure-pages` does **not** flip this back for you on
an already-configured repo; only the repo setting does.

- `.github/workflows/ci.yml` runs on **pull requests only**: lint → typecheck → test → build.
- `.github/workflows/deploy.yml` runs on **pushes to `main`** (and `workflow_dispatch`). Its
  `build` job repeats the same four gates, then uploads `dist/` via `upload-pages-artifact`; a
  separate `deploy` job (`needs: build`) runs `deploy-pages`. Splitting the jobs is what makes a
  red run on main say whether the code or the deployment broke.

Neither workflow pins a pnpm `version:` — `pnpm/action-setup` reads `packageManager` from
package.json. Pinning it there as well makes the action hard-error with
`Multiple versions of pnpm specified`.

This repo is the `nishide-dev.github.io` **user site**, so it is served from `/`. Do not set a Vite
`base` — the built `index.html` must keep referencing `/assets/...`. There is no `404.html` SPA
fallback, because the site is deliberately a single page; adding a router means adding one.

## Roadmap

The rebuild is tracked in issue [#1](https://github.com/nishide-dev/nishide-dev.github.io/issues/1).
Design system, layout, timeline data model, timeline UI, GitHub activity, content, quality, and
deployment each have their own issue — check the relevant one before adding features.
