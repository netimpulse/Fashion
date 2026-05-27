import { defineConfig, devices } from "@playwright/test";

/**
 * Visual-QA Konfiguration fuer den Fashion-Dev-Store.
 *
 * baseURL ist nur der Host. Pfad + preview_theme_id pro Test individuell
 * via withTheme() aus tests/fixtures.ts.
 *
 * Storefront-Passwort-Auth via tests/global-setup.ts und storageState.
 */
export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/global-setup.ts", "**/fixtures.ts"],
  timeout: 30_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: "https://fashion-dev-zekm0nfo.myshopify.com",
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
