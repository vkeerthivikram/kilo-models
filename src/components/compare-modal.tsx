"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Model } from "@/lib/types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PricingBarChart } from "@/components/pricing-bar-chart";
import { CapabilityRadarChart } from "@/components/capability-radar-chart";
import { CompareCostTable } from "@/components/compare-cost-table";
import {
  X,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Plus,
  BarChart3,
  Calculator,
  List,
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

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getProvider(model: Model): string {
  return model.id.split("/")[0];
}

interface CompareRowProps {
  label: string;
  values: string[];
  numericValues?: number[];
  icon?: React.ReactNode;
  higherIsBetter?: boolean;
}

function CompareRow({ label, values, numericValues, icon, higherIsBetter = false }: CompareRowProps) {
  const bestIndex = numericValues
    ? numericValues.reduce((best, val, i, arr) => {
        if (val === 0) return best;
        const currentBetter = higherIsBetter ? val > arr[best] : val < arr[best];
        return currentBetter ? i : best;
      }, -1)
    : -1;

  return (
    <div className="grid gap-3 py-3 px-4 hover:bg-muted/30 transition-colors rounded-lg">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {values.map((v, i) => {
          const isBest = i === bestIndex;
          const isNumeric = numericValues && numericValues[i] > 0;
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-3 transition-all",
                isBest && isNumeric
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/50 bg-card/50"
              )}
            >
              <div className="text-xs text-muted-foreground mb-1">Model {i + 1}</div>
              <div className={cn(
                "text-sm font-semibold font-mono",
                isBest && isNumeric ? "text-primary" : "text-foreground"
              )}>
                {v}
              </div>
              {isBest && isNumeric && (
                <div className="text-[10px] text-primary font-medium mt-1">Best</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CapabilityBadge({ type, enabled }: { type: "reasoning" | "tools" | "moderated"; enabled: boolean }) {
  if (!enabled) return null;

  const configs = {
    reasoning: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Reasoning" },
    tools: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Tools" },
    moderated: { bg: "bg-orange-500/10", text: "text-orange-600", label: "Moderated" },
  };

  const config = configs[type];

  return (
    <Badge className={cn("text-[10px]", config.bg, config.text)}>
      {config.label}
    </Badge>
  );
}

function OverviewTab({ models, onRemove }: { models: Model[]; onRemove: (m: Model) => void }) {
  const router = useRouter();
  const inputPrices = models.map((m) => parseFloat(m.pricing?.prompt ?? "0") || 0);
  const outputPrices = models.map((m) => parseFloat(m.pricing?.completion ?? "0") || 0);
  const contexts = models.map((m) => m.context_length || 0);
  const maxCompletions = models.map((m) => m.top_provider?.max_completion_tokens || 0);

  return (
    <div className="p-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {models.map((model) => {
          const provider = getProvider(model);
          const hasReasoning = (model.supported_parameters ?? []).some(
            (p) => p === "reasoning" || p === "include_reasoning"
          );
          const hasTools = (model.supported_parameters ?? []).includes("tools");
          const isModerated = model.top_provider?.is_moderated;

          return (
            <div key={model.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div
                className="p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/models/${encodeURIComponent(model.id)}`)}
              >
                <h3 className="font-heading text-base font-semibold">{model.name}</h3>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{provider}</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Input / 1K</div>
                    <div className="text-sm font-bold font-mono">{formatPrice(model.pricing?.prompt)}</div>
                  </div>
                  <div className="text-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Output / 1K</div>
                    <div className="text-sm font-bold font-mono">{formatPrice(model.pricing?.completion)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Context</div>
                    <div className="text-sm font-bold">{formatContext(model.context_length)}</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Max Output</div>
                    <div className="text-sm font-bold">
                      {model.top_provider?.max_completion_tokens?.toLocaleString() ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Capabilities</div>
                  <div className="flex flex-wrap gap-1.5">
                    <CapabilityBadge type="reasoning" enabled={hasReasoning} />
                    <CapabilityBadge type="tools" enabled={hasTools} />
                    <CapabilityBadge type="moderated" enabled={isModerated} />
                    {!hasReasoning && !hasTools && !isModerated && (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Released: {formatDate(model.created)}
                </div>
              </div>
              <div className="px-4 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(model);
                  }}
                  className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {models.length > 2 && (
        <div className="mt-8">
          <h3 className="font-heading text-base mb-4 px-1">Comparison Summary</h3>
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <CompareRow
              label="Input Pricing"
              values={models.map((m) => formatPrice(m.pricing?.prompt))}
              numericValues={inputPrices}
              icon={<ArrowUpRight className="h-4 w-4" />}
              higherIsBetter={false}
            />
            <CompareRow
              label="Output Pricing"
              values={models.map((m) => formatPrice(m.pricing?.completion))}
              numericValues={outputPrices}
              icon={<ArrowDownRight className="h-4 w-4" />}
              higherIsBetter={false}
            />
            <CompareRow
              label="Context Window"
              values={models.map((m) => formatContext(m.context_length))}
              numericValues={contexts}
              icon={<Hash className="h-4 w-4" />}
              higherIsBetter={true}
            />
            <CompareRow
              label="Max Completion"
              values={models.map((m) =>
                m.top_provider?.max_completion_tokens
                  ? `${m.top_provider.max_completion_tokens.toLocaleString()} tokens`
                  : "—"
              )}
              numericValues={maxCompletions}
              icon={<Maximize2Icon className="h-4 w-4" />}
              higherIsBetter={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChartsTab({ models }: { models: Model[] }) {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h3 className="font-heading text-base mb-4">Pricing Comparison</h3>
        <PricingBarChart models={models} />
      </div>
      <div>
        <h3 className="font-heading text-base mb-4">Capability Radar</h3>
        <CapabilityRadarChart models={models} />
      </div>
    </div>
  );
}

export function CompareModal({ models, open, onOpenChange, onRemove }: CompareModalProps) {
  if (models.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full h-[100dvh] max-w-7xl mx-auto p-0 flex flex-col overflow-hidden" side="top" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-card/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
              <GitCompare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl">Compare Models</h2>
              <p className="text-xs text-muted-foreground">
                Comparing {models.length} model{models.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Models
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col">
          <div className="px-4 sm:px-6 pt-4">
            <TabsList>
              <TabsTrigger value="overview">
                <List className="h-4 w-4 mr-1.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="charts">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Charts
              </TabsTrigger>
              <TabsTrigger value="calculator">
                <Calculator className="h-4 w-4 mr-1.5" />
                Cost Calculator
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 min-h-0 overflow-y-auto">
            <OverviewTab models={models} onRemove={onRemove} />
          </TabsContent>

          <TabsContent value="charts" className="flex-1 min-h-0 overflow-y-auto">
            <ChartsTab models={models} />
          </TabsContent>

          <TabsContent value="calculator" className="flex-1 min-h-0 overflow-y-auto p-6">
            <CompareCostTable models={models} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Maximize2Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  );
}
