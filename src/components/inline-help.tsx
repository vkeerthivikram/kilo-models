import type { ReactNode } from "react";

export function InlineHelp({ title, children }: { title: string; children: ReactNode }) {
  return <details className="text-xs text-muted-foreground">
    <summary className="min-h-11 cursor-pointer rounded py-3 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">{title}</summary>
    <div className="max-w-prose space-y-2 pb-3 leading-relaxed">{children}</div>
  </details>;
}
