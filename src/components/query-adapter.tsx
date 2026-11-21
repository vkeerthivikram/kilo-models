"use client";

import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { preserveLocalComparisonEntry } from "@/lib/comparison-history";

export function QueryAdapter({ children }: { children: ReactNode }) {
  return <NuqsAdapter processUrlSearchParams={preserveLocalComparisonEntry}>{children}</NuqsAdapter>;
}
