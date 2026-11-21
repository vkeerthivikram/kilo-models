import type { Store } from "@ui-sdk/core";

type AgentActionState = { pending: boolean; error: Error | undefined };

/** The SDK reads pending and error from the primitive's state after calling its action. */
export function trackAgentAction<State extends AgentActionState>(
  store: Store<State>,
  action: () => void | Promise<void>,
) {
  if (store.get().pending) throw new Error("An action is already running.");
  store.set({ error: undefined } as Partial<State>);
  const result = action();
  if (!result) return;
  store.set({ pending: true } as Partial<State>);
  void result.then(
    () => store.set({ pending: false } as Partial<State>),
    (failure: unknown) => store.set({
      pending: false, error: failure instanceof Error ? failure : new Error(String(failure)),
    } as Partial<State>),
  );
}

/** Settle before the installed SDK's 15-second pending-action deadline. */
export function waitForAgentContent(check: () => boolean, timeoutMessage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(inspect);
    const deadline = window.setTimeout(() => fail(new Error(timeoutMessage)), 13_000);
    function cleanup() {
      observer.disconnect();
      window.clearTimeout(deadline);
    }
    function fail(error: unknown) {
      cleanup();
      reject(error);
    }
    function inspect() {
      try {
        if (!check()) return;
        cleanup();
        resolve();
      } catch (error) {
        fail(error);
      }
    }
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["data-directory-state", "data-model-detail-ready", "data-selected", "hidden", "inert", "aria-hidden", "aria-modal"],
    });
    inspect();
  });
}

export type AgentDestination = "directory" | "comparison" | { modelId: string };

export function waitForAgentDestination(destination: AgentDestination, href: string): Promise<void> {
  const expectedPath = new URL(href, window.location.href).pathname;
  const modelId = typeof destination === "object" ? destination.modelId : undefined;
  const description = modelId === undefined ? destination : "model detail";
  return waitForAgentContent(() => {
    if (window.location.pathname !== expectedPath) return false;
    if (modelId !== undefined) {
      if (document.querySelector("[data-model-detail-error]")) throw new Error("The requested model detail is unavailable.");
      return Array.from(document.querySelectorAll<HTMLElement>("[data-model-detail-ready]"))
        .some((element) => element.dataset.modelDetailReady === modelId);
    }
    if (document.querySelector('[data-directory-state="error"]')) throw new Error("The model directory could not load.");
    const ready = !!document.querySelector('[data-directory-state="ready"]');
    return ready && (destination !== "comparison" || !!document.querySelector('[role="dialog"][aria-modal="true"]'));
  }, `The requested ${description} did not finish loading.`);
}
