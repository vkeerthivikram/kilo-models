"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { parseNumericFilter } from "@/lib/model-filtering";

export function NumericFilterInput({ id, label, value, onChange, integer = false }: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  integer?: boolean;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const [badInput, setBadInput] = React.useState(false);
  const invalid = badInput || (draft !== null && draft !== "" && parseNumericFilter(draft, integer) === null);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs text-muted-foreground">{label}</label>
      <Input id={id} type="number" min={0} step={integer ? 1 : "any"} inputMode={integer ? "numeric" : "decimal"}
        placeholder="No limit" value={draft ?? value ?? ""} className="h-11 bg-card text-base md:text-sm"
        aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined}
        onFocus={() => setDraft(value === null ? "" : String(value))}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          setBadInput(event.target.validity.badInput);
          if (event.target.validity.badInput) return;
          if (text === "") onChange(null);
          else {
            const number = parseNumericFilter(text, integer);
            if (number !== null) onChange(number);
          }
        }}
        onBlur={() => { setDraft(null); setBadInput(false); }} />
      {invalid && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">Enter {integer ? "a whole number" : "a finite number"} of 0 or more.</p>}
    </div>
  );
}
