"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";

function formatPrice(price: string | undefined): string {
  if (!price || price === "0") return "Free";
  const num = parseFloat(price);
  if (num < 0.00001) return `$${(num * 1000000).toFixed(2)}/M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/K`;
  return `$${num.toFixed(4)}/K`;
}

interface Props {
  model: Model;
}

export function ModelPricingCard({ model }: Props) {
  const p = model.pricing;
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-heading text-lg">Pricing</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Prompt (input)</span>
          <span className="font-medium">{formatPrice(p?.prompt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Completion (output)</span>
          <span className="font-medium">{formatPrice(p?.completion)}</span>
        </div>
        {p?.input_cache_read && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cache Read</span>
            <span className="font-medium">{formatPrice(p.input_cache_read)}</span>
          </div>
        )}
        {p?.input_cache_write && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cache Write</span>
            <span className="font-medium">{formatPrice(p.input_cache_write)}</span>
          </div>
        )}
        {p?.image && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Image</span>
            <span className="font-medium">{formatPrice(p.image)}</span>
          </div>
        )}
        {p?.web_search && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Web Search</span>
            <span className="font-medium">{formatPrice(p.web_search)}</span>
          </div>
        )}
        {p?.internal_reasoning && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Internal Reasoning</span>
            <span className="font-medium">{formatPrice(p.internal_reasoning)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}