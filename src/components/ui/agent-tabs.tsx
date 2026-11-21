"use client";

import { definePrimitive } from "@ui-sdk/core";
import { createParts } from "@ui-sdk/react/primitive";
import { trackAgentAction } from "@/lib/agent-readiness";

type AgentTabOptions = {
  value: string;
  items: { value: string; label: string }[];
  onSetValue: (value: string) => Promise<void>;
};

const agentTabs = definePrimitive({
  name: "tabs",
  options: { value: "string", items: "value", onSetValue: "action" },
  state: ({ value, items }: AgentTabOptions) => ({ value, items, pending: false, error: undefined as Error | undefined }),
  sync: ({ value, items }) => ({ value, items }),
  api: ({ store, options }) => ({
    setValue(value: string) {
      if (!options().items.some((item) => item.value === value)) throw new Error("Choose a comparison tab.");
      trackAgentAction(store, () => options().onSetValue(value));
    },
  }),
  slots: (slot) => ({ root: slot({}) }),
  agent: { actions: ["setValue"], closed: true, reveals: true },
});

export const AgentTabs = createParts(agentTabs, { root: "div" }).Root;
