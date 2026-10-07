"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineHelp } from "./inline-help";

interface CatalogStatusProps {
  fetchedAt: string | null;
  loading: boolean;
  revalidating: boolean;
  error: Error | null;
  onRefresh: () => void;
  excludedCount?: number;
}

export function CatalogStatus({ fetchedAt, loading, revalidating, error, onRefresh, excludedCount = 0 }: CatalogStatusProps) {
  const busy = loading || revalidating;
  const updated = fetchedAt ? new Date(fetchedAt) : null;
  const status = revalidating ? "Checking Kilo for updates…" : loading ? "Loading catalog…"
    : error ? fetchedAt ? "Refresh failed. Showing last loaded catalog." : "Catalog could not load. Try again."
      : "";

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2 text-xs text-muted-foreground">
      <div className="min-w-0">
        {updated && (
          <p>Updated <time dateTime={fetchedAt!} title={updated.toUTCString()} className="tabular-nums">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(updated)}</time></p>
        )}
        <p role="status" aria-live="polite" className={status ? "mt-1" : "sr-only"}>{status}</p>
        {excludedCount > 0 && <p role="status" className="mt-1">{excludedCount.toLocaleString()} {excludedCount === 1 ? "model unavailable" : "models unavailable"} because their catalog data could not be verified.</p>}
        <InlineHelp title="About catalog updates"><p>Hourly cache; refresh checks Kilo now. Older data may appear while background updates load. If refresh fails, your last loaded models remain available.</p></InlineHelp>
      </div>
      <Button type="button" variant="outline" className="min-h-11 text-xs" disabled={busy} onClick={onRefresh}>
        <RefreshCw aria-hidden="true" className={busy ? "size-4 animate-spin motion-reduce:animate-none" : "size-4"} />
        {busy ? revalidating ? "Refreshing…" : "Loading…" : error ? "Retry refresh" : "Refresh catalog"}
      </Button>
    </div>
  );
}
