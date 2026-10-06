"use client";

import * as React from "react";
import type { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateWorkloadCost, formatCost } from "@/lib/cost-calculator";
import { ChevronDown } from "lucide-react";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { getBillingWarnings, getWorkloadWarnings } from "@/lib/calculator-workload";
import { SavedSetups } from "./saved-setups";
import { parsePrice } from "@/lib/format-price";

export function PricingCalculator({ model, className }: { model: Model; className?: string }) {
  const { workload, setWorkload } = useCalculatorWorkload();
  const { requests, cachePercent, period } = workload;
  const [open, setOpen] = React.useState(true);
  const id = React.useId();
  const costs = calculateWorkloadCost(model.pricing, workload);
  const warnings = getWorkloadWarnings(model, workload);
  const billingWarnings = getBillingWarnings(model.pricing, workload);
  const rows = [
    [cachePercent > 0 || workload.cacheWriteTokens > 0 ? "Input cost per request (including cache)" : "Input cost per request", costs.inputCost],
    ["Output cost per request", costs.outputCost],
    ...(workload.images > 0 ? [["Images per request", costs.imageCost]] as const : []),
    ...(workload.searches > 0 ? [["Searches per request", costs.searchCost]] as const : []),
    ...(model.pricing?.request !== undefined ? [["Request fee", costs.requestCost]] as const : []),
    ["Per request", costs.perRequest],
    [`${period === "month" ? "Monthly total" : "Total"} (${requests.toLocaleString("en-US")} requests)`, costs.total],
  ] as const;

  return (
    <Card className={`p-6 ${className ?? ""}`}>
      <h2>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} className="w-full flex items-center justify-between font-heading text-lg rounded focus-visible:outline-2 focus-visible:outline-ring">
          Cost Calculator
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <div id={id} hidden={!open} className="space-y-6">
        <CalculatorInputs workload={workload} onChange={setWorkload} showCache={parsePrice(model.pricing?.input_cache_read) !== null} />
        <SavedSetups workload={workload} onWorkloadChange={setWorkload} />
        {(warnings.length > 0 || billingWarnings.length > 0) && <div role="status" className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          {warnings.length > 0 && <p className="text-muted-foreground">This is a hypothetical cost; reduce token counts to fit a single request.</p>}
          {billingWarnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>}
        <div className="border-t pt-4 space-y-3 text-sm" aria-live="polite" aria-atomic="true">
          {rows.map(([label, cost], index) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{label}</span>
              <span className={index === rows.length - 1 ? "font-bold text-primary" : "font-medium"}>{formatCost(cost)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Estimate uses published token, cache, image, search, and request rates for the selected usage. Extra reasoning, provider routing, and tiered pricing may change actual charges.</p>
      </div>
    </Card>
  );
}
