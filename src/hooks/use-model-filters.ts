"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { parsePrice } from "@/lib/format-price";
import { DEFAULT_WORKLOAD, getUsableContext, type CalculatorWorkload } from "@/lib/calculator-workload";
import { calculateWorkloadCost } from "@/lib/cost-calculator";
import { getFilterCounts, matchesModelFilters, parseNumericFilter } from "@/lib/model-filtering";
import { decodeFilterValues, decodeProviderFilters, encodeFilterValues } from "@/lib/filter-values";
import { useRetirementClock } from "./use-retirement-clock";
import {
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
  searchDraft: string;
  setSearch: (v: string) => void;
  cancelSearchWrite: () => void;
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
  toggleCapability: (key: "reasoning" | "tools") => Promise<unknown>;
  setView: (v: ViewOption) => void;
  setPage: (v: number) => void;
  setFav: (v: boolean) => void;
  setMinContext: (v: number | null) => void;
  setMaxInputPrice: (v: number | null) => void;
  setMaxOutputPrice: (v: number | null) => void;
  filterCounts: ReturnType<typeof getFilterCounts>;
  clearFilters: () => void;
  directoryQuery: URLSearchParams;
  applyDirectoryQuery: (query: URLSearchParams) => Promise<unknown>;
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

const buildFilterValuesParser = (parse = decodeFilterValues) => createParser({
  parse,
  serialize: encodeFilterValues,
  eq: (a, b) => a.length === b.length && a.every((value, index) => value === b[index]),
});
const filterValuesParser = buildFilterValuesParser();

const parsers = {
  search: parseAsString,
  sort: parseAsStringLiteral(SORT_OPTIONS),
  free: parseAsBoolean,
  hideRetired: parseAsBoolean,
  fitsWorkload: parseAsBoolean,
  maxBudget: numericParser(),
  inputModalities: filterValuesParser,
  outputModalities: filterValuesParser,
  providers: buildFilterValuesParser(decodeProviderFilters),
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

  const urlSearch = params.search?.trim() ? params.search : "";
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

  const cancelSearchWrite = React.useCallback(() => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = null;
  }, []);
  React.useEffect(() => {
    const cancelOnHistory = () => {
      cancelSearchWrite();
      setPendingSearch(null);
    };
    window.addEventListener("popstate", cancelOnHistory);
    return () => {
      window.removeEventListener("popstate", cancelOnHistory);
      cancelSearchWrite();
    };
  }, [cancelSearchWrite]);

  const searchDraft = pendingSearch ?? urlSearch;
  const search = searchDraft.trim() ? searchDraft : "";

  const setSearch = (v: string) => {
    setPendingSearch(v);
    cancelSearchWrite();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setPendingSearch(null);
      const next = v.trim() ? v : null;
      setParams((current) => ({ search: next, ...(next !== (current.search?.trim() ? current.search : null) && { page: null }) }));
    }, 400);
  };
  const setSort = (v: SortOption) => setParams({ sort: v, page: null });
  const setFree = (v: boolean) => setParams({ free: v || null, page: null });
  const setHideRetired = (v: boolean) => setParams({ hideRetired: v || null, page: null });
  const setFitsWorkload = (v: boolean) => setParams({ fitsWorkload: v || null, page: null });
  const setMaxBudget = (v: number | null) => setParams({ maxBudget: parseNumericFilter(v), page: null });
  const setInputModalities = (v: string[]) => setParams({ inputModalities: v.length ? v : null, page: null });
  const setOutputModalities = (v: string[]) => setParams({ outputModalities: v.length ? v : null, page: null });
  const setProviders = (v: string[]) => setParams({ providers: v.length ? v : null, page: null });
  const setReasoning = (v: boolean) => setParams({ reasoning: v || null, page: null });
  const setTools = (v: boolean) => setParams({ tools: v || null, page: null });
  const toggleCapability = (key: "reasoning" | "tools") =>
    setParams((current) => ({ [key]: !current[key] || null, page: null }));
  const setView = (v: ViewOption) => {
    try { window.sessionStorage.setItem(VIEW_STORAGE_KEY, v); window.dispatchEvent(new Event(VIEW_EVENT)); } catch { /* URL state still works when storage is blocked. */ }
    void setParams({ view: v });
  };
  const setPage = (v: number) => {
    const page = v === 1 ? null : v;
    if (pendingSearch === null) return setParams({ page });
    cancelSearchWrite();
    setPendingSearch(null);
    return setParams({ search: search || null, page });
  };
  const setFav = (v: boolean) => setParams({ fav: v || null, page: null });

  const setMinContext = (v: number | null) => setParams({ minContext: parseNumericFilter(v, true), page: null });
  const setMaxInputPrice = (v: number | null) => setParams({ maxInputPrice: parseNumericFilter(v), page: null });
  const setMaxOutputPrice = (v: number | null) => setParams({ maxOutputPrice: parseNumericFilter(v), page: null });

  const clearFilters = () => {
    setPendingSearch(null);
    cancelSearchWrite();
    setParams({
      search: null,
      free: null,
      hideRetired: null,
      fitsWorkload: null,
      maxBudget: null,
      inputModalities: null,
      outputModalities: null,
      providers: null,
      minContext: null,
      maxInputPrice: null,
      maxOutputPrice: null,
      reasoning: null,
      tools: null,
      page: null,
    });
  };

  const directoryQuery = React.useMemo(() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, search: search || null })) {
      if (key !== "page" && value !== null) query.set(key, parsers[key as keyof typeof parsers].serialize(value as never));
    }
    query.set("view", view);
    return query;
  }, [params, search, view]);
  const applyDirectoryQuery = (query: URLSearchParams) => {
    setPendingSearch(null);
    cancelSearchWrite();
    const values = Object.fromEntries(Object.entries(parsers).map(([key, parser]) => [key, query.has(key) ? parser.parse(query.get(key)!) : null]));
    const search = query.get("search");
    return setParams({ ...values, search: search?.trim() ? search : null, view: parsers.view.parse(query.get("view") ?? "") ?? "grid", page: null });
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
          return (getUsableContext(b) ?? 0) - (getUsableContext(a) ?? 0);
        case "created-desc":
        case "created-asc": {
          const first = a.created > 0 && Number.isFinite(a.created) ? a.created : 0;
          const second = b.created > 0 && Number.isFinite(b.created) ? b.created : 0;
          return Number(second > 0) - Number(first > 0) ||
            (sort === "created-asc" ? first - second : second - first) || a.name.localeCompare(b.name);
        }
        default:
          return 0;
      }
    });
  }, [filteredModels, sort, workload]);

  const totalPages = Math.ceil(sortedModels.length / PAGE_SIZE);
  const page = pendingSearch !== null && search !== urlSearch ? 1 : Math.max(1, Math.min(params.page ?? 1, totalPages || 1));
  const paginatedModels = React.useMemo(() => {
    return sortedModels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [sortedModels, page]);

  const hasMore = page < totalPages;

  return {
    search,
    searchDraft,
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
    cancelSearchWrite,
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
    toggleCapability,
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

export { PAGE_SIZE };
export type { SortOption, ViewOption };
