# Code Conventions

## Style

- Compose classes with `cn()` from `@/lib/utils` (clsx + tailwind-merge)
- ESLint uses the flat config `eslint.config.mjs` (not `.eslintrc`) and CI fails on any warning
- Path alias `@/*` → `./src/*`

## UI SDK

- Import from individual entry points (`@ui-sdk/react/button`, `.../dialog`, `.../checkbox`); shared styled wrappers live in `src/components/ui/`
- Model metadata UI (score rows, bars, price rows) is shared and reused — don't fork thresholds, labels, or polarity logic per card; `REVIEW.md` records the display rules, including neutral presentation for scores whose direction is unverified

## Theming

- Palettes live in `src/lib/kilocode-theme-data.ts`; `src/lib/themes.ts` derives every color variable for both modes
- First paint is handled by `src/lib/theme-first-paint.ts` (inline CSS defaults + pre-hydration script in `src/app/layout.tsx`) — keep it generated from the same palettes so values cannot drift
- Do not add theme classes to `src/app/globals.css`

## URL state

- nuqs owns all query-param state; the root layout wraps it in `QueryAdapter` (`src/components/query-adapter.tsx`), which also preserves the local-comparison history marker — keep new state under that adapter
- New shared params must round-trip: value → URL → reload → same value, with defaults omitted from the URL

## Data safety

- Upstream catalog data is untrusted: validate at the boundary (`models-response.ts`) and render nullable fields honestly (hide the row or show "Unknown"/"—", never `NaN` or a guessed zero)
- Model descriptions render through `react-markdown` with restricted components (`src/components/model-description.tsx`); keep remote images and unvalidated links out
