import { expect, test, type Locator } from "@playwright/test";
import { COMPARISON_STORAGE_KEY } from "../src/lib/comparison-storage";

test("favorites recovery keeps another tab's durable changes", async ({ context, page }) => {
  const other = await context.newPage();
  await Promise.all([page.goto("/"), other.goto("/")]);
  const heart = (tab: typeof page, index: string) => tab.getByRole("button", {
    name: new RegExp("^(Add|Remove) Fixture Model " + index + " (to|from) favorites$"),
  });
  await expect(heart(page, "01")).toBeVisible();
  await heart(page, "04").press("Space");
  await expect(heart(other, "04")).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "kilo-models-favorites") {
        Storage.prototype.setItem = setItem;
        throw new DOMException("Temporary failure", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  });
  await heart(page, "04").click();
  await expect(heart(page, "04")).toHaveAttribute("aria-pressed", "false");
  await heart(other, "02").click();
  await expect(heart(other, "02")).toHaveAttribute("aria-pressed", "true");
  await heart(page, "03").click();
  await expect(heart(page, "03")).toHaveAttribute("aria-pressed", "true");
  for (const tab of [page, other]) {
    await expect(heart(tab, "02")).toHaveAttribute("aria-pressed", "true");
    await expect(heart(tab, "03")).toHaveAttribute("aria-pressed", "true");
    await expect(heart(tab, "04")).toHaveAttribute("aria-pressed", "false");
    await tab.reload();
    await expect(heart(tab, "02")).toHaveAttribute("aria-pressed", "true");
    await expect(heart(tab, "03")).toHaveAttribute("aria-pressed", "true");
    await expect(heart(tab, "04")).toHaveAttribute("aria-pressed", "false");
  }
});

for (const idb of ["absent", "failed"] as const) {
  test("setup writes fail explicitly with Web Locks missing and IndexedDB " + idb, async ({ context, page }) => {
    await context.addInitScript((idb) => {
      Object.defineProperty(navigator, "locks", { value: undefined });
      Object.defineProperty(window, "indexedDB", { value: idb === "absent" ? undefined : {
        open() {
          document.documentElement.dataset.indexedDbOpenAttempted = "true";
          const request: { error: DOMException; onerror?: () => void } = {
            error: new DOMException("Cannot open test database", "UnknownError"),
          };
          setTimeout(() => request.onerror?.(), 0);
          return request;
        },
      } });
    }, idb);
    const other = await context.newPage();
    const tabs = [page, other];
    await Promise.all(tabs.map(async (tab, index) => {
      await tab.goto("/");
      await tab.getByRole("button", { name: "Estimate workload", exact: true }).click();
      await tab.getByRole("textbox", { name: "Setup name", exact: true }).fill("Tab " + index);
    }));
    const start = Date.now() + 250;
    await Promise.all(tabs.map((tab) => clickTogether(tab.getByRole("button", { name: "Save setup", exact: true }), start)));
    for (const tab of tabs) {
      await expect(tab.getByRole("region", { name: "Saved setups" }).getByRole("alert")).toContainText("Browser storage");
      if (idb === "failed") await expect(tab.locator("html")).toHaveAttribute("data-indexed-db-open-attempted", "true");
      expect(await tab.evaluate(() => localStorage.getItem("kilo-models-saved-setups"))).toBeNull();
    }
  });
}

function clickTogether(locator: Locator, at: number) {
  return locator.evaluate((button: HTMLElement, time) => new Promise<void>((resolve) => {
    setTimeout(() => { button.click(); resolve(); }, Math.max(0, time - Date.now()));
  }), at);
}

for (const useWebLocks of [true, false]) {
  test(`tabs preserve concurrent saves and favorites with ${useWebLocks ? "Web Locks" : "IndexedDB"}`, async ({ context, page }) => {
    if (!useWebLocks) await context.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined }));
    const other = await context.newPage();
    await Promise.all([page.goto("/?requests=7"), other.goto("/?requests=11")]);
    const tabs = [page, other];
    await Promise.all(tabs.map((tab, index) => tab.getByRole("link", { name: `Fixture Model 0${index + 1}`, exact: true }).waitFor()));
    const favoritesAt = Date.now() + 250;
    await Promise.all(tabs.map((tab, index) => clickTogether(tab.getByRole("button", { name: `Add Fixture Model 0${index + 1} to favorites`, exact: true }), favoritesAt)));
    for (const tab of tabs) {
      for (const model of ["01", "02"]) {
        await expect(tab.getByRole("button", { name: `Remove Fixture Model ${model} from favorites`, exact: true })).toHaveAttribute("aria-pressed", "true");
      }
    }

    const names = ["First tab setup", "Second tab setup"];
    await Promise.all(tabs.map(async (tab, index) => {
      await tab.getByRole("button", { name: "Estimate workload", exact: true }).click();
      await tab.getByRole("textbox", { name: "Setup name", exact: true }).fill(names[index]);
    }));
    const savesAt = Date.now() + 250;
    await Promise.all(tabs.map((tab) => clickTogether(tab.getByRole("button", { name: "Save setup", exact: true }), savesAt)));
    for (const [index, tab] of tabs.entries()) {
      const setups = tab.getByRole("region", { name: "Saved setups" });
      await expect(setups.getByRole("status")).toHaveText(`Saved “${names[index]}”.`);
      await expect(setups.getByRole("combobox")).toContainText(names[0]);
      await expect(setups.getByRole("combobox")).toContainText(names[1]);
    }
  });
}

test("idle tabs with different shared comparisons do not rewrite each other's selection", async ({ context, page }) => {
  await context.addInitScript((comparisonKey) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === comparisonKey) document.documentElement.dataset.comparisonWrites =
        String(Number(document.documentElement.dataset.comparisonWrites ?? 0) + 1);
      return setItem.call(this, key, value);
    };
  }, COMPARISON_STORAGE_KEY);
  await page.goto("/?compare=fixture%2Fmodel-01");
  await expect(page.getByRole("dialog")).toBeVisible();
  const other = await context.newPage();
  await other.goto("/?compare=fixture%2Fmodel-02");
  await expect(other.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: "View details for Fixture Model 01", exact: true })).toBeVisible();
  await expect(other.getByRole("link", { name: "View details for Fixture Model 02", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), COMPARISON_STORAGE_KEY)).toBe('["fixture/model-02"]');
  // Give both tabs time to consume the storage event and persist any follow-up writes.
  const writes = await Promise.all([page, other].map((tab) => tab.evaluate(() => new Promise((resolve) =>
    setTimeout(() => resolve(document.documentElement.dataset.comparisonWrites), 300)))));
  expect(writes).toEqual(["1", "1"]);
});
