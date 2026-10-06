"use client";

import * as React from "react";
import type { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateCost, formatCost } from "@/lib/cost-calculator";
import { ChevronDown } from "lucide-react";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { getWorkloadWarnings } from "@/lib/calculator-workload";
import { parsePrice } from "@/lib/format-price";

export function PricingCalculator({ model, className }: { model: Model; className?: string }) {
  const { workload, setWorkload } = useCalculatorWorkload();
  const { inputTokens, outputTokens, requests, cachePercent, period } = workload;
  const [open, setOpen] = React.useState(true);
  const id = React.useId();
  const costs = calculateCost(model.pricing, inputTokens, outputTokens, requests, cachePercent);
  const warnings = getWorkloadWarnings(model, workload);
  const cacheUnavailable = cachePercent > 0 && inputTokens > 0 && parsePrice(model.pricing?.input_cache_read) === null;
  const rows = [
    [cachePercent > 0 ? "Input cost per request (including cache reads)" : "Input cost per request", costs.inputCost],
    ["Output cost per request", costs.outputCost],
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
        {(warnings.length > 0 || cacheUnavailable) && <div role="status" className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          {warnings.length > 0 && <p className="text-muted-foreground">This is a hypothetical cost; reduce token counts to fit a single request.</p>}
          {cacheUnavailable && <p>No cache read rate is listed. Set cached input to 0% to estimate using regular input rates.</p>}
        </div>}
        <div className="border-t pt-4 space-y-3 text-sm" aria-live="polite" aria-atomic="true">
          {rows.map(([label, cost], index) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{label}</span>
              <span className={index === rows.length - 1 ? "font-bold text-primary" : "font-medium"}>{formatCost(cost)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Estimate uses listed token rates, selected cache reads, and any request fee. Cache creation, images, search, extra reasoning, and tiered pricing are excluded. Unavailable rates cannot be estimated.</p>
      </div>
    </Card>
  );
}
