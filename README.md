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
