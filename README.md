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
```

The Playwright suite runs Chromium at desktop and mobile sizes in isolated browser contexts. It starts its own app on port 3210 with a separate `.next-e2e` output folder and synthetic catalog server on port 3211; both ports must be free. It never reuses a running app or personal browser profile. Directory reloads, filters, pagination, detail return navigation, comparison and favorite persistence, clipboard copying, refresh failure recovery, keyboard interaction, and mobile overflow are covered. Workload tests verify ranking with unit charges, named setup save/apply/delete across reloads, and workload-only setups preserving directory filters and comparison.

Browser fixtures use `KILO_MODELS_GATEWAY_URL` for the server-side gateway request in development. Production builds ignore that override and use Kilo. The browser suite intentionally uses a separate development server; CI also checks a normal production build. No live Kilo connection is required by browser tests.

Playwright files end in `.e2e.ts` so `bun test` only runs the unit and component suite. Failed browser runs save screenshots and traces in `test-results/`; use `bun run test:e2e:report` to view the HTML report. GitHub Actions runs lint with zero warnings, unit tests, the production build, and browser tests on pull requests and main-branch pushes.
