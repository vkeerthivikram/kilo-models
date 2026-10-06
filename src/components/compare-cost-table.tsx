"use client";

import type { Model } from "@/lib/types";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateWorkloadCost, formatCost } from "@/lib/cost-calculator";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { getBillingWarnings, getWorkloadSuitability, getWorkloadWarnings, type CalculatorWorkload } from "@/lib/calculator-workload";
import { CostBreakdown } from "./cost-breakdown";
import { parsePrice } from "@/lib/format-price";
import { SavedSetups } from "./saved-setups";

export function CompareCostTable({ models, workload: controlledWorkload, onWorkloadChange }: {
  models: Model[]; workload?: CalculatorWorkload; onWorkloadChange?: (workload: CalculatorWorkload) => void;
}) {
  const local = useCalculatorWorkload();
  const workload = controlledWorkload ?? local.workload;
  const setWorkload = onWorkloadChange ?? local.setWorkload;
  const { requests, period } = workload;
  const rows = models.map((model) => ({ model, warnings: getWorkloadWarnings(model, workload), billingWarnings: getBillingWarnings(model.pricing, workload), ...calculateWorkloadCost(model.pricing, workload) }))
    .sort((a, b) => (a.total ?? Infinity) - (b.total ?? Infinity));
  const cheapest = rows.filter((row) => row.total !== null && getWorkloadSuitability(row.model, workload) === "fits").reduce<number | null>((best, row) => best === null ? row.total : Math.min(best, row.total!), null);

  return (
    <div className="space-y-4">
      <CalculatorInputs workload={workload} onChange={setWorkload} showCache={models.some((model) => parsePrice(model.pricing?.input_cache_read) !== null)} />
      <SavedSetups workload={workload} onWorkloadChange={setWorkload} />
      <p className="text-xs text-muted-foreground">Input and output costs are per request. Totals include selected cache, image, search, and request charges. Used units without a listed rate show Unavailable. Extra reasoning and tiered pricing are excluded. Highlighted totals are the lowest estimate among models that fit the listed limits.</p>
      <div role="region" aria-label="Cost estimates" tabIndex={0} className="rounded-lg border overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring">
        <table className="w-full min-w-[600px] text-sm">
          <caption className="sr-only">Estimated costs, lowest available total first</caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="text-left p-3 font-medium">Model</th>
              <th scope="col" className="text-right p-3 font-medium">Input / request</th>
              <th scope="col" className="text-right p-3 font-medium">Output / request</th>
              <th scope="col" className="text-right p-3 font-medium">{period === "month" ? "Monthly total" : "Total"} ({requests.toLocaleString("en-US")} requests)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, warnings, billingWarnings, inputCost, outputCost, total }) => (
              <tr key={model.id} className={total !== null && total === cheapest && getWorkloadSuitability(model, workload) === "fits" ? "bg-primary/5" : ""}>
                <th scope="row" className="text-left p-3 font-medium">{model.name}
                  {warnings.length > 0 && <div className="mt-2 space-y-1 text-xs font-normal text-muted-foreground">{warnings.map((warning) => <p key={warning}>{warning}</p>)}<p>Hypothetical cost; workload does not fit.</p></div>}
                  {getWorkloadSuitability(model, workload) === "unknown" && <p className="mt-2 text-xs font-normal text-muted-foreground">Limits unknown: context or output cap is not published.</p>}
                  {billingWarnings.length > 0 && <div className="mt-2 space-y-1 text-xs font-normal text-muted-foreground">{billingWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
                </th>
                <td className="text-right p-3 tabular-nums">{formatCost(inputCost)}</td>
                <td className="text-right p-3 tabular-nums">{formatCost(outputCost)}</td>
                <td className="text-right p-3 font-semibold tabular-nums">{formatCost(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="border-y py-1">
        <summary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Full cost breakdown</summary>
        <ul className="divide-y">
          {rows.map((row) => <li key={row.model.id} className="space-y-3 py-5">
            <h3 className="text-sm font-semibold">{row.model.name}</h3>
            <CostBreakdown costs={row} workload={workload} />
          </li>)}
        </ul>
      </details>
    </div>
  );
}
