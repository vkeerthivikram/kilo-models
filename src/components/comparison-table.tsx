"use client";

import Link from "next/link";
import type { Model } from "@/lib/types";
import { getVisibleComparisonRows, type ComparisonRow } from "@/lib/comparison";
import { buildWorkloadHref, type CalculatorWorkload } from "@/lib/calculator-workload";
import { cn } from "@/lib/utils";
import { ArrowUpRight, X } from "lucide-react";

interface ComparisonTableProps {
  models: Model[];
  differencesOnly: boolean;
  onRemove: (model: Model) => void;
  workload?: CalculatorWorkload;
  fullSpecifications?: boolean;
  rows?: ComparisonRow[];
}

export function ComparisonTable({ models, differencesOnly, onRemove, workload, fullSpecifications = true, rows: suppliedRows }: ComparisonTableProps) {
  const allRows = suppliedRows ?? getVisibleComparisonRows(models, workload, fullSpecifications);
  const rows = differencesOnly && models.length > 1 ? allRows.filter((row) => row.different) : allRows;

  return (
    <div role="region" aria-label="Comparison specifications" tabIndex={0}
      className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border focus-visible:outline-2 focus-visible:outline-ring [--comparison-label-width:7rem] [--comparison-model-width:12rem] sm:[--comparison-label-width:11rem] sm:[--comparison-model-width:15rem]">
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm"
        style={{ minWidth: `calc(var(--comparison-label-width) + ${models.length} * var(--comparison-model-width))` }}>
        <caption className="sr-only">Side-by-side model specifications. Prices are USD per million tokens.</caption>
        <colgroup>
          <col style={{ width: "var(--comparison-label-width)" }} />
          {models.map((model) => <col key={model.id} />)}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 top-0 z-30 border-b border-r bg-muted px-3 py-4 text-left align-bottom font-medium sm:px-4">Specification</th>
            {models.map((model) => (
              <th key={model.id} scope="col" className="sticky top-0 z-20 border-b border-r bg-card px-4 py-4 text-left align-top last:border-r-0">
                <div className="flex items-start gap-2">
                  <Link href={workload ? buildWorkloadHref(`/models/${encodeURIComponent(model.id)}`, workload) : `/models/${encodeURIComponent(model.id)}`} className="min-h-11 min-w-0 flex-1 break-words rounded font-semibold leading-snug hover:underline hover:underline-offset-4">
                    {model.name}<ArrowUpRight className="ml-1 inline size-3.5" aria-hidden="true" />
                  </Link>
                  <button type="button" onClick={() => onRemove(model)} aria-label={`Remove ${model.name} from comparison`}
                    className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 break-words text-xs font-normal text-muted-foreground">{fullSpecifications ? model.id : model.id.split("/")[0]}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className={cn("sticky left-0 z-10 border-b border-r px-3 py-4 text-left align-top text-xs font-medium leading-relaxed sm:px-4",
                row.different ? "bg-muted text-foreground" : "bg-card text-muted-foreground")}>
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td key={models[index].id} className={cn("border-b border-r px-4 py-4 align-top tabular-nums last:border-r-0",
                  row.different ? "bg-muted/40 font-medium" : "bg-card text-muted-foreground")}>
                  <span className="break-words">{value}</span>
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={models.length + 1} className="bg-card px-4 py-12 text-center text-muted-foreground">
              No differences in these specifications. Turn off “Show differences only” to see all rows.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
