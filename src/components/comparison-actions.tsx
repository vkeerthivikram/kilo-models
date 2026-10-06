"use client";

import * as React from "react";
import { Download, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Model } from "@/lib/types";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import { buildComparisonUrl, comparisonCsv } from "@/lib/comparison-share";

export function ComparisonActions({ models, workload }: { models: Model[]; workload: CalculatorWorkload }) {
  const [message, setMessage] = React.useState("");
  const [manualUrl, setManualUrl] = React.useState("");
  const [copying, setCopying] = React.useState(false);

  const copyLink = async () => {
    const url = buildComparisonUrl(window.location.href, models.map((model) => model.id), workload);
    setCopying(true);
    setManualUrl("");
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Comparison link copied with current workload.");
    } catch {
      setManualUrl(url);
      setMessage("Clipboard unavailable. Select the link below and copy it manually.");
    } finally {
      setCopying(false);
    }
  };

  const exportCsv = () => {
    let downloadUrl: string | undefined;
    try {
      downloadUrl = URL.createObjectURL(new Blob([comparisonCsv(models, workload)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "kilo-model-comparison.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage("CSV download started with specifications and workload costs in USD.");
      setManualUrl("");
    } catch {
      setMessage("CSV download could not start. Try exporting again.");
    } finally {
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
        <Button variant="outline" className="min-h-11 gap-2" onClick={exportCsv}>
          <Download className="size-4" />Export CSV
        </Button>
        <p className="text-xs text-muted-foreground">Includes selected models and current workload.</p>
      </div>
      <p role="status" className={message ? "mt-2 text-xs leading-relaxed" : "sr-only"}>{message}</p>
      {manualUrl && <label className="mt-2 block text-xs">Comparison link
        <input readOnly value={manualUrl} onFocus={(event) => event.currentTarget.select()}
          className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
      </label>}
    </div>
  );
}
