"use client";

import * as React from "react";
import Link from "next/link";
import type { Model } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ModelGrid } from "@/components/model-grid-v2";
import { Paginator } from "@/components/paginator";
import { CompareTray } from "@/components/compare-tray";
import { CompareModal } from "@/components/compare-modal";
import { SortDropdown } from "@/components/sort-dropdown";
import { Search, LayoutGrid, List, ChevronDown, X, Heart, SlidersHorizontal, Check, ArrowUpRight, CircleAlert } from "lucide-react";
import { useModelFilters, INPUT_MODALITIES, OUTPUT_MODALITIES } from "@/hooks/use-model-filters";
import { useFavorites } from "@/hooks/use-favorites";
import { useModels } from "@/hooks/use-models";

function ModelExplorer({ models, loading }: { models: Model[]; loading: boolean }) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [comparedModels, setComparedModels] = React.useState<Model[]>([]);
  const [compareModalOpen, setCompareModalOpen] = React.useState(false);
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const {
    search, setSearch, sort, setSort, free, setFree,
    inputModalities, setInputModalities, outputModalities, setOutputModalities,
    providers, setProviders, reasoning, setReasoning, tools, setTools,
    page, setPage, fav, setFav, view, setView, clearFilters,
    activeFilterCount, sortedModels, paginatedModels, totalPages,
  } = useModelFilters(models, favorites);
  const availableProviders = [...new Set(models.map((model) => model.id.split("/")[0]))].sort();
  const hasFilters = activeFilterCount > 0 || search.length > 0;

  const handleToggleCompare = (model: Model) => {
    setComparedModels((previous) => previous.some((item) => item.id === model.id)
      ? previous.filter((item) => item.id !== model.id)
      : previous.length < 10 ? [...previous, model] : previous);
  };

  return (
    <>
      <div className="flex items-center gap-6 border-b">
        <button type="button" onClick={() => setFav(false)} aria-pressed={!fav}
          className={cn("min-h-12 border-b-2 px-1 text-sm font-medium transition-colors", !fav ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          All models <span className="ml-2 text-xs tabular-nums text-muted-foreground">{loading ? "..." : models.length}</span>
        </button>
        <button type="button" onClick={() => setFav(true)} aria-pressed={fav}
          className={cn("flex min-h-12 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors", fav ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          <Heart className="size-4" aria-hidden="true" /> Favorites
          <span className="text-xs tabular-nums text-muted-foreground">{favorites.length}</span>
        </button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">Select models to compare side by side</span>
      </div>

      <div className="grid items-start gap-6 pt-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <div className="flex gap-3 lg:hidden">
          <Button variant="outline" className="h-11 flex-1" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="model-filters">
            <SlidersHorizontal className="size-4" /> Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            <ChevronDown className={cn("ml-auto size-4 transition-transform", filtersOpen && "rotate-180")} />
          </Button>
          {hasFilters && <Button variant="ghost" className="h-11" onClick={clearFilters}>Reset</Button>}
        </div>

        <aside id="model-filters" aria-label="Filter models" className={cn("space-y-7 rounded-xl border p-4 lg:rounded-none lg:border-0 lg:p-0", !filtersOpen && "hidden lg:block")}>
          <div className="flex h-11 items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4" aria-hidden="true" /> Filters</h2>
            {hasFilters && <button type="button" onClick={clearFilters} className="min-h-9 px-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Reset all</button>}
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-medium">Pricing</legend>
            <button type="button" onClick={() => setFree(!free)} aria-pressed={free}
              className="flex min-h-10 w-full items-center gap-3 text-left text-sm">
              <span className={cn("flex size-4 items-center justify-center rounded border", free ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{free && <Check className="size-3" aria-hidden="true" />}</span>
              Free models only
            </button>
          </fieldset>

          {[
            { label: "Input modalities", options: INPUT_MODALITIES, selected: inputModalities, set: setInputModalities },
            { label: "Output modalities", options: OUTPUT_MODALITIES, selected: outputModalities, set: setOutputModalities },
          ].map(({ label, options, selected, set }) => (
            <fieldset key={label}>
              <legend className="mb-3 text-sm font-medium">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {options.map((modality) => (
                  <button key={modality} type="button" aria-pressed={selected.includes(modality)}
                    onClick={() => set(selected.includes(modality) ? selected.filter((item) => item !== modality) : [...selected, modality])}
                    className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs capitalize transition-colors", selected.includes(modality) ? "border-foreground bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground")}>
                    {selected.includes(modality) && <Check className="size-3" aria-hidden="true" />}
                    {modality}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <fieldset>
            <legend className="mb-3 text-sm font-medium">Capabilities</legend>
            {[{ label: "Reasoning", checked: reasoning, set: setReasoning }, { label: "Tool calling", checked: tools, set: setTools }].map(({ label, checked, set }) => (
              <button key={label} type="button" onClick={() => set(!checked)} aria-pressed={checked} className="flex min-h-10 w-full items-center gap-3 text-left text-sm">
                <span className={cn("flex size-4 items-center justify-center rounded border", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{checked && <Check className="size-3" aria-hidden="true" />}</span>
                {label}
              </button>
            ))}
          </fieldset>

          <div className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-medium">Providers</h3>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" className="h-11 w-full justify-between text-xs" />}>
                {providers.length ? `${providers.length} selected` : "All providers"}<ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-80 w-56" align="start">
                {availableProviders.map((provider) => (
                  <DropdownMenuCheckboxItem key={provider} checked={providers.includes(provider)} closeOnClick={false}
                    onCheckedChange={(checked) => setProviders(checked ? [...providers, provider] : providers.filter((item) => item !== provider))}
                    className="min-h-9 capitalize">{provider}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {providers.length > 0 && <button type="button" onClick={() => setProviders([])} className="min-h-9 text-xs text-muted-foreground underline underline-offset-4">Clear providers</button>}
          </div>
        </aside>

        <section aria-label="Model results" aria-busy={loading} className="min-w-0 space-y-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Search models" placeholder="Search by model, provider, or keyword..." value={search}
              onChange={(event) => setSearch(event.target.value)} className="h-12 rounded-lg bg-card pl-11 pr-12 text-sm placeholder:text-muted-foreground" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              {loading ? "Loading models..." : <><span className="font-semibold tabular-nums text-foreground">{sortedModels.length}</span> {fav ? "favorite" : "available"} {sortedModels.length === 1 ? "model" : "models"}</>}
            </p>
            <div className="flex items-center gap-2">
              <SortDropdown value={sort} onChange={setSort} />
              <div className="flex items-center rounded-lg border p-1" role="group" aria-label="Results view">
                <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="size-8" onClick={() => setView("grid")} aria-label="Grid view" aria-pressed={view === "grid"}><LayoutGrid className="size-4" /></Button>
                <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="size-8" onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"}><List className="size-4" /></Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading model cards">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-80 space-y-5 rounded-xl border bg-card p-5 motion-safe:animate-pulse" aria-hidden="true">
                  <div className="h-5 w-2/3 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="space-y-2 pt-4"><div className="h-3 rounded bg-muted" /><div className="h-3 w-4/5 rounded bg-muted" /></div>
                  <div className="h-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : sortedModels.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-20 text-center">
              <Search className="mb-5 size-7 text-muted-foreground" aria-hidden="true" />
              <h2 className="font-heading text-3xl">{fav && favorites.length === 0 ? "Your shortlist starts here" : "No models found"}</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{fav && favorites.length === 0 ? "Save a model with the heart button to find it here later." : "Try a different search or remove a filter to see more models."}</p>
              <Button variant="outline" onClick={clearFilters} className="mt-6 h-11">{fav && favorites.length === 0 ? "Browse all models" : "Clear search and filters"}</Button>
            </div>
          ) : (
            <>
              <ModelGrid models={paginatedModels} viewMode={view}
                isComparedModels={comparedModels} onToggleCompare={handleToggleCompare} isFavoriteModel={isFavorite} onToggleFavorite={toggleFavorite} />
              <Paginator page={page} totalPages={totalPages} totalCount={sortedModels.length} pageSize={24}
                onPageChange={(nextPage) => { setPage(nextPage); document.getElementById("directory")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }} />
            </>
          )}
        </section>
      </div>

      <CompareTray models={comparedModels} onRemove={handleToggleCompare} onOpen={() => setCompareModalOpen(true)} />
      <CompareModal models={comparedModels} open={compareModalOpen} onOpenChange={setCompareModalOpen} onRemove={handleToggleCompare} />
    </>
  );
}

export default function Home() {
  const { models, loading, error } = useModels();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#directory" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-foreground">Skip to models</a>
      <header className="border-b bg-background">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="Kilo Models home" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="" className="size-9" width={36} height={36} />
            <span className="font-heading text-2xl tracking-tight">Kilo Models</span>
          </Link>
          <div className="flex items-center gap-5">
            <a href="https://github.com/vkeerthivikram/kilo-models" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:flex">GitHub <ArrowUpRight className="size-4" /></a>
            <ThemeSelector />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-28 sm:px-8">
        <div className="flex flex-col justify-between gap-5 py-10 sm:py-14 lg:flex-row lg:items-end lg:gap-12">
          <h1 className="max-w-xl text-balance font-heading text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">Discover your next <span className="italic">AI model.</span></h1>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground sm:text-base">Explore models from the Kilo Gateway. Compare pricing, context length, and capabilities in one place.</p>
        </div>

        <div id="directory" className="scroll-mt-6">
          {error || (!loading && models.length === 0) ? (
            <div role="alert" className="flex flex-col items-center rounded-xl border px-6 py-16 text-center">
              <CircleAlert className="mb-4 size-7 text-destructive" aria-hidden="true" />
              <h2 className="font-heading text-3xl">{error ? "Models could not be loaded" : "No models available"}</h2>
              <p className="mt-3 text-sm text-muted-foreground">The model directory is unavailable right now. Please try again.</p>
              <Button onClick={() => window.location.reload()} className="mt-6 h-11">Try again</Button>
            </div>
          ) : (
            <React.Suspense fallback={<p role="status" className="py-16 text-center text-muted-foreground">Loading model directory...</p>}>
              <ModelExplorer models={models} loading={loading} />
            </React.Suspense>
          )}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 px-5 py-6 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:px-8">
          <p>Model data from <a href="https://api.kilo.ai" target="_blank" rel="noopener noreferrer" className="text-foreground underline-offset-4 hover:underline">Kilo Gateway <ArrowUpRight className="inline size-3" /></a></p>
          <p>Unofficial fan project. Not affiliated with or endorsed by Kilo AI.</p>
        </div>
      </footer>
    </div>
  );
}
