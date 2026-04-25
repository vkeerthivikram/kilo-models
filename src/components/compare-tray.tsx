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
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GitCompare className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium shrink-0">
            {models.length} model{models.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {models.map((model) => (
              <Badge
                key={model.id}
                variant="secondary"
                className="flex items-center gap-1.5 pr-1.5 shrink-0"
              >
                <span className="max-w-[120px] truncate">{model.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${model.name} from comparison`}
                  onClick={() => onRemove(model)}
                  className="hover:bg-muted rounded-sm p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <Button onClick={onOpen} size="sm" className="shrink-0">
          Open Compare
        </Button>
      </div>
    </div>
  );
}
