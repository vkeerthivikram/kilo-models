"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GitCompare, Plus, Check } from "lucide-react";

interface CompareTrayProps {
  models: Model[];
  onRemove: (model: Model) => void;
  onOpen: () => void;
}

export function CompareTray({ models, onRemove, onOpen }: CompareTrayProps) {
  if (models.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        {/* Left section: count and pills */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
            <GitCompare className="h-4 w-4 text-primary" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              <span className="font-heading text-primary">{models.length}</span>
              <span className="text-muted-foreground"> selected</span>
            </span>
          </div>

          <div className="h-5 w-px bg-border mx-1" />

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {models.map((model, index) => (
              <Badge
                key={model.id}
                variant={model.isFree ? "secondary" : "outline"}
                className="flex items-center gap-1.5 pr-1.5 shrink-0 cursor-default"
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    model.isFree ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                  )}
                >
                  {index + 1}
                </span>
                <span className="max-w-[100px] truncate">{model.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${model.name} from comparison`}
                  onClick={() => onRemove(model)}
                  className="hover:bg-muted rounded-sm p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Right section: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {models.length >= 2 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Ready to compare
            </div>
          )}
          <Button onClick={onOpen} size="sm" className="gap-2">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Open Compare</span>
            <span className="sm:hidden">Compare</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}