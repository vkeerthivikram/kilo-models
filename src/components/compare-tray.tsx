"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GitCompare } from "lucide-react";
import { COMPARE_LIMIT } from "@/lib/format-price";

interface CompareTrayProps {
  models: Model[];
  onRemove: (model: Model) => void;
  onClear: () => void;
  onOpen: () => void;
}

export function CompareTray({ models, onRemove, onClear, onOpen }: CompareTrayProps) {
  if (models.length === 0) return null;

  return (
    <section aria-label="Model comparison" className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-2 sm:px-8 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        {/* Selection count */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex">
            <GitCompare className="h-4 w-4 text-primary" />
          </div>

          <div className="flex items-center gap-2">
            <span role="status" className="whitespace-nowrap text-sm font-medium">
              <span className="tabular-nums">{models.length} / {COMPARE_LIMIT}</span>
              <span className="text-muted-foreground"> selected</span>
            </span>
          </div>
        </div>
        <div aria-label="Selected models" className="col-span-2 row-start-2 flex min-w-0 items-center gap-2 overflow-x-auto lg:col-span-1 lg:col-start-2 lg:row-start-1">
          {models.map((model, index) => (
            <Badge
              key={model.id}
              variant={model.isFree ? "secondary" : "outline"}
              className="flex h-auto min-h-11 shrink-0 cursor-default items-center gap-1.5 overflow-visible rounded-lg pr-1.5"
            >
              <span
                className="flex size-5 items-center justify-center text-xs tabular-nums text-muted-foreground"
              >
                {index + 1}
              </span>
              <span className="max-w-[160px] truncate" title={model.name}>{model.name}</span>
              <button
                type="button"
                aria-label={`Remove ${model.name} from comparison`}
                onClick={() => onRemove(model)}
                className="flex size-11 items-center justify-center rounded-sm p-1 transition-colors hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Right section: actions */}
        <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 lg:col-start-3">
          {models.length === COMPARE_LIMIT && (
            <div className="hidden text-xs text-muted-foreground lg:block">
              Remove a model to add another
            </div>
          )}
          <Button variant="ghost" onClick={onClear} className="h-11 px-2 text-xs">Clear</Button>
          <Button onClick={onOpen} size="sm" className="h-11 gap-2">
            <GitCompare className="h-4 w-4" />
            Compare
          </Button>
        </div>
      </div>
    </section>
  );
}
