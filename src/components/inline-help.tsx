import type { ReactNode } from "react";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";

export function InlineHelp({ title, children }: { title: string; children: ReactNode }) {
  return <details className="text-xs text-muted-foreground">
    <DisclosureSummary className="min-h-11 cursor-pointer rounded py-3 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">{title}</DisclosureSummary>
    <div data-agent-catalog={title} className="max-w-prose space-y-2 pb-3 leading-relaxed">{children}</div>
  </details>;
}
