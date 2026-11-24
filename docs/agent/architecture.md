# Architecture & Data Flow

## Routes

- `src/app/page.tsx` — directory (`"use client"`); mounts `ModelExplorer` via `useModels()`
- `src/app/api/models/route.ts` — `GET` serves the validated catalog snapshot, `POST` refreshes it; negotiates gzip; `Cache-Control: no-store`
- `src/app/models/[id]/page.tsx` — legacy detail route; `findModel()` resolves percent-encoded IDs to their decoded value
- `src/app/models/id/[encodedId]/page.tsx` — exact detail route for IDs with literal escapes or dot segments; encode/decode in `src/lib/model-detail-path.ts`
- Shared detail rendering lives in `src/components/model-detail-page.tsx` (`renderModelDetail`, `modelDetailMetadata`)

## Catalog pipeline

- Upstream Kilo API is called server-side only, via `fetchCatalog` in `src/lib/catalog-freshness.ts`; `resolveGatewayUrl` picks the URL (`KILO_MODELS_GATEWAY_URL` overrides in non-production)
- `src/lib/get-models.ts` caches the snapshot with `unstable_cache` (1 h, tag `kilo-model-catalog`); `refreshCatalog()` stages a validated snapshot before replacing the shared cache
- `src/lib/models-response.ts` quarantines malformed upstream entries (`excludedCount` + diagnostics); the client-side `parseModelsResponse` stays strict
- Client: `use-models.ts` reuses a fresh in-tab snapshot (`isFreshCatalog`) across route remounts; the Refresh button always POSTs

## Client state model

The URL is the source of truth; localStorage is durable preference state, never a shadow copy of it.

- `use-model-filters.ts` — directory filters, sort, view, pagination (nuqs, shallow)
- `use-comparison.ts` — selection in the `compare` query param plus localStorage; a selection made locally must not auto-open the dialog on reload/Back, while shared links must (see `src/lib/comparison-history.ts` and `src/components/query-adapter.tsx`)
- `use-favorites.ts` / `use-saved-setups.ts` — localStorage via `src/lib/storage-lock.ts` (Web Locks, IndexedDB fallback) for cross-tab safety
- `use-calculator-workload.ts` — workload in query params so links, reloads and Back agree
- `use-retirement-clock.ts` — shared minute clock with a stable server snapshot

## Pricing & display units

- Token prices are per-token strings parsed by `parsePrice`; format with `formatPrice` / `formatCost`
- The gateway's image rate has an unverified billing unit: preserve image usage in links and saved setups, but never derive a total from it (`src/lib/cost-calculator.ts`)
- Provider display names strip a leading `~` alias via `src/lib/model-provider.ts`; model IDs themselves never change
