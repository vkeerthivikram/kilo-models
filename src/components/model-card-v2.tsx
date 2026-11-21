"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Model } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ModelActions, type ModelActionsProps } from "./model-actions";
import { formatPrice, formatContext } from "@/lib/format-price";
import { RetirementBadge } from "./retirement-badge";
import { ModelCostEstimate } from "./model-cost-estimate";
import { modelDetailPath } from "@/lib/model-detail-path";
import { getModelProvider } from "@/lib/model-provider";
import { buildWorkloadHref, getUsableContext, type CalculatorWorkload } from "@/lib/calculator-workload";
import {
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Sparkles,
  Wrench,
} from "lucide-react";

type ModelCardProps = ModelActionsProps & { workload?: CalculatorWorkload; showEstimate?: boolean; onModelNavigate?: () => void };

function ModalityIcons({ mods, kind }: { mods: string[]; kind: "in" | "out" }) {
  const capabilities = [...new Set(mods)].filter((modality) => modality !== "text");
  if (capabilities.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {capabilities.map((m) => (
        <span
          key={m}
          className="rounded border bg-muted/50 px-1.5 py-0.5 text-xs capitalize text-foreground"
        >
          {m} {kind === "in" ? "input" : "output"}
        </span>
      ))}
    </span>
  );
}

export function ModelCapabilities({ model, className }: { model: Model; className?: string }) {
  const inputMods = model.architecture?.input_modalities ?? [];
  const outputMods = model.architecture?.output_modalities ?? [];
  const hasReasoning = (model.supported_parameters ?? []).some(
    (p) => p === "reasoning" || p === "include_reasoning"
  );
  const hasTools = (model.supported_parameters ?? []).includes("tools");

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs empty:hidden", className)}>
      <ModalityIcons mods={inputMods} kind="in" />
      <ModalityIcons mods={outputMods} kind="out" />
      {hasReasoning && (
        <span className="inline-flex items-center gap-1 rounded border bg-muted/50 px-1.5 py-0.5 text-[11px]">
          <Sparkles className="size-3" aria-hidden="true" /> Reasoning
        </span>
      )}
      {hasTools && (
        <span className="inline-flex items-center gap-1 rounded border bg-muted/50 px-1.5 py-0.5 text-[11px]">
          <Wrench className="size-3" aria-hidden="true" /> Tools
        </span>
      )}
    </div>
  );
}

export function ModelCard({ model, workload, showEstimate = true, isCompared, compareDisabled, onToggleCompare, isFavorite, onToggleFavorite, onModelNavigate }: ModelCardProps) {
  const detailPath = modelDetailPath(model.id);
  const detailHref = workload ? buildWorkloadHref(detailPath, workload) : detailPath;

  return (
    <Card data-agent-catalog="Model result" data-model-id={model.id}
      className={cn(
        "group relative flex h-full flex-col gap-0 overflow-hidden border border-border bg-card py-0 ring-0 transition-colors hover:border-foreground/30",
        isCompared && "border-foreground/50 bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 p-5 pb-0">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug break-words">
            <Link
              data-model-link=""
              href={detailHref}
              onNavigate={onModelNavigate}
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
            >
              <span className="group-hover:underline group-hover:underline-offset-4">
                {model.name}
              </span>
            </Link>
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{getModelProvider(model.id)}</p>
        </div>
        {model.isFree && (
          <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold">
            FREE
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {model.expiration_date && <div><RetirementBadge expirationDate={model.expiration_date} /></div>}
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{model.description}</p>

        <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border text-center">
          <div className="px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="size-3" aria-hidden="true" /> Input
            </dt>
            <dd data-agent-rate="input" className="mt-1 text-sm font-semibold tabular-nums">{formatPrice(model.pricing?.prompt)}</dd>
          </div>
          <div className="px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <ArrowDownRight className="size-3" aria-hidden="true" /> Output
            </dt>
            <dd data-agent-rate="output" className="mt-1 text-sm font-semibold tabular-nums">{formatPrice(model.pricing?.completion)}</dd>
          </div>
          <div className="px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Hash className="size-3" aria-hidden="true" /> Context
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums">{formatContext(getUsableContext(model))}</dd>
          </div>
        </dl>

        <ModelCapabilities model={model} />

        {showEstimate && workload && <ModelCostEstimate model={model} workload={workload} />}
        <div className="relative z-10 mt-auto flex items-center gap-2 border-t pt-3">
          <ModelActions model={model} isCompared={isCompared} compareDisabled={compareDisabled}
            onToggleCompare={onToggleCompare} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
          <Link
            href={detailHref}
            onNavigate={onModelNavigate}
            title={`View ${model.name} details`}
            className="relative z-10 ml-auto inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Details <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
