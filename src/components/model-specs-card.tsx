"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatContext } from "@/lib/format-price";
import { defaultParameterLabels } from "@/lib/default-parameters";
import { InlineHelp } from "./inline-help";

interface Props {
  model: Model;
}

export function ModelSpecsCard({ model }: Props) {
  const defaults = defaultParameterLabels(model.default_parameters);
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-heading text-lg">Key capabilities</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Context · tokens</span>
          <span className="font-medium">{formatContext(model.context_length)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max output · tokens</span>
          <span className="font-medium">
            {model.top_provider?.max_completion_tokens
              ? formatContext(model.top_provider.max_completion_tokens)
              : "—"}
          </span>
        </div>
        <p className="text-muted-foreground">Input: {(model.architecture?.input_modalities ?? []).join(", ") || "Unknown"} · Output: {(model.architecture?.output_modalities ?? []).join(", ") || "Unknown"}</p>
        <p className="text-muted-foreground">Reasoning: {model.supported_parameters ? model.supported_parameters.some((parameter) => ["reasoning", "include_reasoning"].includes(parameter)) ? "Yes" : "No" : "Unknown"} · Tool calling: {model.supported_parameters ? model.supported_parameters.includes("tools") ? "Yes" : "No" : "Unknown"}</p>
        <InlineHelp title="About capabilities"><p>Context holds input and output together in one request. Reasoning indicates reasoning controls; tool calling lets your application execute actions requested by the model. Neither capability is an answer-quality score.</p></InlineHelp>
        <details className="border-t pt-2">
          <summary className="min-h-11 cursor-pointer rounded py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">Full specifications</summary>
          <div className="space-y-3 pt-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tokenizer</span>
          <span className="font-medium font-mono text-xs">
            {model.architecture?.tokenizer ?? "—"}
          </span>
        </div>
        {model.architecture?.modality && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modality Mapping</span>
            <span className="font-medium font-mono text-xs">{model.architecture.modality}</span>
          </div>
        )}
        {model.architecture?.instruct_type && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Instruct Type</span>
            <span className="font-medium font-mono text-xs">{model.architecture.instruct_type}</span>
          </div>
        )}
        {model.expiration_date && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expires</span>
            <span className="font-medium font-mono text-xs">{model.expiration_date}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">May Train on Prompts</span>
          <span className={`font-medium ${model.mayTrainOnYourPrompts === false ? "text-emerald-600" : model.mayTrainOnYourPrompts ? "text-amber-600" : "text-muted-foreground"}`}>
            {model.mayTrainOnYourPrompts == null ? "Unknown" : model.mayTrainOnYourPrompts ? "Yes" : "No"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Input types</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(model.architecture?.input_modalities ?? []).map((m) => (
              <Badge key={m} variant="outline" className="text-xs capitalize">
                {m}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Output types</span>
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
        {defaults.length > 0 && (
          <div>
            <span className="text-muted-foreground text-sm">Default Parameters</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {defaults.map((p) => (
                <Badge key={p} variant="outline" className="text-xs font-mono">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {model.autoRouting?.models && model.autoRouting.models.length > 0 && (
          <div>
            <span className="text-muted-foreground text-sm">Auto-Routed Models</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {model.autoRouting.models.map((m) => (
                <Badge key={m} variant="outline" className="text-xs font-mono">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {model.terminalBench?.overallScore != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Terminal Bench Score</span>
            <span className="font-medium font-mono text-xs text-emerald-600">
              {(model.terminalBench.overallScore * 100).toFixed(1)}%
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Moderated</span>
          <span className="font-medium">
            {model.top_provider?.is_moderated == null ? "Unknown" : model.top_provider.is_moderated ? "Yes" : "No"}
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
        {model.opencode?.variants && Object.keys(model.opencode.variants).length > 0 && (
          <div>
            <span className="text-muted-foreground text-sm">SDK Variants</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {Object.entries(model.opencode.variants).map(([name, cfg]) => (
                <Badge key={name} variant="outline" className="text-xs font-mono">
                  {name}
                  {cfg?.reasoning?.enabled && ` · ${cfg.reasoning.effort ?? "default"}`}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {model.canonical_slug && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Canonical Slug</span>
            <span className="font-medium font-mono text-xs">{model.canonical_slug}</span>
          </div>
        )}
        {model.hugging_face_id && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hugging Face</span>
            <a
              href={`https://huggingface.co/${model.hugging_face_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium font-mono text-xs text-primary hover:underline"
            >
              {model.hugging_face_id}
            </a>
          </div>
        )}
          </div>
        </details>
      </div>
    </Card>
  );
}
