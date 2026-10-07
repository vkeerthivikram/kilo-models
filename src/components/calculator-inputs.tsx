"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_WORKLOAD, WORKLOAD_PRESETS, type CalculatorWorkload } from "@/lib/calculator-workload";
import { advancedUsageSummary, resetAdvancedUsage } from "@/lib/workload-summary";
import { InlineHelp } from "./inline-help";

interface Props {
  workload: CalculatorWorkload;
  onChange: (workload: CalculatorWorkload) => void;
  showCache?: boolean;
}

function WorkloadNumberInput({ id, label, value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, integer = true }: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [badInput, setBadInput] = useState(false);
  const number = draft === null || draft.trim() === "" ? NaN : Number(draft);
  const valid = Number.isFinite(number) && (!integer || Number.isSafeInteger(number)) && number >= min && number <= max;
  const invalid = badInput || (draft !== null && draft !== "" && !valid);
  const finishEdit = () => {
    if (draft !== null && valid && !badInput && number !== value) onChange(number);
    setDraft(null);
    setBadInput(false);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>
      <Input id={id} type="number" min={min} max={max} step={integer ? 1 : "any"} inputMode={integer ? "numeric" : "decimal"}
        value={draft ?? value} className="h-11" aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => { setDraft(event.target.value); setBadInput(event.target.validity.badInput); }}
        onBlur={finishEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
        }} />
      {invalid && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
        {integer ? `Enter a whole number from ${min} to ${max}.` : "Enter a percentage from 0 to 100."}
      </p>}
    </div>
  );
}

export function CalculatorInputs(props: Props) {
  const id = useId();
  const { workload, onChange } = props;
  const [resetVersion, setResetVersion] = useState(0);
  const reset = (value: CalculatorWorkload) => { onChange(value); setResetVersion((version) => version + 1); };
  const advancedUsage = workload.period === "month" || workload.cachePercent > 0 || workload.images > 0 || workload.searches > 0 || workload.cacheWriteTokens > 0;
  const [initiallyAdvanced] = useState(advancedUsage);
  const advancedPanel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    // Reveal restored usage without closing the panel when its last value is cleared.
    if (advancedUsage && advancedPanel.current) advancedPanel.current.open = true;
  }, [advancedUsage]);
  const fields = [
    { key: "inputTokens", label: "Input tokens per request", min: 0 },
    { key: "outputTokens", label: "Output tokens per request", min: 0 },
    { key: "requests", label: workload.period === "month" ? "Requests per month" : "Requests", min: 1 },
  ] as const;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Workload presets">
        <span className="mr-1 text-xs text-muted-foreground">Example workloads</span>
        {WORKLOAD_PRESETS.map((preset, index) => (
          <Button key={preset.label} type="button" variant="outline" className="h-auto min-h-11 flex-col items-start gap-0.5 py-2 text-xs"
            aria-label={preset.label} aria-describedby={`${id}-preset-${index}`}
            aria-pressed={workload.inputTokens === preset.inputTokens && workload.outputTokens === preset.outputTokens}
            onClick={() => reset({ ...workload, inputTokens: preset.inputTokens, outputTokens: preset.outputTokens })}>
            <span>{preset.label}</span><span id={`${id}-preset-${index}`} className="font-normal tabular-nums text-muted-foreground">{preset.inputTokens.toLocaleString("en-US")} in · {preset.outputTokens.toLocaleString("en-US")} out</span></Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Examples are starting assumptions, not measured usage. They change token counts only.</p>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <InlineHelp title="About tokens"><p>Tokens are pieces of text counted by a model. Input includes your prompt and conversation history; output is the model’s response. Token counts vary by model and language.</p><p>Context is the space available for input and output together in one request.</p></InlineHelp>
        <Button type="button" variant="ghost" className="min-h-11 text-xs" onClick={() => reset({ ...DEFAULT_WORKLOAD })}>Reset usage</Button>
      </div>
      <p className="text-xs text-muted-foreground">Press Enter or leave a field to update the estimate.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {fields.map((field) => (
          <WorkloadNumberInput key={`${field.key}-${resetVersion}`} id={`${id}-${field.key}`} label={field.label} min={field.min} value={workload[field.key]}
            onChange={(value) => onChange({ ...workload, [field.key]: value })} />
        ))}
      </div>
      <details ref={advancedPanel} open={initiallyAdvanced || undefined} className="border-t pt-2">
        <summary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
          Advanced usage{advancedUsage && <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{advancedUsageSummary(workload)}</span>}
        </summary>
        <div className="space-y-4 pt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor={`${id}-period`} className="text-sm text-muted-foreground">Estimate period</label>
              <select id={`${id}-period`} value={workload.period} onChange={(event) => onChange({ ...workload, period: event.target.value === "month" ? "month" : "batch" })}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring">
                <option value="batch">Batch total</option><option value="month">Monthly total</option>
              </select>
            </div>
            {(props.showCache || workload.cachePercent > 0) && <div className="space-y-2">
              <WorkloadNumberInput key={`cache-${resetVersion}`} id={`${id}-cache`} label="Cached input (%)" value={workload.cachePercent} integer={false} max={100}
                onChange={(value) => onChange({ ...workload, cachePercent: value })} />
              <p className="text-xs text-muted-foreground">Share of total input billed at the cache read rate.</p>
            </div>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              { key: "images", label: "Images per request" },
              { key: "searches", label: "Searches per request" },
              { key: "cacheWriteTokens", label: "Cache-write tokens per request" },
            ] as const).map((field) => <WorkloadNumberInput key={`${field.key}-${resetVersion}`} id={`${id}-${field.key}`} label={field.label} value={workload[field.key]}
              onChange={(value) => onChange({ ...workload, [field.key]: value })} />)}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Images and searches add unit charges. Cache reads and writes replace regular input billing and must not overlap. Missing rates make the estimate unavailable.</p>
          <InlineHelp title="About caching"><p>Cache reads reuse previously stored input at the published read rate. Cache writes store new input at the write rate. These counts are part of total input, so read and write tokens must not overlap or exceed it.</p></InlineHelp>
          <Button type="button" variant="ghost" className="min-h-11 text-xs" onClick={() => reset(resetAdvancedUsage(workload))}>Clear advanced usage</Button>
        </div>
      </details>
    </div>
  );
}
