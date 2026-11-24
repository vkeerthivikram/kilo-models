"use client";

import type { Model } from "@/lib/types";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateWorkloadCost, formatCost } from "@/lib/cost-calculator";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { getBillingWarnings, getBlockingBillingWarnings, getWorkloadSuitability, getWorkloadWarnings, type CalculatorWorkload } from "@/lib/calculator-workload";
import { CostBreakdown } from "./cost-breakdown";
import { parsePrice } from "@/lib/format-price";
import { SavedSetups } from "./saved-setups";
import { InlineHelp } from "./inline-help";
import { requestCount, workloadSummary } from "@/lib/workload-summary";

export function CompareCostTable({ models, workload: controlledWorkload, onWorkloadChange }: {
  models: Model[]; workload?: CalculatorWorkload; onWorkloadChange?: (workload: CalculatorWorkload) => void | Promise<unknown>;
}) {
  const local = useCalculatorWorkload();
  const workload = controlledWorkload ?? local.workload;
  const setWorkload = onWorkloadChange ?? local.setWorkload;
  const { requests, period } = workload;
  const labels = new Map(models.map((model) => [model.id,
    models.some((other) => other.id !== model.id && other.name === model.name) ? `${model.name} (${model.id})` : model.name]));
  const rows = models.map((model) => ({
    model,
    warnings: getWorkloadWarnings(model, workload),
    billingWarnings: getBillingWarnings(model.pricing, workload),
    blockingBillingWarnings: getBlockingBillingWarnings(model.pricing, workload),
    ...calculateWorkloadCost(model.pricing, workload),
  })).sort((a, b) => {
    if (a.total === null) return b.total === null ? a.model.name.localeCompare(b.model.name) : 1;
    if (b.total === null) return -1;
    return (a.total - b.total) || a.model.name.localeCompare(b.model.name);
  });
  const cheapest = rows.filter((row) => row.total !== null && getWorkloadSuitability(row.model, workload) === "fits").reduce<number | null>((best, row) => best === null ? row.total : Math.min(best, row.total!), null);

  return (
    <div className="space-y-4">
      <CalculatorInputs workload={workload} onChange={setWorkload} showCache={models.some((model) => parsePrice(model.pricing?.input_cache_read) !== null)} />
      <p className="text-xs leading-relaxed text-muted-foreground">Estimates in USD · {workloadSummary(workload)}. Highlighted totals are the lowest estimate among models that fit the listed limits.</p>
      <InlineHelp title="About cost estimates"><p>Input and output costs are per request. Totals include selected cache, search, and request charges. Image usage or other usage without a verified rate makes the total unavailable. Extra reasoning and tiered pricing are excluded.</p></InlineHelp>
      <div role="region" aria-label="Cost estimates" data-agent-catalog="Comparison cost estimates" tabIndex={0} className="rounded-lg border overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Estimated costs, lowest available total first</caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="w-3/5 text-left p-3 font-medium">Model</th>
              <th scope="col" className="text-right p-3 font-medium break-words">{period === "month" ? "Monthly total" : "Total"} ({requestCount(requests)})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, warnings, billingWarnings, blockingBillingWarnings, total }) => (
              <tr key={model.id} className={total !== null && total === cheapest && getWorkloadSuitability(model, workload) === "fits" ? "bg-primary/5" : ""}>
                <th scope="row" className="text-left p-3 font-medium [overflow-wrap:anywhere]">{labels.get(model.id)}
                  {warnings.length > 0 && <div className="mt-2 space-y-1 text-xs font-normal text-muted-foreground">{warnings.map((warning) => <p key={warning}>{warning}</p>)}<p>Hypothetical cost; workload does not fit.</p></div>}
                  {getWorkloadSuitability(model, workload) === "unknown" && <p className="mt-2 text-xs font-normal text-muted-foreground">Limits unknown: context or output cap is not published.</p>}
                  {billingWarnings.length > 0 && <div className="mt-2 space-y-1 text-xs font-normal text-muted-foreground">{billingWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
                  {total === null && blockingBillingWarnings.length === 0 && <p className="mt-2 text-xs font-normal text-muted-foreground">Estimate exceeds supported numeric range. Reduce usage.</p>}
                </th>
                <td className="text-right p-3 font-semibold tabular-nums [overflow-wrap:anywhere]">{formatCost(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SavedSetups workload={workload} onWorkloadChange={setWorkload} />
      <details className="border-y py-1">
        <DisclosureSummary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Full cost breakdown</DisclosureSummary>
        <ul className="divide-y">
          {rows.map((row) => <li data-agent-catalog="Comparison cost breakdown" data-model-id={row.model.id} key={row.model.id} className="space-y-3 py-5">
            <h3 className="break-words text-sm font-semibold">{labels.get(row.model.id)}</h3>
            <CostBreakdown costs={row} workload={workload} />
          </li>)}
        </ul>
      </details>
    </div>
  );
}
