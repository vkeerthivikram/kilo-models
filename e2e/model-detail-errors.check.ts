import { expect, test } from "@playwright/test";
import { catalog } from "./catalog";
import { batch, catalogResponse, mockWebMCP, press } from "./repair-support";

for (const entry of ["bookmark", "directory"] as const) {
  test(`the ${entry} detail failure exposes retry and return with its prior view and workload`, async ({ page, request }) => {
    const setAvailable = async (available: boolean) => {
      const response = await request.post(`http://127.0.0.1:3211/fault/${available ? "available" : "unavailable"}`);
      expect(response.ok()).toBe(true);
    };
    await setAvailable(false);
    // The installed Next dev server bypasses its data cache for no-cache requests.
    await page.setExtraHTTPHeaders({ "cache-control": "no-cache" });
    await mockWebMCP(page);
    await catalogResponse(page, catalog);
    const detail = "/models/fixture%2Fmodel-01?requests=7";
    if (entry === "bookmark") await page.goto(detail);
    else {
      await page.goto("/?search=Fixture&view=list&requests=7&compare=fixture%2Fmodel-01");
      const link = page.getByRole("link", { name: "View details for Fixture Model 01", exact: true });
      await expect(link).toBeVisible();
      expect(await batch(page, press("View details for Fixture Model 01"), press("Close comparison"))).toMatchObject({
        ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/requested model detail is unavailable/i) },
      });
    }
    const failure = page.getByRole("heading", { name: "Unable to load this model", level: 1, exact: true });
    await expect(failure).toBeVisible();
    await page.waitForFunction(() =>
      (window as unknown as { repairTools: Map<string, unknown> }).repairTools?.has("read_catalog"));
    const data = await page.evaluate(async () => {
      const tools = (window as unknown as { repairTools: Map<string, { execute(input: unknown): unknown }> }).repairTools;
      return tools.get("read_catalog")?.execute({});
    });
    expect(data).toEqual([expect.objectContaining({
      section: "Model detail unavailable", text: expect.stringContaining("temporarily unavailable"),
    })]);
    const back = page.getByRole("link", { name: "Back to Directory", exact: true });
    await expect(back).toHaveAttribute("href", entry === "directory" ? /search=Fixture.*view=list.*requests=7/ : "/?requests=7");
    await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
    await setAvailable(true);
    expect(await batch(page, press("Try again"))).toMatchObject({ ok: true });
    await expect(page.getByRole("heading", { name: "Fixture Model 01", level: 1, exact: true })).toBeVisible();
    await setAvailable(false);
    await page.reload();
    await expect(failure).toBeVisible();
    expect(await batch(page, press("Back to Directory"))).toMatchObject({ ok: true });
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.searchParams.get("requests") === "7" &&
      (entry === "bookmark" || (url.searchParams.get("search") === "Fixture" && url.searchParams.get("view") === "list")));
    await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  });
}
