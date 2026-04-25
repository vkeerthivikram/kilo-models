# Kilo Models Directory — Feature Enhancements

**Date:** 2026-04-25
**Status:** Approved (all sections)

## Overview

Five parallel features for the Kilo Models Directory (Next.js 16 + shadcn/ui + Tailwind v4):

1. Sorting + Pagination
2. URL State Management
3. Favorites System
4. Individual Model Pages
5. Pricing Calculator + Data Visualization

All built in parallel with shared conventions.

---

## 1. Shared Architecture & Conventions

### State Management

All filter, sort, and view state lives in URL query params via `nuqs`. Benefits: shareable URLs, back/forward navigation, state survives page refresh.

### New Dependencies

- `nuqs` — URL query param state management (SSR-friendly, built for Next.js App Router)
- `recharts` — Charts for pricing comparison and visualization

No database. Everything client-side + the existing `/api/models` API.

### File Structure

- `src/components/` — Shared UI components (cards, charts, calculator)
- `src/app/` — Page routes (`/`, `/models/[id]`)
- `src/lib/` — Types, utils, constants
- `src/hooks/` — Custom hooks (`useFavorites`, `useModelFilters`, `useModels`)

### Data Flow

```
API (/api/models) → Page Component → URL Params (nuqs) → Filtered/Sorted Models → Grid/List
                                                                   ↕
                                                            localStorage (favorites)
```

### Shared Hooks

- `useModels()` — Encapsulates fetch + cache + error state
- `useFavorites()` — localStorage-backed favorites with cross-tab sync
- `useModelFilters()` — URL-param-backed filter/sort/pagination state (replaces current `Filters` state in `page.tsx`)

---

## 2. Sorting + Pagination

### Sorting

Sort dropdown next to search bar. Options:

| Sort | URL Value | Description |
|------|-----------|-------------|
| Name A→Z | `name-asc` | Default |
| Name Z→A | `name-desc` | |
| Price Low→High | `price-asc` | Based on prompt price |
| Price High→Low | `price-desc` | |
| Context Length | `context-desc` | Longest first |
| Newest | `created-desc` | By `created` timestamp |
| Oldest | `created-asc` | By `created` timestamp |

Stored in URL as `?sort=name-asc`. Sorting happens client-side after filtering (all data already loaded).

### Pagination — Load More Pattern

- Initial render: 24 models
- "Load More" button at bottom loads next 24
- Intersection observer auto-loads when user scrolls near bottom
- Count indicator: "Showing 24 of 300+" updates as more load
- URL param `?page=2` tracks current batch for shareability

No virtualization library — just slice the filtered/sorted array.

### Components

- `src/components/sort-dropdown.tsx` — Sort selector dropdown
- `ModelGrid` updated — Accept paginated models, render "Load More" trigger
- `page.tsx` — Add sort state, slice models array

---

## 3. URL State Management

### Library

`nuqs` — purpose-built for Next.js App Router, handles SSR, type-safe parsers.

### URL Schema

| Param | Type | Example | Default |
|-------|------|---------|---------|
| `search` | `string` | `?search=claude` | `""` |
| `sort` | `enum` | `?sort=price-asc` | `name-asc` |
| `free` | `boolean` | `?free=true` | `false` |
| `input` | `string[]` | `?input=image,text` | `[]` |
| `output` | `string[]` | `?output=text` | `[]` |
| `providers` | `string[]` | `?providers=openai,anthropic` | `[]` |
| `reasoning` | `boolean` | `?reasoning=true` | `false` |
| `tools` | `boolean` | `?tools=true` | `false` |
| `view` | `enum` | `?view=list` | `grid` |
| `page` | `number` | `?page=3` | `1` |
| `fav` | `boolean` | `?fav=true` | `false` |
| `modal` | `string` | `?modal=openai%2Fgpt-4o` | `""` |

### Implementation

A `useModelFilters()` hook in `src/hooks/use-model-filters.ts` wraps all nuqs parsers. This replaces the current `Filters` state + `DEFAULT_FILTERS` in `page.tsx`. The hook returns:

- All filter values (from URL)
- All setter functions (update URL)
- `clearFilters()` — resets all params
- `activeFilterCount` — computed count
- `filteredModels` — the memoized filtered + sorted result

### Migration

The existing `useState<Filters>` in `page.tsx` gets replaced by this single hook. The `React.useMemo` filtering logic moves into the hook. No behavioral change — just lifts state to URL.

### Model Detail via URL

`?modal=model-id` opens the detail sheet via URL change, making individual model views shareable. Model card clicks navigate to `/models/[id]` instead.

---

## 4. Favorites System

### Storage

`localStorage` key `kilo-models-favorites` storing an array of model ID strings.

### `useFavorites()` Hook

File: `src/hooks/use-favorites.ts`

- `favorites: string[]` — list of favorited model IDs
- `isFavorite(id: string): boolean` — check if a model is favorited
- `toggleFavorite(id: string): void` — add/remove from favorites
- `favoriteModels: Model[]` — resolved model objects (requires models array passed in)
- Listens to `storage` events for cross-tab sync

### UI Changes

- **Heart icon** on each `ModelCard` — filled when favorited, outline when not. Top-right corner of the card.
- **Favorites filter pill** — "Favorites" toggle button in the filter bar (alongside "Free Only", "Reasoning", etc.), wired to `?fav=true` URL param
- **Favorites count** — shown as badge on filter pill when >0 favorites exist
- **Model detail sheet** — heart icon in the sheet header

### Data Flow

```
localStorage → useFavorites() → ModelCard (heart icon) + Filter bar (fav toggle)
                                        ↕
                                 URL param ?fav=true filters the grid
```

No backend, no accounts — purely client-side.

---

## 5. Individual Model Pages

### Route

`/models/[id]` — e.g., `/models/openai%2Fgpt-4o`

### Rendering

Static generation with `generateStaticParams()` at build time using the models API. Falls back to dynamic rendering for new models not in the build.

Benefits:
- SEO-friendly URLs with full meta tags (Open Graph, Twitter cards)
- Instant page loads via Next.js prefetching
- Shareable links

### Page Layout

```
┌─────────────────────────────────────────────┐
│  ← Back to Directory                         │
├─────────────────────────────────────────────┤
│  Provider Badge    Model Name                │
│  Description                                 │
├──────────────────────┬──────────────────────┤
│  Specs Card          │  Pricing Card         │
│  • Context Length    │  • Prompt price       │
│  • Max Completion    │  • Completion price   │
│  • Input Modalities  │  • Cache read/write   │
│  • Output Modalities │  • Image price        │
│  • Tokenizer         │  • Web search price   │
│  • Supported Params  │                       │
├──────────────────────┴──────────────────────┤
│  Pricing Calculator (Section 6)              │
├─────────────────────────────────────────────┤
│  Similar Models — same provider or           │
│  similar capabilities (max 6 cards)          │
├─────────────────────────────────────────────┤
│  Footer                                      │
└─────────────────────────────────────────────┘
```

### Components

- `src/app/models/[id]/page.tsx` — Route page with `generateStaticParams` + `generateMetadata`
- `src/components/model-specs-card.tsx` — Specs display card
- `src/components/model-pricing-card.tsx` — Pricing display card
- `src/components/similar-models.tsx` — "Similar models" grid (max 6 cards)

### SEO

`generateMetadata()` returns title, description, and OG image per model. Structured data (JSON-LD) for search engines.

### Navigation Change

Clicking a model card in the main directory now navigates to `/models/[id]` instead of opening the sheet. The detail sheet remains available via `?modal=id` URL param for quick peek — when `modal` param is present, the sheet opens automatically on page load. Card clicks use `<Link href="/models/[id]">`, not `onClick` handlers.

---

## 6. Pricing Calculator + Data Visualization

### Library

`recharts` — lightweight, React-native, theme-aware. Colors read from CSS variables so dark/light themes work automatically.

### Pricing Calculator

A collapsible section on the model page and a tab in the compare modal.

**Inputs:**
- Input tokens — slider + number input, range 1K–1M
- Output tokens — slider + number input, range 1K–1M
- Number of requests — number input, default 1,000

**Output:**
- Total cost per model (USD)
- Cost breakdown (input vs output vs cache vs image)
- Cost per request
- Total for all requests

### Data Visualization (in Compare Modal)

**1. Pricing Bar Chart** (`src/components/pricing-bar-chart.tsx`)
- Horizontal bars comparing prompt/completion prices across selected models
- Color-coded bars for prompt vs completion pricing

**2. Context Length Radar Chart** (`src/components/capability-radar-chart.tsx`)
- Multi-axis comparison for compared models
- Axes: context length, max completion tokens, pricing (inverted — lower = better), number of supported parameters

**3. Compare Cost Table** (`src/components/compare-cost-table.tsx`)
- Same calculator inputs but shows costs for all compared models side-by-side in a table
- Sortable by total cost

### Components

- `src/components/pricing-calculator.tsx` — Standalone calculator
- `src/components/pricing-bar-chart.tsx` — Bar chart for pricing comparison
- `src/components/capability-radar-chart.tsx` — Radar chart for multi-axis comparison
- `src/components/compare-cost-table.tsx` — Side-by-side cost table

All charts use recharts with theme-aware colors (CSS variables).

---

## Implementation Order

All five features are independent and can be built in parallel. Shared conventions (nuqs schema, hook patterns, component patterns) should be established first as a shared foundation task.

### Parallel Tasks

| Task | Dependencies | Est. Complexity |
|------|-------------|-----------------|
| URL State (nuqs setup + hook) | nuqs install | Medium |
| Sorting + Pagination | URL State hook | Medium |
| Favorites System | URL State hook | Low |
| Individual Model Pages | None (own route) | Medium |
| Pricing Calculator | None (own component) | Medium |
| Data Visualization (charts) | recharts install | Medium |

### Integration Points

- Compare modal gets tabs: "Overview" | "Pricing Chart" | "Cost Calculator"
- Model page embeds: pricing card + specs card + calculator + similar models
- Main page: sort dropdown + pagination + favorites filter + URL-driven state
