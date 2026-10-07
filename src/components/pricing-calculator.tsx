"use client";

import * as React from "react";
import type { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateWorkloadCost, formatCost } from "@/lib/cost-calculator";
import { ChevronDown } from "lucide-react";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { getBillingWarnings, getWorkloadSuitability, getWorkloadWarnings } from "@/lib/calculator-workload";
import { CostBreakdown } from "./cost-breakdown";
import { SavedSetups } from "./saved-setups";
import { parsePrice } from "@/lib/format-price";
import { workloadSummary } from "@/lib/workload-summary";

export function PricingCalculator({ model, className }: { model: Model; className?: string }) {
  const { workload, setWorkload } = useCalculatorWorkload();
  const [open, setOpen] = React.useState(true);
  const id = React.useId();
  const costs = calculateWorkloadCost(model.pricing, workload);
  const warnings = getWorkloadWarnings(model, workload);
  const billingWarnings = getBillingWarnings(model.pricing, workload);
  const suitability = getWorkloadSuitability(model, workload);

  return (
    <Card className={`p-4 sm:p-6 ${className ?? ""}`}>
      <h2>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`${id} ${id}-saved`} className="min-h-11 w-full flex items-center justify-between font-heading text-lg rounded focus-visible:outline-2 focus-visible:outline-ring">
          Cost Calculator
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <p className="text-xs leading-relaxed text-muted-foreground">Estimates in USD · {workloadSummary(workload)}</p>
      <div id={id} hidden={!open} className="space-y-6">
        <CalculatorInputs workload={workload} onChange={setWorkload} showCache={parsePrice(model.pricing?.input_cache_read) !== null} />
      </div>
        {(warnings.length > 0 || billingWarnings.length > 0) && <div role="status" className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          {warnings.length > 0 && <p className="text-muted-foreground">This is a hypothetical cost; reduce token counts to fit a single request.</p>}
          {billingWarnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>}
        {suitability === "unknown" && <p className="text-sm text-muted-foreground">Limits unknown: published context or output limit is missing. Verify request size with the provider.</p>}
        {costs.total === null && billingWarnings.length === 0 && <p role="status" className="text-sm text-muted-foreground">Estimate exceeds supported numeric range. Reduce usage to calculate a total.</p>}
        <dl aria-live="polite" aria-atomic="true" className="space-y-3 border-t pt-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Per request</dt><dd className="font-semibold tabular-nums">{formatCost(costs.perRequest)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{workload.period === "month" ? "Monthly total" : "Total"} ({workload.requests.toLocaleString("en-US")} requests)</dt><dd className="font-semibold tabular-nums">{formatCost(costs.total)}</dd></div>
        </dl>
      <div id={`${id}-saved`} hidden={!open} className="space-y-6">
        <SavedSetups workload={workload} onWorkloadChange={setWorkload} />
        <details className="border-t pt-2">
          <summary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Full cost breakdown</summary>
          <div className="space-y-3 pt-2">
            <CostBreakdown costs={costs} workload={workload} />
            <p className="text-xs text-muted-foreground">Uses published rates. Reasoning, routing, and tiered pricing may change actual charges.</p>
          </div>
        </details>
      </div>
    </Card>
  );
}
