# Simple-first workflows

The everyday path is find a model, understand its capabilities and price, compare choices, and estimate usage. Advanced tools stay in the same interface behind named disclosures. Project-wide guidance lives in AGENTS.md.

## Implemented refinements

| Request | Behavior |
| --- | --- |
| 1. Collapsed settings | Workload summaries show cache percentage, images, searches, writes, and period. |
| 2. Term explanations | Native help disclosures explain tokens, context, capabilities, and caching on keyboard and touch. |
| 3. Providers | Selected providers sort first; clearing provider search retains selections and returns focus. |
| 4. Search shortcut | `/` focuses model search without interrupting editing, composition, modifiers, or comparison. |
| 5. Reset scope | Reset usage preserves filters and comparison; clear advanced usage also preserves basic counts. |
| 6. Empty recovery | Current conditions and targeted budget, workload-fit, and search recovery accompany full reset. |
| 7. Earlier results | A shorter introduction and compact catalog status make search easier to reach. |
| 8. Plain labels | Input/output types and explicit billing units replace technical terminology in common flows. |
| 9. Examples | Presets show token assumptions before applying; request count and advanced usage are preserved. |
| 10. Price vs estimate | Published token prices and request-based workload totals have distinct units and summaries. |
| 11. Unavailable costs | Missing base or extra rates, invalid request fees, and numeric overflow have recovery guidance. |
| 12. Warnings | Limit messages name actual counts and limits; headline totals and warnings survive input collapse. |
| 13. Budget | Budget displays current usage and links directly to the calculator’s first input. |
| 14. Details | Key capabilities and prices precede usage; full specifications, other rates, and safety metrics disclose detail. |
| 15. Comparison | Essentials and workload cost appear first; full specifications and differences remain available. |
| 16. Actions | Copy link remains direct; CSV export sits under More actions. |
| 17. Mobile | Comparison keeps column names and row labels sticky, uses narrower model columns, and retains safe-area tray padding. |
| 18. Setups | Preview describes saved usage and view; applied setups indicate subsequent changes. |
| 19. Preferences | Grid/list preference is remembered for the tab session; explicit URL and saved-view choices win. |
| 20. Feedback | Action status stays near its controls; empty feedback is hidden visually; delete retains Undo. |
| 21. Catalog | Normal status shows update time and refresh; cache explanations disclose on demand and failures preserve results. |
| 22. Readability | Larger capability labels and appearance target, numeric alignment, visible focus, and themed scrollbars. |
| 23. Responsiveness | Charts and comparison calculator load on demand; calculator state survives later tab switches; provider inventory is memoized; existing client filtering and refresh preservation remain. |
| 24. Task verification | Automated novice-style and advanced task paths cover directory, calculator, setups, sharing, export, and keyboard/mobile use. |

## Repeatable automated checks

Run `bun test`, `bun run lint`, `bun run build`, and `bun run test:e2e`. Browser tests use a synthetic catalog on isolated ports 3210/3211, not the live upstream data. `workflow-refinements.e2e.ts` exercises reset scope, provider ordering, shortcut guards, targeted recovery, setup previews, comparison export, view precedence, and persistent warnings. Existing suites cover billing calculations, draft editing, navigation, sharing, setup management, and refresh recovery. Accessibility scans cover default light/dark themes in the four configured browser projects.

Browser engines installed by Playwright are the supported test path. A machine-specific, git-ignored diagnostic runtime override was used for local Windows Firefox checks; it is not part of this repository or required by CI.

## Human usability validation

Automated task completion does not establish that real people understand the interface. Use the following protocol with a newcomer and a frequent user before claiming improved completion times:

1. Newcomer: find a model with tool calling, compare two candidates, then estimate seven requests using a preset. Give no interface instructions. Record completion time, wrong turns, and help requests.
2. Frequent user: apply a saved workload, change cache percentage, set a monthly budget, inspect differences, and export CSV. Record completion time and whether advanced assumptions remain clear when panels close.
3. Repeat on mobile and with keyboard navigation. Verify scrolling does not obscure model names, warnings, or actions.
4. Ask each person what is included in the cost and what Unavailable means. Revise wording when understanding is wrong, rather than adding more controls.

This protocol is prepared; no external participants were recruited or observed by the agent.
