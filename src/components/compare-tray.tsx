"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GitCompare } from "lucide-react";

interface CompareTrayProps {
  models: Model[];
  onRemove: (model: Model) => void;
  onOpen: () => void;
}

export function CompareTray({ models, onRemove, onOpen }: CompareTrayProps) {
  if (models.length === 0) return null;

  return (
    <div aria-label="Model comparison" className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap sm:px-8">
        {/* Left section: count and pills */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex">
            <GitCompare className="h-4 w-4 text-primary" />
          </div>

          <div className="flex items-center gap-2">
            <span role="status" className="whitespace-nowrap text-sm font-medium">
              <span className="tabular-nums">{models.length} / 10</span>
              <span className="text-muted-foreground"> selected</span>
            </span>
          </div>

          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

          <div className="hidden items-center gap-2 overflow-x-auto sm:flex">
            {models.map((model, index) => (
              <Badge
                key={model.id}
                variant={model.isFree ? "secondary" : "outline"}
                className="flex items-center gap-1.5 pr-1.5 shrink-0 cursor-default"
              >
                <span
                  className="flex size-5 items-center justify-center text-xs tabular-nums text-muted-foreground"
                >
                  {index + 1}
                </span>
                <span className="max-w-[100px] truncate">{model.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${model.name} from comparison`}
                  onClick={() => onRemove(model)}
                  className="flex size-9 items-center justify-center rounded-sm p-1 transition-colors hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Right section: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {models.length === 10 && (
            <div className="hidden text-xs text-muted-foreground lg:block">
              Remove a model to add another
            </div>
          )}
          <Button onClick={onOpen} size="sm" className="h-11 gap-2">
            <GitCompare className="h-4 w-4" />
            Compare models
          </Button>
        </div>
      </div>
    </div>
  );
}
