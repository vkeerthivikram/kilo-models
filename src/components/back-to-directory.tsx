"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDirectoryReturnHref, prepareDirectoryReturn } from "@/lib/directory-navigation";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";
import { buildWorkloadHref } from "@/lib/calculator-workload";

const subscribe = () => () => {};
const serverHref = () => "/";

export function BackToDirectory() {
  const directoryHref = React.useSyncExternalStore(subscribe, getDirectoryReturnHref, serverHref);
  const { workload } = useCalculatorWorkload();
  const href = buildWorkloadHref(directoryHref, workload);
  return (
    <Link href={href} scroll={false} onNavigate={prepareDirectoryReturn}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to Directory
    </Link>
  );
}
