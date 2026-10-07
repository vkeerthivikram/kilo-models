"use client";

import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { formatDiscount, formatPrice } from "@/lib/format-price";
import { formatCost } from "@/lib/cost-calculator";
import { parsePrice } from "@/lib/format-price";

interface Props {
  model: Model;
}

export function ModelPricingCard({ model }: Props) {
  const p = model.pricing;
  const hasOtherRates = [p?.input_cache_read, p?.input_cache_write, p?.image, p?.web_search, p?.internal_reasoning].some((rate) => rate !== undefined && rate !== null) || (p?.discount ?? 0) > 0;
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-heading text-lg">Published prices</h2>
      <p className="text-xs text-muted-foreground">Token prices in USD per million tokens.</p>
      {(p?.discount ?? 0) > 0 && <p className="text-xs text-muted-foreground">Estimates are pre-discount; the listed discount is not applied.</p>}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Input</span>
          <span className="font-medium tabular-nums">{formatPrice(p?.prompt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Output</span>
          <span className="font-medium tabular-nums">{formatPrice(p?.completion)}</span>
        </div>
        {p?.request != null && <p className="text-xs text-muted-foreground">Request fee: {formatCost(parsePrice(p.request))}/request, {parsePrice(p.request) === null ? "total estimate unavailable" : "included in estimates"}.</p>}
        <details hidden={!hasOtherRates} className="border-t pt-2">
          <summary className="min-h-11 cursor-pointer rounded py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">Other published rates</summary>
          <div className="space-y-3 pt-2">
        {p?.input_cache_read != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cache Read</span>
            <span className="font-medium">{formatPrice(p.input_cache_read)}</span>
          </div>
        )}
        {p?.input_cache_write != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cache Write</span>
            <span className="font-medium">{formatPrice(p.input_cache_write)}</span>
          </div>
        )}
        {p?.image != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Image</span>
            <span className="font-medium">{formatCost(parsePrice(p.image))}/image</span>
          </div>
        )}
        {p?.web_search != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Web Search</span>
            <span className="font-medium">{formatCost(parsePrice(p.web_search))}/search</span>
          </div>
        )}
        {p?.internal_reasoning != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Internal Reasoning</span>
            <span className="font-medium">{formatPrice(p.internal_reasoning)}</span>
          </div>
        )}
        {p?.discount != null && p.discount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium text-emerald-600">{formatDiscount(p.discount)}</span>
          </div>
        )}
          </div>
        </details>
      </div>
    </Card>
  );
}
