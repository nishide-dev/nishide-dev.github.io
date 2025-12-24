# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses `pnpm` as the package manager.

```bash
pnpm dev           # Start development server at localhost:3000
pnpm build         # Build for production
pnpm start         # Start production server
pnpm lint          # Lint code with Biome
pnpm format        # Format code with Biome
pnpm check         # Lint and format with Biome (--write)
```

## Architecture Overview

This is a portfolio website built as a VS Code-themed IDE interface. The app uses Next.js 16 with the App Router and renders markdown/MDX content in an interactive code editor-like UI.

### Content System

All content is stored in `/content` directory as Markdown (.md) or MDX (.mdx) files:
- Content files support frontmatter metadata (id, filename, icon, lang, tags, thumbnail)
- The `lib/files.ts` module reads all content files recursively at build time
- MDX files are serialized using `next-mdx-remote` for rendering custom components
- Files are indexed by their frontmatter `id` field (or derived from path if not specified)

Content files are structured as:
```
content/
  ├── profile.md
  ├── works.mdx          # Main works page with <ProjectGrid /> component
  ├── contact.md
  └── works/
      ├── microbase.md
      └── resq-link.md
```

### UI Architecture

The main interface simulates a VS Code IDE with these components (all in `/components/ide/`):
- **TitleBar**: Top bar with window controls
- **ActivityBar**: Left sidebar navigation
- **EditorArea**: Main content display with tabs
- **Terminal**: Bottom panel with command-line interface for navigation
- **StatusBar**: Bottom status indicator

The IDE layout is client-side (`IdeLayout` component) and manages:
- File system state (from server-rendered content)
- Open tabs and active tab state
- Terminal command history
- File navigation via terminal commands

### Terminal Commands

Users navigate the portfolio via terminal commands:
- `/clear` - Clear terminal history
- `/close` - Close all tabs
- `/<file-id>` - Open a file (e.g., `/profile`, `/works/microbase`)



### MDX Components

Custom MDX components are in `/components/mdx/`:
- `ProjectGrid` - Renders project cards from content/works/*.md files
- `ProjectCard` - Individual project card with thumbnail and metadata

### Styling

- Uses Tailwind CSS v4 with custom IDE theme colors
- CSS custom properties prefixed with `--ide-` (e.g., `--ide-bg`, `--ide-text`)
- Configured with shadcn/ui (New York style) but most components are custom-built

### Code Quality

Biome is used for linting and formatting with these key rules:
- Double quotes for strings (`quoteStyle: "double"`)
- Semicolons as needed (`semicolons: "asNeeded"`)
- 2 space indentation
- 100 character line width
- Arrow parentheses always included
- No unused variables (error)
- No explicit any (warn)

### Path Aliases

TypeScript paths are configured with `@/*` pointing to project root:
- `@/components` - Component imports
- `@/lib` - Utility functions
- `@/hooks` - React hooks (if added)
