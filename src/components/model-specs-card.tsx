"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { getUsableContext } from "@/lib/calculator-workload";
import { defaultParameterLabels } from "@/lib/default-parameters";
import { InlineHelp } from "./inline-help";

interface Props {
  model: Model;
}

function listSummary(values: string[] | undefined) {
  const unique = values ? [...new Set(values)] : undefined;
  return unique?.length ? unique.join(", ") : unique ? "None" : "Unknown";
}

function SpecificationList({ label, values, parameters = false }: { label: string; values?: string[]; parameters?: boolean }) {
  const unique = values ? [...new Set(values)] : undefined;
  return <div>
    <span className="text-muted-foreground text-sm">{label}</span>
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {unique?.length ? unique.map((value) => (
        <Badge key={value} variant={parameters ? "secondary" : "outline"} className={parameters ? "text-xs font-mono" : "text-xs capitalize"}>
          {value}
        </Badge>
      )) : <span>{listSummary(unique)}</span>}
    </div>
  </div>;
}

export function ModelSpecsCard({ model }: Props) {
  const defaults = [...new Set(defaultParameterLabels(model.default_parameters))];
  const autoRoutedModels = model.autoRouting?.models ? [...new Set(model.autoRouting.models)] : [];
  const huggingFaceId = model.hugging_face_id?.trim();
  const context = getUsableContext(model);
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-heading text-lg">Key capabilities</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Usable context · tokens</span>
          <span className="font-medium">{context?.toLocaleString("en-US") ?? "—"}</span>
        </div>
        {model.context_length > 0 && context !== model.context_length && <div className="flex justify-between">
          <span className="text-muted-foreground">Advertised model context · tokens</span>
          <span className="font-medium">{model.context_length.toLocaleString("en-US")}</span>
        </div>}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max output · tokens</span>
          <span className="font-medium">
            {model.top_provider?.max_completion_tokens
              ? model.top_provider.max_completion_tokens.toLocaleString("en-US")
              : "—"}
          </span>
        </div>
        <p className="text-muted-foreground">Input: {listSummary(model.architecture?.input_modalities)} · Output: {listSummary(model.architecture?.output_modalities)}</p>
        <p className="text-muted-foreground">Reasoning: {model.supported_parameters ? model.supported_parameters.some((parameter) => ["reasoning", "include_reasoning"].includes(parameter)) ? "Yes" : "No" : "Unknown"} · Tool calling: {model.supported_parameters ? model.supported_parameters.includes("tools") ? "Yes" : "No" : "Unknown"}</p>
        <InlineHelp title="About capabilities"><p>Context holds input and output together in one request. Reasoning indicates reasoning controls; tool calling lets your application execute actions requested by the model. Neither capability is an answer-quality score.</p></InlineHelp>
        <details className="border-t pt-2">
          <DisclosureSummary className="min-h-11 cursor-pointer rounded py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">Full specifications</DisclosureSummary>
          <div data-agent-catalog="Full specifications" data-model-id={model.id} className="space-y-3 pt-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tokenizer</span>
          <span className="font-medium font-mono text-xs">
            {model.architecture?.tokenizer?.trim() || "—"}
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
          <span className={model.mayTrainOnYourPrompts == null ? "font-medium text-muted-foreground" : "font-medium text-foreground"}>
            {model.mayTrainOnYourPrompts == null ? "Unknown" : model.mayTrainOnYourPrompts ? "Yes" : "No"}
          </span>
        </div>
        <SpecificationList label="Input types" values={model.architecture?.input_modalities} />
        <SpecificationList label="Output types" values={model.architecture?.output_modalities} />
        <SpecificationList label="Supported Parameters" values={model.supported_parameters} parameters />
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
        {autoRoutedModels.length > 0 && (
          <div>
            <span className="text-muted-foreground text-sm">Auto-Routed Models</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {autoRoutedModels.map((m) => (
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
            <span className="font-medium font-mono text-xs">
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
        {huggingFaceId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hugging Face</span>
            <a
              href={`https://huggingface.co/${huggingFaceId.split("/").map(encodeURIComponent).join("/")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium font-mono text-xs text-primary hover:underline"
            >
              {huggingFaceId}
            </a>
          </div>
        )}
          </div>
        </details>
      </div>
    </Card>
  );
}
