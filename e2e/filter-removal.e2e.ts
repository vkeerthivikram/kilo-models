import { expect, test, type Page } from "@playwright/test";

async function revealFilters(page: Page) {
  const button = page.getByRole("button", { name: /^Filters/ });
  if (await button.isVisible()) await button.click();
}

test("individual chips remove URL filters while favorites, sort, view, workload and comparison remain", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kilo-models-favorites", JSON.stringify(["fixture/model-01"])));
  await page.goto("/?search=Fixture&free=true&hideRetired=true&fitsWorkload=true&reasoning=true&tools=true&providers=fixture,missing&inputModalities=image,text&outputModalities=audio,text&page=2&fav=true&sort=cost-desc&view=list&requests=7&compare=fixture/model-01");
  await page.getByRole("button", { name: "Close comparison", exact: true }).click();
  const filters = page.getByRole("group", { name: "Active filters", exact: true });
  const removals = [
    ["Search: Fixture", "search"],
    ["Free only", "free"],
    ["Hide retired", "hideRetired"],
    ["Fits workload", "fitsWorkload"],
    ["Reasoning", "reasoning"],
    ["Tool calling", "tools"],
  ] as const;
  for (const [label, key] of removals) {
    await filters.getByRole("button", { name: `Remove filter: ${label}`, exact: true }).click();
    await expect(page).toHaveURL((url) => !url.searchParams.has(key) && !url.searchParams.has("page")
      && url.searchParams.get("fav") === "true" && url.searchParams.get("sort") === "cost-desc"
      && url.searchParams.get("view") === "list" && url.searchParams.get("requests") === "7"
      && url.searchParams.get("compare") === "fixture/model-01");
  }
  for (const [label, key, removed, remaining] of [
    ["Provider", "providers", "missing", "fixture"],
    ["Input", "inputModalities", "image", "text"],
    ["Output", "outputModalities", "audio", "text"],
  ] as const) {
    await filters.getByRole("button", { name: `Remove filter: ${label}: ${removed}`, exact: true }).click();
    await expect(page).toHaveURL((url) => url.searchParams.get(key) === remaining);
    await filters.getByRole("button", { name: `Remove filter: ${label}: ${remaining}`, exact: true }).click();
    await expect(page).toHaveURL((url) => !url.searchParams.has(key));
  }
  await expect(filters).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Favorites/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /^Fixture Model \d+$/ })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.get("fav") === "true" && url.searchParams.get("view") === "list"
    && url.searchParams.get("sort") === "cost-desc" && url.searchParams.get("requests") === "7"
    && url.searchParams.get("compare") === "fixture/model-01");
});

test("clear search control deletes search and preserves remaining filters and usage", async ({ page }) => {
  await page.goto("/?search=NoSuchModel&providers=fixture&tools=true&view=list&sort=name-desc&page=2&requests=7");
  await expect(page.getByRole("heading", { name: "No models found", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Search models", exact: true })).toHaveValue("");
  await expect(page).toHaveURL((url) => !url.searchParams.has("search") && !url.searchParams.has("page")
    && url.searchParams.get("providers") === "fixture" && url.searchParams.get("tools") === "true"
    && url.searchParams.get("view") === "list" && url.searchParams.get("sort") === "name-desc"
    && url.searchParams.get("requests") === "7");
  await expect(page.getByRole("link", { name: "Fixture Model 60", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove filter: Provider: fixture", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove filter: Tool calling", exact: true })).toBeVisible();
});

test("deselecting controls removes the last provider, modality and boolean query keys", async ({ page }) => {
  await page.goto("/?providers=fixture&inputModalities=image&outputModalities=text&reasoning=true&page=2&view=list&requests=7");
  await expect(page.getByRole("link", { name: "Fixture Model 25", exact: true })).toBeVisible();
  await revealFilters(page);
  const filters = page.getByRole("complementary", { name: "Filter models", exact: true });
  await filters.getByRole("button", { name: /^Reasoning/ }).click();
  await expect(page).toHaveURL((url) => !url.searchParams.has("reasoning") && !url.searchParams.has("page"));
  await filters.getByRole("button", { name: "1 selected", exact: true }).click();
  await filters.getByRole("checkbox", { name: /^fixture/i }).uncheck();
  await expect(page).toHaveURL((url) => !url.searchParams.has("providers"));
  await filters.getByRole("group", { name: "Input types", exact: true }).getByRole("button", { name: /^image/ }).click();
  await expect(page).toHaveURL((url) => !url.searchParams.has("inputModalities"));
  await filters.getByRole("group", { name: "Output types", exact: true }).getByRole("button", { name: /^text/ }).click();
  await expect(page).toHaveURL((url) => !url.searchParams.has("outputModalities") && !url.searchParams.has("page")
    && url.searchParams.get("view") === "list" && url.searchParams.get("requests") === "7");
  await expect(page.getByRole("group", { name: "Active filters", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
});
