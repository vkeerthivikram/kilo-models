"use client";

import * as React from "react";
import type { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateWorkloadCost } from "@/lib/cost-calculator";
import { ChevronDown } from "lucide-react";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { getBillingWarnings, getWorkloadSuitability, getWorkloadWarnings } from "@/lib/calculator-workload";
import { CostBreakdown } from "./cost-breakdown";
import { SavedSetups } from "./saved-setups";
import { parsePrice } from "@/lib/format-price";

export function PricingCalculator({ model, className }: { model: Model; className?: string }) {
  const { workload, setWorkload } = useCalculatorWorkload();
  const [open, setOpen] = React.useState(true);
  const id = React.useId();
  const costs = calculateWorkloadCost(model.pricing, workload);
  const warnings = getWorkloadWarnings(model, workload);
  const billingWarnings = getBillingWarnings(model.pricing, workload);
  const suitability = getWorkloadSuitability(model, workload);

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
        {suitability === "unknown" && <p className="text-sm text-muted-foreground">Limits unknown: published context or output limit is missing. Verify request size with the provider.</p>}
        <div className="border-t pt-4"><CostBreakdown costs={costs} workload={workload} /></div>
        <p className="text-xs text-muted-foreground">Estimate uses published token, cache, image, search, and request rates for the selected usage. Extra reasoning, provider routing, and tiered pricing may change actual charges.</p>
      </div>
    </Card>
  );
}
