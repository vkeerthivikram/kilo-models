"use client";

import * as React from "react";
import { Model, ViewMode } from "@/lib/types";
import { ModelCard } from "./model-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Cpu,
  Shield,
  ChevronDown,
  Copy,
  Check,
  Zap,
} from "lucide-react";

interface Filters {
  search: string;
  freeOnly: boolean;
  inputModalities: string[];
  outputModalities: string[];
  providers: string[];
  hasReasoning: boolean;
  hasTools: boolean;
}

interface ModelFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  inputModalities: string[];
  outputModalities: string[];
  providers: string[];
  resultCount: number;
  totalCount: number;
}

const ALL_INPUT_MODALITIES = ["text", "image", "video", "audio", "file"];
const ALL_OUTPUT_MODALITIES = ["text", "image", "audio"];

interface FilterContentProps {
  filters: Filters;
  inputModalities: string[];
  outputModalities: string[];
  providers: string[];
  toggleArrayItem: <K extends "inputModalities" | "outputModalities" | "providers">(key: K, item: string) => void;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
}

const FilterContent = React.memo(function FilterContent({
  filters,
  inputModalities,
  outputModalities,
  providers,
  toggleArrayItem,
  updateFilter,
}: FilterContentProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Free Only</label>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant={filters.freeOnly ? "default" : "outline"}
              className="w-full justify-start"
            >
              {filters.freeOnly ? "Free Models Only" : "All Models"}
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuCheckboxItem
              checked={filters.freeOnly}
              onCheckedChange={(v) => updateFilter("freeOnly", v)}
            >
              Free only
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      <div className="space-y-2">
        <label className="text-sm font-medium">Input Modalities</label>
        <div className="flex flex-wrap gap-2">
          {inputModalities.map((mod) => (
            <Badge
              key={mod}
              variant={filters.inputModalities.includes(mod) ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => toggleArrayItem("inputModalities", mod)}
            >
              {mod}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Output Modalities</label>
        <div className="flex flex-wrap gap-2">
          {outputModalities.map((mod) => (
            <Badge
              key={mod}
              variant={filters.outputModalities.includes(mod) ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => toggleArrayItem("outputModalities", mod)}
            >
              {mod}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <label className="text-sm font-medium">Capabilities</label>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filters.hasReasoning ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => updateFilter("hasReasoning", !filters.hasReasoning)}
          >
            Reasoning
          </Badge>
          <Badge
            variant={filters.hasTools ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => updateFilter("hasTools", !filters.hasTools)}
          >
            Tools
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <label className="text-sm font-medium">Providers</label>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="outline" className="w-full justify-start">
              {filters.providers.length === 0
                ? "All Providers"
                : `${filters.providers.length} selected`}
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
            {providers.map((p) => (
              <DropdownMenuCheckboxItem
                key={p}
                checked={filters.providers.includes(p)}
                onCheckedChange={() => toggleArrayItem("providers", p)}
              >
                {p}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export function ModelFilters({
  filters,
  onFiltersChange,
  inputModalities,
  outputModalities,
  providers,
  resultCount,
  totalCount,
}: ModelFiltersProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayItem = <K extends "inputModalities" | "outputModalities" | "providers">(
    key: K,
    item: string
  ) => {
    const current = filters[key];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    updateFilter(key, updated);
  };

  const activeFilterCount =
    (filters.freeOnly ? 1 : 0) +
    filters.inputModalities.length +
    filters.outputModalities.length +
    filters.providers.length +
    (filters.hasReasoning ? 1 : 0) +
    (filters.hasTools ? 1 : 0);

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      freeOnly: false,
      inputModalities: [],
      outputModalities: [],
      providers: [],
      hasReasoning: false,
      hasTools: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          className="lg:hidden shrink-0"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      <div className="hidden lg:block border rounded-lg p-4">
        <FilterContent
          filters={filters}
          inputModalities={inputModalities}
          outputModalities={outputModalities}
          providers={providers}
          toggleArrayItem={toggleArrayItem}
          updateFilter={updateFilter}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Showing {resultCount} of {totalCount} models
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <FilterContent
              filters={filters}
              inputModalities={inputModalities}
              outputModalities={outputModalities}
              providers={providers}
              toggleArrayItem={toggleArrayItem}
              updateFilter={updateFilter}
            />
          </div>
        </SheetContent>
      </Sheet>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.freeOnly && (
            <Badge variant="secondary" className="gap-1">
              Free
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("freeOnly", false)}
              />
            </Badge>
          )}
          {filters.hasReasoning && (
            <Badge variant="secondary" className="gap-1">
              Reasoning
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("hasReasoning", false)}
              />
            </Badge>
          )}
          {filters.hasTools && (
            <Badge variant="secondary" className="gap-1">
              Tools
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("hasTools", false)}
              />
            </Badge>
          )}
          {filters.inputModalities.map((m) => (
            <Badge key={m} variant="secondary" className="gap-1 capitalize">
              in:{m}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleArrayItem("inputModalities", m)}
              />
            </Badge>
          ))}
          {filters.outputModalities.map((m) => (
            <Badge key={m} variant="secondary" className="gap-1 capitalize">
              out:{m}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleArrayItem("outputModalities", m)}
              />
            </Badge>
          ))}
          {filters.providers.map((p) => (
            <Badge key={p} variant="secondary" className="gap-1">
              {p}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleArrayItem("providers", p)}
              />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

interface ModelDetailDialogProps {
  model: Model | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModelDetailDialog({ model, open, onOpenChange }: ModelDetailDialogProps) {
  const [copied, setCopied] = React.useState(false);

  if (!model) return null;

  const copyId = () => {
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{model.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{model.id}</p>
            </div>
            {model.isFree && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                Free
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyId}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy ID"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm leading-relaxed">{model.description}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUpRight className="h-4 w-4" />
                Input Price
              </div>
              <p className="text-lg font-semibold">
                {model.pricing?.prompt && model.pricing.prompt !== "0"
                  ? `$${parseFloat(model.pricing.prompt).toFixed(6)}/1K`
                  : "Free"}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowDownRight className="h-4 w-4" />
                Output Price
              </div>
              <p className="text-lg font-semibold">
                {model.pricing?.completion && model.pricing.completion !== "0"
                  ? `$${parseFloat(model.pricing.completion).toFixed(6)}/1K`
                  : "Free"}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                Context Window
              </div>
              <p className="text-lg font-semibold">
                {model.context_length.toLocaleString()} tokens
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                Max Output
              </div>
              <p className="text-lg font-semibold">
                {model.top_provider?.max_completion_tokens?.toLocaleString() ?? "N/A"} tokens
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Modalities</h4>
            <div className="flex gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Input</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(model.architecture?.input_modalities ?? []).map((m) => (
                    <Badge key={m} variant="outline" className="capitalize">{m}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Output</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(model.architecture?.output_modalities ?? []).map((m) => (
                    <Badge key={m} variant="outline" className="capitalize">{m}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {model.supported_parameters && model.supported_parameters.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Supported Parameters</h4>
                <div className="flex flex-wrap gap-2">
                  {model.supported_parameters.map((p) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {model.top_provider?.is_moderated && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-amber-600" />
                <span className="text-amber-600">Content is moderated by provider</span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ModelGridProps {
  models: Model[];
  viewMode: ViewMode;
  onSelectModel: (model: Model) => void;
}

export function ModelGrid({ models, viewMode, onSelectModel }: ModelGridProps) {
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Cpu className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-semibold text-lg">No models found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-sm font-medium">Model</th>
              <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Provider</th>
              <th className="text-left p-3 text-sm font-medium hidden lg:table-cell">Input</th>
              <th className="text-left p-3 text-sm font-medium hidden lg:table-cell">Output</th>
              <th className="text-right p-3 text-sm font-medium">Input $/1K</th>
              <th className="text-right p-3 text-sm font-medium hidden sm:table-cell">Output $/1K</th>
              <th className="text-right p-3 text-sm font-medium hidden xl:table-cell">Context</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr
                key={model.id}
                className="border-b cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSelectModel(model)}
              >
                <td className="p-3">
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {model.id}
                  </div>
                </td>
                <td className="p-3 text-sm hidden md:table-cell">
                  {model.id.split("/")[0]}
                </td>
                <td className="p-3 hidden lg:table-cell">
                  <div className="flex gap-1">
                    {(model.architecture?.input_modalities ?? []).map((m) => (
                      <Badge key={m} variant="outline" className="text-[10px] h-5 capitalize">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  <div className="flex gap-1">
                    {(model.architecture?.output_modalities ?? []).map((m) => (
                      <Badge key={m} variant="outline" className="text-[10px] h-5 capitalize">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-right text-sm font-mono">
                  {model.pricing?.prompt && model.pricing.prompt !== "0"
                    ? `$${parseFloat(model.pricing.prompt).toFixed(4)}`
                    : "Free"}
                </td>
                <td className="p-3 text-right text-sm font-mono hidden sm:table-cell">
                  {model.pricing?.completion && model.pricing.completion !== "0"
                    ? `$${parseFloat(model.pricing.completion).toFixed(4)}`
                    : "Free"}
                </td>
                <td className="p-3 text-right text-sm hidden xl:table-cell">
                  {model.context_length >= 1000000
                    ? `${(model.context_length / 1000000).toFixed(0)}M`
                    : `${(model.context_length / 1000).toFixed(0)}K`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {models.map((model) => (
        <ModelCard key={model.id} model={model} onSelect={onSelectModel} />
      ))}
    </div>
  );
}
