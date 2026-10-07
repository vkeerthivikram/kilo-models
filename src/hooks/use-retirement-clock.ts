"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const notify = () => listeners.forEach((listener) => listener());
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(notify, 60_000);
    document.addEventListener("visibilitychange", notify);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
      document.removeEventListener("visibilitychange", notify);
    }
  };
}
const snapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const serverSnapshot = () => 0;

/** Shared minute clock with a stable server snapshot prevents date-based hydration mismatches. */
export function useRetirementClock() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
