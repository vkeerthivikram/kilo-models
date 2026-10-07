import type { CalculatorWorkload } from "@/lib/calculator-workload";
import { calculateWorkloadCost, formatCost } from "@/lib/cost-calculator";

export function CostBreakdown({ costs, workload }: {
  costs: ReturnType<typeof calculateWorkloadCost>;
  workload: CalculatorWorkload;
}) {
  const rows = [
    ["Uncached input", costs.uncachedCost],
    ["Cache reads", costs.cacheReadCost],
    ["Cache writes", costs.cacheWriteCost],
    ["Output", costs.outputCost],
    ["Images", costs.imageCost],
    ["Searches", costs.searchCost],
    ["Request fee", costs.requestCost],
    ["Per request", costs.perRequest],
    [`${workload.period === "month" ? "Monthly total" : "Total"} (${workload.requests.toLocaleString("en-US")} requests)`, costs.total],
  ] as const;
  return <div className="space-y-3 text-sm">
    <p className="text-xs text-muted-foreground">Charges in USD per request. Cache reads and writes replace those input tokens; zero usage has no charge.</p>
    <dl className="space-y-2" aria-live="polite" aria-atomic="true">
      {rows.map(([label, cost], index) => <div key={label} className={`flex justify-between gap-4 ${index >= 7 ? "border-t pt-2 font-semibold" : ""}`}>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="shrink-0 tabular-nums">{formatCost(cost)}</dd>
      </div>)}
    </dl>
  </div>;
}
