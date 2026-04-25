"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Zap,
  Shield,
  Sparkles,
  Wrench,
  ChevronRight,
} from "lucide-react";

interface ModelCardProps {
  model: Model;
  onSelect: (model: Model) => void;
}

function formatPrice(price: string | undefined): string {
  if (!price || price === "0") return "Free";
  const num = parseFloat(price);
  if (num < 0.00001) return `$${(num * 1000000).toFixed(2)}/M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/K`;
  return `$${num.toFixed(4)}/K`;
}

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K`;
  return ctx.toString();
}

const MODALITY_ICONS: Record<string, React.ReactNode> = {
  text: <span className="text-[10px] font-bold">T</span>,
  image: (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  video: (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polygon points="23 7 16 12 23 17 23 7" fill="currentColor" stroke="none" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  audio: (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor" stroke="none" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    </svg>
  ),
  file: (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

export function ModelCard({ model, onSelect }: ModelCardProps) {
  const inputMods = model.architecture?.input_modalities ?? [];
  const outputMods = model.architecture?.output_modalities ?? [];
  const hasReasoning = (model.supported_parameters ?? []).some(
    (p) => p === "reasoning" || p === "include_reasoning"
  );
  const hasTools = (model.supported_parameters ?? []).includes("tools");

  return (
    <Card
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 border-primary/5 hover:border-primary/20 bg-card/80 backdrop-blur-sm"
      onClick={() => onSelect(model)}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg leading-tight truncate group-hover:text-primary transition-colors">
              {model.name}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
              {model.id}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {model.isFree && (
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[10px] font-semibold px-2">
                FREE
              </Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {model.description}
        </p>

        {/* Price & Context */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <ArrowUpRight className="h-3 w-3" />
              Input
            </div>
            <span className="text-sm font-semibold font-heading">
              {formatPrice(model.pricing?.prompt)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <ArrowDownRight className="h-3 w-3" />
              Output
            </div>
            <span className="text-sm font-semibold font-heading">
              {formatPrice(model.pricing?.completion)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Hash className="h-3 w-3" />
              Context
            </div>
            <span className="text-sm font-semibold font-heading">
              {formatContext(model.context_length)}
            </span>
          </div>
        </div>

        {/* Modalities */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase">
              In
            </span>
            <div className="flex items-center gap-1">
              {inputMods.map((m) => (
                <div
                  key={m}
                  className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center"
                  title={`Input: ${m}`}
                >
                  {MODALITY_ICONS[m] ?? m[0].toUpperCase()}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase">
              Out
            </span>
            <div className="flex items-center gap-1">
              {outputMods.map((m) => (
                <div
                  key={m}
                  className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center"
                  title={`Output: ${m}`}
                >
                  {MODALITY_ICONS[m] ?? m[0].toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="flex items-center gap-2">
          {hasReasoning && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-medium">
              <Sparkles className="h-3 w-3" />
              Reasoning
            </div>
          )}
          {hasTools && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-medium">
              <Wrench className="h-3 w-3" />
              Tools
            </div>
          )}
          {model.top_provider?.is_moderated && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 text-orange-600 text-[10px] font-medium">
              <Shield className="h-3 w-3" />
              Moderated
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
