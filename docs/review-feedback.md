# PR 8 review feedback

Reviewed the 40 Kilo Code Bot findings against commit `1e5151f` and the installed dependencies. Changes address 36 findings; four suggested changes are intentionally omitted after checking the framework or upstream guidance. No new dependencies are required.

## Changes

| Area | Resolution |
| --- | --- |
| Billing | A null request fee means no fee in totals, warnings, published prices, and CSV. Invalid non-null fees remain unavailable. Optional pricing types now match the catalog boundary. |
| Discount | Estimates explicitly say pre-discount when a discount is published. Its billing scope is unspecified, so calculations do not guess which charges it affects. The same assumption appears in directory summaries, comparison, calculator notices, and CSV. Missing-rate warnings precede discount notices. |
| Workload | URL and standalone workload parsers share validators; unused tokenCount was removed; batch summaries match the period label. |
| Published prices | Absent extra rates hide their disclosure. Invalid but present rates remain visible as unavailable, and invalid request fees explain why a total cannot be calculated. |
| Saved setups | Saving works without secure-context randomUUID. Backup validation errors are distinct from storage failures, URLs are revoked after 1000 ms, and tiny monetary limits display decimal values without losing precision. |
| Catalog | RFC 3339 fractional timestamps longer than milliseconds are accepted. Validation errors identify entry, model, and nested field; server logs contain safe diagnostic categories instead of payloads or arbitrary error messages. |
| Refresh | Manual refresh reuses snapshots younger than 60 seconds. Cold and overlapping calls share a fetch; failed refreshes can be retried immediately. This bounds sequential forced refreshes without introducing accounts or tokens. |
| Comparison | Rows are memoized once and reused by the table. CSV downloads include a UTF-8 BOM for spreadsheet interoperability. |
| Directory | Provider matching and saved directory query construction are memoized. Clear all removes default filter parameters while preserving the current favorites tab, view, sorting, workload, and comparison. Active chips have an accessible group role. Duplicate modality badges are removed in both views. |
| Charts | Long axis labels fit a bounded width while data and tooltips retain full names. Tooltip formatting distinguishes missing prices from zero. The radar's existing accessibility layer is made explicit and checked with real keyboard interaction. |
| Accessibility | Retirement urgency says Retires soon; the model-actions fallback has status semantics. Axe waits for fonts and finite transitions to settle instead of measuring intermediate colors. No rules are disabled or elements excluded. |
| Themes | Picker swatches use the contrast-adjusted primary color applied to the page, with cached results per mode. |
| CI | Superseded runs cancel through concurrency. The job has a 60-minute cap and expensive steps have individual limits. Scroll restoration tolerates 10 pixels of browser layout rounding while still rejecting a lost scroll position. |
| Maintenance | Typed regression fixtures replace broad Model assertions. The button comment and local Windows Firefox diagnostic note now describe the actual behavior. |

The similar-model suggestion was adapted: unknown modalities contribute no positive similarity score. A known output requirement continues to exclude unknown or incompatible candidates, preserving the useful compatibility guarantee rather than recommending an unverified match.

## Suggested changes intentionally omitted

- **4204631264 — change retry to reset:** Next.js 16.3.3 documents `retry` as stable since 16.3.0 and prefers it for fetching fresh content after an error. Its actual error-boundary implementation supplies both functions. The existing detail recovery button uses the correct prop. Evidence: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` and `node_modules/next/dist/client/components/error-boundary.js`.
- **4204631402 — remove data-scroll-behavior:** Next consumes this attribute in `node_modules/next/dist/shared/lib/router/utils/disable-smooth-scroll.js` to suppress smooth scrolling during route transitions. Its version-16 upgrade guide documents the opt-in. Removing it would weaken navigation behavior.
- **4204631345 — remove the radar keyboard promise:** Recharts 3.8.1 enables its accessibility layer by default. The real browser regression checks focus and arrow-key tooltips with actual token values. The prop is now explicit; the capability remains available.
- **4204631449 — cache browser downloads:** [Playwright's CI guidance](https://playwright.dev/docs/ci#caching-browsers) recommends against caching browser binaries because restoration costs are comparable and Linux system dependencies still need installation. Keep the supported installation path until measured CI evidence justifies a cache.

## Verification

The unit suite covers null catalog fees, shared parsing, safe catalog diagnostics, sequential/concurrent/retry refresh calls, missing UUID generation, export errors, small monetary caps, duplicate badges, theme swatches, and unknown similarity metadata. Browser regressions cover filter-reset scope, readable chart labels and keyboard values, null fees, retirement text, saved backups, and CSV encoding. Existing workflow and default-theme accessibility suites also exercise the integrated changes.

GitHub Actions itself must run after these changes are pushed; local checks do not establish a successful hosted run.

Local verification completed: 170 unit/component tests across 32 files, zero-warning ESLint, and the production build passed. Of 92 browser cases across desktop Chromium, mobile Chromium, Firefox, and WebKit, 84 passed in the integrated run, including all eight default-theme accessibility scans. Eight cases still used outdated batch wording or assumed an extra arrow press was needed after chart focus; their corrected expectations passed in a separate eight-case run. No product checks were skipped or assertions removed.

Local Firefox used the machine-specific ignored diagnostic runtime described in `simple-first-workflows.md`; hosted CI continues to install the official engine. Diagnostics remain in ignored `.tmp/final-browser-results` and `.tmp/review-recheck-results` on this workspace.
