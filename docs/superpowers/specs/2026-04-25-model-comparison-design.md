# Multi-Model Comparison Feature

## Context

Kilo Models is an AI model directory that displays 300+ models in a filterable grid/list. Users currently can click a model card to open a detail sheet, but cannot compare multiple models side-by-side. The feature request is to add the ability to compare multiple models.

## Design

### Approach: Table-based comparison in a modal

Comparison is table-based: rows = attributes (pricing, context, modalities, capabilities, etc.), columns = selected models. This is space-efficient for comparing many models at once.

### Adding Models to Compare

- Each model card gets a **Compare** icon button (balanced scale icon) in the top-right corner
- Clicking it adds the model to a **comparison tray** that slides up from the bottom of the screen
- The tray shows pill badges of selected models with an "Open Compare" button
- Clicking the X on a pill removes that model from the tray
- The tray is hidden when no models are selected
- Maximum of 10 models can be selected (to prevent UI overflow)

### Comparison Modal

- Full-screen modal opens when "Open Compare" is clicked
- Table layout with one row per attribute, one column per model
- Sticky model names at the top of each column
- Rows: name, description, provider, input modalities, output modalities, pricing (prompt/completion), context length, max completion, capabilities (reasoning, tools, moderated), tokenizer, SDK info
- Rows with identical values across all models are dimmed; differing values are highlighted
- "Remove" icon on each column header to remove a model from comparison
- "Add More Models" button to close modal and add more from the grid
- "Close" button in the modal header

### Interaction Details

- Clicking the compare icon on an already-selected model removes it
- Selected models show a visual indicator (highlighted border) on their card
- Tray shows count: "3 models selected"
- If user tries to exceed 10, show a toast: "Maximum 10 models for comparison"

### UI Consistency

- Follow existing design language: rounded-xl cards, primary color accents, amber/blue capability badges
- Use existing `Badge`, `Button`, `Sheet` components from the codebase
- Match typography: font-heading for headings, font-mono for model IDs

## Components

1. **CompareButton** — icon button on model card (balanced scale icon), toggles model in/out of comparison
2. **CompareTray** — sticky bottom tray showing selected model pills and "Open Compare" button
3. **CompareModal** — full-screen table comparing selected models

## Technical Approach

- State: `comparedModels: Model[]` in `page.tsx`, max 10
- CompareTray and CompareModal components receive `comparedModels`, `onRemove`, `onOpen`
- Modal renders inside a `Sheet` or custom Dialog with full-screen size
- Table uses CSS grid or flexbox, with sticky column headers

## Out of Scope

- Persisting comparison across page reloads
- Exporting comparison to CSV/PDF
- List view comparison (grid-only for now)