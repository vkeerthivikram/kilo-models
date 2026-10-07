import { Buffer } from "node:buffer";
import { expect, test, type Locator, type Page } from "@playwright/test";

interface Backup {
  format: string;
  version: number;
  setups: Array<{
    id: string;
    name: string;
    workload: {
      inputTokens: number;
      outputTokens: number;
      requests: number;
      cachePercent: number;
      period: string;
      images: number;
      searches: number;
      cacheWriteTokens: number;
    };
    directoryQuery: string;
    includesDirectoryView: boolean;
  }>;
}

async function openSavedSetups(page: Page) {
  const requests = page.getByRole("spinbutton", { name: "Requests", exact: true });
  if (!await requests.isVisible()) await page.locator("summary").filter({ hasText: "Estimate workload" }).click();
  await expect(requests).toBeVisible();
  const setups = page.getByRole("region", { name: "Saved setups", exact: true });
  await setups.locator("summary").filter({ hasText: "Manage setups" }).click();
  return setups;
}

async function exportBackup(page: Page, setups: Locator): Promise<{ backup: Backup; buffer: Buffer }> {
  const downloadPromise = page.waitForEvent("download");
  await setups.getByRole("button", { name: "Export backup", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("kilo-models-setups.json");
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  return { backup: JSON.parse(buffer.toString("utf8")) as Backup, buffer };
}

async function importBackup(setups: Locator, buffer: Buffer) {
  await setups.getByLabel("Choose a saved-setups JSON backup", { exact: true }).setInputFiles({
    name: "saved-setups.json", mimeType: "application/json", buffer,
  });
}

test("saved views support rename, update, undo and a downloaded backup round trip", async ({ page }) => {
  await page.goto("/?fitsWorkload=true&maxBudget=20&requests=42&inputTokens=1200&cachePercent=25.5&sort=cost-asc&view=list");
  let setups = await openSavedSetups(page);
  await setups.getByRole("textbox", { name: "Setup name", exact: true }).fill("Work view");
  await setups.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(setups.getByRole("status")).toHaveText("Saved “Work view”.");

  await setups.getByRole("button", { name: "Rename", exact: true }).click();
  await setups.getByRole("textbox", { name: "New name for Work view", exact: true }).fill("Winter plan");
  await setups.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(setups.getByRole("status")).toHaveText("Renamed setup to “Winter plan”.");
  await expect(setups.getByRole("combobox", { name: "Saved setup", exact: true }).locator("option:checked")).toHaveText("Winter plan · Workload + view");

  const requests = page.getByRole("spinbutton", { name: "Requests", exact: true });
  await requests.fill("9");
  await requests.press("Enter");
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "9");
  await page.getByRole("textbox", { name: "Search models", exact: true }).fill("Fixture Model 0");
  await expect(page).toHaveURL((url) => url.searchParams.get("search") === "Fixture Model 0");
  await setups.getByRole("button", { name: "Update workload & view", exact: true }).click();
  await expect(setups.getByRole("status")).toHaveText("Updated “Winter plan” with the current workload and view.");

  await setups.getByRole("button", { name: "Delete Winter plan", exact: true }).click();
  await expect(setups.getByRole("combobox", { name: "Saved setup", exact: true })).toHaveCount(0);
  await setups.getByRole("button", { name: "Undo deletion of Winter plan", exact: true }).click();
  await expect(setups.getByRole("status")).toHaveText("Restored “Winter plan”.");

  const exported = await exportBackup(page, setups);
  expect(exported.backup).toMatchObject({ format: "kilo-models-saved-setups", version: 1 });
  expect(exported.backup.setups).toHaveLength(1);
  expect(exported.backup.setups[0]).toMatchObject({
    name: "Winter plan", includesDirectoryView: true,
    workload: { inputTokens: 1200, outputTokens: 500, requests: 9, cachePercent: 25.5, period: "batch", images: 0, searches: 0, cacheWriteTokens: 0 },
  });
  const view = new URLSearchParams(exported.backup.setups[0].directoryQuery);
  expect(view.get("fitsWorkload")).toBe("true");
  expect(view.get("maxBudget")).toBe("20");
  expect(view.get("search")).toBe("Fixture Model 0");
  expect(view.get("sort")).toBe("cost-asc");
  expect(view.get("view")).toBe("list");
  expect(view.has("requests")).toBe(false);

  await setups.getByRole("button", { name: "Delete Winter plan", exact: true }).click();
  await importBackup(setups, exported.buffer);
  await expect(setups.getByRole("status")).toContainText("Imported 1 setup. Skipped 0 duplicate");
  await page.goto("/?requests=88&inputTokens=500&search=Fixture%20Model%2060&view=grid");
  await page.reload();
  setups = await openSavedSetups(page);
  await setups.getByRole("combobox", { name: "Saved setup", exact: true }).selectOption({ label: "Winter plan · Workload + view" });
  await setups.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(setups.getByRole("status")).toHaveText("Applied “Winter plan”.");
  await expect(requests).toHaveValue("9");
  await expect(page.getByRole("spinbutton", { name: "Input tokens per request", exact: true })).toHaveValue("1200");
  await expect(page.getByRole("spinbutton", { name: "Cached input (%)", exact: true })).toHaveValue("25.5");
  await expect(page.getByRole("textbox", { name: "Search models", exact: true })).toHaveValue("Fixture Model 0");
  await expect(page).toHaveURL((url) => url.searchParams.get("fitsWorkload") === "true" && url.searchParams.get("maxBudget") === "20" && url.searchParams.get("sort") === "cost-asc" && url.searchParams.get("view") === "list");
});

test("duplicate and malformed backup imports leave existing setups intact", async ({ page }) => {
  await page.goto("/?fitsWorkload=true&maxBudget=20&requests=7");
  const setups = await openSavedSetups(page);
  await setups.getByRole("textbox", { name: "Setup name", exact: true }).fill("Keep this setup");
  await setups.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(setups.getByRole("status")).toHaveText("Saved “Keep this setup”.");
  const original = (await exportBackup(page, setups)).backup;
  const existing = original.setups[0];
  await importBackup(setups, Buffer.from(JSON.stringify({ ...original, setups: [
    { ...existing, name: "Same ID with another name", workload: { ...existing.workload, requests: 99 } },
    { ...existing, id: "same-name-other-id", name: "KEEP THIS SETUP", workload: { ...existing.workload, requests: 88 } },
  ] })));
  await expect(setups.getByRole("status")).toContainText("Imported 0 setups. Skipped 2 duplicate names or IDs");
  const selection = setups.getByRole("combobox", { name: "Saved setup", exact: true });
  await expect(selection.locator("option")).toHaveCount(2);

  await importBackup(setups, Buffer.from(JSON.stringify({ ...original, setups: [
    { ...existing, id: "valid-new-entry", name: "Should not be partially imported" },
    { ...existing, id: "invalid-entry", name: "Invalid workload", workload: { ...existing.workload, requests: 0 } },
  ] })));
  await expect(setups.getByRole("alert")).toHaveText("Setup 2 in this backup has invalid data. Nothing was imported.");
  await expect(selection.locator("option")).toHaveCount(2);
  await importBackup(setups, Buffer.from("{broken JSON"));
  await expect(setups.getByRole("alert")).toHaveText("This file is not valid JSON. Choose a saved-setups backup.");
  expect((await exportBackup(page, setups)).backup).toEqual(original);
  await page.reload();
  await openSavedSetups(page);
  await selection.selectOption({ label: "Keep this setup · Workload + view" });
  await setups.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("7");
  await expect(selection.locator("option")).toHaveCount(2);
});
