"use client";

import type { ComponentProps } from "react";
import { createChange, definePrimitive } from "@ui-sdk/core";
import { createParts } from "@ui-sdk/react/primitive";

type Choice = { value: string; label: string };
type Options = { value: string; items: readonly Choice[]; disabled?: boolean; onValueChange: (value: string) => void };

const nativeSelect = definePrimitive({
  name: "native-select",
  options: { value: "string", items: "value", disabled: "boolean", onValueChange: "callback" },
  state: ({ value, items, disabled }: Options) => ({ value, items, disabled }),
  sync: ({ value, items, disabled }) => ({ value, items, disabled }),
  api: (context) => {
    const change = createChange(context);
    return {
      setValue(value: string, event?: Event) {
        const { disabled, items } = context.options();
        if (disabled || !items.some((item) => item.value === value)) {
          throw new Error("Choose an available option from this list.");
        }
        return change("value", value, { reason: "selection", event });
      },
    };
  },
  slots: (slot) => ({ root: slot({}) }),
  agent: { actions: ["setValue"], closed: true },
});

const { Root } = createParts(nativeSelect, { root: "select" });

export function NativeSelect({ items, value, disabled, onValueChange, ...props }: Options & Omit<ComponentProps<"select">, "children" | "value" | "defaultValue" | "onChange">) {
  return (
    <Root items={items} value={value} disabled={disabled} onValueChange={onValueChange}
      render={<select value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)} />} {...props}>
      {items.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
    </Root>
  );
}
