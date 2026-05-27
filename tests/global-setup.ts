import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Globaler Setup-Schritt vor allen Playwright-Tests.
 * Loggt sich einmal ueber /password ein und speichert die Session
 * als Storage-State. Tests nutzen danach automatisch diesen authentifizierten State.
 *
 * Erwartete ENV-Variable:
 *   SHOPIFY_STOREFRONT_PASSWORD – aktuelles Storefront-Passwort des Fashion-Dev-Stores
 */
export default async function globalSetup(_config: FullConfig) {
  const STORE_BASE = "https://fashion-dev-zekm0nfo.myshopify.com";
  const password = process.env.SHOPIFY_STOREFRONT_PASSWORD;

  if (!password) {
    throw new Error(
      "SHOPIFY_STOREFRONT_PASSWORD ist nicht gesetzt. Setze die ENV-Variable " +
        "mit dem Storefront-Passwort des Fashion-Dev-Stores, bevor Playwright laeuft."
    );
  }

  const authDir = path.resolve("playwright/.auth");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  const statePath = path.join(authDir, "storefront.json");

  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await page.goto(`${STORE_BASE}/password`, { waitUntil: "networkidle" });
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/password"), { timeout: 15_000 });

  await context.storageState({ path: statePath });
  await browser.close();
}
