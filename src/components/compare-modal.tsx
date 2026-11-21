"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { DialogController } from "@ui-sdk/react/dialog";
import { Model } from "@/lib/types";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CatalogCheckbox } from "@/components/ui/catalog-checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AgentTabs } from "@/components/ui/agent-tabs";
import { waitForAgentContent } from "@/lib/agent-readiness";
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
  selectedIds?: string[];
  controller: DialogController;
  onOpenChange: (open: boolean) => void;
  onRemove: (model: Model) => void;
  onModelNavigate: () => void;
}

function ComparisonContentError() {
  return <p role="alert" data-comparison-load-error="" className="p-4 text-sm text-destructive">This tab could not load. Reload the page to try again.</p>;
}

const ComparisonCharts = dynamic(
  () => import("@/components/comparison-charts").then((module) => module.ComparisonCharts, () => ComparisonContentError),
  { ssr: false, loading: () => <p role="status" className="p-4 sm:p-6 text-sm text-muted-foreground">Loading comparison charts…</p> },
);
const CompareCostTable = dynamic(() => import("@/components/compare-cost-table").then((module) => module.CompareCostTable, () => ComparisonContentError),
  { loading: () => <p role="status" className="p-4 text-sm text-muted-foreground">Loading cost calculator…</p> });

const comparisonTabs = [
  { value: "overview", label: "Overview" },
  { value: "charts", label: "Charts" },
  { value: "calculator", label: "Cost Calculator" },
];

const tabContent: Record<string, string> = {
  overview: '[data-agent-catalog="Comparison specifications"]',
  charts: '[data-agent-catalog="Charts guide"]',
  calculator: '[data-agent-catalog="Comparison cost estimates"]',
};

export function CompareModal({ models, selectedIds, controller, onOpenChange, onRemove, onModelNavigate }: CompareModalProps) {
  const [differencesOnly, setDifferencesOnly] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [calculatorVisited, setCalculatorVisited] = React.useState(false);
  const [fullSpecifications, setFullSpecifications] = React.useState(false);
  const { workload, setWorkload } = useCalculatorWorkload();
  const rows = React.useMemo(() => getVisibleComparisonRows(models, workload, fullSpecifications), [models, workload, fullSpecifications]);
  const differenceCount = rows.filter((row) => row.different).length;
  if (models.length === 0) return <Sheet controller={controller} onOpenChange={onOpenChange} />;

  function selectTab(value: string | null) {
    if (value === null) return;
    setActiveTab(value);
    if (value === "calculator") setCalculatorVisited(true);
  }

  function selectAgentTab(value: string) {
    selectTab(value);
    return waitForAgentContent(() => {
      const panel = Array.from(document.querySelectorAll<HTMLElement>("[data-comparison-tab][data-selected]"))
        .find((element) => element.dataset.comparisonTab === value && !element.closest("[hidden], [inert], [aria-hidden='true']"));
      if (panel?.querySelector("[data-comparison-load-error]")) throw new Error("The comparison tab could not load.");
      return !!panel?.querySelector(tabContent[value]);
    }, "The comparison tab did not finish loading.");
  }

  return (
    <Sheet controller={controller} onOpenChange={onOpenChange}>
      <SheetContent initialFocus="content" className="[@media(max-height:700px)]:overflow-y-auto">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 sm:px-6 py-4 border-b bg-card/30">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden size-10 items-center justify-center rounded-lg bg-muted sm:flex">
              <GitCompare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="font-heading text-xl font-medium">Compare Models</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {models.length} model{models.length !== 1 ? "s" : ""} selected
              </SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="size-11 gap-2 sm:w-auto" onClick={() => { controller.close(); }} aria-label="Add models" title="Return to directory to add models">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add models</span>
            </Button>
            <Button variant="ghost" size="icon" className="size-11" onClick={() => { controller.close(); }} aria-label="Close comparison">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ComparisonActions models={models} selectedIds={selectedIds} workload={workload} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={selectTab} className="flex-1 min-h-0 flex flex-col overflow-clip [@media(max-height:700px)]:flex-none [@media(max-height:700px)]:overflow-visible">
          <AgentTabs className="shrink-0 px-4 sm:px-6 pt-1" value={activeTab} items={comparisonTabs} onSetValue={selectAgentTab}>
            <TabsList data-agent-hidden="" className="w-full group-data-horizontal/tabs:h-11 sm:w-auto">
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
          </AgentTabs>

          <TabsContent value="overview" data-comparison-tab="overview" className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <CatalogCheckbox aria-label="Full specifications" checked={fullSpecifications} onCheckedChange={(checked) => setFullSpecifications(checked === true)} />
                Full specifications
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:text-muted-foreground">
                <CatalogCheckbox aria-label="Show differences only" checked={differencesOnly && models.length > 1} disabled={models.length < 2}
                  onCheckedChange={(checked) => setDifferencesOnly(checked === true)} />
                Show differences only
              </label>
              <p role="status" className="text-xs text-muted-foreground">
                {models.length < 2 ? "Add another model to see differences" : `${differencesOnly ? differenceCount : rows.length} of ${rows.length} specifications shown`}
              </p>
            </div>
            <p className="shrink-0 text-xs leading-relaxed text-muted-foreground">Scroll across to compare models. Published prices: USD / 1M tokens. Estimates use: {workloadSummary(workload)}. {workload.images > 0 && "Totals are unavailable for image usage because its billing unit is unverified. "}Differences use full precision.</p>
            <ComparisonTable models={models} rows={rows} differencesOnly={differencesOnly} onRemove={onRemove} onModelNavigate={onModelNavigate} fullSpecifications={fullSpecifications} workload={workload} />
          </TabsContent>

          <TabsContent value="charts" data-comparison-tab="charts" className="flex-1 min-h-0 overflow-y-auto">
            {activeTab === "charts" && <ComparisonCharts models={models} />}
          </TabsContent>

          <TabsContent value="calculator" data-comparison-tab="calculator" keepMounted className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
            {calculatorVisited && <CompareCostTable models={models} workload={workload} onWorkloadChange={setWorkload} />}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
