"use client";

import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortOption } from "@/hooks/use-model-filters";

const SORT_LABELS: Record<SortOption, string> = {
  "name-asc": "Name (A→Z)",
  "name-desc": "Name (Z→A)",
  "price-asc": "Input price (low → high)",
  "price-desc": "Input price (high → low)",
  "context-desc": "Context length",
  "created-desc": "Newest",
  "created-asc": "Oldest",
};

interface SortDropdownProps {
  value: SortOption;
  onChange: (v: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-9 justify-between gap-2 text-xs font-medium" />
        }
      >
        <span className="flex items-center gap-1.5">
          <ArrowUpDown className="size-3.5" aria-hidden="true" />
          {SORT_LABELS[value]}
        </span>
        <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuRadioGroup value={value} onValueChange={(nextValue) => onChange(nextValue as SortOption)}>
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              className="min-h-9 pr-8 text-xs capitalize"
            >
              {SORT_LABELS[option]}
              {option === value && <Check className="ml-auto size-3.5" aria-hidden="true" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
