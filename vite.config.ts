// No `/// <reference types="vite-plus" />`. `vp migrate` writes one, and oxlint
// then flags it as `triple-slash-reference`; removing it instead of suppressing
// the rule is the right way round, because `defineConfig` already carries the
// types for the `test`, `lint` and `fmt` blocks — `pnpm typecheck` reports 0
// errors without it.
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite-plus"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  /* Mapped one-for-one from the biome.json this replaces, so the migration does
     not double as a restyle. Left at oxfmt's Prettier-compatible defaults the
     diff was 56 files and ~2,300 lines — semicolons added everywhere and a wider
     measure — none of which is a consequence of changing toolchain. What remains
     is only where the two formatters genuinely disagree. */
  fmt: {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    semi: false,
    singleQuote: false,
    trailingComma: "es5",
  },
  /* What lefthook ran, moved into the toolchain. Formatting only, deliberately:
     the pre-commit hook exists to keep class order and whitespace out of review
     diffs, not to be a second Lint gate — CI is the gate, and a hook that fails
     a commit for a lint error is a hook people disable.

     Note this repository is often worked on in a git worktree, where `.git` is a
     *file*; the old `prepare` guard (`[ ! -d .git ]`) skipped installing the hook
     there entirely, so a worktree has never had one. `vp hooks enable` sets
     `core.hooksPath`, which a worktree inherits, so this now runs in both. */
  staged: {
    "*.{ts,tsx,js,jsx,mjs,json,jsonc,css,html,md,yaml,yml}": "vp fmt",
  },
  lint: {
    options: {
      // Verified by mutation, not assumed. The root tsconfig is solution-style
      // (`"files": []` + `references`), and CLAUDE.md records that plain `tsc`
      // reads zero files through it and passes vacuously. A deliberate
      // `const x: number = "nope"` was placed in `src/lib/timeline.ts`, and
      // again in `scripts/og-tokens.mjs` — `.mjs`, typed by JSDoc under
      // `checkJs` — and `pnpm typecheck` reported `typescript(TS2322)` for both
      // and exited 1. Both referenced projects are genuinely read.
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: ["oxlint-tailwindcss"],
    settings: {
      tailwindcss: {
        // Required by the plugin, and the same file the build compiles, so the
        // linter resolves this project's own `@theme` tokens rather than stock
        // Tailwind. A wrong entry point fails loud with a single
        // `designSystemUnavailable` rather than silently skipping every rule.
        entryPoint: "src/styles/globals.css",
        // `cn()` and `cva()` build most of this project's class strings.
        // Without these the sort rule sees only bare `className` literals —
        // biome.json carried the same pair for `useSortedClasses`.
        callees: ["cn", "cva"],
      },
    },
    rules: {
      // What `useSortedClasses` was. Kept at warn for the same reason it was
      // warn under Biome: class order changes no output CSS, only diffs, so it
      // is fixed by `pnpm format` rather than failing the Lint gate.
      "tailwindcss/enforce-sort-order": "warn",
      // These three have no Biome equivalent here, and each catches a class
      // that silently does nothing: a misspelt utility compiles to no CSS, and
      // the element loses the style with every test still green — the class-name
      // counterpart of the `--color-*` alias gap `globals.test.ts` guards.
      "tailwindcss/no-unknown-classes": "error",
      "tailwindcss/no-conflicting-classes": "error",
      "tailwindcss/no-duplicate-classes": "error",

      // `scripts/fonts.mjs` spreads a string to iterate code points, which is
      // the unit a font subset is defined in — `unicode-range` lists code
      // points, so decomposing is the required behaviour rather than the bug
      // this rule assumes. Turned off rather than suppressed at the site: it is
      // a type-aware rule, and neither `oxlint-disable-next-line
      // no-misused-spread` nor the `typescript/`-prefixed form silences it
      // (tsgolint's comment suppression is still limited). Nothing else in this
      // project spreads a string.
      "typescript/no-misused-spread": "off",
    },
  },
})
