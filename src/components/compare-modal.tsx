"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Calendar,
  Building2,
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

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getProvider(model: Model): string {
  return model.id.split("/")[0];
}

function allSame(values: string[]): boolean {
  return values.every((v) => v === values[0]);
}

interface CompareRowProps {
  label: string;
  values: string[];
  icon?: React.ReactNode;
  highlight?: boolean;
}

function CompareRow({ label, values, icon, highlight }: CompareRowProps) {
  const same = allSame(values);
  return (
    <div
      className={cn(
        "flex items-center gap-4 py-2.5 px-4 transition-colors",
        same && "opacity-50",
        highlight && !same && "bg-amber-500/5 border-l-2 border-amber-500"
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground w-44 shrink-0">
        {icon}
        {label}
      </div>
      {values.map((v, i) => (
        <div key={i} className="text-sm font-medium font-mono flex-1">
          {v}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b">
      {icon}
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function CapabilityBadge({ type, enabled }: { type: "reasoning" | "tools" | "moderated"; enabled: boolean }) {
  if (!enabled) return null;

  const configs = {
    reasoning: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Reasoning" },
    tools: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Tools" },
    moderated: { bg: "bg-orange-500/10", text: "text-orange-600", label: "Moderated" },
  };

  const config = configs[type];

  return (
    <Badge className={cn("text-[10px]", config.bg, config.text)}>
      {config.label}
    </Badge>
  );
}

function ModelColumnHeader({ model, onRemove }: { model: Model; onRemove: () => void }) {
  const provider = getProvider(model);

  return (
    <div className="p-4 bg-card/50 border-b flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-semibold truncate">{model.name}</h3>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{model.id}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
          title="Remove from comparison"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[10px] capitalize">
          <Building2 className="h-3 w-3 mr-1" />
          {provider}
        </Badge>
        {model.isFree && (
          <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold">
            Free
          </Badge>
        )}
      </div>
    </div>
  );
}

export function CompareModal({ models, open, onOpenChange, onRemove }: CompareModalProps) {
  if (models.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-7xl mx-auto p-0 flex flex-col" side="top" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
              <GitCompare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl">Compare Models</h2>
              <p className="text-xs text-muted-foreground">
                Comparing {models.length} model{models.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Models
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Sticky Column Headers */}
            <div className="sticky top-0 z-20 flex bg-background border-b shadow-sm">
              <div className="w-48 shrink-0 p-4 flex items-center">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Attribute
                </span>
              </div>
              {models.map((model) => (
                <ModelColumnHeader
                  key={model.id}
                  model={model}
                  onRemove={() => onRemove(model)}
                />
              ))}
            </div>

            {/* Pricing Section */}
            <SectionHeader
              icon={<DollarSign className="h-4 w-4" />}
              label="Pricing"
            />
            <CompareRow
              label="Input (per 1K)"
              values={models.map((m) => formatPrice(m.pricing?.prompt))}
              icon={<ArrowUpRight className="h-4 w-4" />}
              highlight
            />
            <CompareRow
              label="Output (per 1K)"
              values={models.map((m) => formatPrice(m.pricing?.completion))}
              icon={<ArrowDownRight className="h-4 w-4" />}
              highlight
            />

            {/* Context & Limits Section */}
            <SectionHeader
              icon={<Layers className="h-4 w-4" />}
              label="Context & Limits"
            />
            <CompareRow
              label="Context Window"
              values={models.map((m) => formatContext(m.context_length))}
              icon={<Hash className="h-4 w-4" />}
              highlight
            />
            <CompareRow
              label="Max Completion"
              values={models.map((m) =>
                m.top_provider?.max_completion_tokens
                  ? `${m.top_provider.max_completion_tokens.toLocaleString()} tokens`
                  : "—"
              )}
              icon={<Maximize2Icon className="h-4 w-4" />}
            />

            {/* Modalities Section */}
            <SectionHeader
              icon={<Cpu className="h-4 w-4" />}
              label="Modalities"
            />
            <CompareRow
              label="Input"
              values={models.map((m) => (m.architecture?.input_modalities ?? []).join(", ") || "—")}
            />
            <CompareRow
              label="Output"
              values={models.map((m) => (m.architecture?.output_modalities ?? []).join(", ") || "—")}
            />

            {/* Capabilities Section */}
            <SectionHeader
              icon={<Sparkles className="h-4 w-4" />}
              label="Capabilities"
            />
            <div className="flex items-center gap-4 py-2.5 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground w-44 shrink-0">
                <Sparkles className="h-4 w-4" />
                Features
              </div>
              {models.map((m) => {
                const hasReasoning = (m.supported_parameters ?? []).some(
                  (p) => p === "reasoning" || p === "include_reasoning"
                );
                const hasTools = (m.supported_parameters ?? []).includes("tools");
                const isModerated = m.top_provider?.is_moderated;

                return (
                  <div key={m.id} className="flex-1 flex flex-wrap gap-1.5">
                    <CapabilityBadge type="reasoning" enabled={hasReasoning} />
                    <CapabilityBadge type="tools" enabled={hasTools} />
                    <CapabilityBadge type="moderated" enabled={isModerated} />
                    {!hasReasoning && !hasTools && !isModerated && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Additional Info Section */}
            <SectionHeader
              icon={<Settings2 className="h-4 w-4" />}
              label="Additional Info"
            />
            <CompareRow
              label="Tokenizer"
              values={models.map((m) => m.architecture?.tokenizer ?? "—")}
              icon={<Settings2 className="h-4 w-4" />}
            />
            <CompareRow
              label="Released"
              values={models.map((m) => formatDate(m.created))}
              icon={<Calendar className="h-4 w-4" />}
            />

            {/* Description Section */}
            <SectionHeader
              icon={<Cpu className="h-4 w-4" />}
              label="Description"
            />
            <div className="flex items-start gap-4 py-3 px-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground w-44 shrink-0 pt-1">
                <Cpu className="h-4 w-4 mt-0.5" />
                About
              </div>
              {models.map((m) => (
                <div key={m.id} className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {m.description}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Maximize2Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  );
}