# Testing

## Unit & component

- `bun test` — Bun's runner; `.test.ts(x)` files sit beside the code they test, use `node:test` imports, and can execute JSX
- Playwright specs end in `.e2e.ts` (or `.check.ts`), so `bun test` never picks them up
- Bug fixes land with a regression test that failed first; prefer the real code path over mocks of it (a `renderToStaticMarkup` probe never reads browser storage)

## Browser (Playwright)

- `bun run test:e2e` — desktop Chromium, desktop Firefox, mobile Chromium; WebKit is configured but needs system libraries this machine lacks
- The run is self-contained: synthetic catalog server on `:3211`, isolated dev app on `:3210` (`KILO_MODELS_E2E=1` uses `.next-e2e`), fixture gateway faults via `KILO_MODELS_FAULT_TEST`
- `bun run test:e2e:detail-errors` — separate config (`playwright.detail-errors.config.ts`) for catalog-failure detail pages
- `bun run test:e2e:native` — production `next start` on `:3220` + native WebMCP checks (`e2e/native-*.ts`); needs Playwright Chromium and live Kilo access; not in the CI matrix
- `bun run test:e2e:a11y` — axe scans via `scanThemeSurfaces` in `e2e/accessibility.ts`
- CI runs lint (zero warnings), unit tests, the production build, the browser matrix, and the detail-error suite

## Fixtures

- `e2e/catalog.ts` must mirror live API shapes: `-1` router prices, `:free` route IDs, `~` alias providers, free models, 0–100 safety scores, per-token image rates. Unrealistic fixtures have hidden real-data bugs before.
