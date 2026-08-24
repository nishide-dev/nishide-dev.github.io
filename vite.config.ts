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
        // Tailwind. A wrong path fails loudly rather than skipping rules
        // silently — pointing it at a non-existent file produced 183 diagnostics
        // here, every class in the project reported as unknown, conflicting or
        // unsorted. Loud, but not the single tidy error this comment first
        // claimed.
        entryPoint: "src/styles/globals.css",
        // `cn()` and `cva()` build most of this project's class strings.
        // Without these the sort rule sees only bare `className` literals —
        // biome.json carried the same pair for `useSortedClasses`.
        callees: ["cn", "cva"],
      },
    },
    categories: {
      // Without this the Lint gate cannot fail. oxlint resolves its enabled set
      // at `warn` — `vp lint --print-config` showed 111 rules, 110 at warn and
      // none at error — and `vp lint` exits 0 on warnings: a `debugger` in
      // `src/lib/utils.ts` was reported and the gate still passed. Biome's
      // `"preset": "recommended"` was error-severity, so this restores what the
      // migration silently dropped rather than tightening anything.
      //
      // The category, not `-D all` on the command line: `all` turns on every
      // rule oxlint ships (`no-magic-numbers`, `capitalized-comments`, …) and
      // reported over 1,400 findings here. A CLI `-D` also overrides a per-rule
      // `"off"` in this block, which would make the exceptions below unusable.
      correctness: "error",
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
      // the unit `unicode-range` is defined in, so decomposing a surrogate pair
      // there is the required behaviour rather than the bug this rule assumes.
      //
      // Off project-wide rather than suppressed at the site, and the reason is
      // narrower than it looks. A correctly placed
      // `// oxlint-disable-next-line typescript/no-misused-spread` *is* honoured
      // by `vp lint` — so the first version of this comment, which claimed
      // type-aware rules cannot be suppressed by comment at all, was wrong. But
      // the type-check gate runs `vp check --no-fmt --no-lint`, and that path
      // still evaluates the rule and **ignores the suppression**: with the
      // directive in place `pnpm lint` exits 0 and `pnpm typecheck` exits 1 on
      // the same line. Nothing else in this project spreads a string.
      "typescript/no-misused-spread": "off",

      // Not enabled, deliberately, and the seven index-key suppressions this
      // migration removed are therefore unguarded. `react/no-array-index-key`
      // was Biome's `noArrayIndexKey`, and it does work — an earlier probe
      // concluded it was a no-op, but oxlint's react plugin is **off by
      // default** (`vp lint --help`: "Enable react plugin, which is turned off
      // by default"), which is why the rule validated its own name and never
      // fired.
      //
      // Restoring it is not free and is not this PR's job: `plugins: ["react"]`
      // alone does not fire it either (it is outside `correctness`), so it needs
      // an explicit entry, and turning the plugin on surfaces two
      // `react/set-state-in-effect` errors — the width measurement in
      // `contribution-grid.tsx` and the loading reset in `use-contributions.ts`,
      // both of which are the "synchronizing with an external system" case the
      // rule's own help text exempts. That is nine suppressions and a judgement
      // call about a rule this project did not previously run, which belongs in
      // its own change.
      // "react/no-array-index-key": "error",
    },
  },
})
