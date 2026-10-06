# Kilo Models

An unofficial AI model directory for browsing and comparing 300+ models from the [Kilo](https://kilo.ai) Gateway.

> Not affiliated with or endorsed by Kilo AI.

## Features

- Browse 300+ AI models sourced from the [Kilo API](https://api.kilo.ai)
- Filter by modality (text, image, video, audio), pricing, context length, reasoning, and tool use
- Sort and paginate results
- Grid and list view modes
- Model detail sheet with specs, pricing, and capabilities
- Side-by-side model comparison (up to 10 models)
- Favorites — saved locally in the browser
- Workload-fit and total-budget filters with shareable URL state
- Cost estimates with separate token, cache, image, search, and request charges
- Saved workloads and directory views with rename, update, undo delete, and JSON backups
- Multiple themes

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) + [Recharts](https://recharts.org)
- [nuqs](https://nuqs.47ng.com) for URL state

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Source

Model data is fetched server-side from `https://api.kilo.ai/api/gateway/models` and cached for 1 hour.

## Testing

```bash
bun run lint
bun test
bun run build
bun run test:e2e:install
bun run test:e2e
# Run only automated accessibility checks
bun run test:e2e:a11y
```

The Playwright suite runs desktop Chromium, Firefox, and WebKit, plus mobile Chromium, in isolated browser contexts. It starts its own app on port 3210 with a separate `.next-e2e` output folder and synthetic catalog server on port 3211; both ports must be free. It never reuses a running app or personal browser profile. Directory reloads, filters, pagination, detail return navigation, comparison and favorite persistence, clipboard copying, refresh failure recovery, keyboard interaction, and mobile overflow are covered. Workload tests verify complete billing totals, workload-fit and budget filters, numeric draft editing, and saved setup management and backups across reloads.

Axe scans cover the directory, model detail, comparison overview, and expanded comparison costs. Every supported light/dark theme combination is checked in desktop Chromium, and default light/dark modes are checked in every browser project. Results are attached as JSON to the HTML report. Automated checks complement manual keyboard and visual review; they cannot prove complete accessibility.

Browser fixtures use `KILO_MODELS_GATEWAY_URL` for the server-side gateway request in development. Production builds ignore that override and use Kilo. The browser suite intentionally uses a separate development server; CI also checks a normal production build. No live Kilo connection is required by browser tests.

Playwright files end in `.e2e.ts` so `bun test` only runs the unit and component suite. Failed browser runs save screenshots and traces in `test-results/`; use `bun run test:e2e:report` to view the HTML report. GitHub Actions runs lint with zero warnings, unit tests, the production build, and browser tests on pull requests and main-branch pushes.
