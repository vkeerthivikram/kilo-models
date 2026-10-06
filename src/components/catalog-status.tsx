"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CatalogStatusProps {
  fetchedAt: string | null;
  loading: boolean;
  revalidating: boolean;
  error: Error | null;
  onRefresh: () => void;
}

export function CatalogStatus({ fetchedAt, loading, revalidating, error, onRefresh }: CatalogStatusProps) {
  const busy = loading || revalidating;
  const updated = fetchedAt ? new Date(fetchedAt) : null;
  const status = revalidating ? "Checking Kilo for updates…" : loading ? "Loading catalog…"
    : error ? fetchedAt ? "Refresh failed. Showing last loaded catalog." : "Catalog could not load. Try again."
      : "Hourly cache; refresh checks Kilo now.";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 text-sm text-muted-foreground">
      <div className="min-w-0 space-y-1">
        {updated && (
          <p>Catalog fetched <time dateTime={fetchedAt!} title={updated.toUTCString()} className="tabular-nums">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(updated)}</time></p>
        )}
        <p role="status" aria-live="polite">{status}</p>
        {error && <p className="text-xs">Hourly cache; refresh checks Kilo now.</p>}
        {!busy && !error && <p className="text-xs">Older data may appear while background updates load.</p>}
      </div>
      <Button type="button" variant="outline" className="min-h-10" disabled={busy} onClick={onRefresh}>
        <RefreshCw aria-hidden="true" className={busy ? "size-4 animate-spin motion-reduce:animate-none" : "size-4"} />
        {busy ? revalidating ? "Refreshing…" : "Loading…" : error ? "Retry refresh" : "Refresh catalog"}
      </Button>
    </div>
  );
}
