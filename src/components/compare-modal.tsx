"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  X,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Sparkles,
  Cpu,
  DollarSign,
  Layers,
  Settings2,
} from "lucide-react";

interface CompareModalProps {
  models: Model[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (model: Model) => void;
}

function formatPrice(price: string | undefined): string {
  if (!price || price === "0") return "Free";
  const num = parseFloat(price);
  if (num < 0.00001) return `$${(num * 1000000).toFixed(2)}/1M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/1K`;
  return `$${num.toFixed(6)}/1K`;
}

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K`;
  return ctx.toLocaleString();
}

function allSame(values: string[]): boolean {
  return values.every((v) => v === values[0]);
}

interface CompareRowProps {
  label: string;
  values: string[];
  icon?: React.ReactNode;
}

function CompareRow({ label, values, icon }: CompareRowProps) {
  const same = allSame(values);
  return (
    <div className={cn("grid gap-4 py-3 px-4", same && "opacity-50")}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      {values.map((v, i) => (
        <div key={i} className="text-sm font-medium font-mono">
          {v}
        </div>
      ))}
    </div>
  );
}

export function CompareModal({ models, open, onOpenChange, onRemove }: CompareModalProps) {
  if (models.length === 0) return null;

  const gridCols = `grid-cols-[200px_repeat(${models.length},1fr)]`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-6xl mx-auto p-0 flex flex-col" side="top">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <GitCompare className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-xl">Compare Models</h2>
            <Badge variant="secondary">{models.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto">
          <div className={cn("grid min-w-max", gridCols)}>
            {/* Sticky Header */}
            <div className="sticky left-0 z-10 bg-background border-b py-3 px-4 font-semibold text-sm">
              Model
            </div>
            {models.map((model) => (
              <div
                key={model.id}
                className="sticky top-0 z-10 bg-background border-b py-3 px-4 flex flex-col gap-2"
              >
                <div className="font-heading text-sm font-semibold truncate">{model.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">{model.id}</div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemove(model)}
                  className="self-start"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Description */}
            <CompareRow
              label="Description"
              values={models.map((m) => m.description)}
            />
            <Separator className="col-span-full" />

            {/* Input Price */}
            <CompareRow
              label="Input Price"
              values={models.map((m) => formatPrice(m.pricing?.prompt))}
              icon={<ArrowUpRight className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Output Price */}
            <CompareRow
              label="Output Price"
              values={models.map((m) => formatPrice(m.pricing?.completion))}
              icon={<ArrowDownRight className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Context */}
            <CompareRow
              label="Context Window"
              values={models.map((m) => formatContext(m.context_length))}
              icon={<Hash className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Input Modalities */}
            <CompareRow
              label="Input Modalities"
              values={models.map((m) => (m.architecture?.input_modalities ?? []).join(", ") || "—")}
              icon={<Cpu className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Output Modalities */}
            <CompareRow
              label="Output Modalities"
              values={models.map((m) => (m.architecture?.output_modalities ?? []).join(", ") || "—")}
              icon={<Cpu className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Capabilities */}
            <div className="grid gap-4 py-3 px-4 col-span-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Capabilities
              </div>
              <div className={cn("grid gap-4", gridCols)}>
                <div />
                {models.map((m) => {
                  const hasReasoning = (m.supported_parameters ?? []).some(
                    (p) => p === "reasoning" || p === "include_reasoning"
                  );
                  const hasTools = (m.supported_parameters ?? []).includes("tools");
                  return (
                    <div key={m.id} className="flex flex-wrap gap-1.5">
                      {hasReasoning && (
                        <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">
                          Reasoning
                        </Badge>
                      )}
                      {hasTools && (
                        <Badge className="bg-blue-500/10 text-blue-600 text-[10px]">
                          Tools
                        </Badge>
                      )}
                      {m.top_provider?.is_moderated && (
                        <Badge className="bg-orange-500/10 text-orange-600 text-[10px]">
                          Moderated
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator className="col-span-full" />

            {/* Max Completion */}
            <CompareRow
              label="Max Completion"
              values={models.map((m) =>
                m.top_provider?.max_completion_tokens
                  ? `${m.top_provider.max_completion_tokens.toLocaleString()} tokens`
                  : "—"
              )}
              icon={<Layers className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Tokenizer */}
            <CompareRow
              label="Tokenizer"
              values={models.map((m) => m.architecture?.tokenizer ?? "—")}
              icon={<Settings2 className="h-4 w-4" />}
            />
            <Separator className="col-span-full" />

            {/* Free */}
            <CompareRow
              label="Free"
              values={models.map((m) => (m.isFree ? "Yes" : "No"))}
              icon={<DollarSign className="h-4 w-4" />}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
