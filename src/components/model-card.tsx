"use client";

import { Model } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  MessagesSquare,
  Zap,
  Shield,
  Hash,
  Star,
} from "lucide-react";

interface ModelCardProps {
  model: Model;
  onSelect: (model: Model) => void;
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
  return ctx.toString();
}

function InputModalityIcon({ modality }: { modality: string }) {
  switch (modality) {
    case "text":
      return <MessagesSquare className="h-3 w-3" />;
    case "image":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    case "video":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    case "audio":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      );
    case "file":
      return <ArrowUpRight className="h-3 w-3" />;
    default:
      return <Cpu className="h-3 w-3" />;
  }
}

export function ModelCard({ model, onSelect }: ModelCardProps) {
  const inputModalities = model.architecture?.input_modalities ?? [];
  const outputModalities = model.architecture?.output_modalities ?? [];

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/50"
      onClick={() => onSelect(model)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
              {model.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {model.id}
            </p>
          </div>
          {model.isFree && (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shrink-0">
              Free
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {model.description}
        </p>

        <Separator />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1.5 text-left">
              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Input</span>
              <span className="font-medium ml-auto">{formatPrice(model.pricing?.prompt)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Prompt price per 1K tokens
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1.5 text-left">
              <ArrowDownRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Output</span>
              <span className="font-medium ml-auto">{formatPrice(model.pricing?.completion)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Completion price per 1K tokens
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1.5 text-left">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Context</span>
              <span className="font-medium ml-auto">{formatContext(model.context_length)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Maximum context window
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1.5 text-left">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Max Out</span>
              <span className="font-medium ml-auto">{formatContext(model.top_provider?.max_completion_tokens ?? 0)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Max completion tokens
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">In</span>
            <div className="flex items-center gap-1">
              {inputModalities.map((m) => (
                <Tooltip key={m}>
                  <TooltipTrigger>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                      <InputModalityIcon modality={m} />
                      <span className="ml-1">{m}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs capitalize">
                    {m} input
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Out</span>
            <div className="flex items-center gap-1">
              {outputModalities.map((m) => (
                <Badge key={m} variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {model.supported_parameters && model.supported_parameters.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {model.supported_parameters.slice(0, 5).map((param) => (
              <Badge key={param} variant="secondary" className="h-5 text-[10px] px-1.5">
                {param}
              </Badge>
            ))}
            {model.supported_parameters.length > 5 && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                +{model.supported_parameters.length - 5}
              </Badge>
            )}
          </div>
        )}

        {model.top_provider?.is_moderated && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600">
            <Shield className="h-3 w-3" />
            Moderated
          </div>
        )}
      </CardContent>
    </Card>
  );
}
