"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { tokenCount } from "@/lib/cost-calculator";

interface Props {
  inputTokens: number;
  outputTokens: number;
  requests: number;
  onInputTokens: (value: number) => void;
  onOutputTokens: (value: number) => void;
  onRequests: (value: number) => void;
}

export function CalculatorInputs(props: Props) {
  const id = useId();
  const fields = [
    { key: "input", label: "Input tokens per request", value: props.inputTokens, onChange: props.onInputTokens, min: 0 },
    { key: "output", label: "Output tokens per request", value: props.outputTokens, onChange: props.onOutputTokens, min: 0 },
    { key: "requests", label: "Requests", value: props.requests, onChange: props.onRequests, min: 1 },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <label htmlFor={`${id}-${field.key}`} className="text-sm text-muted-foreground">{field.label}</label>
          <Input id={`${id}-${field.key}`} type="number" min={field.min} max={Number.MAX_SAFE_INTEGER} step={1} value={field.value}
            onChange={(event) => field.onChange(tokenCount(event.target.value, field.min))} className="h-11" />
        </div>
      ))}
    </div>
  );
}
