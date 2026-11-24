# Kilo Models

Unofficial Next.js directory for browsing, comparing, and estimating the cost of Kilo Gateway AI models.

## Critical

- This is NOT the Next.js you know — the pinned rules block at the end of this file is auto-managed by `next dev` and must stay. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.

## Commands

- `bun install` — install dependencies
- `bun dev` — dev server on `:3000`
- `bun run lint` — ESLint, flat config, zero warnings
- `bun test` — unit/component tests (Bun runner; `node:test` imports, JSX-capable)
- `bun run build` — production build; also type-checks
- No dedicated typecheck script; run `bunx tsc --noEmit` if needed

## Stack

Next.js 16 App Router · React 19 · Tailwind CSS v4 · UI SDK (`@ui-sdk/react`) · nuqs · recharts · lucide-react · Bun. Path alias `@/*` → `./src/*`.

## Detailed guidelines

Read the ones relevant to your task before changing code:

- [Architecture & data flow](docs/agent/architecture.md)
- [Code conventions](docs/agent/conventions.md)
- [UX: simple by default, advanced when needed](docs/agent/ux.md)
- [Testing](docs/agent/testing.md)
- [Model UI data display rules](REVIEW.md)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
