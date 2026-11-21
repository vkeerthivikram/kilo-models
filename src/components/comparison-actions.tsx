"use client";

import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import * as React from "react";
import { Download, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Model } from "@/lib/types";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import { ClipboardTimeoutError, writeClipboardText } from "@/lib/clipboard";
import { buildComparisonUrl, comparisonCsv } from "@/lib/comparison-share";

export function ComparisonActions({ models, selectedIds = models.map((model) => model.id), workload }: { models: Model[]; selectedIds?: string[]; workload: CalculatorWorkload }) {
  const [message, setMessage] = React.useState("");
  const [manualUrl, setManualUrl] = React.useState("");
  const [copying, setCopying] = React.useState(false);

  const copyLink = async () => {
    const url = buildComparisonUrl(window.location.href, selectedIds, workload);
    setCopying(true);
    setManualUrl("");
    try {
      await writeClipboardText(url);
      setMessage("Comparison link copied with current workload.");
    } catch (error) {
      setManualUrl(url);
      const fallback = "Clipboard unavailable. Select the link below and copy it manually.";
      setMessage(fallback);
      if (error instanceof ClipboardTimeoutError) throw new Error(fallback);
    } finally {
      setCopying(false);
    }
  };

  const exportCsv = () => {
    let downloadUrl: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      downloadUrl = URL.createObjectURL(new Blob(["\uFEFF", comparisonCsv(models, workload)], { type: "text/csv;charset=utf-8" }));
      link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "kilo-model-comparison.csv";
      document.body.appendChild(link);
      link.click();
      setMessage("CSV download started with specifications and workload costs in USD.");
      setManualUrl("");
    } catch {
      const error = "CSV download could not start. Try exporting again.";
      setMessage(error);
      throw new Error(error);
    } finally {
      link?.remove();
      if (downloadUrl) {
        const resolvedUrl = downloadUrl;
        window.setTimeout(() => URL.revokeObjectURL(resolvedUrl), 1000);
      }
    }
  };

  return (
    <div className="shrink-0 border-b px-4 py-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="min-h-11 gap-2" disabled={copying} onClick={copyLink}>
          <Link className="size-4" />{copying ? "Copying…" : "Copy link"}
        </Button>
        <details>
          <DisclosureSummary className="min-h-11 cursor-pointer rounded px-2 py-3 text-xs underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">More actions</DisclosureSummary>
          <Button variant="outline" className="mb-2 min-h-11 gap-2" onClick={exportCsv}>
            <Download className="size-4" />Export CSV
          </Button>
        </details>
        <p className="text-xs text-muted-foreground">Models + current workload</p>
      </div>
      <p role="status" data-agent-catalog={message ? "Comparison action status" : undefined} className={message ? "mt-2 text-xs leading-relaxed" : "sr-only"}>{message}</p>
      {manualUrl && <label className="mt-2 block text-xs">Comparison link
        <input data-agent-catalog="Comparison link" readOnly value={buildComparisonUrl(manualUrl, selectedIds, workload)} onFocus={(event) => event.currentTarget.select()}
          className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
      </label>}
    </div>
  );
}
