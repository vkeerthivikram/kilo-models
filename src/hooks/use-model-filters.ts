"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { parsePrice } from "@/lib/format-price";
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
const PAGE_SIZE = 24;

interface FilterState {
  search: string;
  sort: SortOption;
  free: boolean;
  hideRetired: boolean;
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

export function useModelFilters(models: Model[], favoriteIds: string[] = EMPTY_FILTERS): UseModelFiltersResult {
  const now = useRetirementClock();
  const [params, setParams] = useQueryStates(parsers, {
    clearOnDefault: false,
    shallow: false,
  });

  const urlSearch = params.search ?? "";
  const sort = params.sort ?? "name-asc";
  const free = params.free ?? false;
  const hideRetired = params.hideRetired ?? false;
  const inputModalities = params.inputModalities ?? EMPTY_FILTERS;
  const outputModalities = params.outputModalities ?? EMPTY_FILTERS;
  const providers = params.providers ?? EMPTY_FILTERS;
  const reasoning = params.reasoning ?? false;
  const tools = params.tools ?? false;
  const view = params.view ?? "grid";
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
  const setInputModalities = (v: string[]) => setParams({ inputModalities: v, page: 1 });
  const setOutputModalities = (v: string[]) => setParams({ outputModalities: v, page: 1 });
  const setProviders = (v: string[]) => setParams({ providers: v, page: 1 });
  const setReasoning = (v: boolean) => setParams({ reasoning: v, page: 1 });
  const setTools = (v: boolean) => setParams({ tools: v, page: 1 });
  const setView = (v: ViewOption) => setParams({ view: v });
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

  const activeFilterCount =
    (free ? 1 : 0) +
    (hideRetired ? 1 : 0) +
    inputModalities.length +
    outputModalities.length +
    providers.length +
    (reasoning ? 1 : 0) +
    (tools ? 1 : 0) +
    (minContext !== null ? 1 : 0) +
    (maxInputPrice !== null ? 1 : 0) +
    (maxOutputPrice !== null ? 1 : 0);

  const criteria = React.useMemo(() => ({ search, free, hideRetired, now, inputModalities, outputModalities, providers, reasoning, tools, fav, minContext, maxInputPrice, maxOutputPrice }),
    [search, free, hideRetired, now, inputModalities, outputModalities, providers, reasoning, tools, fav, minContext, maxInputPrice, maxOutputPrice]);
  const filteredModels = React.useMemo(() => models.filter((model) => matchesModelFilters(model, criteria, favoriteIds)), [models, criteria, favoriteIds]);
  const filterCounts = React.useMemo(() => getFilterCounts(models, criteria, favoriteIds), [models, criteria, favoriteIds]);
  const sortedModels = React.useMemo(() => {
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
