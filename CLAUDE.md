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
├─ lib/                 # utils (cn)
├─ styles/globals.css   # Tailwind v4 entry + design tokens
├─ test/setup.ts        # Vitest setup (jest-dom)
├─ App.tsx
└─ main.tsx
public/                 # Copied verbatim to dist/ (favicon, images)
```

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
  icons). Add components with `pnpm dlx shadcn@latest add <name>`.
- `src/styles/globals.css` imports `shadcn/tailwind.css`, so the `shadcn` package must stay a
  runtime dependency.

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
