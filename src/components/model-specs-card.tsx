"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K`;
  return ctx.toString();
}

interface Props {
  model: Model;
}

export function ModelSpecsCard({ model }: Props) {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-heading text-lg">Specifications</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Context Length</span>
          <span className="font-medium">{formatContext(model.context_length)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Completion</span>
          <span className="font-medium">
            {model.top_provider?.max_completion_tokens
              ? formatContext(model.top_provider.max_completion_tokens)
              : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tokenizer</span>
          <span className="font-medium font-mono text-xs">
            {model.architecture?.tokenizer ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Input Modalities</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(model.architecture?.input_modalities ?? []).map((m) => (
              <Badge key={m} variant="outline" className="text-xs capitalize">
                {m}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Output Modalities</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(model.architecture?.output_modalities ?? []).map((m) => (
              <Badge key={m} variant="outline" className="text-xs capitalize">
                {m}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Supported Parameters</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(model.supported_parameters ?? []).map((p) => (
              <Badge key={p} variant="secondary" className="text-xs font-mono">
                {p}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Moderated</span>
          <span className="font-medium">
            {model.top_provider?.is_moderated ? "Yes" : "No"}
          </span>
        </div>
        {model.opencode?.family && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model Family</span>
            <span className="font-medium font-mono text-xs">{model.opencode.family}</span>
          </div>
        )}
        {model.opencode?.ai_sdk_provider && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">AI SDK Provider</span>
            <span className="font-medium font-mono text-xs">{model.opencode.ai_sdk_provider}</span>
          </div>
        )}
        {model.opencode?.prompt && (
          <div>
            <span className="text-muted-foreground text-sm">System Prompt</span>
            <p className="mt-1.5 text-xs font-mono bg-muted rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
              {model.opencode.prompt}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}