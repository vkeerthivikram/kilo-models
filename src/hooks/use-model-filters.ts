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

  const [searchDebounceTimer, setSearchDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);

  const setSearch = (v: string) => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const timer = setTimeout(() => {
      setParams({ search: v, page: 1 });
    }, 300);
    setSearchDebounceTimer(timer);
  };
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
    return sortedModels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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