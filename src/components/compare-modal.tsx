"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PricingBarChart } from "@/components/pricing-bar-chart";
import { CapabilityRadarChart } from "@/components/capability-radar-chart";
import { CompareCostTable } from "@/components/compare-cost-table";
import { ComparisonTable } from "@/components/comparison-table";
import { getComparisonRows } from "@/lib/comparison";
import {
  X,
  GitCompare,
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
  const [differencesOnly, setDifferencesOnly] = React.useState(false);
  const rows = getComparisonRows(models);
  const differenceCount = rows.filter((row) => row.different).length;
  if (models.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full data-[side=top]:!h-[100dvh] data-[side=top]:max-h-[100dvh] max-w-7xl mx-auto p-0 flex flex-col overflow-hidden"
        side="top"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 sm:px-6 py-4 border-b bg-card/30">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden size-10 items-center justify-center rounded-lg bg-muted sm:flex">
              <GitCompare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">Compare Models</SheetTitle>
              <SheetDescription className="text-xs">
                {models.length} model{models.length !== 1 ? "s" : ""} selected
              </SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="size-11 gap-2 sm:w-auto" onClick={() => onOpenChange(false)} aria-label="Add models" title="Return to directory to add models">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add models</span>
            </Button>
            <Button variant="ghost" size="icon" className="size-11" onClick={() => onOpenChange(false)} aria-label="Close comparison">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 px-4 sm:px-6 pt-1">
            <TabsList className="w-full group-data-horizontal/tabs:h-11 sm:w-auto">
              <TabsTrigger value="overview">
                <List className="mr-1.5 hidden size-4 sm:block" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="charts">
                <BarChart3 className="mr-1.5 hidden size-4 sm:block" />
                Charts
              </TabsTrigger>
              <TabsTrigger value="calculator">
                <Calculator className="mr-1.5 hidden size-4 sm:block" />
                <span className="sm:hidden">Costs</span><span className="hidden sm:inline">Cost Calculator</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:text-muted-foreground">
                <input type="checkbox" checked={differencesOnly && models.length > 1} disabled={models.length < 2}
                  onChange={(event) => setDifferencesOnly(event.target.checked)} className="size-4 accent-primary" />
                Show differences only
              </label>
              <p role="status" className="text-xs text-muted-foreground">
                {models.length < 2 ? "Add another model to see differences" : `${differencesOnly ? differenceCount : rows.length} of ${rows.length} specifications shown`}
              </p>
            </div>
            <p className="shrink-0 text-xs leading-relaxed text-muted-foreground">Scroll across to compare models. Prices in USD / 1M tokens; differences use full precision.</p>
            <ComparisonTable models={models} differencesOnly={differencesOnly} onRemove={onRemove} />
          </TabsContent>

          <TabsContent value="charts" className="flex-1 min-h-0 overflow-y-auto">
            <ChartsTab models={models} />
          </TabsContent>

          <TabsContent value="calculator" keepMounted className="flex-1 min-h-0 overflow-y-auto p-6">
            <CompareCostTable models={models} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
