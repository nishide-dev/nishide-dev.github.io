# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

A personal portfolio: a **single-page** React + Vite static site on GitHub Pages, Japanese content,
one 680px column, timeline-centred. Based on
[`nishide-dev/react-template`](https://github.com/nishide-dev/react-template).

There is no router — `index.html` → `src/main.tsx` → `src/App.tsx` is the whole entry path. Do not
add routing, MDX or a content layer without an issue. Work is tracked from
[#1](https://github.com/nishide-dev/nishide-dev.github.io/issues/1); check the relevant child issue
before adding features.

## Commands

`pnpm` only — never add `package-lock.json` or `yarn.lock`.

```bash
pnpm dev / build / preview
pnpm lint / format          # biome check [--write] .
pnpm typecheck              # tsc -b --noEmit
pnpm test                   # vitest run
pnpm fonts                  # regenerate src/styles/fonts.css
```

Every PR must pass **lint, typecheck, test, build**.

- `typecheck` must stay `tsc -b`. The root tsconfig is solution-style (`"files": []` + `references`),
  and plain `tsc` does not follow references — it checks zero files and passes vacuously.
- Run `pnpm fonts` after adding **any** non-ASCII character under `src/` or to `index.html`,
  comments included. `fonts.test.ts` fails while the generated file is stale.
- In a git worktree `.git` is a *file*, so the `prepare` script's `[ ! -d .git ]` guard skips
  lefthook and there is **no pre-commit hook**. Run `pnpm lint` by hand — and note `useSortedClasses`
  is **warn**-level, so `biome check` exits 0 on it and the Lint gate never fails: class order is
  fixed by `pnpm format` and the hook, which a worktree does not have.
- `verbatimModuleSyntax` is on, so type-only imports must say `import type`. `strict`,
  `noUnusedLocals` and `noUnusedParameters` are on too.

## Commits and PRs

**Subject in English, body in Japanese.** The subject sits beside file and token names in
`git log --oneline`; the body is where reasoning goes, and that is more precise in Japanese. PR titles
and bodies follow the same split. One issue = one PR.

```
<gitmoji> <type>: <imperative subject, no trailing period, ≤ 72 chars incl. the (#NN) squash adds>

<日本語の本文。何をしたかではなく、なぜそうしたか。>
```

`✨ feat` · `🐛 fix` · `⚡️ perf` (quote the numbers) · `♻️ refactor` · `💄 style` · `✏️ content` ·
`✅ test` · `📝 docs` · `🔧 chore` (tooling, deps, CI)

- **Pick the type by what a reader needs to notice**, not by which files changed. A wrong comment
  corrected is `fix`, not `docs`; a test that let a bug through is `fix`, not `test`. `docs` and
  `test` are for changes that add nothing a user or a caller would observe.
- **A body is required for `feat`, `fix`, `perf`, `style` and `content`** — the types where someone
  will later ask why. `chore`, `test` and `docs` may go bodiless when the subject says everything.
- **`update` is retired.** It was the most-used type in the early history and `⚡️` now means `perf`,
  so the same emoji means two things depending on how far back you scroll. Use the specific type.
- Let GitHub's `Revert "…"` subject through unchanged; nothing is gained by rewriting it.
- **The history before this rule does not follow it** — four of the last thirteen subjects are
  Japanese. Do not copy recent commits; the commit that introduced this section is the example.

State what was *measured*, not what was intended, and **name the conditions**: "faster" is not a
measurement, and an FCP number without its throttling preset means nothing. When a review finds
something, say what was wrong rather than what is now right.

Non-obvious files: `public/og.png` and `src/styles/fonts.css` are **generated and committed**
(`scripts/og.mjs` ad hoc, `pnpm fonts`); `src/data/` is data and never JSX; `src/lib/` has no
components; `src/data/site.ts` derives its strings from `profile.ts` and exists so the tests can hold
`index.html` — which duplicates them — to the same values.

`scripts/` is plain `.mjs` so `node scripts/fonts.mjs` needs no build step, and it is **typechecked**:
`tsconfig.node.json` sets `allowJs` + `checkJs` and types come from **JSDoc in the files themselves**,
not a `.d.mts` that can drift from what it describes. Turning `checkJs` on immediately found a real
one — `cp.toString(16)` on a possibly-`undefined` codepoint, which would have replaced a clear "no
subset covers X" error with a `TypeError`. **`scripts/og.mjs` is the one exclusion**: it imports
`playwright`, which is deliberately not installed. Everything checkable was moved into
`og-tokens.mjs` so that exclusion covers the browser driver and nothing else.

`@/*` resolves to `src/*`, declared in **both** `vite.config.ts` (bundler) and `tsconfig.app.json`
(types). **Keep the two in sync**: adding an alias to one only gives a green typecheck with a broken
build, or the reverse.

## Timeline data

An **activity log, not a CV**: an affiliation and an award that happened during it are peers on one
axis. Content in `src/data/timeline.ts`, types and pure helpers in `src/lib/timeline.ts`. No CMS, no
markdown; `description` is text, not HTML.

- Dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD` and **precision follows the string's shape** — do not
  restate it. `precision` may only display something *coarser*; finer throws rather than inventing a
  month. `fiscal-year` must be declared (2025年 and 2025年度 are the same digits) and only on a bare
  `YYYY`, since a 年度 runs April to March. Template-literal typed, so `end: "onging"` is a compile
  error — a coarse filter only, `parseDateString` still rejects `2026-3`.
- **`end` is three-valued**: omitted means a point in time, `"ongoing"` means still running, a date
  means a closed period. "Omitted means ongoing" cannot express an award — it would render
  `2026.03 — 現在`. `end` may be coarser than `start` and formats at its own granularity.
- Sorting is newest-first from the date, then by **rendered label**, then by `id` — both strings **by
  code unit, not `localeCompare`** (which returns 0 for strings differing only by normalisation and
  varies with ICU data). A year-precision date sorts as the start of its year. Never hand-order in a
  component. The label step is there for the UI: dates are suppressed only when adjacent, so equal
  labels within a date tie must sit together — under an `id`-only tie-break that was decided by
  strings the reader cannot see, and three entries dated 2024-04 printed `2024.04` twice because the
  affiliation's `2024.04 — 現在` sorted between the two point events. It does **not** make every
  duplicate adjacent: `precision` can widen a day to a month, so two entries can share a label and
  still differ in sort key. Its visible cost is that a period always follows a point event sharing
  its start date, `"2024.04"` being a prefix of `"2024.04 — 現在"`.
- Grouping is keyed by a map, not by comparing with the previous group: differing precisions tie, so
  two events of one month can be separated by a year-precision event, which **would otherwise** emit
  that month twice with duplicate React keys.
- `assertValidTimeline` runs over the **real data in the tests** and reports every problem at once,
  each named by event id. Read the function for what it checks — a prose copy here would rot. It
  deliberately *allows* duplicate `details` lines and two links sharing an href: the renderer keys
  both by index because those are legitimate, and `timeline.test.tsx` asserts it.
- **There is no way to relate one entry to another.** `relatedTo`/`resolveRelated` were built for a
  detail view that never arrived: four edges in the data, bidirectional resolution, three validation
  branches, seven tests — and no consumer, so the suite was green and read as though the feature
  worked. Removed in #27; `git log -S relatedTo` has it if a detail view is ever built. Until then,
  say the connection in `description`, where a reader can see it. **Speculative structure expires** —
  the cost is not the code, it is that passing tests stop meaning anything.

## Writing content

- **Never sharpen an unconfirmed date.** Month unknown → `YYYY`; day unknown → `YYYY-MM`. A coarse
  label does not flag itself: `2026年` renders like `2026.03` and sorts as January 1st.
- **An ordinal is a confirmed fact, not a guess.** `第32回` is on the ANLP entry because that meeting
  is annual and 2026 is verifiably the 32nd. EACL is not annual, so its ordinal is omitted rather
  than invented — inventing one is sharpening a date by another name.
- **An award goes in the title**, not in `details` — a reader scanning headings never opens the body.
  `type` still records what the event *was* (`hackathon`, not `award`); nothing renders `type`.
- **`国際学会` marks an international venue only.** 言語処理学会第32回年次大会 is a conference too and
  carries no marker, because the marker says *this one was abroad*. The full name goes in the
  description, once.
- **Say what was done, not how impressive it was.** Proper nouns exact: `microbase` is lowercase.
  Prefer a link label naming the *destination* (`toyota-ti.ac.jp/Lab/kde`) over repeating the heading
  above it — a preference, not a rule.
- `profile.test.ts` **affirms** the intro names the university, not only that it avoids things, or it
  could lose it entirely with the suite green. It exempts `M2` by removing it and refusing every
  remaining digit; listing year shapes let `'26`, `R8` and a silent `M2`→`M3` through.
- **`M2` expires in April 2027**, is written in four places, and nothing here will notice —
  [#28](https://github.com/nishide-dev/nishide-dev.github.io/issues/28) has the procedure. **Do not
  add a test that fails on a date**: CI gates every PR and deploy every push, so a canary would block
  an unrelated deploy for someone with no context, and fires identically whether the fix is `M3`,
  `修士課程` or deleting the line.

## Timeline UI

One flat `<ol>`: date / marker / content on desktop, date above marker + content below `md`. No card,
no badge, no nested timeline, no scroll reveal.

- **Repeated dates are suppressed by comparing the rendered label with the one directly above**, not
  by `groupTimelineEvents` — grouping on the period would merge `2024.04 — 現在` and `2024.04` and
  lose the `— 現在`. Deliberately weak: it only hides genuinely adjacent duplicates, never reorders,
  and does not catch every duplicate — separated entries each need their date. A suppressed date is
  not deleted but made `sr-only`, so **every entry announces its own date**.
- The connecting line is two pieces because the entry gap is the `<li>`'s padding, outside the grid
  row. `:first-child`/`:last-child` decide which entry ends it, so no caller can disagree.
- `PlainList` exists because Preflight's `list-style: none` makes WebKit drop list semantics from the
  accessibility tree. `role="list"` is redundant per spec and load-bearing in practice; it is off the
  prop type so a caller cannot hand it away.
- `ExternalLink` is the one link treatment, with closed props — `target` and `rel` cannot be
  overridden. `Href` is a template literal because `"github.com/x"` is a *valid relative path*, so a
  missing scheme would silently resolve against this origin.
- The timeline sits inside an `ErrorBoundary`: `formatTimelineDate` rejects rather than coerces, and
  React unmounts the whole tree on an uncaught render error.

## GitHub activity

`src/lib/github-activity.ts` holds fetch and reshaping with no components, so a build-time step could
replace `fetchContributions`. `github-contributions-api.jogruber.de` is called from the browser with
**no token** — this is the client bundle — and `parseContributions` narrows the response rather than
trusting a third party. `FullDateString` is narrower than `TimelineDateString` for the same reason the
latter exists: the grid reads a weekday off every date, and `2026-03` yields `NaN` and misplaces a row
rather than throwing.

**A third party going down is a normal outcome, not an exception.** `useContributions` is three-valued
and `error` is as ordinary as `ready`; both states keep the heading and reserve the graph's height.

- **An 8s timeout**, because a connection that opens and never answers is otherwise a silent hole.
- **The success path checks `aborted` too** — aborting does not un-settle an already-arrived promise,
  so a superseded request could paint one account's graph under another's heading.
- **The `ErrorBoundary` is inside the section**, or the heading, link and level-2 go with it.
- `toWeeks` keys columns by the Sunday opening each week and each day by its weekday — never by
  position, so a missing day cannot shift every later row. Cell size is fixed and the **week count**
  responds: a narrow viewport drops the oldest weeks. The single measurement runs **before** the
  `ResizeObserver` guard, so a browser without one still gets it.
- `LEVEL_CLASS` spells class names out — Tailwind scans for literals, so `bg-activity-${level}`
  compiles to nothing. Bands 1–4 are `color-mix`ed from the primitives so editing one moves them
  together; **band 0 is `--muted`, a literal, so it does not follow**. Navy in light, **sand in dark**
  — the page is already navy there, so the scale must climb away from the background.
- The hovered day is read out in **one fixed spot** (a ~200px label cannot be anchored in a 350px
  column), as `pt-` on the positioned wrapper rather than `mt-` on the grid — a margin collapses
  straight out and paints the readout over the first row of cells.
- The grid is one `role="img"` labelled with **the weeks actually drawn**, not the whole payload; the
  API's own total is used only when nothing was sliced away.

## Theming

Class-based (`.dark` on `<html>`). The pre-paint script in `index.html` and `theme-provider.tsx`
duplicate the same decision, so three rules keep them from drifting:

- **Only `dark` is ever toggled.** The script cannot produce a `light` class, so React must not.
- **Any stored value that is not `light`/`dark` means system.** The whole origin shares one
  `localStorage`, so a stale key from another project page is a real input.
- **The default theme and storage key are not props** — the script decides before React exists. It
  guards only the storage *read*, which can throw (Safari with cookies blocked); letting that skip
  the whole block would drop the system preference too.

`useTheme()` exposes the **choice**, not the resolution — showing the resolution makes "system,
currently light" and "light" identical. `ThemeToggle` **cycles** system → light → dark; a two-state
toggle is a one-way door out of `system`. The template's global `d` keydown shortcut was removed and
**must not come back**: it fired on Shift+D and during IME composition on a Japanese page, could not
see Base UI's typeahead targets, and was itself a one-way door out of `system`.

## Styling

- Tailwind v4 via `@tailwindcss/vite`. No `tailwind.config.js`, no PostCSS config.
- Source scanning is pinned: `@import "tailwindcss" source(none)` + explicit `@source` roots. With
  auto-detection on, Tailwind compiles class names out of prose and config — `contents: read` in
  `ci.yml` became `.contents{display:contents}`, and rewording this file changed the stylesheet.
- shadcn/ui is configured in `components.json` as **`base-nova`, so components are Base UI, not
  Radix** — `@radix-ui/*` is not installed, and copying from ui.shadcn.com's default docs reaches for
  a package that is not here. Add with `pnpm dlx shadcn@latest add <name>` (which reads
  `components.json` and does the right thing) and **read the diff**: the CLI appends its own
  achromatic `oklch()` ramp after our blocks at equal specificity, silently reverting the palette
  (`pnpm test` catches it). Components wanting `--sidebar-*` or `--chart-*` render unstyled — those
  groups were dropped. **A component that animates renders unanimated**: `tw-animate-css` is not
  installed and Tailwind compiles unknown utilities to nothing. A test fails instead; see Fonts.
- `globals.css` imports `shadcn/tailwind.css`, so `shadcn` stays a runtime dependency.

## Design system

Everything is in `src/styles/globals.css`; `globals.test.ts` enforces it, so a violation fails
`pnpm test` rather than shipping.

**Colour.** Four Color Hunt primitives (`--brand-navy #30364f`, `--brand-slate #acbac4`,
`--brand-sand #e1d9bc`, `--brand-cream #f0f0db`) are pinned by `globals.test.ts`, and semantic tokens
reference them with `var()` wherever they are an exact match so editing a primitive propagates. Where
no primitive matches — most of the `.dark` block — a literal is written **in `globals.css` only**. The
rule the tests enforce is that **a component never carries a hex or a `--brand-*`**: use
`bg-background` and friends. Dark is a separate set of values, not an inversion; sand is `--primary`
there, **not `--accent`**, which shadcn treats as a hover surface with body text on it (1.2:1). Every
ink is asserted at **AA against every surface** in both themes, not just against the page —
`text-muted-foreground` inside a `bg-accent` row is ordinary shadcn markup, which is why light
`--muted-foreground` is navy-toward-slate rather than slate.

**Focus** is one offset outline in the base layer, deliberately not per-component. Do not reintroduce
`outline-none` — it sits in the utilities layer and cancels the base rule. (The template's
`focus-visible:ring-*` painted the ring inside the button, navy on navy: a 1:1 indicator.)

**`--border`/`--input` are control boundaries and clear 3:1 against every surface; `--rule` is the
decorative hairline and deliberately does not.** SC 1.4.11 applies to what identifies a control, not
to a line that separates content — and 3:1 would turn the timeline's connecting line into a rail. The
split is what let `--border` move: before it one token served both, at 1.5:1, correct for the rule and
quietly non-compliant for anything else. The bound on `--rule` is *relative* (`rule < border`), not an
absolute ceiling: WCAG has no maximum contrast, and "make the line easier to see" should not fail CI.

**`shadcn add separator` — and anything else with a hairline — arrives on `bg-border` and needs
changing to `bg-rule`.** shadcn has no separator token, so its components reach for the boundary one;
`hr` is already overridden in the base layer, but a component is not. This belongs on the "read the
diff" checklist above.

`--card`/`--popover` are raised surfaces held a measurable step off `--background` and moving in one
consistent direction. `--card` used to be byte-identical to the page, so the first component to use
one would have rendered invisible — and `not.toBe(background)` does not fix that, since a one-digit
difference is equally invisible; light mode has only 1.07:1 of room to the top of the range, so the
floor is 1.02, not 3:1.

Every token needs its `--color-*` alias in `@theme inline` or **the utility compiles to nothing**:
the class stays in the markup, the token stays in the stylesheet, every contrast assertion still
passes, and the element is transparent. `--color-border` happens to hard-error instead because
`@apply border-border` cannot resolve — that asymmetry is why the alias set is asserted.

None of this changed a pixel: nothing on the page renders a control boundary yet, which is exactly
why it was safe to fix now.

**Type.** Noto is in *both* stacks on purpose: Geist ships no CJK, and Geist Mono also lacks U+2197
`↗`, which appears in mono links and `2024.04 — 現在` labels. Sizes ramp **11 / 12 / 14 / 15 / 20**.

- Two pairs share a size deliberately, each distinguished by another property: `label`/`meta` by
  `letter-spacing`, `title`/`lead` by `line-height`. `globals.test.ts` pins exactly those two pairs —
  a third collision fails — plus the value of `--text-name` and the distinguishing properties.
- The bug that enforces is invisible: the `h1` had been `text-title`, byte-identical to all eight
  timeline headings and smaller than the 24px avatar, so the page's own title read as a caption. **A
  semantic name producing no visible difference from its neighbour names something the design does
  not distinguish.** `App.test.tsx` asserts the `h1` carries `text-name` — without it, reverting
  passed lint, typecheck and the whole suite.
- **A new `--text-*` must be registered in `src/lib/utils.ts`**, or tailwind-merge reads it as a text
  *colour* and `cn()` silently drops the size.
- 16px for the lead was tried and reverted: it split 取り組む across a 110px orphan line, which
  `word-break: auto-phrase` exists to avoid.

**Layout.** `max-w-page` (680px) must sit on its own element with padding on an ancestor — both on one
border-box element caps the column at 632px. `mt-section` (48px) and `mt-entry` (40px) are the only
spacing tokens: **do not add one for a one-off gap**, use Tailwind's scale. Type/space/radius is
`@theme static`; only `--color-*` aliases are `@theme inline`, which compiles a token into literals so
`var(--container-page)` would resolve to nothing — and without `static` Tailwind prunes tokens no
utility references yet.

## Fonts

Self-hosted through Fontsource; no Google Fonts request. Geist and Geist Mono are imported whole, but
**Noto Sans JP is not** — its package entry declares all 124 subsets, which measured **84% of the
render-blocking stylesheet's gzipped bytes** for a page that requests 31, and shipped 5MB of woff2
regardless. `globals.css` imports the generated `./fonts.css` instead: 37.7 → 11.2 KiB gzip, `dist/`
5.83 → 1.18 MiB, render identical to the pixel.

**The subset list is derived, never written down** — Fontsource renumbers these files when coverage
changes. Three details in the corpus rule were each a bug first: it is an **exclude** list, since
allowing `.ts/.tsx/.css/.html` dropped a `.json` data file Vite imports natively; **escapes are
decoded**, since a byte scan reads `"麒"` and `content: "\9e92"` as ASCII; and **test files are
excluded**, matching the `@source not` in globals.css. Scanning source rather than rendered output
over-collects deliberately — under-collecting costs a glyph that falls back silently, over-collecting
~230 B — and `fonts.css` is excluded from its own corpus.

`fonts.test.ts` needs **three** assertions. **Equivalence** (the file matches what the generator would
emit) is the only one catching a wrong `src:` path, a `font-family` nothing requests, or a missing
`font-weight` — all of which leave the page in a system font and all of which passed the coverage-only
version. **Coverage** and **no waste** say something true about the site; equivalence only says the
artifact matches the script, so it cannot see a wrong corpus rule — hence the test imports
`sourceFiles` from the generator rather than keeping a second copy that could agree with it. It
compares whitespace-insensitively because `pnpm format` reformats the generated file; `pnpm fonts`
therefore runs the generator **and** Biome, so it reproduces the committed bytes and a second run is
a no-op.

`font-display: swap` is kept: its CLS is real (aborting every woff2 takes CLS to exactly 0) but
0.0003 against a 0.1 threshold does not justify a `size-adjust` fallback and its drift surface.

**`tw-animate-css` was removed**, dependency and all; `globals.test.ts` fails if a class needing it
appears in `src/` **or `index.html`**. That guard first missed `animate-accordion-*` and
`animate-caret-blink` — declared as `@theme` variables, and exactly what shadcn's Accordion ships,
i.e. the case it existed for — and matched the bare words `running`/`paused`, so `const running = …`
failed CI. If it fires and the class is wanted: reinstall, restore the `@import`, **and delete that
test**, whose last assertion rejects the import by design. `shadcn/tailwind.css` stays (~150 B gzip,
resolved through the `exports` map); `lucide-react` is 40MB installed but ships exactly the three
icons `theme-toggle.tsx` imports — import by name and it stays that way.

## Metadata and SEO

`index.html` is what a crawler and an unfurler read; the built body is `<div id="root"></div>`, so
nothing React renders reaches them. **Vite gives it no way to import a TS module**, so its strings are
duplicated in `src/data/site.ts` and `site.test.ts` fails when the two drift — the only thing holding
the tags together, so do not tidy it away.

- It **parses the file rather than regex-matching it**: the regex version let a stale value in an HTML
  comment satisfy it, allowed the tag to move out of `<head>`, and missed swapped `theme-color` media
  queries. Use `getAttribute("media")` — jsdom's `HTMLMetaElement` IDL has no `.media`.
- **Assert against `globals.css` and the real files, never a literal restated in the test**:
  `theme-color` comes from `--background`, the `og:image` dimensions from the PNG's own IHDR chunk.
  `site.ts` derives `title`/`description` from `profile`, so comparing them back is a tautology —
  only `index.html` holds a second copy that can rot.
- The JSON-LD claims the name, this URL and the GitHub account and **nothing else**; the timeline
  carries affiliations with their dates, and structured data that guesses is structured data that lies.
- `theme-color` is a **hint some UAs use to tint browser chrome**, not what paints behind the page.
  The static metas key on `prefers-color-scheme`, the best a file with no JS can do; because the theme
  is an explicit stored choice, `theme-provider.tsx` overwrites both with the resolved `--background`
  once it runs, reading the computed token rather than restating a hex.

`public/og.png` is committed, not built. `scripts/og.mjs` reads the palette from `globals.css` and the
words from `index.html`'s `og:` tags, which removes drift at *generation* time and no further: **the
PNG does not update itself**, so editing the intro or the palette means running the script again. It
uses the **dark** palette deliberately (a cream card disappears on a white Slack background), and its
**subset numbers come from the package manifest, never written down** — the first version embedded
subset 58 as "the Japanese this card uses"; it holds maths symbols and covered *none* of the 58
characters drawn. Playwright is **not** a dependency (356MB); run the script ad hoc, copied next to a
Playwright install, since Node resolves bare imports from the *script's* directory.

`public/404.html` is a real 404, not an SPA fallback — no history rewrite, no bundle — and exists
because the old Next.js site published `/profile`, `/research` and `/works/*`. `vite preview` serves
`index.html` for unknown paths, so it can only be checked by loading `/404.html` directly. Its palette
is inlined out of necessity — `--background`, `--foreground` and `--muted-foreground` per theme plus
the two `theme-color` metas, eight literals in all. `globals.test.ts` scans only `.tsx?` under `src/`,
so `public/` is outside it, which is why `src/styles/404.test.ts` exists: it asserts all eight against
the resolved tokens plus that the file still has no `<script>`.

## Deployment

GitHub Pages from GitHub Actions; no Jekyll, no `gh-pages` branch.

**The Pages publishing source must stay "GitHub Actions"** (`build_type: "workflow"`; check with
`gh api repos/nishide-dev/nishide-dev.github.io/pages`). Switching to "Deploy from a branch" does not
revert the site, it breaks it: the legacy publisher serves `main`'s root verbatim — the **unbuilt**
`index.html`, which loads `/src/main.tsx` — so the page renders blank and the whole source tree
becomes fetchable. `actions/configure-pages` does **not** flip this back on an already-configured repo.

`ci.yml` runs the four gates on pull requests. `deploy.yml` repeats them on pushes to `main` in a
`build` job that **also uploads `dist/`** as its last step; a separate `deploy` job (`needs: build`)
runs only `deploy-pages`. That split is what makes a red run on `main` say whether the code or the
deployment broke — putting the upload in `deploy` would erase the distinction. Neither workflow pins
a pnpm `version:`, since `pnpm/action-setup` reads `packageManager` and specifying it in **both
places** hard-errors with `Multiple versions of pnpm specified`.

This is the **user site**, served from `/`. Do not set a Vite `base`. There is no SPA fallback and
adding a router would mean adding one.

## Testing

Vitest + jsdom + React Testing Library, tests co-located with the code.

`src/test/setup.ts` patches five gaps that otherwise fail *silently*: RTL auto-cleanup and the act
environment (Vitest runs without `globals: true`), `matchMedia` (the stub tracks listeners and exports
`colorScheme` so tests can flip the OS preference), `localStorage` (Node's own global has no methods
and shadows jsdom's — `ThemeProvider`'s try/catch swallowed the `TypeError`, so persistence was never
exercised), and `fetch` (rejects, so no test reaches the network). Storage, the OS preference and the
`<html>` class are global, so `beforeEach` *reinstalls* rather than clears them.

- jsdom reports `clientWidth: 0` and has no `ResizeObserver`, so anything measuring itself needs both
  stubbed; stubbing `ResizeObserver` alone achieves nothing, as the measurement bails at width 0. It
  *does* resolve custom properties through `getComputedStyle` and respect `.dark`, but only after a
  `<style>` is injected, since the real stylesheet never loads.
- **An assertion behind a guard on its own subject must filter, not branch.**
  `for (link of links) if (target === "_blank") expect(rel)…` reads as coverage and is disabled by
  exactly the regression it exists to catch. Filter first, then assert the filtered set is non-empty.
- **Which side a literal belongs on depends on what else exists.** When a *second real artifact*
  holds the value — `index.html`, `globals.css`, the PNG's IHDR — assert against that artifact, never
  against a hex or a number restated in the test. When the only alternative is the module under test,
  **spell the expectation out**: reading `profile.links` back off `profile.ts` passes for whatever
  that file happens to hold. The two rules point opposite ways on purpose.
- When a review finds a gap, **prove the fix with a mutation**: break the code deliberately and
  confirm the test fails. Several assertions here were added, looked right, and caught nothing.
