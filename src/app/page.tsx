"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ModelDetailSheet } from "@/components/model-detail-sheet";
import { ModelGrid } from "@/components/model-grid-v2";
import { CompareTray } from "@/components/compare-tray";
import { CompareModal } from "@/components/compare-modal";
import { useModelFilters, INPUT_MODALITIES, OUTPUT_MODALITIES, ALL_PROVIDERS } from "@/hooks/use-model-filters";
import { useFavorites } from "@/hooks/use-favorites";
import {
  Search,
  LayoutGrid,
  List,
  Bot,
  Zap,
  Filter,
  X,
  ChevronDown,
  Heart,
} from "lucide-react";

export default function Home() {
  const [models, setModels] = React.useState<Model[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedModel, setSelectedModel] = React.useState<Model | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [providersOpen, setProvidersOpen] = React.useState(false);
  const [comparedModels, setComparedModels] = React.useState<Model[]>([]);
  const [compareModalOpen, setCompareModalOpen] = React.useState(false);

  const {
    search,
    free,
    inputModalities,
    outputModalities,
    providers,
    reasoning,
    tools,
    view,
    setSearch,
    setFree,
    setInputModalities,
    setOutputModalities,
    setProviders,
    setReasoning,
    setTools,
    setView,
    clearFilters,
    activeFilterCount,
    filteredModels,
  } = useModelFilters(models);

  React.useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/models");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setModels(data.data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  const toggleModality = (type: "input" | "output", mod: string) => {
    const key = type === "input" ? "inputModalities" : "outputModalities";
    const current = key === "input" ? inputModalities : outputModalities;
    if (current.includes(mod)) {
      if (key === "input") {
        setInputModalities(current.filter((m) => m !== mod));
      } else {
        setOutputModalities(current.filter((m) => m !== mod));
      }
    } else {
      if (key === "input") {
        setInputModalities([...current, mod]);
      } else {
        setOutputModalities([...current, mod]);
      }
    }
  };

  const toggleProvider = (p: string) => {
    if (providers.includes(p)) {
      setProviders(providers.filter((x) => x !== p));
    } else {
      setProviders([...providers, p]);
    }
  };

  const handleSelectModel = (model: Model) => {
    setSelectedModel(model);
    setSheetOpen(true);
  };

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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
            </div>
            <div>
              <h1 className="font-heading text-xl tracking-tight">Kilo Models</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">
                AI Directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!loading && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  Showing
                </span>
                <span className="font-semibold text-foreground font-heading">
                  {filteredModels.length}
                </span>
                <span className="text-muted-foreground">of {models.length}</span>
              </div>
            )}
            <ThemeSelector />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="space-y-3 max-w-2xl">
          <h2 className="font-heading text-4xl md:text-5xl tracking-tight leading-[1.1]">
            Discover{" "}
            <span className="italic text-primary">300+</span>
            <br />
            AI Models
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
            Explore models from the Kilo network. Filter by modality, pricing, context length, and capabilities.
          </p>
        </div>

        {/* Search & View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-background/80 border-primary/10 focus:border-primary/30"
            />
          </div>

          <div className="flex items-center border rounded-xl p-1 bg-background/80">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("grid")}
              className="h-8 px-2.5"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="h-8 px-2.5"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Free toggle */}
            <Button
              variant={free ? "default" : "outline"}
              size="sm"
              onClick={() => setFree(!free)}
              className="h-8 rounded-lg text-xs font-medium"
            >
              Free Only
            </Button>

            {/* Input modalities */}
            {INPUT_MODALITIES.map((mod) => (
              <Button
                key={mod}
                variant={inputModalities.includes(mod) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleModality("input", mod)}
                className="h-8 rounded-lg text-xs capitalize"
              >
                {mod}
              </Button>
            ))}

            {/* Output modalities */}
            {OUTPUT_MODALITIES.map((mod) => (
              <Button
                key={mod}
                variant={outputModalities.includes(mod) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleModality("output", mod)}
                className="h-8 rounded-lg text-xs capitalize"
              >
                {mod}
              </Button>
            ))}

            {/* Capabilities */}
            <Button
              variant={reasoning ? "default" : "outline"}
              size="sm"
              onClick={() => setReasoning(!reasoning)}
              className="h-8 rounded-lg text-xs"
            >
              Reasoning
            </Button>
            <Button
              variant={tools ? "default" : "outline"}
              size="sm"
              onClick={() => setTools(!tools)}
              className="h-8 rounded-lg text-xs"
            >
              Tools
            </Button>

            {/* Providers dropdown */}
            <div className="relative">
              <Button
                variant={providers.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setProvidersOpen(!providersOpen)}
                className="h-8 rounded-lg text-xs"
              >
                Providers
                {providers.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {providers.length}
                  </Badge>
                )}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>

              {providersOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl border bg-popover p-3 shadow-xl z-50">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Select Providers
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProviders([])}
                        className="h-6 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_PROVIDERS.map((p) => (
                        <Badge
                          key={p}
                          variant={providers.includes(p) ? "default" : "outline"}
                          className="cursor-pointer text-xs capitalize"
                          onClick={() => toggleProvider(p)}
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 rounded-lg text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Model Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card animate-pulse h-64" />
            ))}
          </div>
        ) : (
          <ModelGrid
            models={filteredModels}
            viewMode={view}
            onSelectModel={handleSelectModel}
            isComparedModels={comparedModels}
            onToggleCompare={handleToggleCompare}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              Data from{" "}
              <a
                href="https://api.kilo.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                api.kilo.ai
              </a>
            </p>
            <p className="font-heading italic">
              Built with Next.js + shadcn/ui
            </p>
          </div>
        </div>
      </footer>

      {/* Model Detail Sheet */}
      <ModelDetailSheet
        model={selectedModel}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

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
    </div>
  );
}