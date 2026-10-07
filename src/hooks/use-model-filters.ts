"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { parsePrice } from "@/lib/format-price";
import { DEFAULT_WORKLOAD, type CalculatorWorkload } from "@/lib/calculator-workload";
import { calculateWorkloadCost } from "@/lib/cost-calculator";
import { getFilterCounts, matchesModelFilters, parseNumericFilter } from "@/lib/model-filtering";
import { useRetirementClock } from "./use-retirement-clock";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsBoolean,
  parseAsStringLiteral,
  parseAsInteger,
  useQueryStates,
  createParser,
} from "nuqs";

const SORT_OPTIONS = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "cost-asc",
  "cost-desc",
  "context-desc",
  "created-desc",
  "created-asc",
] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const VIEW_OPTIONS = ["grid", "list"] as const;
type ViewOption = (typeof VIEW_OPTIONS)[number];

const INPUT_MODALITIES = ["text", "image", "video", "audio", "file"];
const OUTPUT_MODALITIES = ["text", "image", "audio"];
const EMPTY_FILTERS: string[] = [];
const VIEW_STORAGE_KEY = "kilo-models-result-view";
const VIEW_EVENT = "kilo-models-view-change";
const readView = (): ViewOption => {
  try { return window.sessionStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; }
};
const subscribeView = (listener: () => void) => {
  window.addEventListener(VIEW_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(VIEW_EVENT, listener); window.removeEventListener("storage", listener); };
};
const serverView = (): ViewOption => "grid";
const PAGE_SIZE = 24;

interface FilterState {
  search: string;
  sort: SortOption;
  free: boolean;
  hideRetired: boolean;
  fitsWorkload: boolean;
  maxBudget: number | null;
  inputModalities: string[];
  outputModalities: string[];
  providers: string[];
  reasoning: boolean;
  tools: boolean;
  view: ViewOption;
  page: number;
  fav: boolean;
  minContext: number | null;
  maxInputPrice: number | null;
  maxOutputPrice: number | null;
}

interface UseModelFiltersResult extends FilterState {
  setSearch: (v: string) => void;
  setSort: (v: SortOption) => void;
  setFree: (v: boolean) => void;
  setHideRetired: (v: boolean) => void;
  setFitsWorkload: (v: boolean) => void;
  setMaxBudget: (v: number | null) => void;
  setInputModalities: (v: string[]) => void;
  setOutputModalities: (v: string[]) => void;
  setProviders: (v: string[]) => void;
  setReasoning: (v: boolean) => void;
  setTools: (v: boolean) => void;
  setView: (v: ViewOption) => void;
  setPage: (v: number) => void;
  setFav: (v: boolean) => void;
  setMinContext: (v: number | null) => void;
  setMaxInputPrice: (v: number | null) => void;
  setMaxOutputPrice: (v: number | null) => void;
  filterCounts: ReturnType<typeof getFilterCounts>;
  clearFilters: () => void;
  directoryQuery: URLSearchParams;
  applyDirectoryQuery: (query: URLSearchParams) => void;
  activeFilterCount: number;
  filteredModels: Model[];
  sortedModels: Model[];
  paginatedModels: Model[];
  totalPages: number;
  hasMore: boolean;
}

const numericParser = (integer = false) => createParser({
  parse: (value) => parseNumericFilter(value, integer),
  serialize: String,
});

const parsers = {
  search: parseAsString,
  sort: parseAsStringLiteral(SORT_OPTIONS),
  free: parseAsBoolean,
  hideRetired: parseAsBoolean,
  fitsWorkload: parseAsBoolean,
  maxBudget: numericParser(),
  inputModalities: parseAsArrayOf(parseAsString),
  outputModalities: parseAsArrayOf(parseAsString),
  providers: parseAsArrayOf(parseAsString),
  reasoning: parseAsBoolean,
  tools: parseAsBoolean,
  view: parseAsStringLiteral(VIEW_OPTIONS),
  page: parseAsInteger,
  fav: parseAsBoolean,
  minContext: numericParser(true),
  maxInputPrice: numericParser(),
  maxOutputPrice: numericParser(),
};

export function useModelFilters(models: Model[], favoriteIds: string[] = EMPTY_FILTERS, workload: CalculatorWorkload = DEFAULT_WORKLOAD): UseModelFiltersResult {
  const now = useRetirementClock();
  const [params, setParams] = useQueryStates(parsers, {
    clearOnDefault: false,
    // Filtering uses the loaded catalog; server navigations can interrupt reloads.
    shallow: true,
  });

  const urlSearch = params.search ?? "";
  const sort = params.sort ?? "name-asc";
  const free = params.free ?? false;
  const hideRetired = params.hideRetired ?? false;
  const fitsWorkload = params.fitsWorkload ?? false;
  const maxBudget = params.maxBudget;
  const inputModalities = params.inputModalities ?? EMPTY_FILTERS;
  const outputModalities = params.outputModalities ?? EMPTY_FILTERS;
  const providers = params.providers ?? EMPTY_FILTERS;
  const reasoning = params.reasoning ?? false;
  const tools = params.tools ?? false;
  const preferredView = React.useSyncExternalStore(subscribeView, readView, serverView);
  const view = params.view ?? preferredView;
  const fav = params.fav ?? false;
  const minContext = params.minContext;
  const maxInputPrice = params.maxInputPrice;
  const maxOutputPrice = params.maxOutputPrice;

  const [pendingSearch, setPendingSearch] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const search = pendingSearch !== null ? pendingSearch : urlSearch;

  const setSearch = (v: string) => {
    setPendingSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPendingSearch(null);
      setParams({ search: v, page: 1 });
    }, 400);
  };
  const setSort = (v: SortOption) => setParams({ sort: v, page: 1 });
  const setFree = (v: boolean) => setParams({ free: v, page: 1 });
  const setHideRetired = (v: boolean) => setParams({ hideRetired: v, page: 1 });
  const setFitsWorkload = (v: boolean) => setParams({ fitsWorkload: v, page: 1 });
  const setMaxBudget = (v: number | null) => setParams({ maxBudget: parseNumericFilter(v), page: 1 });
  const setInputModalities = (v: string[]) => setParams({ inputModalities: v, page: 1 });
  const setOutputModalities = (v: string[]) => setParams({ outputModalities: v, page: 1 });
  const setProviders = (v: string[]) => setParams({ providers: v, page: 1 });
  const setReasoning = (v: boolean) => setParams({ reasoning: v, page: 1 });
  const setTools = (v: boolean) => setParams({ tools: v, page: 1 });
  const setView = (v: ViewOption) => {
    try { window.sessionStorage.setItem(VIEW_STORAGE_KEY, v); window.dispatchEvent(new Event(VIEW_EVENT)); } catch { /* URL state still works when storage is blocked. */ }
    void setParams({ view: v });
  };
  const setPage = (v: number) => setParams({ page: v });
  const setFav = (v: boolean) => setParams({ fav: v, page: 1 });

  const setMinContext = (v: number | null) => setParams({ minContext: parseNumericFilter(v, true), page: 1 });
  const setMaxInputPrice = (v: number | null) => setParams({ maxInputPrice: parseNumericFilter(v), page: 1 });
  const setMaxOutputPrice = (v: number | null) => setParams({ maxOutputPrice: parseNumericFilter(v), page: 1 });

  const clearFilters = () => {
    setPendingSearch(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setParams({
      search: "",
      free: false,
      hideRetired: false,
      fitsWorkload: false,
      maxBudget: null,
      inputModalities: [],
      outputModalities: [],
      providers: [],
      minContext: null,
      maxInputPrice: null,
      maxOutputPrice: null,
      reasoning: false,
      tools: false,
      page: 1,
    });
  };

  const directoryQuery = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, search })) {
    if (key !== "page" && value !== null) directoryQuery.set(key, parsers[key as keyof typeof parsers].serialize(value as never));
  }
  directoryQuery.set("view", view);
  const applyDirectoryQuery = (query: URLSearchParams) => {
    setPendingSearch(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const values = Object.fromEntries(Object.entries(parsers).map(([key, parser]) => [key, query.has(key) ? parser.parse(query.get(key)!) : null]));
    void setParams({ ...values, view: parsers.view.parse(query.get("view") ?? "") ?? "grid", page: 1 });
  };

  const activeFilterCount =
    (free ? 1 : 0) +
    (hideRetired ? 1 : 0) +
    (fitsWorkload ? 1 : 0) +
    (maxBudget !== null ? 1 : 0) +
    inputModalities.length +
    outputModalities.length +
    providers.length +
    (reasoning ? 1 : 0) +
    (tools ? 1 : 0) +
    (minContext !== null ? 1 : 0) +
    (maxInputPrice !== null ? 1 : 0) +
    (maxOutputPrice !== null ? 1 : 0);

  const criteria = React.useMemo(() => ({ search, free, hideRetired, fitsWorkload, maxBudget, workload, now, inputModalities, outputModalities, providers, reasoning, tools, fav, minContext, maxInputPrice, maxOutputPrice }),
    [search, free, hideRetired, fitsWorkload, maxBudget, workload, now, inputModalities, outputModalities, providers, reasoning, tools, fav, minContext, maxInputPrice, maxOutputPrice]);
  const filteredModels = React.useMemo(() => models.filter((model) => matchesModelFilters(model, criteria, favoriteIds)), [models, criteria, favoriteIds]);
  const filterCounts = React.useMemo(() => getFilterCounts(models, criteria, favoriteIds), [models, criteria, favoriteIds]);
  const sortedModels = React.useMemo(() => {
    const costs = sort.startsWith("cost-") ? new Map(filteredModels.map((model) => [model.id, calculateWorkloadCost(model.pricing, workload).total])) : null;
    return [...filteredModels].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
        case "price-desc": {
          const first = parsePrice(a.pricing?.prompt);
          const second = parsePrice(b.pricing?.prompt);
          if (first === null) return second === null ? 0 : 1;
          if (second === null) return -1;
          return sort === "price-asc" ? first - second : second - first;
        }
        case "cost-asc":
        case "cost-desc": {
          const first = costs?.get(a.id) ?? null;
          const second = costs?.get(b.id) ?? null;
          if (first === null) return second === null ? a.name.localeCompare(b.name) : 1;
          if (second === null) return -1;
          return (sort === "cost-asc" ? first - second : second - first) || a.name.localeCompare(b.name);
        }
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
  }, [filteredModels, sort, workload]);

  const totalPages = Math.ceil(sortedModels.length / PAGE_SIZE);
  const page = pendingSearch !== null ? 1 : Math.max(1, Math.min(params.page ?? 1, totalPages || 1));
  const paginatedModels = React.useMemo(() => {
    return sortedModels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [sortedModels, page]);

  const hasMore = page < totalPages;

  return {
    search,
    sort,
    free,
    hideRetired,
    fitsWorkload,
    maxBudget,
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
    setHideRetired,
    setFitsWorkload,
    setMaxBudget,
    setInputModalities,
    setOutputModalities,
    setProviders,
    setReasoning,
    setTools,
    setView,
    setPage,
    setFav,
    minContext,
    maxInputPrice,
    maxOutputPrice,
    setMinContext,
    setMaxInputPrice,
    setMaxOutputPrice,
    filterCounts,
    clearFilters,
    directoryQuery,
    applyDirectoryQuery,
    activeFilterCount,
    filteredModels,
    sortedModels,
    paginatedModels,
    totalPages,
    hasMore,
  };
}

export { INPUT_MODALITIES, OUTPUT_MODALITIES, PAGE_SIZE };
export type { SortOption, ViewOption };
