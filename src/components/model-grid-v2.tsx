"use client";

import Link from "next/link";
import { Model, ViewMode } from "@/lib/types";
import { ModelCard } from "./model-card-v2";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react";
import { formatPrice } from "@/lib/format-price";

interface ModelGridProps {
  models: Model[];
  viewMode: ViewMode;
  isComparedModels?: Model[];
  onToggleCompare?: (model: Model) => void;
  isFavoriteModel?: (id: string) => boolean;
  onToggleFavorite?: (id: string) => void;
}

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K`;
  return ctx.toString();
}

export function ModelGrid({ models, viewMode, isComparedModels, onToggleCompare, isFavoriteModel, onToggleFavorite }: ModelGridProps) {
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Cpu className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-heading text-lg mb-1">No models found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-semibold">Model</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Input</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Output</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-semibold md:table-cell">Context</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">Capabilities</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => {
              const hasReasoning = (model.supported_parameters ?? []).some((p) => p === "reasoning" || p === "include_reasoning");
              const hasTools = (model.supported_parameters ?? []).includes("tools");
              return (
                <tr key={model.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/models/${encodeURIComponent(model.id)}`} className="font-medium hover:underline hover:underline-offset-4">
                      {model.name}
                    </Link>
                    {model.isFree && (
                      <Badge className="ml-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px]">FREE</Badge>
                    )}
                    <p className="truncate text-[11px] font-mono text-muted-foreground">{model.id}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatPrice(model.pricing?.prompt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatPrice(model.pricing?.completion)}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground md:table-cell">{formatContext(model.context_length)}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="flex flex-wrap items-center gap-1">
                      {(model.architecture?.input_modalities ?? []).slice(0, 2).map((m) => (
                        <Badge key={m} variant="outline" className="text-[10px] capitalize">{m}</Badge>
                      ))}
                      {hasReasoning && <Badge variant="secondary" className="text-[10px]">Reasoning</Badge>}
                      {hasTools && <Badge variant="secondary" className="text-[10px]">Tools</Badge>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {models.map((model) => (
        <ModelCard
          key={model.id}
          model={model}
          isCompared={isComparedModels?.some((m) => m.id === model.id)}
          compareDisabled={(isComparedModels?.length ?? 0) >= 10 && !isComparedModels?.some((m) => m.id === model.id)}
          onToggleCompare={onToggleCompare}
          isFavorite={isFavoriteModel?.(model.id)}
          onToggleFavorite={() => onToggleFavorite?.(model.id)}
        />
      ))}
    </div>
  );
}
