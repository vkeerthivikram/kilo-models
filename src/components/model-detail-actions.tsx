"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Heart, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { useComparison } from "@/hooks/use-comparison";
import { COMPARE_LIMIT } from "@/lib/format-price";
import { getDirectoryReturnHref, prepareDirectoryReturn } from "@/lib/directory-navigation";
import type { ModelDetailActionProps } from "@/lib/model-detail-summary";
import { cn } from "@/lib/utils";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { buildComparisonUrl } from "@/lib/comparison-share";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const serverHref = () => "/";

export function ModelDetailActions({ model, catalog }: ModelDetailActionProps) {
  const ready = React.useSyncExternalStore(subscribe, clientReady, serverReady);
  const directoryHref = React.useSyncExternalStore(subscribe, getDirectoryReturnHref, serverHref);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { comparedModels, toggleCompare } = useComparison(catalog);
  const { workload } = useCalculatorWorkload();
  const favorite = ready && isFavorite(model.id);
  const compared = ready && comparedModels.some((item) => item.id === model.id);
  const limitReached = !compared && comparedModels.length >= COMPARE_LIMIT;
  const [copying, setCopying] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const comparisonUrl = new URL(buildComparisonUrl(new URL(directoryHref, "https://directory.local").href, comparedModels.map((item) => item.id), workload));
  const comparisonHref = `${comparisonUrl.pathname}${comparisonUrl.search}${comparisonUrl.hash}`;

  async function copyId() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(model.id);
      setMessage("Model ID copied.");
    } catch {
      setMessage("Could not copy. Select and copy the model ID shown above.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="mt-5 space-y-2">
      <code className="block break-all text-xs text-muted-foreground select-all">{model.id}</code>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="h-11 px-3" disabled={!ready}
          aria-label={`${favorite ? "Remove" : "Add"} ${model.name} ${favorite ? "from" : "to"} favorites`}
          aria-pressed={favorite} onClick={() => toggleFavorite(model.id)}>
          <Heart className={cn("size-4", favorite && "fill-current")} aria-hidden="true" />
          {favorite ? "Favorited" : "Favorite"}
        </Button>
        <Button variant="outline" className="h-11 px-3" disabled={!ready || limitReached}
          aria-label={`${compared ? "Remove" : "Add"} ${model.name} ${compared ? "from" : "to"} comparison`}
          aria-pressed={compared} aria-describedby={limitReached ? "detail-compare-limit" : undefined}
          onClick={() => toggleCompare(model)}>
          {compared ? <Check className="size-4" aria-hidden="true" /> : <Scale className="size-4" aria-hidden="true" />}
          {compared ? "Selected for comparison" : "Compare"}
        </Button>
        <Button variant="outline" className="h-11 px-3" disabled={!ready || copying} onClick={copyId}>
          <Copy className="size-4" aria-hidden="true" />
          {copying ? "Copying..." : "Copy model ID"}
        </Button>
        {ready && comparedModels.length > 0 && (
          <Link href={comparisonHref} scroll={false} onNavigate={prepareDirectoryReturn}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            View comparison ({comparedModels.length})
          </Link>
        )}
      </div>
      {limitReached && <p id="detail-compare-limit" className="text-xs text-muted-foreground">Comparison holds up to {COMPARE_LIMIT} models. Remove one to add this model.</p>}
      <p role="status" aria-live="polite" className={message ? "text-xs text-muted-foreground" : "sr-only"}>{message}</p>
    </div>
  );
}
