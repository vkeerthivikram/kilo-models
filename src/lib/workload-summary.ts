import { DEFAULT_WORKLOAD, type CalculatorWorkload } from "./calculator-workload";

const count = (value: number) => value.toLocaleString("en-US");

export function advancedUsageSummary(workload: CalculatorWorkload): string {
  return [
    ...(workload.period === "month" ? ["Monthly"] : []),
    ...(workload.cachePercent > 0 ? [`${workload.cachePercent}% cached`] : []),
    ...(workload.images > 0 ? [`${count(workload.images)} ${workload.images === 1 ? "image" : "images"}/request`] : []),
    ...(workload.searches > 0 ? [`${count(workload.searches)} ${workload.searches === 1 ? "search" : "searches"}/request`] : []),
    ...(workload.cacheWriteTokens > 0 ? [`${count(workload.cacheWriteTokens)} cache-write tokens/request`] : []),
  ].join(" · ");
}

export function workloadSummary(workload: CalculatorWorkload): string {
  const basic = `${count(workload.inputTokens)} input · ${count(workload.outputTokens)} output tokens/request · ${count(workload.requests)} requests${workload.period === "month" ? "/month" : " (batch total)"}`;
  const advanced = advancedUsageSummary(workload).replace(/^Monthly(?: · )?/, "");
  return advanced ? `${basic} · ${advanced}` : basic;
}

export function resetAdvancedUsage(workload: CalculatorWorkload): CalculatorWorkload {
  return { ...DEFAULT_WORKLOAD, inputTokens: workload.inputTokens, outputTokens: workload.outputTokens, requests: workload.requests };
}
