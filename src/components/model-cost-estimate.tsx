import type { Model } from "@/lib/types";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import { getWorkloadWarnings } from "@/lib/calculator-workload";
import { calculateWorkloadCost, formatCost } from "@/lib/cost-calculator";

export function ModelCostEstimate({ model, workload }: { model: Model; workload: CalculatorWorkload }) {
  const total = calculateWorkloadCost(model.pricing, workload).total;
  const warnings = getWorkloadWarnings(model, workload);
  return <div className="space-y-1 text-xs">
    <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span className="text-muted-foreground">Estimated {workload.period === "month" ? "monthly" : "batch"} cost</span>
      <strong className="font-semibold tabular-nums">{formatCost(total)}</strong>
    </p>
    <p className="text-muted-foreground">{workload.requests.toLocaleString("en-US")} requests{warnings.length > 0 ? " · Hypothetical: workload exceeds limits" : ""}</p>
    {total === null && <p className="text-muted-foreground">Check workload or missing rates in calculator.</p>}
  </div>;
}
