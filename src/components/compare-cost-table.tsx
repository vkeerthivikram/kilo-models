"use client";

import type { Model } from "@/lib/types";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateCost, formatCost } from "@/lib/cost-calculator";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { getWorkloadWarnings, type CalculatorWorkload } from "@/lib/calculator-workload";
import { parsePrice } from "@/lib/format-price";

export function CompareCostTable({ models, workload: controlledWorkload, onWorkloadChange }: {
  models: Model[]; workload?: CalculatorWorkload; onWorkloadChange?: (workload: CalculatorWorkload) => void;
}) {
  const local = useCalculatorWorkload();
  const workload = controlledWorkload ?? local.workload;
  const setWorkload = onWorkloadChange ?? local.setWorkload;
  const { inputTokens, outputTokens, requests, period, cachePercent } = workload;
  const rows = models.map((model) => ({ model, warnings: getWorkloadWarnings(model, workload), ...calculateCost(model.pricing, inputTokens, outputTokens, requests, cachePercent) }))
    .sort((a, b) => (a.total ?? Infinity) - (b.total ?? Infinity));
  const cheapest = rows.filter((row) => row.total !== null && row.warnings.length === 0).reduce<number | null>((best, row) => best === null ? row.total : Math.min(best, row.total!), null);

  return (
    <div className="space-y-4">
      <CalculatorInputs workload={workload} onChange={setWorkload} showCache={models.some((model) => parsePrice(model.pricing?.input_cache_read) !== null)} />
      <p className="text-xs text-muted-foreground">Input and output costs are per request. Totals include selected cache reads and any request fee; cache creation, images, search, extra reasoning, and tiered pricing are excluded. Highlighted totals are the lowest estimate among models that fit the listed limits.</p>
      {cachePercent > 0 && <p role="status" className="text-xs text-muted-foreground">Models without a listed cache read rate show Unavailable when cached input is used.</p>}
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
            {rows.map(({ model, warnings, inputCost, outputCost, total }) => (
              <tr key={model.id} className={total !== null && total === cheapest && warnings.length === 0 ? "bg-primary/5" : ""}>
                <th scope="row" className="text-left p-3 font-medium">{model.name}
                  {warnings.length > 0 && <div className="mt-2 space-y-1 text-xs font-normal text-muted-foreground">{warnings.map((warning) => <p key={warning}>{warning}</p>)}<p>Hypothetical cost; workload does not fit.</p></div>}
                </th>
                <td className="text-right p-3 tabular-nums">{formatCost(inputCost)}</td>
                <td className="text-right p-3 tabular-nums">{formatCost(outputCost)}</td>
                <td className="text-right p-3 font-semibold tabular-nums">{formatCost(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
