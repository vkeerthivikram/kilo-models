"use client";

import * as React from "react";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/hooks/use-model-filters";

const SORT_LABELS: Record<SortOption, string> = {
  "name-asc": "Name (A→Z)",
  "name-desc": "Name (Z→A)",
  "price-asc": "Price (Low→High)",
  "price-desc": "Price (High→Low)",
  "context-desc": "Context Length",
  "created-desc": "Newest",
  "created-asc": "Oldest",
};

interface SortDropdownProps {
  value: SortOption;
  onChange: (v: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="h-9 rounded-xl text-xs font-medium"
      >
        <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
        {SORT_LABELS[value]}
        <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border bg-popover p-1 shadow-xl z-50">
          <div className="space-y-0.5">
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors",
                  option === value
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                {SORT_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
