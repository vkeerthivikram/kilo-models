"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginatorProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const around = new Set<number>([1, total]);
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    around.add(i);
  }

  const sorted = [...around].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

export function Paginator({ page, totalPages, totalCount, pageSize, onPageChange }: PaginatorProps) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  if (totalPages <= 1) return null;

  const navButton = "size-9 rounded-lg";

  return (
    <nav aria-label="Model pages" className="flex flex-col items-center justify-between gap-4 pb-2 pt-6 sm:flex-row">
      <p className="order-2 text-xs text-muted-foreground sm:order-1">
        Showing <span className="font-medium tabular-nums text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium tabular-nums text-foreground">{totalCount}</span> models
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button variant="outline" size="icon" className={`${navButton} hidden sm:inline-flex`} onClick={() => onPageChange(1)} disabled={page === 1} aria-label="First page">
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button variant="outline" size="icon" className={navButton} onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page">
          <ChevronLeft className="size-3.5" />
        </Button>

        <span className="mx-2 text-xs tabular-nums text-muted-foreground sm:hidden">
          Page {page} of {totalPages}
        </span>

        <div className="hidden items-center gap-1 sm:flex">
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="w-8 text-center text-xs select-none text-muted-foreground" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "secondary" : "ghost"}
                size="icon"
                className={`${navButton} text-xs ${p === page ? "font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Button>
            )
          )}
        </div>

        <Button variant="outline" size="icon" className={navButton} onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Next page">
          <ChevronRight className="size-3.5" />
        </Button>
        <Button variant="outline" size="icon" className={`${navButton} hidden sm:inline-flex`} onClick={() => onPageChange(totalPages)} disabled={page === totalPages} aria-label="Last page">
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </nav>
  );
}
