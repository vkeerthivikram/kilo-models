"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Model, ViewMode } from "@/lib/types";
import { ModelCard } from "./model-card-v2";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react";

interface ModelGridProps {
  models: Model[];
  viewMode: ViewMode;
  onSelectModel: (model: Model) => void;
  isComparedModels?: Model[];
  onToggleCompare?: (model: Model) => void;
  isFavoriteModel?: (id: string) => boolean;
  onToggleFavorite?: (id: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
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

export function ModelGrid({ models, viewMode, onSelectModel, isComparedModels, onToggleCompare, isFavoriteModel, onToggleFavorite, hasMore, onLoadMore }: ModelGridProps) {
  const router = useRouter();
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasMore || !onLoadMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

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
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
          <div>Model</div>
          <div className="text-right">Input</div>
          <div className="text-right">Output</div>
          <div className="text-right hidden sm:block">Context</div>
          <div className="text-right hidden md:block">Capabilities</div>
        </div>
        {models.map((model, i) => (
          <div
            key={model.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors items-center"
            onClick={() => router.push(`/models/${encodeURIComponent(model.id)}`)}
            style={{ animationDelay: `${i * 15}ms` }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm truncate">{model.name}</span>
                {model.isFree && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] shrink-0">
                    FREE
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                {model.id}
              </p>
            </div>
            <div className="font-mono text-xs text-right">
              {formatPrice(model.pricing?.prompt)}
            </div>
            <div className="font-mono text-xs text-right">
              {formatPrice(model.pricing?.completion)}
            </div>
            <div className="font-mono text-xs text-right hidden sm:block">
              {formatContext(model.context_length)}
            </div>
            <div className="hidden md:flex items-center gap-1 justify-end">
              {(model.architecture?.input_modalities ?? []).slice(0, 2).map((m) => (
                <Badge key={m} variant="outline" className="text-[9px] h-5 px-1 capitalize">
                  {m}
                </Badge>
              ))}
              {model.supported_parameters?.includes("tools") && (
                <Badge variant="secondary" className="text-[9px] h-5 px-1">Tools</Badge>
              )}
              {model.supported_parameters?.some((p) => p === "reasoning" || p === "include_reasoning") && (
                <Badge variant="secondary" className="text-[9px] h-5 px-1">Reasoning</Badge>
              )}
            </div>
          </div>
        ))}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {models.map((model, i) => (
          <div
            key={model.id}
            style={{ animationDelay: `${i * 20}ms` }}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <ModelCard model={model} isCompared={isComparedModels?.some((m) => m.id === model.id)} onToggleCompare={onToggleCompare} isFavorite={isFavoriteModel?.(model.id)} onToggleFavorite={() => onToggleFavorite?.(model.id)} />
          </div>
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      )}
    </div>
  );
}
