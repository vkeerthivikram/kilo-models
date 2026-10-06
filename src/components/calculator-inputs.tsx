"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { tokenCount } from "@/lib/cost-calculator";
import { Button } from "@/components/ui/button";
import { WORKLOAD_PRESETS, type CalculatorWorkload } from "@/lib/calculator-workload";

interface Props {
  workload: CalculatorWorkload;
  onChange: (workload: CalculatorWorkload) => void;
  showCache?: boolean;
}

export function CalculatorInputs(props: Props) {
  const id = useId();
  const { workload, onChange } = props;
  const fields = [
    { key: "inputTokens", label: "Input tokens per request", min: 0 },
    { key: "outputTokens", label: "Output tokens per request", min: 0 },
    { key: "requests", label: workload.period === "month" ? "Requests per month" : "Requests", min: 1 },
  ] as const;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Workload presets">
        <span className="mr-1 text-xs text-muted-foreground">Example workloads</span>
        {WORKLOAD_PRESETS.map((preset) => (
          <Button key={preset.label} type="button" variant="outline" className="h-11 text-xs"
            aria-pressed={workload.inputTokens === preset.inputTokens && workload.outputTokens === preset.outputTokens}
            onClick={() => onChange({ ...workload, inputTokens: preset.inputTokens, outputTokens: preset.outputTokens })}>{preset.label}</Button>
        ))}
      </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <label htmlFor={`${id}-${field.key}`} className="text-sm text-muted-foreground">{field.label}</label>
          <Input id={`${id}-${field.key}`} type="number" min={field.min} max={Number.MAX_SAFE_INTEGER} step={1} value={workload[field.key]}
            onChange={(event) => onChange({ ...workload, [field.key]: tokenCount(event.target.value, field.min) })} className="h-11" />
        </div>
      ))}
    </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`${id}-period`} className="text-sm text-muted-foreground">Estimate period</label>
          <select id={`${id}-period`} value={workload.period} onChange={(event) => onChange({ ...workload, period: event.target.value === "month" ? "month" : "batch" })}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring">
            <option value="batch">Batch total</option><option value="month">Monthly total</option>
          </select>
        </div>
        {(props.showCache || workload.cachePercent > 0) && <div className="space-y-2">
          <label htmlFor={`${id}-cache`} className="text-sm text-muted-foreground">Cached input (%)</label>
          <Input id={`${id}-cache`} type="number" min={0} max={100} step={1} value={workload.cachePercent} className="h-11"
            onChange={(event) => onChange({ ...workload, cachePercent: Math.min(100, tokenCount(event.target.value)) })} />
          <p className="text-xs text-muted-foreground">Share of total input billed at the cache read rate.</p>
        </div>}
      </div>
      <details className="border-t pt-3">
        <summary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Additional billing</summary>
        <div className="grid gap-4 pt-3 sm:grid-cols-3">
          {([
            { key: "images", label: "Images per request" },
            { key: "searches", label: "Searches per request" },
            { key: "cacheWriteTokens", label: "Cache-write tokens per request" },
          ] as const).map((field) => <div key={field.key} className="space-y-2">
            <label htmlFor={`${id}-${field.key}`} className="text-sm text-muted-foreground">{field.label}</label>
            <Input id={`${id}-${field.key}`} type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} value={workload[field.key]} className="h-11"
              onChange={(event) => onChange({ ...workload, [field.key]: tokenCount(event.target.value) })} />
          </div>)}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Images and searches add their listed unit charges. Cache-write tokens are part of total input and replace regular input billing; reads and writes must not overlap. Used units without a published rate make the estimate unavailable.</p>
      </details>
    </div>
  );
}
