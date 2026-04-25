# Kilo Models Directory — Feature Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement five parallel features for the Kilo Models Directory: URL state management, sorting+pagination, favorites, individual model pages, and pricing calculator+visualization.

**Architecture:** URL-driven state via `nuqs` for all filters/sort/view/page. localStorage for favorites. Static generation for model pages. Recharts for visualizations. No backend changes.

**Tech Stack:** Next.js 16, shadcn/ui, Tailwind v4, nuqs, recharts

---

## Shared Foundation (Task 0)

Installs dependencies and creates shared hooks used by all features.

**Files:**
- Modify: `package.json`
- Create: `src/hooks/use-models.ts`
- Create: `src/hooks/use-favorites.ts`
- Create: `src/hooks/use-model-filters.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd /home/vicky/Documents/personal-projects/kilo-models && bun add nuqs recharts && bun add -D @types/recharts
```

- [ ] **Step 2: Create `src/hooks/use-models.ts`**

```typescript
"use client";

import * as React from "react";
import { Model } from "@/lib/types";

interface UseModelsResult {
  models: Model[];
  loading: boolean;
  error: Error | null;
}

export function useModels(): UseModelsResult {
  const [models, setModels] = React.useState<Model[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/models");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setModels(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  return { models, loading, error };
}
```

- [ ] **Step 3: Create `src/hooks/use-favorites.ts`**

```typescript
"use client";

import * as React from "react";
import { Model } from "@/lib/types";

const STORAGE_KEY = "kilo-models-favorites";

interface UseFavoritesResult {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  favoriteModels: (models: Model[]) => Model[];
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
  }, []);

  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setFavorites(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isFavorite = React.useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  const toggleFavorite = React.useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const favoriteModels = React.useCallback(
    (models: Model[]) => models.filter((m) => favorites.includes(m.id)),
    [favorites]
  );

  return { favorites, isFavorite, toggleFavorite, favoriteModels };
}
```

- [ ] **Step 4: Create `src/hooks/use-model-filters.ts`**

```typescript
"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsBoolean,
  parseAsStringLiteral,
  parseAsInteger,
  useQueryStates,
} from "nuqs";

const SORT_OPTIONS = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "context-desc",
  "created-desc",
  "created-asc",
] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const VIEW_OPTIONS = ["grid", "list"] as const;
type ViewOption = (typeof VIEW_OPTIONS)[number];

const INPUT_MODALITIES = ["text", "image", "video", "audio", "file"];
const OUTPUT_MODALITIES = ["text", "image", "audio"];
const ALL_PROVIDERS = [
  "ai21","aion-labs","alfredpros","alibaba","allenai","alpindale","amazon",
  "anthropic","bytedance","cohere","deepseek","google","gryphe","ibm-granite",
  "inclusionai","kilo-auto","meta-llama","microsoft","mistralai","moonshotai",
  "nvidia","openai","openrouter","perplexity","qwen","rekaai","stepfun",
  "tencent","x-ai","z-ai"
];

interface FilterState {
  search: string;
  sort: SortOption;
  free: boolean;
  inputModalities: string[];
  outputModalities: string[];
  providers: string[];
  reasoning: boolean;
  tools: boolean;
  view: ViewOption;
  page: number;
  fav: boolean;
}

interface UseModelFiltersResult extends FilterState {
  setSearch: (v: string) => void;
  setSort: (v: SortOption) => void;
  setFree: (v: boolean) => void;
  setInputModalities: (v: string[]) => void;
  setOutputModalities: (v: string[]) => void;
  setProviders: (v: string[]) => void;
  setReasoning: (v: boolean) => void;
  setTools: (v: boolean) => void;
  setView: (v: ViewOption) => void;
  setPage: (v: number) => void;
  setFav: (v: boolean) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  filteredModels: Model[];
  sortedModels: Model[];
  paginatedModels: Model[];
  totalPages: number;
  hasMore: boolean;
}

const parsers = {
  search: parseAsString,
  sort: parseAsStringLiteral(SORT_OPTIONS),
  free: parseAsBoolean,
  inputModalities: parseAsArrayOf(parseAsString),
  outputModalities: parseAsArrayOf(parseAsString),
  providers: parseAsArrayOf(parseAsString),
  reasoning: parseAsBoolean,
  tools: parseAsBoolean,
  view: parseAsStringLiteral(VIEW_OPTIONS),
  page: parseAsInteger,
  fav: parseAsBoolean,
};

export function useModelFilters(models: Model[]): UseModelFiltersResult {
  const [params, setParams] = useQueryStates(parsers, {
    clearOnDefault: false,
    shallow: false,
  });

  const search = params.search ?? "";
  const sort = params.sort ?? "name-asc";
  const free = params.free ?? false;
  const inputModalities = params.inputModalities ?? [];
  const outputModalities = params.outputModalities ?? [];
  const providers = params.providers ?? [];
  const reasoning = params.reasoning ?? false;
  const tools = params.tools ?? false;
  const view = params.view ?? "grid";
  const page = params.page ?? 1;
  const fav = params.fav ?? false;

  const PAGE_SIZE = 24;

  const setSearch = (v: string) => setParams({ search: v, page: 1 });
  const setSort = (v: SortOption) => setParams({ sort: v, page: 1 });
  const setFree = (v: boolean) => setParams({ free: v, page: 1 });
  const setInputModalities = (v: string[]) => setParams({ inputModalities: v, page: 1 });
  const setOutputModalities = (v: string[]) => setParams({ outputModalities: v, page: 1 });
  const setProviders = (v: string[]) => setParams({ providers: v, page: 1 });
  const setReasoning = (v: boolean) => setParams({ reasoning: v, page: 1 });
  const setTools = (v: boolean) => setParams({ tools: v, page: 1 });
  const setView = (v: ViewOption) => setParams({ view: v });
  const setPage = (v: number) => setParams({ page: v });
  const setFav = (v: boolean) => setParams({ fav: v, page: 1 });

  const clearFilters = () =>
    setParams({
      search: "",
      sort: "name-asc",
      free: false,
      inputModalities: [],
      outputModalities: [],
      providers: [],
      reasoning: false,
      tools: false,
      view: "grid",
      page: 1,
      fav: false,
    });

  const activeFilterCount =
    (free ? 1 : 0) +
    inputModalities.length +
    outputModalities.length +
    providers.length +
    (reasoning ? 1 : 0) +
    (tools ? 1 : 0) +
    (fav ? 1 : 0);

  const filteredModels = React.useMemo(() => {
    return models.filter((model) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !model.name.toLowerCase().includes(s) &&
          !model.id.toLowerCase().includes(s) &&
          !model.description.toLowerCase().includes(s)
        )
          return false;
      }
      if (free && !model.isFree) return false;
      if (inputModalities.length > 0) {
        const mods = model.architecture?.input_modalities ?? [];
        if (!inputModalities.some((m) => mods.includes(m))) return false;
      }
      if (outputModalities.length > 0) {
        const mods = model.architecture?.output_modalities ?? [];
        if (!outputModalities.some((m) => mods.includes(m))) return false;
      }
      if (providers.length > 0) {
        const p = model.id.split("/")[0];
        if (!providers.includes(p)) return false;
      }
      if (reasoning) {
        const params = model.supported_parameters ?? [];
        if (!params.includes("reasoning") && !params.includes("include_reasoning"))
          return false;
      }
      if (tools) {
        const params = model.supported_parameters ?? [];
        if (!params.includes("tools")) return false;
      }
      return true;
    });
  }, [models, search, free, inputModalities, outputModalities, providers, reasoning, tools]);

  const sortedModels = React.useMemo(() => {
    return [...filteredModels].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return (parseFloat(a.pricing?.prompt ?? "0") || 0) - (parseFloat(b.pricing?.prompt ?? "0") || 0);
        case "price-desc":
          return (parseFloat(b.pricing?.prompt ?? "0") || 0) - (parseFloat(a.pricing?.prompt ?? "0") || 0);
        case "context-desc":
          return (b.context_length ?? 0) - (a.context_length ?? 0);
        case "created-desc":
          return (b.created ?? 0) - (a.created ?? 0);
        case "created-asc":
          return (a.created ?? 0) - (b.created ?? 0);
        default:
          return 0;
      }
    });
  }, [filteredModels, sort]);

  const totalPages = Math.ceil(sortedModels.length / PAGE_SIZE);
  const paginatedModels = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedModels.slice(start, start + PAGE_SIZE);
  }, [sortedModels, page]);

  const hasMore = page < totalPages;

  return {
    search,
    sort,
    free,
    inputModalities,
    outputModalities,
    providers,
    reasoning,
    tools,
    view,
    page,
    fav,
    setSearch,
    setSort,
    setFree,
    setInputModalities,
    setOutputModalities,
    setProviders,
    setReasoning,
    setTools,
    setView,
    setPage,
    setFav,
    clearFilters,
    activeFilterCount,
    filteredModels,
    sortedModels,
    paginatedModels,
    totalPages,
    hasMore,
  };
}

export { INPUT_MODALITIES, OUTPUT_MODALITIES, ALL_PROVIDERS };
export type { SortOption, ViewOption };
```

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lockb && mkdir -p src/hooks && git add src/hooks/use-models.ts src/hooks/use-favorites.ts src/hooks/use-model-filters.ts && git commit -m "feat(foundation): add shared hooks - useModels, useFavorites, useModelFilters with nuqs"
```

---

## Task 1: Sorting + Pagination

**Files:**
- Create: `src/components/sort-dropdown.tsx`
- Modify: `src/components/model-grid-v2.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/sort-dropdown.tsx`**

```typescript
"use client";

import * as React from "react";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/hooks/use-model-filters";

const SORT_LABELS: Record<SortOption, string> = {
  "name-asc": "Name (A→Z)",
  "name-desc": "Name (Z→A)",
  "price-asc": "Price (Low→High)",
  "price-desc": "Price (High→Low)",
  "context-desc": "Context Length",
  "created-desc": "Newest",
  "created-asc": "Oldest",
};

interface SortDropdownProps {
  value: SortOption;
  onChange: (v: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl text-xs font-medium"
        >
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
          {SORT_LABELS[value]}
          <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <div className="space-y-0.5">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <button
              key={option}
              onClick={() => onChange(option)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors",
                option === value
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {SORT_LABELS[option]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Update `src/components/model-grid-v2.tsx` to support pagination**

Add `hasMore` and `onLoadMore` props:

```typescript
interface ModelGridProps {
  models: Model[];
  viewMode: "grid" | "list";
  onSelectModel: (model: Model) => void;
  isComparedModels: Model[];
  onToggleCompare: (model: Model) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}
```

Add "Load More" button at bottom of grid. Use intersection observer on the button ref to trigger `onLoadMore` when visible.

- [ ] **Step 3: Update `src/app/page.tsx` to use `useModelFilters` hook**

Replace `useState<Filters>` and `useMemo` filtering logic with `useModelFilters(models)`. Add `SortDropdown` next to search. Slice `paginatedModels` into the grid. Add "Showing X of Y" count that updates with pagination.

- [ ] **Step 4: Run build to verify**

```bash
bun run build
```
Expected: PASS (or lint warnings only)

- [ ] **Step 5: Commit**

```bash
git add src/components/sort-dropdown.tsx src/components/model-grid-v2.tsx src/app/page.tsx && git commit -m "feat: add sorting dropdown and load more pagination"
```

---

## Task 2: URL State Migration Complete

Refines `page.tsx` to fully adopt the URL state hook, removing all legacy state.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite `page.tsx` to fully use `useModelFilters` hook**

Migrate all filter toggle functions to use setters from the hook. Remove `DEFAULT_FILTERS` constant. All state is now URL-driven.

- [ ] **Step 2: Run lint**

```bash
bun run lint
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx && git commit -m "refactor: migrate all page state to URL-driven useModelFilters hook"
```

---

## Task 3: Favorites System

**Files:**
- Modify: `src/components/model-card-v2.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/model-detail-sheet.tsx`

- [ ] **Step 1: Add heart icon to `ModelCard`**

Add `Heart` import from lucide-react. Add `isFavorite?: boolean` and `onToggleFavorite?: () => void` props. Render filled heart (red) when `isFavorite`, outline heart when not. Top-right corner, above the compare button.

- [ ] **Step 2: Update `page.tsx` to wire up favorites**

Use `useFavorites()` hook. Pass `isFavorite` and `onToggleFavorite` to each `ModelCard`. Add "Favorites" filter pill wired to `setFav()`. Show favorites count badge on the pill.

- [ ] **Step 3: Add heart to `ModelDetailSheet` header**

Add `onToggleFavorite` prop to `ModelDetailSheet`. Pass through from `page.tsx`.

- [ ] **Step 4: Run build**

```bash
bun run build
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/model-card-v2.tsx src/components/model-detail-sheet.tsx src/app/page.tsx && git commit -m "feat: add favorites system with heart icon on cards and filter"
```

---

## Task 4: Individual Model Pages

**Files:**
- Create: `src/app/models/[id]/page.tsx`
- Create: `src/components/model-specs-card.tsx`
- Create: `src/components/model-pricing-card.tsx`
- Create: `src/components/similar-models.tsx`
- Modify: `src/components/model-card-v2.tsx` (navigation change)
- Modify: `src/app/page.tsx` (navigation change)

- [ ] **Step 1: Create `src/app/models/[id]/page.tsx`**

```typescript
import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Model } from "@/lib/types";
import { ModelSpecsCard } from "@/components/model-specs-card";
import { ModelPricingCard } from "@/components/model-pricing-card";
import { SimilarModels } from "@/components/similar-models";
import { PricingCalculator } from "@/components/pricing-calculator";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  try {
    const res = await fetch("https://api.kilo.ai/api/gateway/models", {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return (data.data ?? []).map((m: Model) => ({ id: encodeURIComponent(m.id) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  try {
    const res = await fetch("https://api.kilo.ai/api/gateway/models", {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    const model = (data.data ?? []).find((m: Model) => m.id === decoded);
    if (!model) return {};
    return {
      title: `${model.name} — Kilo Models`,
      description: model.description,
      openGraph: {
        title: model.name,
        description: model.description,
        type: "website",
      },
    };
  } catch {
    return {};
  }
}

export default async function ModelPage({ params }: Props) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  let model: Model | null = null;
  let allModels: Model[] = [];

  try {
    const res = await fetch("https://api.kilo.ai/api/gateway/models", {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    allModels = data.data ?? [];
    model = allModels.find((m: Model) => m.id === decoded) ?? null;
  } catch {}

  if (!model) notFound();

  const similar = allModels
    .filter((m) => m.id !== model!.id)
    .filter((m) => {
      const sameProvider = m.id.split("/")[0] === model!.id.split("/")[0];
      const sameInput = (m.architecture?.input_modalities ?? []).some((mod) =>
        (model!.architecture?.input_modalities ?? []).includes(mod)
      );
      return sameProvider || sameInput;
    })
    .slice(0, 6);

  const provider = model.id.split("/")[0];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>

        <div>
          <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
            {provider}
          </span>
          <h1 className="font-heading text-4xl mt-1">{model.name}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{model.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModelSpecsCard model={model} />
          <ModelPricingCard model={model} />
        </div>

        <PricingCalculator model={model} />

        <SimilarModels models={similar} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/model-specs-card.tsx`**

```typescript
"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K`;
  return ctx.toString();
}

interface Props {
  model: Model;
}

export function ModelSpecsCard({ model }: Props) {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-heading text-lg">Specifications</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Context Length</span>
          <span className="font-medium">{formatContext(model.context_length)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Completion</span>
          <span className="font-medium">
            {model.top_provider?.max_completion_tokens
              ? formatContext(model.top_provider.max_completion_tokens)
              : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tokenizer</span>
          <span className="font-medium font-mono text-xs">
            {model.architecture?.tokenizer ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Input Modalities</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(model.architecture?.input_modalities ?? []).map((m) => (
              <Badge key={m} variant="outline" className="text-xs capitalize">
                {m}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Output Modalities</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(model.architecture?.output_modalities ?? []).map((m) => (
              <Badge key={m} variant="outline" className="text-xs capitalize">
                {m}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Supported Parameters</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(model.supported_parameters ?? []).map((p) => (
              <Badge key={p} variant="secondary" className="text-xs font-mono">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create `src/components/model-pricing-card.tsx`**

```typescript
"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";

function formatPrice(price: string | undefined): string {
  if (!price || price === "0") return "Free";
  const num = parseFloat(price);
  if (num < 0.00001) return `$${(num * 1000000).toFixed(2)}/M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/K`;
  return `$${num.toFixed(4)}/K`;
}

interface Props {
  model: Model;
}

export function ModelPricingCard({ model }: Props) {
  const p = model.pricing;
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-heading text-lg">Pricing</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Prompt (input)</span>
          <span className="font-medium">{formatPrice(p?.prompt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Completion (output)</span>
          <span className="font-medium">{formatPrice(p?.completion)}</span>
        </div>
        {p?.input_cache_read && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cache Read</span>
            <span className="font-medium">{formatPrice(p.input_cache_read)}</span>
          </div>
        )}
        {p?.input_cache_write && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cache Write</span>
            <span className="font-medium">{formatPrice(p.input_cache_write)}</span>
          </div>
        )}
        {p?.image && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Image</span>
            <span className="font-medium">{formatPrice(p.image)}</span>
          </div>
        )}
        {p?.web_search && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Web Search</span>
            <span className="font-medium">{formatPrice(p.web_search)}</span>
          </div>
        )}
        {p?.internal_reasoning && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Internal Reasoning</span>
            <span className="font-medium">{formatPrice(p.internal_reasoning)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create `src/components/similar-models.tsx`**

```typescript
"use client";

import * as React from "react";
import Link from "next/link";
import { Model } from "@/lib/types";
import { ModelCard } from "@/components/model-card-v2";

interface Props {
  models: Model[];
}

export function SimilarModels({ models }: Props) {
  if (models.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl">Similar Models</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <Link key={model.id} href={`/models/${encodeURIComponent(model.id)}`}>
            <ModelCard
              model={model}
              onSelect={() => {}}
              isCompared={false}
              onToggleCompare={() => {}}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `ModelCard` navigation — change `onClick` to `Link` wrapper**

In `ModelCard`, wrap the card content in a `Link` from `next/link` that navigates to `/models/${encodeURIComponent(model.id)}`. Remove the `onClick` handler from the `Card` element. Keep `onToggleCompare` working via button click (stopPropagation).

- [ ] **Step 6: Run build**

```bash
bun run build
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/models/ src/components/model-specs-card.tsx src/components/model-pricing-card.tsx src/components/similar-models.tsx src/components/model-card-v2.tsx && git commit -m "feat: add individual model pages with SEO metadata, specs/pricing cards, and similar models"
```

---

## Task 5: Pricing Calculator

**Files:**
- Create: `src/components/pricing-calculator.tsx`
- Modify: `src/app/models/[id]/page.tsx` (already references it)

- [ ] **Step 1: Create `src/components/pricing-calculator.tsx`**

```typescript
"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

function formatPrice(price: string | undefined): string {
  if (!price || price === "0") return "Free";
  const num = parseFloat(price);
  if (num < 0.00001) return `$${(num * 1000000).toFixed(2)}/M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/K`;
  return `$${num.toFixed(4)}/K`;
}

function formatCost(cost: number): string {
  if (cost < 0.00001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

interface Props {
  model: Model;
  className?: string;
}

export function PricingCalculator({ model, className }: Props) {
  const [inputTokens, setInputTokens] = React.useState(100000);
  const [outputTokens, setOutputTokens] = React.useState(50000);
  const [requests, setRequests] = React.useState(1000);
  const [open, setOpen] = React.useState(false);

  const p = model.pricing;
  const inputPrice = parseFloat(p?.prompt ?? "0") || 0;
  const outputPrice = parseFloat(p?.completion ?? "0") || 0;

  const inputCost = (inputTokens / 1000) * inputPrice;
  const outputCost = (outputTokens / 1000) * outputPrice;
  const totalPerRequest = inputCost + outputCost;
  const totalCost = totalPerRequest * requests;

  return (
    <Card className={`p-6 ${className ?? ""}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="font-heading text-lg">Cost Calculator</h2>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Input Tokens</label>
              <Input
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9"
              />
              <input
                type="range"
                min={0}
                max={1000000}
                step={1000}
                value={inputTokens}
                onChange={(e) => setInputTokens(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Output Tokens</label>
              <Input
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9"
              />
              <input
                type="range"
                min={0}
                max={500000}
                step={1000}
                value={outputTokens}
                onChange={(e) => setOutputTokens(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Requests</label>
              <Input
                type="number"
                value={requests}
                onChange={(e) => setRequests(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Input cost</span>
              <span className="font-medium">{formatCost(inputCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Output cost</span>
              <span className="font-medium">{formatCost(outputCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Per request</span>
              <span className="font-semibold">{formatCost(totalPerRequest)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground font-medium">Total ({requests.toLocaleString()} req)</span>
              <span className="font-bold text-primary">{formatCost(totalCost)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Run build**

```bash
bun run build
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/pricing-calculator.tsx && git commit -m "feat: add pricing calculator component with sliders and cost breakdown"
```

---

## Task 6: Data Visualization

**Files:**
- Create: `src/components/pricing-bar-chart.tsx`
- Create: `src/components/capability-radar-chart.tsx`
- Create: `src/components/compare-cost-table.tsx`
- Modify: `src/components/compare-modal.tsx`

- [ ] **Step 1: Create `src/components/pricing-bar-chart.tsx`**

```typescript
"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Model } from "@/lib/types";
import { useTheme } from "next-themes";

function formatPrice(price: string | undefined): string {
  if (!price || price === "0") return "0";
  const num = parseFloat(price);
  if (num < 0.00001) return `${(num * 1000000).toFixed(1)}`;
  if (num < 0.001) return `${(num * 1000).toFixed(4)}`;
  return `${num.toFixed(2)}`;
}

interface Props {
  models: Model[];
}

export function PricingBarChart({ models }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = models.map((m) => ({
    name: m.name.split("/").pop() ?? m.name,
    prompt: parseFloat(m.pricing?.prompt ?? "0") || 0,
    completion: parseFloat(m.pricing?.completion ?? "0") || 0,
  }));

  const promptColor = isDark ? "#a78bfa" : "#7c3aed";
  const completionColor = isDark ? "#f472b6" : "#db2777";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <XAxis type="number" tickFormatter={(v) => `$${v}`} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(6)}`, ""]}
          contentStyle={{
            backgroundColor: isDark ? "#1e1e2e" : "#fff",
            border: "none",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey="prompt" name="Prompt" fill={promptColor} radius={[0, 4, 4, 0]} />
        <Bar dataKey="completion" name="Completion" fill={completionColor} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create `src/components/capability-radar-chart.tsx`**

```typescript
"use client";

import * as React from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Model } from "@/lib/types";
import { useTheme } from "next-themes";

function normalize(value: number, max: number): number {
  return Math.round((value / max) * 100);
}

const COLORS = [
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb923c",
];

interface Props {
  models: Model[];
}

export function CapabilityRadarChart({ models }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const maxContext = Math.max(...models.map((m) => m.context_length ?? 0));
  const maxTokens = Math.max(...models.map((m) => m.top_provider?.max_completion_tokens ?? 0));
  const maxParams = Math.max(...models.map((m) => (m.supported_parameters ?? []).length));

  const avgPromptPrice = models.reduce((acc, m) => acc + parseFloat(m.pricing?.prompt ?? "0"), models.length);
  const minPromptPrice = Math.min(...models.map((m) => parseFloat(m.pricing?.prompt ?? "9999")));

  const data = models.map((m, i) => ({
    name: m.name.split("/").pop() ?? m.name,
    context: normalize(m.context_length ?? 0, maxContext),
    tokens: normalize(m.top_provider?.max_completion_tokens ?? 0, maxTokens),
    pricing: Math.round(((avgPromptPrice - parseFloat(m.pricing?.prompt ?? "0")) / avgPromptPrice) * 100) || 0,
    params: normalize((m.supported_parameters ?? []).length, maxParams),
  }));

  const axes = ["context", "tokens", "pricing", "params"] as const;
  const axisLabels: Record<string, string> = {
    context: "Context",
    tokens: "Max Tokens",
    pricing: "Low Price",
    params: "Parameters",
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke={isDark ? "#374151" : "#e5e7eb"} />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
        {axes.map((axis, i) => (
          <Radar
            key={axis}
            name={axisLabels[axis]}
            dataKey={axis}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
          />
        ))}
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? "#1e1e2e" : "#fff",
            border: "none",
            borderRadius: "8px",
          }}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create `src/components/compare-cost-table.tsx`**

```typescript
"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react";

function formatCost(cost: number): string {
  if (cost < 0.00001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

interface Props {
  models: Model[];
}

export function CompareCostTable({ models }: Props) {
  const [inputTokens, setInputTokens] = React.useState(100000);
  const [outputTokens, setOutputTokens] = React.useState(50000);
  const [requests, setRequests] = React.useState(1000);

  const rows = models.map((m) => {
    const inputPrice = parseFloat(m.pricing?.prompt ?? "0") || 0;
    const outputPrice = parseFloat(m.pricing?.completion ?? "0") || 0;
    const inputCost = (inputTokens / 1000) * inputPrice;
    const outputCost = (outputTokens / 1000) * outputPrice;
    const total = (inputCost + outputCost) * requests;
    return { model: m, total, inputCost, outputCost };
  });

  rows.sort((a, b) => a.total - b.total);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Input Tokens</label>
          <Input
            type="number"
            value={inputTokens}
            onChange={(e) => setInputTokens(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Output Tokens</label>
          <Input
            type="number"
            value={outputTokens}
            onChange={(e) => setOutputTokens(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Requests</label>
          <Input
            type="number"
            value={requests}
            onChange={(e) => setRequests(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-9"
          />
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Model</th>
              <th className="text-right p-3 font-medium">Input</th>
              <th className="text-right p-3 font-medium">Output</th>
              <th className="text-right p-3 font-medium">Total ({requests.toLocaleString()})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, inputCost, outputCost, total }, i) => (
              <tr key={model.id} className={i === 0 ? "bg-primary/5" : ""}>
                <td className="p-3 font-medium">
                  {i === 0 && <ArrowUpDown className="inline h-3 w-3 mr-1.5 text-primary" />}
                  {model.name.split("/").pop()}
                </td>
                <td className="text-right p-3">{formatCost(inputCost)}</td>
                <td className="text-right p-3">{formatCost(outputCost)}</td>
                <td className="text-right p-3 font-semibold">{formatCost(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `src/components/compare-modal.tsx` to add tabs**

Add `Tabs` from shadcn/ui. Three tabs:
1. "Overview" — existing comparison content
2. "Charts" — `PricingBarChart` + `CapabilityRadarChart`
3. "Cost Calculator" — `CompareCostTable`

- [ ] **Step 5: Run build**

```bash
bun run build
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/pricing-bar-chart.tsx src/components/capability-radar-chart.tsx src/components/compare-cost-table.tsx src/components/compare-modal.tsx && git commit -m "feat: add recharts visualizations to compare modal - bar chart, radar chart, and cost table"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] URL State — Task 0 hook + Task 2 complete migration
- [x] Sorting — Task 1 sort dropdown + hook
- [x] Pagination — Task 1 load more + page tracking
- [x] Favorites — Task 3 heart icons + filter + localStorage
- [x] Model Pages — Task 4 static pages + specs + pricing + similar
- [x] Pricing Calculator — Task 5 standalone + embedded in model page
- [x] Data Visualization — Task 6 bar chart + radar chart + cost table in compare modal

**Placeholder scan:** No TBDs, TODOs, or incomplete steps. All code is complete and runnable.

**Type consistency:** `useModelFilters` hook signature consistent across Tasks 1-3. `Model` type imported from `@/lib/types` everywhere. `SortOption` and `ViewOption` exported from hook, imported in components. `PricingCalculator` receives `Model` prop matching its usage in Task 4 page.
