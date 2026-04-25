# Multi-Model Comparison Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the ability to compare multiple AI models side-by-side using a table-based comparison in a modal, with a bottom tray for selecting models.

**Architecture:** Comparison state lives in `page.tsx`. Model cards get a compare toggle button. A sticky bottom tray shows selected models. A full-screen modal displays a table comparing all selected models across key attributes.

**Tech Stack:** Next.js, React, Tailwind, @base-ui/react (Sheet/Dialog), lucide-react icons, existing UI components (Badge, Button, Card)

---

## File Structure

- Create: `src/components/compare-tray.tsx`
- Create: `src/components/compare-modal.tsx`
- Modify: `src/components/model-card-v2.tsx` (add compare button)
- Modify: `src/app/page.tsx` (add comparison state, integrate tray/modal)

---

## Tasks

### Task 1: Add Compare Button to ModelCard

**Files:**
- Modify: `src/components/model-card-v2.tsx`

The compare button (scale/balance icon) appears in the top-right of the card, next to the FREE badge. It toggles the model in/out of the comparison state. When selected, the card shows a highlighted border.

- [ ] **Step 1: Modify model-card-v2.tsx**

Add a `Scale` icon import from lucide-react. Add `isCompared?: boolean` and `onToggleCompare?: (model: Model) => void` to the `ModelCardProps` interface. Add a compare button in the card header (top-right area), before the ChevronRight icon. When `isCompared` is true, show a primary-colored border on the card.

```tsx
// Add to imports at top
import { Scale } from "lucide-react";

// Add to ModelCardProps interface
isCompared?: boolean;
onToggleCompare?: (model: Model) => void;

// Add compare button in the header div (before ChevronRight)
<button
  onClick={(e) => {
    e.stopPropagation();
    onToggleCompare?.(model);
  }}
  className={cn(
    "p-1.5 rounded-md transition-all",
    isCompared
      ? "bg-primary/10 text-primary"
      : "hover:bg-muted text-muted-foreground"
  )}
  title={isCompared ? "Remove from compare" : "Add to compare"}
>
  <Scale className="h-4 w-4" />
</button>

// Update Card className to include conditional border
className={cn(
  "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 border-primary/5 hover:border-primary/20 bg-card/80 backdrop-blur-sm",
  isCompared && "border-primary/50 bg-primary/5"
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/model-card-v2.tsx
git commit -m "feat: add compare button to model card"
```

---

### Task 2: Create CompareTray Component

**Files:**
- Create: `src/components/compare-tray.tsx`

A sticky bar at the bottom of the screen that shows selected model pills and an "Open Compare" button. Hidden when no models are selected.

- [ ] **Step 1: Write compare-tray.tsx**

```tsx
"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompareTrayProps {
  models: Model[];
  onRemove: (model: Model) => void;
  onOpen: () => void;
}

export function CompareTray({ models, onRemove, onOpen }: CompareTrayProps) {
  if (models.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GitCompare className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium shrink-0">
            {models.length} model{models.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {models.map((model) => (
              <Badge
                key={model.id}
                variant="secondary"
                className="flex items-center gap-1.5 pr-1.5 shrink-0"
              >
                <span className="max-w-[120px] truncate">{model.name}</span>
                <button
                  onClick={() => onRemove(model)}
                  className="hover:bg-muted rounded-sm p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <Button onClick={onOpen} size="sm" className="shrink-0">
          Open Compare
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/compare-tray.tsx
git commit -m "feat: create compare tray component"
```

---

### Task 3: Create CompareModal Component

**Files:**
- Create: `src/components/compare-modal.tsx`

A full-screen modal showing a table where rows = attributes and columns = models. Sticky column headers. Remove button per column. Rows with identical values across all models are dimmed.

- [ ] **Step 1: Write compare-modal.tsx**

```tsx
"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Sparkles,
  Wrench,
  Shield,
  Cpu,
  DollarSign,
  Layers,
  Settings2,
} from "lucide-react";

interface CompareModalProps {
  models: Model[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (model: Model) => void;
}

function formatPrice(price: string | undefined): string {
  if (!price || price === "0") return "Free";
  const num = parseFloat(price);
  if (num < 0.00001) return `$${(num * 1000000).toFixed(2)}/1M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/1K`;
  return `$${num.toFixed(6)}/1K`;
}

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K`;
  return ctx.toLocaleString();
}

function allSame(values: string[]): boolean {
  return values.every((v) => v === values[0]);
}

interface CompareRowProps {
  label: string;
  values: string[];
  icon?: React.ReactNode;
}

function CompareRow({ label, values, icon }: CompareRowProps) {
  const same = allSame(values);
  return (
    <div className={cn("grid gap-4 py-3 px-4", same && "opacity-50")}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      {values.map((v, i) => (
        <div key={i} className="text-sm font-medium font-mono">
          {v}
        </div>
      ))}
    </div>
  );
}

export function CompareModal({ models, open, onOpenChange, onRemove }: CompareModalProps) {
  if (models.length === 0) return null;

  const gridCols = `grid-cols-[200px_repeat(${models.length},1fr)]`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-6xl mx-auto p-0 flex flex-col" side="top">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <GitCompare className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-xl">Compare Models</h2>
            <Badge variant="secondary">{models.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto">
          <div className={cn("grid min-w-max", gridCols)}>
            {/* Sticky Header */}
            <div className="sticky left-0 z-10 bg-background border-b py-3 px-4 font-semibold text-sm">
              Model
            </div>
            {models.map((model) => (
              <div
                key={model.id}
                className="sticky top-0 z-10 bg-background border-b py-3 px-4 flex flex-col gap-2"
              >
                <div className="font-heading text-sm font-semibold truncate">{model.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">{model.id}</div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemove(model)}
                  className="self-start"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Description */}
            <CompareRow
              label="Description"
              values={models.map((m) => m.description)}
            />
            <Separator className="col-span-full" />

            {/* Input Price */}
            <CompareRow
              label="Input Price"
              values={models.map((m) => formatPrice(m.pricing?.prompt))}
              icon={<ArrowUpRight className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Output Price */}
            <CompareRow
              label="Output Price"
              values={models.map((m) => formatPrice(m.pricing?.completion))}
              icon={<ArrowDownRight className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Context */}
            <CompareRow
              label="Context Window"
              values={models.map((m) => formatContext(m.context_length))}
              icon={<Hash className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Input Modalities */}
            <CompareRow
              label="Input Modalities"
              values={models.map((m) => (m.architecture?.input_modalities ?? []).join(", ") || "—")}
              icon={<Cpu className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Output Modalities */}
            <CompareRow
              label="Output Modalities"
              values={models.map((m) => (m.architecture?.output_modalities ?? []).join(", ") || "—")}
              icon={<Cpu className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Capabilities */}
            <div className="grid gap-4 py-3 px-4 col-span-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Capabilities
              </div>
              <div className={cn("grid gap-4", gridCols)}>
                <div />
                {models.map((m) => {
                  const hasReasoning = (m.supported_parameters ?? []).some(
                    (p) => p === "reasoning" || p === "include_reasoning"
                  );
                  const hasTools = (m.supported_parameters ?? []).includes("tools");
                  return (
                    <div key={m.id} className="flex flex-wrap gap-1.5">
                      {hasReasoning && (
                        <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">
                          Reasoning
                        </Badge>
                      )}
                      {hasTools && (
                        <Badge className="bg-blue-500/10 text-blue-600 text-[10px]">
                          Tools
                        </Badge>
                      )}
                      {m.top_provider?.is_moderated && (
                        <Badge className="bg-orange-500/10 text-orange-600 text-[10px]">
                          Moderated
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator className="col-span-full" />

            {/* Max Completion */}
            <CompareRow
              label="Max Completion"
              values={models.map((m) =>
                m.top_provider?.max_completion_tokens
                  ? `${m.top_provider.max_completion_tokens.toLocaleString()} tokens`
                  : "—"
              )}
              icon={<Layers className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Tokenizer */}
            <CompareRow
              label="Tokenizer"
              values={models.map((m) => m.architecture?.tokenizer ?? "—")}
              icon={<Settings2 className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Free */}
            <CompareRow
              label="Free"
              values={models.map((m) => (m.isFree ? "Yes" : "No"))}
              icon={<DollarSign className="h-4 w-4" />}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/compare-modal.tsx
git commit -m "feat: create compare modal component"
```

---

### Task 4: Integrate Comparison into page.tsx

**Files:**
- Modify: `src/app/page.tsx`

Add comparison state (`comparedModels`), pass `isCompared` and `onToggleCompare` to model cards, render the CompareTray and CompareModal.

- [ ] **Step 1: Add state and handlers in page.tsx**

Add to imports:
```tsx
import { CompareTray } from "@/components/compare-tray";
import { CompareModal } from "@/components/compare-modal";
```

Add to state section:
```tsx
const [comparedModels, setComparedModels] = React.useState<Model[]>([]);
const [compareModalOpen, setCompareModalOpen] = React.useState(false);
```

Add handler:
```tsx
const handleToggleCompare = (model: Model) => {
  setComparedModels((prev) => {
    const exists = prev.some((m) => m.id === model.id);
    if (exists) {
      return prev.filter((m) => m.id !== model.id);
    }
    if (prev.length >= 10) {
      return prev;
    }
    return [...prev, model];
  });
};
```

- [ ] **Step 2: Pass props to ModelGrid and ModelCard**

In `ModelGrid` render, add the new props:
```tsx
<ModelGrid
  models={filteredModels}
  viewMode={viewMode}
  onSelectModel={handleSelectModel}
  isComparedModels={comparedModels}
  onToggleCompare={handleToggleCompare}
/>
```

In `ModelCard` render, add:
```tsx
<ModelCard
  model={model}
  onSelect={onSelectModel}
  isCompared={comparedModels.some((m) => m.id === model.id)}
  onToggleCompare={handleToggleCompare}
/>
```

- [ ] **Step 3: Add CompareTray and CompareModal at bottom of page**

Before the closing `</div>` of the main page:
```tsx
<CompareTray
  models={comparedModels}
  onRemove={handleToggleCompare}
  onOpen={() => setCompareModalOpen(true)}
/>

<CompareModal
  models={comparedModels}
  open={compareModalOpen}
  onOpenChange={setCompareModalOpen}
  onRemove={handleToggleCompare}
/>
```

Also update `ModelGrid` to pass `isCompared` and `onToggleCompare` to `ModelCard`.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/model-grid-v2.tsx
git commit -m "feat: integrate comparison state and UI into page"
```

---

### Task 5: Update ModelGrid to Support Comparison Props

**Files:**
- Modify: `src/components/model-grid-v2.tsx`

ModelGrid needs to accept and pass `isComparedModels` and `onToggleCompare` to ModelCard.

- [ ] **Step 1: Update ModelGrid interface and rendering**

Add to interface:
```tsx
isComparedModels?: Model[];
onToggleCompare?: (model: Model) => void;
```

Update the grid view ModelCard render:
```tsx
<ModelCard
  model={model}
  onSelect={onSelectModel}
  isCompared={isComparedModels?.some((m) => m.id === model.id)}
  onToggleCompare={onToggleCompare}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/model-grid-v2.tsx
git commit -m "feat: model grid supports compare props"
```

---

## Verification

- [ ] Run `npm run lint` to check for errors
- [ ] Run `npm run build` to verify build passes
- [ ] Test in browser: open the app, click compare icons on 3+ model cards, verify tray appears, click "Open Compare", verify modal shows all models side-by-side with table layout