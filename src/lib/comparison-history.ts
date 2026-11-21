const LOCAL_COMPARISON_ENTRY = "kilo-local-comparison";

const currentSelection = () => new URLSearchParams(window.location.search).get("compare");

export function isLocalComparisonEntry(): boolean {
  if (typeof window === "undefined") return false;
  const selection = currentSelection();
  return selection !== null && window.history.state?.[LOCAL_COMPARISON_ENTRY] === selection;
}

export function markLocalComparisonEntry() {
  const selection = currentSelection();
  if (selection === null || isLocalComparisonEntry()) return;
  // This changes history metadata, not the URL. Next and nuqs wrap the
  // instance method as a navigation and would otherwise reset pending edits.
  History.prototype.replaceState.call(window.history, { ...window.history.state, [LOCAL_COMPARISON_ENTRY]: selection }, "");
}

export function preserveLocalComparisonEntry(next: URLSearchParams): URLSearchParams {
  const selection = next.get("compare");
  if (selection && isLocalComparisonEntry()) {
    const path = window.location.pathname;
    // Nuqs replaces history state, even when the final URL is unchanged (for
    // example, applying a saved view). Reattach our marker after that write.
    queueMicrotask(() => {
      if (window.location.pathname === path && currentSelection() === selection) markLocalComparisonEntry();
    });
  }
  return next;
}
