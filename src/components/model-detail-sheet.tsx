"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Zap,
  Shield,
  ShieldAlert,
  Sparkles,
  Wrench,
  Copy,
  Check,
  Clock,
  Cpu,
  DollarSign,
  Layers,
  Maximize2,
  Settings2,
  Heart,
  Route,
  Gauge,
  GraduationCap,
  Link2,
} from "lucide-react";

interface ModelDetailSheetProps {
  model: Model | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
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
  if (!ts) return "Unknown";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const PriceRow = ({ label, value, icon: Icon }: { label: string; value: string | undefined; icon: React.ElementType }) => {
  if (!value || value === "0") return null;
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <span className="font-mono font-medium">{formatPrice(value)}</span>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2 px-3 gap-3">
    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
    <span className="text-sm font-medium text-right break-all">{value}</span>
  </div>
);

const ScoreBar = ({ label, score }: { label: string; score: number }) => (
  <div className="py-1.5 px-3 space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{score.toFixed(1)}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full",
          score >= 50 ? "bg-red-500/70" : score >= 25 ? "bg-amber-500/70" : "bg-emerald-500/70"
        )}
        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
      />
    </div>
  </div>
);

export function ModelDetailSheet({ model, open, onOpenChange, isFavorite, onToggleFavorite }: ModelDetailSheetProps) {
  const [copied, setCopied] = React.useState(false);

  if (!model) return null;

  const copyId = () => {
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allPricingKeys = Object.keys(model.pricing ?? {}).filter(
    (k) => model.pricing?.[k as keyof typeof model.pricing] &&
           model.pricing?.[k as keyof typeof model.pricing] !== "0"
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <SheetTitle className="text-xl leading-tight">{model.name}</SheetTitle>
              <p className="text-xs text-muted-foreground font-mono">{model.id}</p>
            </div>
            <div className="flex items-center gap-2">
              {model.isFree && (
                <Badge className="bg-emerald-500/10 text-emerald-600 shrink-0">Free</Badge>
              )}
              {onToggleFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite()
                  }}
                  className={cn(
                    "p-2 min-w-[44px] min-h-[44px] rounded-lg transition-all flex items-center justify-center active:scale-90",
                    isFavorite
                      ? "text-red-500 bg-red-500/10"
                      : "bg-muted/50 text-muted-foreground border border-transparent hover:border-red-500/20 hover:text-red-500"
                  )}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={cn("h-4 w-4", isFavorite ? "fill-current" : "")} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyId}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy ID"}
            </Button>
            {model.created > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(model.created)}
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {model.description}
          </p>

          {/* Pricing */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </h3>
            <div className="rounded-xl border bg-card">
              <PriceRow label="Prompt (per 1K tokens)" value={model.pricing?.prompt} icon={ArrowUpRight} />
              <Separator />
              <PriceRow label="Completion (per 1K tokens)" value={model.pricing?.completion} icon={ArrowDownRight} />
              <Separator />
              <PriceRow label="Cache Read (per 1M chars)" value={model.pricing?.input_cache_read} icon={Hash} />
              <Separator />
              <PriceRow label="Cache Write (per 1M chars)" value={model.pricing?.input_cache_write} icon={Hash} />
              <Separator />
              <PriceRow label="Per Request" value={model.pricing?.request} icon={Zap} />
              <Separator />
              <PriceRow label="Image" value={model.pricing?.image} icon={Layers} />
              <Separator />
              <PriceRow label="Web Search" value={model.pricing?.web_search} icon={Zap} />
              <Separator />
              <PriceRow label="Internal Reasoning" value={model.pricing?.internal_reasoning} icon={Sparkles} />
              {model.pricing?.discount != null && model.pricing.discount > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2 px-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Discount
                    </div>
                    <span className="font-mono font-medium text-emerald-600">
                      {model.pricing.discount}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Context & Limits */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Context & Limits
            </h3>
            <div className="rounded-xl border bg-card">
              <div className="flex items-center justify-between py-2 px-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  Context Window
                </div>
                <span className="font-mono font-medium">
                  {model.context_length.toLocaleString()} tokens
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Maximize2 className="h-4 w-4" />
                  Max Completion
                </div>
                <span className="font-mono font-medium">
                  {model.top_provider?.max_completion_tokens?.toLocaleString() ?? "N/A"} tokens
                </span>
              </div>
              {model.top_provider?.context_length !== model.context_length && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2 px-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Layers className="h-4 w-4" />
                      Provider Context
                    </div>
                    <span className="font-mono font-medium">
                      {model.top_provider?.context_length?.toLocaleString() ?? "N/A"} tokens
                    </span>
                  </div>
                </>
              )}
              {model.expiration_date && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2 px-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Expires
                    </div>
                    <span className="font-mono font-medium">{model.expiration_date}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Modalities */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Modalities
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-3 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                  Input
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(model.architecture?.input_modalities ?? []).map((m) => (
                    <Badge key={m} variant="secondary" className="capitalize text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-3 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                  Output
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(model.architecture?.output_modalities ?? []).map((m) => (
                    <Badge key={m} variant="secondary" className="capitalize text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            {model.architecture?.tokenizer && (
              <div className="rounded-xl border bg-card px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Settings2 className="h-4 w-4" />
                  Tokenizer
                </div>
                <span className="font-medium text-sm">{model.architecture.tokenizer}</span>
              </div>
            )}
            {model.architecture?.modality && (
              <div className="rounded-xl border bg-card px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  Modality Mapping
                </div>
                <span className="font-mono font-medium text-sm">{model.architecture.modality}</span>
              </div>
            )}
            {model.architecture?.instruct_type && (
              <div className="rounded-xl border bg-card px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Settings2 className="h-4 w-4" />
                  Instruct Type
                </div>
                <span className="font-mono font-medium text-sm">{model.architecture.instruct_type}</span>
              </div>
            )}
          </div>

          {/* Supported Parameters */}
          {model.supported_parameters && model.supported_parameters.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Supported Parameters
              </h3>
              <div className="rounded-xl border bg-card p-3">
                <div className="flex flex-wrap gap-1.5">
                  {model.supported_parameters.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs font-mono">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Default Parameters */}
          {model.default_parameters && model.default_parameters.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Default Parameters
              </h3>
              <div className="rounded-xl border bg-card p-3">
                <div className="flex flex-wrap gap-1.5">
                  {model.default_parameters.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs font-mono">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auto Routing */}
          {model.autoRouting?.models && model.autoRouting.models.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Route className="h-4 w-4" />
                Auto-Routed Models
              </h3>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Requests to this auto-routing model are distributed across:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {model.autoRouting.models.map((m) => (
                    <Badge key={m} variant="outline" className="text-xs font-mono">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Terminal Bench */}
          {model.terminalBench && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Terminal Bench
              </h3>
              <div className="rounded-xl border bg-card">
                <InfoRow
                  label="Overall Score"
                  value={
                    <span className="font-mono text-emerald-600">
                      {(model.terminalBench.overallScore * 100).toFixed(1)}%
                    </span>
                  }
                />
                <Separator />
                <InfoRow
                  label="Avg Attempt Cost"
                  value={
                    <span className="font-mono">
                      ${model.terminalBench.avgAttemptCostUsd?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {/* Safety Scores (enkrypt) */}
          {model.enkrypt && model.enkrypt.safety_score != null && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Safety Report
                {model.enkrypt.freshness && (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {model.enkrypt.freshness}
                  </Badge>
                )}
              </h3>
              <div className="rounded-xl border bg-card py-1">
                {[
                  ["Overall Safety", model.enkrypt.safety_score],
                  ["Risk", model.enkrypt.risk_score],
                  ["Bias", model.enkrypt.bias_score],
                  ["CBRN", model.enkrypt.cbrn_score],
                  ["Harmful", model.enkrypt.harmful_score],
                  ["Insecure Code", model.enkrypt.insecure_code_score],
                  ["Toxicity", model.enkrypt.toxicity_score],
                  ["Jailbreak", model.enkrypt.jailbreak_score],
                  ["Evasion", model.enkrypt.evasion_score],
                  ["Robustness", model.enkrypt.robustness_score],
                  ["NIST", model.enkrypt.nist_score],
                  ["OWASP", model.enkrypt.owasp_score],
                ]
                  .filter(([, v]) => v != null)
                  .map(([label, score]) => (
                    <ScoreBar key={label as string} label={label as string} score={score as number} />
                  ))}
              </div>
            </div>
          )}
          {model.opencode && Object.keys(model.opencode).length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                SDK Integration
              </h3>
              <div className="rounded-xl border bg-card">
                {model.opencode.family && (
                  <div className="flex items-center justify-between py-2 px-3">
                    <span className="text-sm text-muted-foreground">Family</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {model.opencode.family}
                    </Badge>
                  </div>
                )}
                {model.opencode.prompt && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between py-2 px-3">
                      <span className="text-sm text-muted-foreground">Prompt Format</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {model.opencode.prompt}
                      </Badge>
                    </div>
                  </>
                )}
                {model.opencode.ai_sdk_provider && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between py-2 px-3">
                      <span className="text-sm text-muted-foreground">AI SDK Provider</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {model.opencode.ai_sdk_provider}
                      </Badge>
                    </div>
                  </>
                )}
                {model.opencode.variants && Object.keys(model.opencode.variants).length > 0 && (
                  <>
                    <Separator />
                    <div className="py-2 px-3">
                      <span className="text-sm text-muted-foreground">Variants</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.entries(model.opencode.variants).map(([name, cfg]) => (
                          <Badge key={name} variant="outline" className="text-xs font-mono gap-1">
                            {name}
                            {cfg?.reasoning && (
                              <span className="text-muted-foreground">
                                ({cfg.reasoning.enabled ? `effort: ${cfg.reasoning.effort ?? "default"}` : "no reasoning"})
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Provider Meta */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Provider Info
            </h3>
            <div className="rounded-xl border bg-card">
              <div className="flex items-center justify-between py-2 px-3">
                <span className="text-sm text-muted-foreground">Content Moderated</span>
                <span className={`text-sm font-medium ${model.top_provider?.is_moderated ? "text-amber-600" : "text-emerald-600"}`}>
                  {model.top_provider?.is_moderated ? "Yes" : "No"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  May Train on Prompts
                </div>
                <span className={`text-sm font-medium ${model.mayTrainOnYourPrompts ? "text-amber-600" : "text-emerald-600"}`}>
                  {model.mayTrainOnYourPrompts ? "Yes" : "No"}
                </span>
              </div>
              {model.canonical_slug && (
                <>
                  <Separator />
                  <InfoRow
                    label="Canonical Slug"
                    value={
                      <span className="font-mono text-xs flex items-center gap-1 justify-end">
                        <Link2 className="h-3 w-3 shrink-0" />
                        {model.canonical_slug}
                      </span>
                    }
                  />
                </>
              )}
              {model.hugging_face_id && (
                <>
                  <Separator />
                  <InfoRow
                    label="Hugging Face ID"
                    value={
                      <a
                        href={`https://huggingface.co/${model.hugging_face_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {model.hugging_face_id}
                      </a>
                    }
                  />
                </>
              )}
              {model.per_request_limits != null && (
                  <>
                    <Separator />
                    <div className="py-2 px-3">
                      <span className="text-sm text-muted-foreground">Per-Request Limits</span>
                      <p className="text-xs font-mono mt-1 text-muted-foreground">
                        {JSON.stringify(model.per_request_limits ?? null)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
