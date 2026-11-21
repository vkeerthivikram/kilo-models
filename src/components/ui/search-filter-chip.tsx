"use client";

import type { ReactNode } from "react";
import { definePrimitive } from "@ui-sdk/core";
import { createParts } from "@ui-sdk/react/primitive";

const searchFilter = definePrimitive({
  name: "search-filter",
  options: { onRemove: "action" },
  state: ({ onRemove }: { onRemove?: () => void }) => ({ disabled: !onRemove }),
  api: ({ options }) => ({ remove: () => options().onRemove?.() }),
  slots: (slot) => ({ root: slot({}) }),
  agent: { actions: ["remove"] },
});

const { Root } = createParts(searchFilter, { root: "span" });

export function SearchFilterChip({ label, onRemove, className, children }: {
  label: string;
  onRemove: () => void;
  className: string;
  children: ReactNode;
}) {
  // Human-facing text can contain the exact name of another SDK control.
  return (
    <Root role="group" aria-label="Search filter" onRemove={onRemove} className="min-w-0 max-w-full">
      <button type="button" aria-label={`Remove filter: ${label}`} onClick={onRemove} className={className}>
        {children}
      </button>
    </Root>
  );
}
