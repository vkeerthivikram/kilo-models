"use client";

import type { Model } from "@/lib/types";
import { cn } from "@/lib/utils";
import { COMPARE_LIMIT } from "@/lib/format-price";
import { Check, Heart, Scale } from "lucide-react";

export interface ModelActionsProps {
  model: Model;
  isCompared?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: (model: Model) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function ModelActions({ model, isCompared, compareDisabled, onToggleCompare, isFavorite, onToggleFavorite }: ModelActionsProps) {
  const compareLabel = isCompared ? `Remove ${model.name} from comparison` : `Add ${model.name} to comparison`;
  const favoriteLabel = isFavorite ? `Remove ${model.name} from favorites` : `Add ${model.name} to favorites`;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {onToggleCompare && <button type="button" onClick={() => onToggleCompare(model)} disabled={compareDisabled}
        aria-label={compareLabel} aria-pressed={!!isCompared}
        title={compareDisabled ? `Compare up to ${COMPARE_LIMIT} models` : compareLabel}
        className={cn("inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          isCompared ? "border-foreground/30 bg-muted text-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground")}>
        {isCompared ? <Check className="size-4" aria-hidden="true" /> : <Scale className="size-4" aria-hidden="true" />}
        {isCompared ? "Selected" : "Compare"}
      </button>}
      {onToggleFavorite && <button type="button" onClick={onToggleFavorite} aria-label={favoriteLabel} aria-pressed={!!isFavorite} title={favoriteLabel}
        className={cn("inline-flex size-11 items-center justify-center rounded-lg transition-colors",
          isFavorite ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
        <Heart className={cn("size-4", isFavorite && "fill-current")} aria-hidden="true" />
      </button>}
    </div>
  );
}
