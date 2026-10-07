import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3210",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] }, testIgnore: "**/accessibility-themes.e2e.ts" },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: "**/accessibility-themes.e2e.ts" },
    { name: "desktop-webkit", use: { ...devices["Desktop Safari"] }, testIgnore: "**/accessibility-themes.e2e.ts" },
  ],
  webServer: [
    {
      name: "Synthetic catalog",
      command: "bun e2e/fixture-server.ts",
      url: "http://127.0.0.1:3211/health",
      reuseExistingServer: false,
    },
    {
      name: "Isolated app",
      command: "bun run dev -- --hostname 127.0.0.1 --port 3210",
      url: "http://127.0.0.1:3210",
      env: { KILO_MODELS_E2E: "1", KILO_MODELS_GATEWAY_URL: "http://127.0.0.1:3211/api/gateway/models" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
