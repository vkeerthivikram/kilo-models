"use client";

import { Button as ActionButton } from "@ui-sdk/react/button";
import * as React from "react";
import { Model } from "@/lib/types";
import { DialogTrigger, type DialogController } from "@ui-sdk/react/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPARE_LIMIT } from "@/lib/format-price";

interface CompareTrayProps {
  models: Model[];
  selectedCount?: number;
  onRemove: (model: Model) => void;
  onClear: () => void;
  controller: DialogController;
}

export function CompareTray({ models, selectedCount = models.length, onRemove, onClear, controller }: CompareTrayProps) {
  if (selectedCount === 0) return null;
  const unavailable = selectedCount - models.length;

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
              <span className="tabular-nums">{selectedCount} / {COMPARE_LIMIT}</span>
              <span className="text-muted-foreground"> selected</span>
              {unavailable > 0 && <span className="block text-xs text-muted-foreground">{unavailable} unavailable</span>}
            </span>
          </div>
        </div>
        <div aria-label="Selected models" className="col-span-2 row-start-2 flex min-w-0 items-center gap-2 overflow-x-auto lg:col-span-1 lg:col-start-2 lg:row-start-1">
          {models.map((model, index) => {
            const duplicate = models.some((other) => other.id !== model.id && other.name === model.name);
            const label = duplicate ? `${model.name} (${model.id})` : model.name;
            return (
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
                <span className="max-w-[min(65vw,16rem)]">
                  <span className="block truncate" title={model.name}>{model.name}</span>
                  {duplicate && <span className="block whitespace-normal text-xs text-muted-foreground [overflow-wrap:anywhere]">{model.id}</span>}
                </span>
                <ActionButton
                  type="button"
                  aria-label={`Remove ${label} from comparison`}
                  onClick={() => onRemove(model)}
                  className="flex size-11 items-center justify-center rounded-sm p-1 transition-colors hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </ActionButton>
              </Badge>
            );
          })}
        </div>

        {/* Right section: actions */}
        <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 lg:col-start-3">
          {selectedCount === COMPARE_LIMIT && models.length > 0 && (
            <div className="hidden text-xs text-muted-foreground lg:block">
              Remove a model to add another
            </div>
          )}
          <Button variant="ghost" onClick={onClear} className="h-11 px-2 text-xs">Clear</Button>
          {models.length > 0 && <DialogTrigger controller={controller} className={cn(buttonVariants({ size: "sm" }), "h-11 gap-2")}>
            <GitCompare className="h-4 w-4" />
            Compare
          </DialogTrigger>}
        </div>
      </div>
    </section>
  );
}
