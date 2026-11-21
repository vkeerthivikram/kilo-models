import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Run independently of the regular suite because the fixture gateway changes response status.
const servers = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testMatch: "**/model-detail-errors.check.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: ".tmp/detail-error-results",
  webServer: servers.map((server) => server.name === "Synthetic catalog"
    ? { ...server, env: { ...server.env, KILO_MODELS_FAULT_TEST: "1" } }
    : server),
});
