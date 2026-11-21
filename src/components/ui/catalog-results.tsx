"use client";

import { definePrimitive } from "@ui-sdk/core";
import { createParts } from "@ui-sdk/react/primitive";
import { trackAgentAction, waitForAgentDestination } from "@/lib/agent-readiness";

type ModelOption = { value: string; label: string };
type CatalogOptions = {
  items: ModelOption[];
  onSetFavorite?: (id: string, selected: boolean) => Promise<void>;
};

function defineCatalogResults(actions: string[]) {
  return definePrimitive({
    name: "catalog-results",
    options: { items: "value", onSetFavorite: "action" },
    state: ({ items }: CatalogOptions) => ({ items, pending: false, error: undefined as Error | undefined }),
    sync: ({ items }) => ({ items }),
    api: (context) => {
      function findControl(id: string, selector: string) {
        const row = Array.from(context.element("root")?.querySelectorAll<HTMLElement>("[data-model-id]") ?? [])
          .find((element) => element.dataset.modelId === id);
        const control = row?.querySelector<HTMLElement>(selector);
        if (!control || !control.checkVisibility() || control.closest("[inert], [aria-hidden='true']")) {
          throw new Error("That model action is currently unavailable. Read the visible catalog before trying again.");
        }
        return control;
      }

      function assertEnabled(control: HTMLElement) {
        if (control.matches(":disabled")) throw new Error("That model control is disabled.");
      }

      function assertSelection(selected: boolean) {
        if (typeof selected !== "boolean") throw new Error("Select a model by passing true or false.");
      }

      return {
        items: () => context.options().items,
        openModel: (id: string) => trackAgentAction(context.store, () => {
          const link = findControl(id, "[data-model-link]");
          const href = link.getAttribute("href");
          if (!href) throw new Error("The model link has no destination.");
          link.click();
          return waitForAgentDestination({ modelId: id }, href);
        }),
        setModelCompared: (id: string, selected: boolean) => trackAgentAction(context.store, () => {
          assertSelection(selected);
          const control = findControl(id, "[data-model-compare]");
          if ((control.getAttribute("aria-pressed") === "true") === selected) return;
          assertEnabled(control);
          control.click();
        }),
        setModelFavorite: (id: string, selected: boolean) => trackAgentAction(context.store, () => {
          assertSelection(selected);
          const control = findControl(id, "[data-model-favorite]");
          assertEnabled(control);
          const setFavorite = context.options().onSetFavorite;
          if (!setFavorite) throw new Error("Favorites are unavailable for these results.");
          return setFavorite(id, selected);
        }),
      };
    },
    slots: (slot) => ({ root: slot({}) }),
    agent: { actions, closed: true, items: (api) => api.items() },
  });
}

export const CatalogResults = createParts(
  defineCatalogResults(["openModel", "setModelCompared", "setModelFavorite"]), { root: "div" },
).Root;
export const RelatedModelResults = createParts(defineCatalogResults(["openModel"]), { root: "div" }).Root;
