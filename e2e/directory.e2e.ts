import { expect, test, type Page } from "@playwright/test";

async function openDirectoryWorkload(page: Page) {
  const requests = page.getByRole("spinbutton", { name: "Requests", exact: true });
  if (!await requests.isVisible()) await page.getByText("Estimate workload", { exact: false }).first().click();
  await expect(requests).toBeVisible();
}

test("directory filters and page survive reload", async ({ page }) => {
  await page.goto("/?search=Fixture&minContext=1000&page=2&view=list");
  await expect(page.getByRole("link", { name: "Fixture Model 25", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue("Fixture");
  await page.reload();
  await expect(page.getByRole("link", { name: "Fixture Model 25", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue("Fixture");
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("comparison and favorites survive directory to detail, reload and Back", async ({ page }) => {
  await page.goto("/?search=Fixture&minContext=1000&page=2");
  await page.getByRole("button", { name: "Add Fixture Model 25 to comparison", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("compare") === "fixture/model-25");
  const detailLink = page.getByRole("link", { name: "Fixture Model 26", exact: true });
  await detailLink.scrollIntoViewIfNeeded();
  const savedScroll = await page.evaluate(() => window.scrollY);
  await detailLink.click();
  await expect(page.getByRole("heading", { name: "Fixture Model 26", level: 1, exact: true })).toBeVisible();
  await expect(page).toHaveURL((url) => decodeURIComponent(url.pathname) === "/models/fixture/model-26");
  await page.getByRole("button", { name: "Add Fixture Model 26 to comparison", exact: true }).click();
  await expect(page).toHaveURL((url) => decodeURIComponent(url.pathname) === "/models/fixture/model-26" && !!url.searchParams.get("compare")?.includes("fixture/model-26"));
  await page.getByRole("button", { name: "Add Fixture Model 26 to favorites", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Remove Fixture Model 26 from comparison", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Remove Fixture Model 26 from favorites", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Back to Directory" }).click();
  await expect(page.getByRole("link", { name: "Fixture Model 25", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue("Fixture");
  await expect(page.getByRole("region", { name: "Model comparison", exact: true })).toContainText("2 / 10");
  await expect(page.getByRole("button", { name: "Remove Fixture Model 26 from favorites", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(Math.max(0, savedScroll - 3));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(savedScroll + 3);
});

test("failed refresh keeps the loaded catalog and supports retry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Synthetic refresh outage" }) }));
  await page.getByRole("button", { name: "Refresh catalog", exact: true }).click();
  await expect(page.getByText("Refresh failed. Showing last loaded catalog.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await page.unroute(/\/api\/models(?:\?|$)/);
  await page.getByRole("button", { name: "Retry refresh", exact: true }).click();
  await expect(page.getByRole("button", { name: "Refresh catalog", exact: true })).toBeEnabled();
  await expect(page.getByText("Refresh failed. Showing last loaded catalog.", { exact: true })).toHaveCount(0);
});

test("keyboard opens and closes comparison; mobile keeps controls reachable", async ({ page }) => {
  await page.goto("/");
  const compare = page.getByRole("button", { name: "Add Fixture Model 01 to comparison", exact: true });
  await compare.focus();
  await expect(compare).toBeFocused();
  await page.keyboard.press("Enter");
  const tray = page.getByRole("region", { name: "Model comparison", exact: true });
  await tray.getByRole("button", { name: "Compare", exact: true }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Compare Models" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(tray.getByRole("button", { name: "Compare", exact: true })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("a shared comparison reloads with only the linked models", async ({ page }) => {
  await page.goto("/?compare=fixture%2Fmodel-01%2Cfixture%2Fmodel-02");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Compare Models" })).toBeVisible();
  await expect(dialog.getByText("2 models selected", { exact: true })).toBeVisible();
  await page.reload();
  await expect(dialog.getByText("2 models selected", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Remove Fixture Model 01 from comparison", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Remove Fixture Model 02 from comparison", exact: true })).toBeVisible();
});

test("direct model links copy the model ID and return safely to the directory", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("heading", { name: "Fixture Model 01", level: 1, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy model ID", exact: true }).click();
  await expect(page.getByText("Model ID copied.", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("fixture/model-01");
  await expect(page.getByRole("link", { name: "Back to Directory" })).toHaveAttribute("href", "/");
  await page.getByRole("link", { name: "Back to Directory" }).click();
  await expect(page.getByRole("textbox", { name: "Search models" })).toBeVisible();
});

test("workload ranking accounts for per-request billing and survives reload", async ({ page }) => {
  await page.goto("/?sort=cost-asc&requests=100&inputTokens=2000&outputTokens=500&images=2");
  // Model 01 has the lowest input price but a 2-cent per-request charge.
  // Model 02 therefore wins the actual workload ranking.
  const modelLinks = page.getByRole("link", { name: /^Fixture Model \d+$/ });
  await expect(modelLinks.first()).toHaveText("Fixture Model 02");
  await page.reload();
  await expect(modelLinks.first()).toHaveText("Fixture Model 02");
  await expect(page).toHaveURL(/images=2/);
  await expect(page.getByRole("button", { name: "Sort models: Estimated cost (low → high)", exact: true })).toBeVisible();
});

test("saved setups restore workload and filters after reload while preserving comparison", async ({ page }) => {
  await page.goto("/?requests=42&images=3&sort=cost-asc&view=list");
  await page.getByRole("button", { name: "Add Fixture Model 02 to comparison", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("compare") === "fixture/model-02");
  await openDirectoryWorkload(page);
  await page.getByRole("textbox", { name: "Setup name", exact: true }).fill("Fixture workload");
  await page.getByRole("textbox", { name: "Search models", exact: true }).fill("Fixture Model 0");
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(page.getByText("Saved “Fixture workload”.", { exact: true })).toBeVisible();
  await page.reload();
  // Query-driven comparisons open on a fresh load; close it to edit the directory.
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close comparison", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openDirectoryWorkload(page);
  await page.getByRole("textbox", { name: "Search models", exact: true }).fill("Fixture Model 60");
  await page.getByRole("spinbutton", { name: "Requests", exact: true }).fill("99");
  await page.getByRole("combobox", { name: "Saved setup", exact: true }).selectOption({ label: "Fixture workload · Workload + view" });
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Search models", exact: true })).toHaveValue("Fixture Model 0");
  await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("42");
  await expect(page).toHaveURL((url) => url.searchParams.get("images") === "3" && url.searchParams.get("compare") === "fixture/model-02");
  await expect(page.getByRole("region", { name: "Model comparison", exact: true })).toContainText("1 / 10");
  await page.getByRole("button", { name: "Delete Fixture workload", exact: true }).click();
  await expect(page.getByText("No saved setups yet. Name this workload and filter view to reuse it later.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Close comparison", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openDirectoryWorkload(page);
  await expect(page.getByRole("combobox", { name: "Saved setup", exact: true })).toHaveCount(0);
});

test("detail workload survives View comparison and Back; workload-only setups preserve directory filters", async ({ page }) => {
  await page.goto("/?search=Fixture&page=2&view=list&requests=2");
  await page.getByRole("link", { name: "Fixture Model 25", exact: true }).click();
  await expect(page).toHaveURL((url) => decodeURIComponent(url.pathname) === "/models/fixture/model-25");
  await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("2");
  await page.getByRole("spinbutton", { name: "Requests", exact: true }).fill("7");
  await page.getByRole("textbox", { name: "Setup name", exact: true }).fill("Detail workload");
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(page.getByText("Saved “Detail workload”.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Fixture Model 25 to comparison", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname.startsWith("/models/") && url.searchParams.get("compare") === "fixture/model-25" && url.searchParams.get("requests") === "7");
  await page.getByRole("link", { name: "View comparison (1)", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: /Cost Calculator|Costs/ }).click();
  await expect(dialog.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("7");
  await dialog.getByRole("textbox", { name: "Setup name", exact: true }).fill("Comparison workload");
  await dialog.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(dialog.getByText("Saved “Comparison workload”.", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Delete Comparison workload", exact: true }).click();
  await expect(dialog.getByText("Deleted “Comparison workload”.", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close comparison", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await openDirectoryWorkload(page);
  await page.getByRole("spinbutton", { name: "Requests", exact: true }).fill("99");
  await page.getByRole("combobox", { name: "Saved setup", exact: true }).selectOption({ label: "Detail workload · Workload only" });
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("7");
  await expect(page.getByRole("textbox", { name: "Search models", exact: true })).toHaveValue("Fixture");
  await expect(page).toHaveURL((url) => url.searchParams.get("page") === "2" && url.searchParams.get("view") === "list" && url.searchParams.get("compare") === "fixture/model-25");
  await page.getByRole("link", { name: "Fixture Model 25", exact: true }).click();
  await expect(page).toHaveURL((url) => decodeURIComponent(url.pathname) === "/models/fixture/model-25");
  await page.getByRole("spinbutton", { name: "Requests", exact: true }).fill("8");
  await expect(page).toHaveURL((url) => url.pathname.startsWith("/models/") && url.searchParams.get("requests") === "8");
  await page.getByRole("link", { name: "Back to Directory", exact: true }).click();
  await openDirectoryWorkload(page);
  await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("8");
  await expect(page.getByRole("textbox", { name: "Search models", exact: true })).toHaveValue("Fixture");
  await expect(page).toHaveURL((url) => url.searchParams.get("page") === "2" && url.searchParams.get("view") === "list");
  await expect(page.getByRole("region", { name: "Model comparison", exact: true })).toContainText("1 / 10");
});
