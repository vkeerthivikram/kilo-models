"use client";

import Link from "next/link";
import { Model, ViewMode } from "@/lib/types";
import { ModelCard } from "./model-card-v2";
import { ModelActions } from "./model-actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react";
import { formatPrice, formatContext, COMPARE_LIMIT } from "@/lib/format-price";
import { rememberDirectoryPosition } from "@/lib/directory-navigation";
import { RetirementBadge } from "./retirement-badge";
import { ModelCostEstimate } from "./model-cost-estimate";
import { buildWorkloadHref, type CalculatorWorkload } from "@/lib/calculator-workload";

interface ModelGridProps {
  models: Model[];
  viewMode: ViewMode;
  workload?: CalculatorWorkload;
  isComparedModels?: Model[];
  onToggleCompare?: (model: Model) => void;
  isFavoriteModel?: (id: string) => boolean;
  onToggleFavorite?: (id: string) => void;
}

export function ModelGrid({ models, viewMode, workload, isComparedModels, onToggleCompare, isFavoriteModel, onToggleFavorite }: ModelGridProps) {
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
        <table className="w-full table-fixed border-collapse text-sm md:table-auto">
          <caption className="sr-only">Models with input and output pricing per million tokens and context length in tokens</caption>
          <thead>
            <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="w-[56%] px-3 py-3 font-semibold md:w-auto md:px-4">Model</th>
              <th scope="col" className="px-2 py-3 text-right font-semibold md:px-4">Input</th>
              <th scope="col" className="px-2 py-3 text-right font-semibold md:px-4">Output</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-semibold md:table-cell">Context</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">Capabilities</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => {
              const hasReasoning = (model.supported_parameters ?? []).some((p) => p === "reasoning" || p === "include_reasoning");
              const hasTools = (model.supported_parameters ?? []).includes("tools");
              const isCompared = isComparedModels?.some((item) => item.id === model.id);
              return (
                <tr key={model.id} className={cn("border-b last:border-b-0 hover:bg-muted/30", isCompared && "bg-muted/50")}>
                  <td className="px-3 py-3 md:px-4">
                    <Link href={workload ? buildWorkloadHref(`/models/${encodeURIComponent(model.id)}`, workload) : `/models/${encodeURIComponent(model.id)}`} onClick={rememberDirectoryPosition} className="inline-flex min-h-11 items-center break-words rounded-md font-medium hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                      {model.name}
                    </Link>
                    {model.isFree && (
                      <Badge className="ml-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px]">FREE</Badge>
                    )}
                    <p className="mt-1 truncate text-xs text-muted-foreground">{model.id.split("/")[0]}</p>
                    {model.expiration_date && <div className="mt-2"><RetirementBadge expirationDate={model.expiration_date} /></div>}
                    <p className="mt-1 text-xs text-muted-foreground md:hidden">{formatContext(model.context_length)} context tokens</p>
                    {workload && <div className="mt-2"><ModelCostEstimate model={model} workload={workload} /></div>}
                    <div className="mt-1">
                      <ModelActions model={model} isCompared={isCompared}
                        compareDisabled={(isComparedModels?.length ?? 0) >= COMPARE_LIMIT && !isCompared}
                        onToggleCompare={onToggleCompare} isFavorite={isFavoriteModel?.(model.id)}
                        onToggleFavorite={() => onToggleFavorite?.(model.id)} />
                    </div>
                  </td>
                  <td className="break-words px-2 py-3 text-right text-xs tabular-nums md:px-4 md:text-sm">{formatPrice(model.pricing?.prompt)}</td>
                  <td className="break-words px-2 py-3 text-right text-xs tabular-nums md:px-4 md:text-sm">{formatPrice(model.pricing?.completion)}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground md:table-cell">{formatContext(model.context_length)}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="flex flex-wrap items-center gap-1">
                      {(model.architecture?.input_modalities ?? []).filter((modality) => modality !== "text").map((m) => (
                        <Badge key={`in-${m}`} variant="outline" className="text-[10px] capitalize">{m} input</Badge>
                      ))}
                      {(model.architecture?.output_modalities ?? []).filter((modality) => modality !== "text").map((m) => (
                        <Badge key={`out-${m}`} variant="outline" className="text-[10px] capitalize">{m} output</Badge>
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
          workload={workload}
          isCompared={isComparedModels?.some((m) => m.id === model.id)}
          compareDisabled={(isComparedModels?.length ?? 0) >= COMPARE_LIMIT && !isComparedModels?.some((m) => m.id === model.id)}
          onToggleCompare={onToggleCompare}
          isFavorite={isFavoriteModel?.(model.id)}
          onToggleFavorite={() => onToggleFavorite?.(model.id)}
        />
      ))}
    </div>
  );
}
