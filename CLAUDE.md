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
│  ├─ ui/               # shadcn/ui components (Base UI primitives)
│  └─ theme-provider.tsx
├─ data/timeline.ts     # timeline content — data only, never JSX
├─ lib/
│  ├─ timeline.ts       # timeline types + pure format/sort/group helpers
│  └─ utils.ts          # cn()
├─ styles/globals.css   # Tailwind v4 entry + design tokens
├─ test/setup.ts        # Vitest setup (jest-dom)
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
over-declared precision, backwards ranges, self-references, duplicated and dangling `relatedTo`.

### Theming

Dark mode is class-based (`.dark` on `<html>`). Two pieces cooperate:

- The inline script in `index.html` applies the stored/system theme before first paint to avoid a
  flash.
- `src/components/theme-provider.tsx` owns the runtime state, persists to `localStorage` under the
  `theme` key, follows `prefers-color-scheme` when set to `system`, syncs across tabs, and binds a
  `d` keydown shortcut to toggle themes.

The two duplicate the same decision, so a change to the storage key, the default theme, or the
class names has to be made in both places — nothing links them mechanically.

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
