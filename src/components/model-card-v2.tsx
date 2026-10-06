"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ModelActions, type ModelActionsProps } from "./model-actions";
import { formatPrice, formatContext } from "@/lib/format-price";
import { rememberDirectoryPosition } from "@/lib/directory-navigation";
import {
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react";

type ModelCardProps = ModelActionsProps;

function ModalityIcons({ mods, kind }: { mods: string[]; kind: "in" | "out" }) {
  if (mods.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {kind === "in" ? "In" : "Out"}
      </span>
      {mods.map((m) => (
        <span
          key={m}
          className="rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] capitalize text-foreground"
        >
          {m}
        </span>
      ))}
    </span>
  );
}

export function ModelCard({ model, isCompared, compareDisabled, onToggleCompare, isFavorite, onToggleFavorite }: ModelCardProps) {
  const inputMods = model.architecture?.input_modalities ?? [];
  const outputMods = model.architecture?.output_modalities ?? [];
  const hasReasoning = (model.supported_parameters ?? []).some(
    (p) => p === "reasoning" || p === "include_reasoning"
  );
  const hasTools = (model.supported_parameters ?? []).includes("tools");

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col gap-0 overflow-hidden border border-border bg-card py-0 ring-0 transition-colors hover:border-foreground/30",
        isCompared && "border-foreground/50 bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 p-5 pb-0">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug break-words">
            <Link
              href={`/models/${encodeURIComponent(model.id)}`}
              onClick={rememberDirectoryPosition}
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              <span className="group-hover:underline group-hover:underline-offset-4">
                {model.name}
              </span>
            </Link>
          </h3>
          <p className="mt-1 truncate text-xs font-mono text-muted-foreground">{model.id}</p>
        </div>
        {model.isFree && (
          <Badge className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
            FREE
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{model.description}</p>

        <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border text-center">
          <div className="px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <ArrowUpRight className="size-3" aria-hidden="true" /> Input
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums">{formatPrice(model.pricing?.prompt)}</dd>
          </div>
          <div className="px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <ArrowDownRight className="size-3" aria-hidden="true" /> Output
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums">{formatPrice(model.pricing?.completion)}</dd>
          </div>
          <div className="px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Hash className="size-3" aria-hidden="true" /> Context
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums">{formatContext(model.context_length)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
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
          {model.top_provider?.is_moderated && (
            <span className="inline-flex items-center gap-1 rounded border bg-muted/50 px-1.5 py-0.5 text-[11px]" title="Provider moderates this model">
              <Shield className="size-3" aria-hidden="true" /> Moderated
            </span>
          )}
        </div>

        <div className="relative z-10 mt-auto flex items-center gap-2 border-t pt-3">
          <ModelActions model={model} isCompared={isCompared} compareDisabled={compareDisabled}
            onToggleCompare={onToggleCompare} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
          <Link
            href={`/models/${encodeURIComponent(model.id)}`}
            onClick={rememberDirectoryPosition}
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
