"use client";

import * as React from "react";
import { Check, Copy, Heart, Scale } from "lucide-react";
import { AgentLink } from "@/components/ui/agent-link";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { useComparison } from "@/hooks/use-comparison";
import { COMPARE_LIMIT } from "@/lib/format-price";
import { getDirectoryReturnHref, prepareDirectoryReturn } from "@/lib/directory-navigation";
import type { ModelDetailActionProps } from "@/lib/model-detail-summary";
import { cn } from "@/lib/utils";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { writeClipboardText } from "@/lib/clipboard";
import { buildComparisonUrl } from "@/lib/comparison-share";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const serverHref = () => "/";

export function ModelDetailActions({ model, catalog, catalogComplete = true }: ModelDetailActionProps & { catalogComplete?: boolean }) {
  const ready = React.useSyncExternalStore(subscribe, clientReady, serverReady);
  const directoryHref = React.useSyncExternalStore(subscribe, getDirectoryReturnHref, serverHref);
  const { isFavorite, toggleFavorite, storageWarning } = useFavorites();
  const { comparedModels, selectedIds, toggleCompare } = useComparison(catalog, catalogComplete ? "complete" : "partial");
  const { workload } = useCalculatorWorkload();
  const favorite = ready && isFavorite(model.id);
  const compared = ready && comparedModels.some((item) => item.id === model.id);
  const limitReached = ready && !compared && selectedIds.length >= COMPARE_LIMIT;
  const [copying, setCopying] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const comparisonUrl = new URL(buildComparisonUrl(new URL(directoryHref, "https://directory.local").href, selectedIds, workload));
  const comparisonHref = `${comparisonUrl.pathname}${comparisonUrl.search}${comparisonUrl.hash}`;

  async function copyId() {
    setCopying(true);
    try {
      await writeClipboardText(model.id);
      setMessage("Model ID copied.");
    } catch {
      const error = "Could not copy. Select and copy the model ID shown above.";
      setMessage(error);
      throw new Error(error);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="mt-5 space-y-2" data-model-detail-ready={ready ? model.id : undefined}>
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
          <AgentLink destination="comparison" href={comparisonHref} scroll={false} onNavigate={prepareDirectoryReturn}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            View comparison ({comparedModels.length})
          </AgentLink>
        )}
      </div>
      {limitReached && <p id="detail-compare-limit" className="text-xs text-muted-foreground">Comparison holds up to {COMPARE_LIMIT} models. Remove one to add this model.</p>}
      {storageWarning && <p role="status" data-agent-catalog="Favorites status" className="text-xs text-muted-foreground">{storageWarning}</p>}
      <p role="status" aria-live="polite" data-agent-catalog={message ? "Model action status" : undefined} className={message ? "text-xs text-muted-foreground" : "sr-only"}>{message}</p>
    </div>
  );
}
