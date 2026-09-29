## Model UI Data Display Guidelines

- **Render nullable model fields honestly.** If a field such as `overallScore`, `avgAttemptCostUsd`, `safety_score`, `canonical_slug`, or `mayTrainOnYourPrompts` can be missing, type it as optional/nullable and guard the render site. Prefer hiding the row or showing “Unknown”/“—” over rendering `NaN`, an empty label, or a false `Yes`/`No`.

- **Gate cards on any available data, not one required score.** Safety-related cards should render when any relevant score is present, while still filtering out null rows.

- **Use shared components for repeated model metadata UI.** Score rows, score bars, price rows, and safety metric lists should be implemented once and reused across `model-detail-sheet`, `model-specs-card`, and `model-safety-card` to avoid duplicated thresholds, labels, and styling bugs.

- **Apply polarity-aware color thresholds for safety metrics.** Metrics where higher is better, such as overall safety, robustness, NIST, and OWASP, should show positive colors at high values. Metrics where higher is worse, such as risk, bias, toxicity, jailbreak, evasion, CBRN, harmful content, and insecure code, should show warning colors at high values.

- **Keep row alignment and padding consistent within cards.** New rows should match the padding, spacing, and layout used by sibling rows rather than introducing one-off insets.
