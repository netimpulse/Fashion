import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/global-setup.ts", "**/fixtures.ts"],
  timeout: 30_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: "https://fashion-o4ccall8.myshopify.com",
    storageState: "playwright/.auth/storefront.json",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile",  use: { ...devices["iPhone 13"] } },
  ],
});
