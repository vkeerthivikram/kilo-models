import { expect, type Page } from "@playwright/test";
import type { Model } from "../src/lib/types";

type Tool = { name: string; execute(input: unknown): unknown };
type ToolWindow = Window & { repairTools: Map<string, Tool> };
type Step = { ref: string; action: string; args?: unknown[] };

export async function mockWebMCP(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, Tool>();
    Object.defineProperty(window, "repairTools", { value: tools });
    Object.defineProperty(document, "modelContext", { value: {
      registerTool(tool: Tool, { signal }: { signal: AbortSignal }) {
        tools.set(tool.name, tool);
        signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
        return Promise.resolve();
      },
    } });
  });
}

export async function batch(page: Page, ...steps: Step[]) {
  await page.waitForFunction(() => (window as unknown as ToolWindow).repairTools.has("act"));
  return page.evaluate((steps) => (window as unknown as ToolWindow).repairTools.get("act")!.execute({ steps }), steps);
}

export function press(ref: string): Step {
  return { ref, action: "press" };
}

export async function catalogResponse(page: Page, data: Model[]) {
  const snapshot: { data: Model[]; fetchedAt: string; excludedCount?: number } = { data, fetchedAt: "2026-11-20T10:00:00Z" };
  await page.route("**/api/models", (route) => route.fulfill({ json: snapshot }));
  return snapshot;
}

export async function directoryReady(page: Page) {
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
}

export async function openFilters(page: Page) {
  const filters = page.getByRole("button", { name: "Filters", exact: true });
  if (await filters.isVisible()) await filters.click();
}
