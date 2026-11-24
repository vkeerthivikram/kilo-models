"use client";

import { createDialogController } from "@ui-sdk/react/dialog";
import { Button as ActionButton } from "@ui-sdk/react/button";
import { CheckboxGroup } from "@ui-sdk/react/checkbox";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { SearchFilterChip } from "@/components/ui/search-filter-chip";
import * as React from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import type { Model } from "@/lib/types";
import { getModelProvider } from "@/lib/model-provider";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelGrid } from "@/components/model-grid-v2";
import { Paginator } from "@/components/paginator";
import { CompareTray } from "@/components/compare-tray";
import { CompareModal } from "@/components/compare-modal";
import { SortDropdown } from "@/components/sort-dropdown";
import { NumericFilterInput } from "@/components/numeric-filter-input";
import { rememberDirectoryPosition, useDirectoryScrollRestoration } from "@/lib/directory-navigation";
import { Search, LayoutGrid, List, ChevronDown, X, Heart, SlidersHorizontal, Check, ArrowUpRight, CircleAlert } from "lucide-react";
import { useModelFilters, PAGE_SIZE } from "@/hooks/use-model-filters";
import { useComparison } from "@/hooks/use-comparison";
import { isLocalComparisonEntry } from "@/lib/comparison-history";
import { useFavorites } from "@/hooks/use-favorites";
import { useModels } from "@/hooks/use-models";
import { CatalogStatus } from "@/components/catalog-status";
import { CalculatorInputs } from "@/components/calculator-inputs";
import { SavedSetups } from "@/components/saved-setups";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { workloadSummary } from "@/lib/workload-summary";
import { InlineHelp } from "@/components/inline-help";

function ModelExplorer({ models, loading, excludedCount }: { models: Model[]; loading: boolean; excludedCount: number }) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [providerSearch, setProviderSearch] = React.useState("");
  const [providersOpen, setProvidersOpen] = React.useState(false);
  const providerToggle = React.useRef<HTMLButtonElement>(null);
  const searchInput = React.useRef<HTMLInputElement>(null);
  const providerInput = React.useRef<HTMLInputElement>(null);
  const workloadPanel = React.useRef<HTMLDetailsElement>(null);
  const [workloadVisited, setWorkloadVisited] = React.useState(false);
  const { comparedModels, selectedIds, toggleCompare, rememberLocalComparison, clearComparison, hasSharedComparison } = useComparison(models, loading ? "loading" : excludedCount > 0 ? "partial" : "complete");
  const [comparisonDialog] = React.useState(() => createDialogController());
  const [comparisonOpen, setComparisonOpen] = React.useState(false);
  const hideBackgroundFromAgent = comparisonOpen && comparedModels.length > 0 ? "" : undefined;
  React.useEffect(() => {
    if (comparedModels.length === 0 && comparisonOpen) comparisonDialog.close();
  }, [comparedModels.length, comparisonOpen, comparisonDialog]);
  React.useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || comparisonDialog.isOpen()) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], [role="menu"]')) return;
      if (document.querySelector('[aria-haspopup="menu"][aria-expanded="true"]')) return;
      event.preventDefault();
      searchInput.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [comparisonDialog]);
  const openedSharedComparison = React.useRef(false);
  useDirectoryScrollRestoration(!loading);
  React.useEffect(() => {
    if (!hasSharedComparison) openedSharedComparison.current = false;
    if (!loading && hasSharedComparison && comparedModels.length > 0 && !openedSharedComparison.current && !isLocalComparisonEntry()) {
      const frame = window.requestAnimationFrame(() => {
        openedSharedComparison.current = true;
        comparisonDialog.setOpen(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [loading, hasSharedComparison, comparedModels.length, comparisonDialog]);
  const { favorites, isFavorite, toggleFavorite, setFavorite, storageWarning } = useFavorites();
  const favoriteCount = React.useMemo(() => models.filter((model) => favorites.includes(model.id)).length, [models, favorites]);
  const { workload, setWorkload } = useCalculatorWorkload();
  const {
    search, searchDraft, setSearch, cancelSearchWrite, sort, setSort, free, setFree, hideRetired, setHideRetired,
    fitsWorkload, setFitsWorkload, maxBudget, setMaxBudget,
    inputModalities, setInputModalities, outputModalities, setOutputModalities,
    providers, setProviders, reasoning, setReasoning, tools, setTools, toggleCapability,
    minContext, setMinContext, maxInputPrice, setMaxInputPrice, maxOutputPrice, setMaxOutputPrice, filterCounts,
    page, setPage, fav, setFav, view, setView, clearFilters,
    activeFilterCount, sortedModels, paginatedModels, totalPages, directoryQuery, applyDirectoryQuery,
  } = useModelFilters(models, favorites, workload);
  const modalities = React.useMemo(() => ({
    input: [...new Set(models.flatMap((model) => model.architecture?.input_modalities ?? []))].sort(),
    output: [...new Set(models.flatMap((model) => model.architecture?.output_modalities ?? []))].sort(),
  }), [models]);
  const availableProviders = React.useMemo(() => [...new Set(models.map((model) => getModelProvider(model.id)))].sort(), [models]);
  const matchingProviders = React.useMemo(() => {
    const needle = providerSearch.trim().toLowerCase();
    return availableProviders.filter((provider) => provider.toLowerCase().includes(needle))
      .sort((a, b) => Number(providers.includes(b)) - Number(providers.includes(a)) || a.localeCompare(b));
  }, [availableProviders, providerSearch, providers]);
  const editBudgetWorkload = () => {
    if (!workloadPanel.current) return;
    workloadPanel.current.open = true;
    setWorkloadVisited(true);
    requestAnimationFrame(() => workloadPanel.current?.querySelector<HTMLInputElement>('input[type="number"]')?.focus());
  };
  const hasFilters = activeFilterCount > 0 || search.length > 0;
  const advancedFilterCount = [hideRetired, fitsWorkload, maxBudget !== null, minContext !== null, maxInputPrice !== null, maxOutputPrice !== null].filter(Boolean).length + inputModalities.length + outputModalities.length;
  const [initiallyAdvanced] = React.useState(advancedFilterCount > 0);
  const advancedPanel = React.useRef<HTMLDetailsElement>(null);
  const [advancedVisited, setAdvancedVisited] = React.useState(initiallyAdvanced);
  const hasAdvancedFilters = advancedFilterCount > 0;
  React.useEffect(() => {
    // Saved views reveal active filters; clearing them must not close an editing panel.
    if (hasAdvancedFilters && advancedPanel.current) advancedPanel.current.open = true;
  }, [hasAdvancedFilters]);
  const activeFilters = [
    ...(search ? [{ key: "search", label: `Search: ${search}`, remove: () => setSearch("") }] : []),
    ...(free ? [{ key: "free", label: "Free only", remove: () => setFree(false) }] : []),
    ...(hideRetired ? [{ key: "hide-retired", label: "Hide retired", remove: () => setHideRetired(false) }] : []),
    ...(fitsWorkload ? [{ key: "fits-workload", label: "Fits workload", remove: () => setFitsWorkload(false) }] : []),
    ...(maxBudget !== null ? [{ key: "budget", label: `${workload.period === "month" ? "Monthly" : "Batch"} budget ≤ $${maxBudget}`, remove: () => setMaxBudget(null) }] : []),
    ...inputModalities.map((value) => ({ key: `input-${value}`, label: `Input: ${value}`, remove: () => setInputModalities(inputModalities.filter((item) => item !== value)) })),
    ...outputModalities.map((value) => ({ key: `output-${value}`, label: `Output: ${value}`, remove: () => setOutputModalities(outputModalities.filter((item) => item !== value)) })),
    ...providers.map((value) => ({ key: `provider-${value}`, label: `Provider: ${value}`, remove: () => setProviders(providers.filter((item) => item !== value)) })),
    ...(reasoning ? [{ key: "reasoning", label: "Reasoning", remove: () => setReasoning(false) }] : []),
    ...(tools ? [{ key: "tools", label: "Tool calling", remove: () => setTools(false) }] : []),
    ...(minContext !== null ? [{ key: "context", label: `Context ≥ ${minContext.toLocaleString()} tokens`, remove: () => setMinContext(null) }] : []),
    ...(maxInputPrice !== null ? [{ key: "input-price", label: `Input ≤ $${maxInputPrice}/1M tokens`, remove: () => setMaxInputPrice(null) }] : []),
    ...(maxOutputPrice !== null ? [{ key: "output-price", label: `Output ≤ $${maxOutputPrice}/1M tokens`, remove: () => setMaxOutputPrice(null) }] : []),
  ];

  const handleToggleCompare = (model: Model) => {
    if (comparedModels.length === 1 && comparedModels[0].id === model.id) comparisonDialog.close();
    toggleCompare(model);
  };
  const handleModelNavigate = () => {
    cancelSearchWrite();
    rememberDirectoryPosition({ search, page });
    rememberLocalComparison();
  };

  return (
    <>
      <div data-agent-hidden={hideBackgroundFromAgent} className="flex items-center gap-6 border-b">
        <ActionButton type="button" onClick={() => setFav(false)} aria-pressed={!fav}
          className={cn("min-h-12 border-b-2 px-1 text-sm font-medium transition-colors", !fav ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          All models <span aria-hidden="true" className="ml-2 text-xs tabular-nums text-muted-foreground">{loading ? "..." : models.length}</span>
        </ActionButton>
        <ActionButton type="button" onClick={() => setFav(true)} aria-pressed={fav}
          className={cn("flex min-h-12 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors", fav ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          <Heart className="size-4" aria-hidden="true" /> Favorites
          <span aria-hidden="true" className="text-xs tabular-nums text-muted-foreground">{loading ? "..." : favoriteCount}</span>
        </ActionButton>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">Select models to compare side by side</span>
      </div>

      <div data-agent-hidden={hideBackgroundFromAgent} className="grid items-start gap-3 pt-3 sm:gap-5 sm:pt-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <div className="flex gap-3 lg:hidden">
          <Button variant="outline" className="h-11 flex-1" onClick={() => setFiltersOpen(!filtersOpen)} aria-label="Filters" aria-expanded={filtersOpen} aria-controls="model-filters">
            <SlidersHorizontal className="size-4" /> Filters{activeFilterCount > 0 && <span aria-hidden="true">({activeFilterCount})</span>}
            <ChevronDown className={cn("ml-auto size-4 transition-transform", filtersOpen && "rotate-180")} />
          </Button>
          {hasFilters && <Button variant="ghost" className="h-11" onClick={clearFilters}>Reset</Button>}
        </div>

        <aside id="model-filters" aria-label="Filter models" className={cn("space-y-7 rounded-xl border p-4 lg:rounded-none lg:border-0 lg:p-0", !filtersOpen && "hidden lg:block")}>
          <div className="flex h-11 items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4" aria-hidden="true" /> Filters</h2>
            {hasFilters && <ActionButton type="button" onClick={clearFilters} className="min-h-9 px-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Reset all</ActionButton>}
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-medium">Pricing</legend>
            <ActionButton type="button" onClick={() => setFree(!free)} aria-pressed={free} aria-describedby="free-model-count"
              className="flex min-h-10 w-full items-center gap-3 text-left text-sm">
              <span className={cn("flex size-4 items-center justify-center rounded border", free ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{free && <Check className="size-3" aria-hidden="true" />}</span>
              Free models only
              <span id="free-model-count" aria-hidden="true" className="ml-auto text-xs tabular-nums text-muted-foreground">{filterCounts.free}<span className="sr-only"> matching models</span></span>
            </ActionButton>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-medium">Capabilities</legend>
            {([{ key: "reasoning", label: "Reasoning", checked: reasoning, count: filterCounts.reasoning }, { key: "tools", label: "Tool calling", checked: tools, count: filterCounts.tools }] as const).map(({ key, label, checked, count }, index) => (
              <ActionButton key={key} type="button" onClick={(_event, details) =>
                details.source === "agent" ? flushSync(() => toggleCapability(key)) : toggleCapability(key)} aria-label={label + " filter"} aria-pressed={checked} aria-describedby={`capability-count-${index}`} className="flex min-h-10 w-full items-center gap-3 text-left text-sm">
                <span className={cn("flex size-4 items-center justify-center rounded border", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{checked && <Check className="size-3" aria-hidden="true" />}</span>
                {label}
                <span id={`capability-count-${index}`} aria-hidden="true" className="ml-auto text-xs tabular-nums text-muted-foreground">{count}<span className="sr-only"> matching models</span></span>
              </ActionButton>
            ))}
            <InlineHelp title="About capabilities"><p>Reasoning indicates support for reasoning controls. Tool calling lets a model request a tool action; your application must execute it. These features do not measure answer quality.</p></InlineHelp>
          </fieldset>

          <div className="space-y-3 border-t pt-5" onKeyDown={(event) => {
            if (event.key === "Escape" && providersOpen) {
              event.stopPropagation();
              setProvidersOpen(false);
              providerToggle.current?.focus();
            }
          }}>
            <h3 className="text-sm font-medium">Providers</h3>
            <Button ref={providerToggle} type="button" variant="outline" className="h-11 w-full justify-between text-xs"
              onClick={() => setProvidersOpen(!providersOpen)} aria-expanded={providersOpen} aria-controls="provider-options">
                {providers.length ? `${providers.length} selected` : "All providers"}<ChevronDown className="size-4" />
            </Button>
            <div id="provider-options" hidden={!providersOpen} className="space-y-2">
              {providersOpen && <>
                <div className="relative">
                  <Input ref={providerInput} aria-label="Search providers" placeholder="Find provider..." value={providerSearch}
                    onValueChange={setProviderSearch} className="h-11 pr-11 text-base md:text-sm" />
                  {providerSearch && <ActionButton type="button" aria-label="Clear provider search" className="absolute right-0 top-0 flex size-11 items-center justify-center rounded text-muted-foreground hover:text-foreground" onClick={() => { setProviderSearch(""); providerInput.current?.focus(); }}><X className="size-4" aria-hidden="true" /></ActionButton>}
                </div>
                <CheckboxGroup aria-label="Choose providers" data-agent-catalog="Provider choices" value={providers} allValues={availableProviders}
                  onValueChange={(values, details) => {
                    if (values.some((provider) => !availableProviders.includes(provider))) {
                      details.cancel();
                      if (details.source === "agent") throw new Error("Choose providers listed in Provider choices.");
                      return;
                    }
                    setProviders([...new Set(values)]);
                  }} className="max-h-64 overflow-y-auto">
                  {matchingProviders.map((provider) => (
                    <label key={provider} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm capitalize">
                      <input type="checkbox" checked={providers.includes(provider)}
                        onChange={(event) => setProviders(event.target.checked ? [...providers, provider] : providers.filter((item) => item !== provider))}
                        className="size-4 shrink-0 accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
                      <span className="min-w-0 truncate">{provider}</span><span className="ml-auto text-xs tabular-nums text-muted-foreground">{filterCounts.providers[provider] ?? 0}</span>
                    </label>
                  ))}
                  {matchingProviders.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">No providers match this search.</p>}
                </CheckboxGroup>
              </>}
            </div>
            {providers.length > 0 && <ActionButton type="button" onClick={() => setProviders([])} className="min-h-9 text-xs text-muted-foreground underline underline-offset-4">Clear providers</ActionButton>}
          </div>
          <details ref={advancedPanel} open={initiallyAdvanced || undefined}
            onToggle={(event) => { if (event.currentTarget.open) setAdvancedVisited(true); }} className="border-t pt-2">
            <DisclosureSummary aria-label="Advanced filters" aria-describedby={advancedFilterCount > 0 ? "advanced-filter-count" : undefined} className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
              Advanced filters{advancedFilterCount > 0 && <span id="advanced-filter-count" className="ml-2 text-xs font-normal text-muted-foreground">{advancedFilterCount} active</span>}
            </DisclosureSummary>
            {(advancedVisited || hasAdvancedFilters) && <div className="space-y-6 pt-3">
              <fieldset>
                <legend className="mb-3 text-sm font-medium">Availability</legend>
                <ActionButton type="button" onClick={() => setHideRetired(!hideRetired)} aria-pressed={hideRetired}
                  className="flex min-h-11 w-full items-center gap-3 text-left text-sm">
                  <span className={cn("flex size-4 items-center justify-center rounded border", hideRetired ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{hideRetired && <Check className="size-3" aria-hidden="true" />}</span>
                  Hide retired models
                </ActionButton>
                <p className="text-xs leading-relaxed text-muted-foreground">Models without a retirement date stay visible.</p>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-medium">Workload shortlist</legend>
                <ActionButton type="button" onClick={() => setFitsWorkload(!fitsWorkload)} aria-pressed={fitsWorkload}
                  className="flex min-h-11 w-full items-center gap-3 text-left text-sm">
                  <span className={cn("flex size-4 items-center justify-center rounded border", fitsWorkload ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{fitsWorkload && <Check className="size-3" aria-hidden="true" />}</span>
                  Fits workload
                </ActionButton>
                <p className="text-xs leading-relaxed text-muted-foreground">Uses your estimate and published token limits. Unknown limits are excluded.</p>
                <NumericFilterInput id="max-budget" label={`Total budget · USD / ${workload.period === "month" ? "month" : "batch"}`} value={maxBudget} onChange={setMaxBudget} />
                <p className="text-xs leading-relaxed text-muted-foreground">Total for all requests and selected charges. Unavailable estimates are excluded.</p>
                <p className="text-xs leading-relaxed text-muted-foreground">Budget uses: {workloadSummary(workload)}</p>
                <ActionButton type="button" aria-label="Edit budget workload" onClick={editBudgetWorkload} className="min-h-11 rounded text-xs underline underline-offset-4">Edit workload</ActionButton>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-medium">Pricing</legend>
                <NumericFilterInput id="max-input-price" label="Max input · USD / 1M tokens" value={maxInputPrice} onChange={setMaxInputPrice} />
                <NumericFilterInput id="max-output-price" label="Max output · USD / 1M tokens" value={maxOutputPrice} onChange={setMaxOutputPrice} />
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-medium">Context</legend>
                <NumericFilterInput id="min-context" label="Minimum context · tokens" value={minContext} onChange={setMinContext} integer />
                <InlineHelp title="About context"><p>Context is the token space available for input and output together in one request. The context filter uses the lower of the published provider limit and the model’s advertised context when both are available.</p></InlineHelp>
              </fieldset>

              {[
                { label: "Input types", direction: "input", options: modalities.input, selected: inputModalities, set: setInputModalities, counts: filterCounts.inputModalities },
                { label: "Output types", direction: "output", options: modalities.output, selected: outputModalities, set: setOutputModalities, counts: filterCounts.outputModalities },
              ].map(({ label, direction, options, selected, set, counts }) => (
                <fieldset key={label}>
                  <legend className="mb-3 text-sm font-medium">{label}</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set([...options, ...selected])].map((modality, index) => (
                      <ActionButton key={modality} type="button" aria-label={`${modality} ${direction}`} aria-describedby={`${direction}-count-${index}`} aria-pressed={selected.includes(modality)}
                        onClick={() => set(selected.includes(modality) ? selected.filter((item) => item !== modality) : [...selected, modality])}
                        className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs capitalize transition-colors", selected.includes(modality) ? "border-foreground bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground")}>
                        {selected.includes(modality) && <Check className="size-3" aria-hidden="true" />}
                        <span aria-hidden="true">{modality}</span>
                        <span id={`${direction}-count-${index}`} aria-hidden="true" className="tabular-nums text-muted-foreground">{counts[modality] ?? 0}<span className="sr-only"> matching models</span></span>
                      </ActionButton>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Matches any selected type.</p>
                </fieldset>
              ))}

            </div>}
          </details>
        </aside>

        <section aria-label="Model results" data-directory-state={loading ? undefined : "ready"} aria-busy={loading} className="min-w-0 space-y-3 sm:space-y-4">
          <h2 className="sr-only">Model results</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input ref={searchInput} aria-label="Search models" aria-keyshortcuts="/" title="Press / to search when not editing a field" placeholder="Search models, providers, or keywords..." value={searchDraft}
              onValueChange={setSearch} className="h-11 rounded-lg bg-card pl-11 pr-12 text-base placeholder:text-muted-foreground md:text-sm" />
            {searchDraft && <ActionButton type="button" aria-label="Clear search" onClick={() => { setSearch(""); searchInput.current?.focus(); }} className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"><X className="size-4" /></ActionButton>}
          </div>

          {activeFilters.length > 0 && (
            <div role="group" aria-label="Active filters" className="flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => {
                const content = <><span className="truncate">{filter.label}</span><X className="size-3.5 shrink-0" aria-hidden="true" /></>;
                const className = "inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 text-xs transition-colors hover:bg-muted";
                return filter.key === "search"
                  ? <SearchFilterChip key={filter.key} label={filter.label} onRemove={filter.remove} className={className}>{content}</SearchFilterChip>
                  : <ActionButton key={filter.key} type="button" onClick={filter.remove} aria-label={`Remove filter: ${filter.label}`} className={className}>{content}</ActionButton>;
              })}
              <ActionButton type="button" onClick={clearFilters} className="min-h-11 px-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Clear all</ActionButton>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" data-agent-catalog={loading ? undefined : "Directory results"} className="text-sm text-muted-foreground">
              {loading ? "Loading models..." : <>
                <span className="font-semibold tabular-nums text-foreground">{sortedModels.length}</span> {fav ? "favorite" : "available"} {sortedModels.length === 1 ? "model" : "models"}
                <span className="mt-1 block text-xs">Prices in USD per million tokens · Context in tokens</span>
                <span className="sr-only">{view === "grid" ? "Grid" : "List"} view. {sortedModels.length > 0
                  ? `Page ${page} of ${totalPages}. Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + paginatedModels.length} of ${sortedModels.length} matches.`
                  : "No matches."}</span>
              </>}
            </p>
            <div className="flex items-center gap-2">
              <SortDropdown value={sort} onChange={setSort} />
              <div className="flex items-center rounded-lg border p-1" role="group" aria-label="Results view">
                <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="size-11" onClick={() => setView("grid")} aria-label="Grid view" aria-pressed={view === "grid"}><LayoutGrid className="size-4" /></Button>
                <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="size-11" onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"}><List className="size-4" /></Button>
              </div>
            </div>
          </div>

          <details ref={workloadPanel} onToggle={(event) => { if (event.currentTarget.open) setWorkloadVisited(true); }} className="border-y py-1">
            <DisclosureSummary aria-label="Estimate workload" aria-describedby="directory-workload-summary" className="min-h-11 cursor-pointer rounded py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
              Estimate workload
              <span id="directory-workload-summary" className="mt-1 block text-xs font-normal leading-relaxed tabular-nums text-muted-foreground">{workloadSummary(workload)}</span>
            </DisclosureSummary>
            {workloadVisited && <div className="space-y-6 py-4">
              <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">Set usage to compare estimated costs across models.</p>
              <CalculatorInputs workload={workload} onChange={setWorkload} showCache />
              <SavedSetups workload={workload} onWorkloadChange={setWorkload} directoryQuery={directoryQuery} onApplyDirectoryQuery={applyDirectoryQuery} />
            </div>}
          </details>

          {storageWarning && <p role="status" data-agent-catalog="Favorites status" className="text-sm text-muted-foreground">{storageWarning}</p>}
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
          ) : models.length === 0 ? (
            <div data-agent-catalog="Catalog results status" className="rounded-xl border border-dashed px-6 py-20 text-center">
              <h2 className="font-heading text-3xl">No models available</h2>
              <p className="mt-3 text-sm text-muted-foreground">The catalog returned no models. Refresh catalog to check again.</p>
            </div>
          ) : fav && favoriteCount === 0 ? (
            <div data-agent-catalog="Catalog results status" className="rounded-xl border border-dashed px-6 py-20 text-center">
              <h2 className="font-heading text-3xl">Your shortlist starts here</h2>
              <p className="mt-3 text-sm text-muted-foreground">{favorites.length ? "None of your saved favorites are in the current catalog." : "Save a model with the heart button to find it here later."}</p>
              <Button variant="outline" onClick={() => { clearFilters(); setFav(false); }} className="mt-6 h-11">Browse all models</Button>
            </div>
          ) : sortedModels.length === 0 ? (
            <div data-agent-catalog="Catalog results status" className="flex flex-col items-center rounded-xl border border-dashed px-6 py-20 text-center">
              <Search className="mb-5 size-7 text-muted-foreground" aria-hidden="true" />
              <h2 className="font-heading text-3xl">No models found</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Try a different search or remove a filter to see more models.</p>
              {maxBudget !== null && workload.images > 0 && <p className="mt-3 max-w-sm text-sm text-muted-foreground">The budget filter excludes workloads with images because the image billing unit is unverified. Edit the workload or remove the budget limit.</p>}
              {activeFilters.length > 0 && <p className="mt-3 w-full max-w-prose text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">Current conditions: {activeFilters.map((filter) => filter.label).join(" · ")}</p>}
              {maxBudget !== null && <Button variant="outline" onClick={() => setMaxBudget(null)} className="mt-4 h-11">Remove budget limit</Button>}
              {fitsWorkload && <Button variant="outline" onClick={() => setFitsWorkload(false)} className="mt-2 h-11">Include models with unknown or exceeded limits</Button>}
              {search && <Button variant="outline" onClick={() => setSearch("")} className="mt-2 h-11">Remove search condition</Button>}
              <Button variant="outline" onClick={clearFilters} className="mt-6 h-11">Clear search and filters</Button>
              {fav && <Button variant="ghost" onClick={() => { clearFilters(); setFav(false); }} className="mt-2 h-11">Browse all models</Button>}
            </div>
          ) : (
            <>
              <ModelGrid models={paginatedModels} viewMode={view} workload={workload}
                isComparedModels={comparedModels} comparisonCount={selectedIds.length} onToggleCompare={handleToggleCompare}
                isFavoriteModel={isFavorite} onToggleFavorite={(id) => { void toggleFavorite(id).catch(() => {}); }}
                onSetFavorite={setFavorite} onModelNavigate={handleModelNavigate} />
              <Paginator page={page} totalPages={totalPages} totalCount={sortedModels.length} pageSize={PAGE_SIZE}
                onPageChange={(nextPage) => { setPage(nextPage); document.getElementById("directory")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }} />
            </>
          )}
        </section>
      </div>

      <div data-agent-hidden={hideBackgroundFromAgent}>
        <CompareTray models={comparedModels} selectedCount={loading ? 0 : selectedIds.length} onRemove={handleToggleCompare} onClear={() => { clearComparison(); comparisonDialog.close(); }} controller={comparisonDialog} />
      </div>
      <CompareModal models={comparedModels} selectedIds={selectedIds} controller={comparisonDialog} onOpenChange={setComparisonOpen} onRemove={handleToggleCompare} onModelNavigate={handleModelNavigate} />
    </>
  );
}

export default function Home() {
  const { models, loading, error, fetchedAt, excludedCount, revalidating, refresh } = useModels();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#directory" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-foreground">Skip to models</a>
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
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

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-44 sm:px-8">
        <div className="flex flex-col justify-between gap-2 py-3 sm:py-4 lg:flex-row lg:items-end lg:gap-12">
          <h1 className="max-w-xl text-balance font-heading text-3xl leading-tight tracking-tight sm:text-4xl">Discover your next <span className="italic">AI model.</span></h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Explore Kilo Gateway models. Compare prices, capabilities, and costs.</p>
        </div>

        <div id="directory" className="scroll-mt-6">
          <CatalogStatus fetchedAt={fetchedAt} loading={loading} revalidating={revalidating} error={error} excludedCount={excludedCount} onRefresh={refresh} />
          {error && fetchedAt === null ? (
            <div role="alert" data-directory-state="error" data-agent-catalog="Catalog unavailable" className="flex flex-col items-center rounded-xl border px-6 py-16 text-center">
              <CircleAlert className="mb-4 size-7 text-destructive" aria-hidden="true" />
              <h2 className="font-heading text-3xl">Models could not be loaded</h2>
              <p className="mt-3 text-sm text-muted-foreground">The model directory is unavailable right now. Please try again.</p>
              <Button onClick={refresh} disabled={revalidating} className="mt-6 h-11">Try again</Button>
            </div>
          ) : (
            <React.Suspense fallback={<p role="status" className="py-16 text-center text-muted-foreground">Loading model directory...</p>}>
              <ModelExplorer models={models} loading={loading} excludedCount={excludedCount} />
            </React.Suspense>
          )}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 px-5 py-6 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:px-8">
          <p>Model data from <a href="https://api.kilo.ai" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">Kilo Gateway <ArrowUpRight className="inline size-3" /></a></p>
          <p>Unofficial fan project. Not affiliated with or endorsed by Kilo AI.</p>
        </div>
      </footer>
    </div>
  );
}
