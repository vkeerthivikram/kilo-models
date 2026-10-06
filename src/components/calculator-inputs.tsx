"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WORKLOAD_PRESETS, type CalculatorWorkload } from "@/lib/calculator-workload";

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
      <p className="text-xs text-muted-foreground">Press Enter or leave a field to update the estimate.</p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {fields.map((field) => (
        <WorkloadNumberInput key={field.key} id={`${id}-${field.key}`} label={field.label} min={field.min} value={workload[field.key]}
          onChange={(value) => onChange({ ...workload, [field.key]: value })} />
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
          <WorkloadNumberInput id={`${id}-cache`} label="Cached input (%)" value={workload.cachePercent} integer={false} max={100}
            onChange={(value) => onChange({ ...workload, cachePercent: value })} />
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
          ] as const).map((field) => <WorkloadNumberInput key={field.key} id={`${id}-${field.key}`} label={field.label} value={workload[field.key]}
            onChange={(value) => onChange({ ...workload, [field.key]: value })} />)}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Images and searches add their listed unit charges. Cache-write tokens are part of total input and replace regular input billing; reads and writes must not overlap. Used units without a published rate make the estimate unavailable.</p>
      </details>
    </div>
  );
}
