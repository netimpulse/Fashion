import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Globaler Setup-Schritt vor allen Playwright-Tests.
 * Falls Storefront-Passwortschutz aktiv ist (Dev-Stores ja), wird er
 * via SHOPIFY_STOREFRONT_PASSWORD umgangen. Falls nicht gesetzt oder
 * Store keinen Passwortschutz hat, wird der Login-Schritt geskippt.
 */
export default async function globalSetup(_config: FullConfig) {
  const STORE_BASE = "https://fashion-o4ccall8.myshopify.com";
  const password = process.env.SHOPIFY_STOREFRONT_PASSWORD;

  const authDir = path.resolve("playwright/.auth");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  const statePath = path.join(authDir, "storefront.json");

  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  if (password) {
    try {
      await page.goto(`${STORE_BASE}/password`, { waitUntil: "networkidle" });
      const hasPasswordForm = await page.locator('input[type="password"]').count() > 0;
      if (hasPasswordForm) {
        await page.locator('input[type="password"]').first().fill(password);
        await page.locator('form button[type="submit"]').first().click();
        await page.waitForURL((url) => !url.pathname.startsWith("/password"), { timeout: 15_000 });
      }
    } catch (e) {
      console.warn("Storefront-Login uebersprungen:", (e as Error).message);
    }
  }

  await context.storageState({ path: statePath });
  await browser.close();
}
