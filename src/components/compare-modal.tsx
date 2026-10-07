"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Model } from "@/lib/types";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ComparisonTable } from "@/components/comparison-table";
import { getVisibleComparisonRows } from "@/lib/comparison";
import { workloadSummary } from "@/lib/workload-summary";
import { ComparisonActions } from "@/components/comparison-actions";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
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

const ComparisonCharts = dynamic(
  () => import("@/components/comparison-charts").then((module) => module.ComparisonCharts),
  { ssr: false, loading: () => <p role="status" className="p-4 sm:p-6 text-sm text-muted-foreground">Loading comparison charts…</p> },
);
const CompareCostTable = dynamic(() => import("@/components/compare-cost-table").then((module) => module.CompareCostTable),
  { loading: () => <p role="status" className="p-4 text-sm text-muted-foreground">Loading cost calculator…</p> });

export function CompareModal({ models, open, onOpenChange, onRemove }: CompareModalProps) {
  const [differencesOnly, setDifferencesOnly] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [calculatorVisited, setCalculatorVisited] = React.useState(false);
  const [fullSpecifications, setFullSpecifications] = React.useState(false);
  const { workload, setWorkload } = useCalculatorWorkload();
  const rows = getVisibleComparisonRows(models, workload, fullSpecifications);
  const differenceCount = rows.filter((row) => row.different).length;
  if (models.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full data-[side=top]:!h-[100dvh] data-[side=top]:max-h-[100dvh] max-w-7xl mx-auto p-0 flex flex-col overflow-clip"
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

        <ComparisonActions models={models} workload={workload} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => { const tab = String(value); setActiveTab(tab); if (tab === "calculator") setCalculatorVisited(true); }} className="flex-1 min-h-0 flex flex-col overflow-clip">
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
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={fullSpecifications} onChange={(event) => setFullSpecifications(event.target.checked)} className="size-4 accent-primary" />
                Full specifications
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:text-muted-foreground">
                <input type="checkbox" checked={differencesOnly && models.length > 1} disabled={models.length < 2}
                  onChange={(event) => setDifferencesOnly(event.target.checked)} className="size-4 accent-primary" />
                Show differences only
              </label>
              <p role="status" className="text-xs text-muted-foreground">
                {models.length < 2 ? "Add another model to see differences" : `${differencesOnly ? differenceCount : rows.length} of ${rows.length} specifications shown`}
              </p>
            </div>
            <p className="shrink-0 text-xs leading-relaxed text-muted-foreground">Scroll across to compare models. Published prices: USD / 1M tokens. Estimates use: {workloadSummary(workload)}. Differences use full precision.</p>
            <ComparisonTable models={models} differencesOnly={differencesOnly} onRemove={onRemove} fullSpecifications={fullSpecifications} workload={workload} />
          </TabsContent>

          <TabsContent value="charts" className="flex-1 min-h-0 overflow-y-auto">
            {open && activeTab === "charts" && <ComparisonCharts models={models} />}
          </TabsContent>

          <TabsContent value="calculator" keepMounted className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
            {open && calculatorVisited && <CompareCostTable models={models} workload={workload} onWorkloadChange={setWorkload} />}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
