import { expect, test } from "@playwright/test";

test("an SDK import that needs a person stops before deleting persistent data", async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map<string, { execute(input: unknown): unknown }>();
    Object.assign(window, { repairTools: tools });
    Object.defineProperty(document, "modelContext", { value: {
      registerTool(tool: { name: string; execute(input: unknown): unknown }) { tools.set(tool.name, tool); return Promise.resolve(); },
    } });
  });
  await page.goto("/");
  await page.locator("summary").filter({ hasText: "Estimate workload" }).click();
  await page.getByLabel("Setup name", { exact: true }).fill("Only copy");
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  await page.getByText("Manage setups", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Delete Only copy", exact: true })).toBeEnabled();
  await page.waitForFunction(() => (window as unknown as { repairTools: Map<string, unknown> }).repairTools.has("act"));
  let openedFiles = 0;
  page.on("filechooser", () => { openedFiles += 1; });
  const result = await page.evaluate(async () => {
    const tools = (window as unknown as { repairTools: Map<string, { execute(input: unknown): unknown }> }).repairTools;
    return tools.get("act")?.execute({ steps: [
      { ref: "Import backup", action: "press" },
      { ref: "Delete Only copy", action: "press" },
    ] });
  });
  expect(openedFiles).toBe(0);
  await page.reload();
  await page.locator("summary").filter({ hasText: "Estimate workload" }).click();
  await expect(page.getByRole("option", { name: /Only copy/, includeHidden: true })).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("kilo-models-saved-setups"))).toContain("Only copy");
  expect(result).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringContaining("needs a person") } });
});
