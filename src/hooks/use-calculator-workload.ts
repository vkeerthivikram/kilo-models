"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { parseCalculatorWorkload, type CalculatorWorkload } from "@/lib/calculator-workload";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}
const getSearch = () => window.location.search;
const getServerSearch = () => "";

export function useCalculatorWorkload() {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  const initial = useMemo(() => parseCalculatorWorkload(search), [search]);
  const [edited, setWorkload] = useState<CalculatorWorkload | null>(null);
  return { workload: edited ?? initial, setWorkload };
}
