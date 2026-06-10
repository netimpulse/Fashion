import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Globaler Setup-Schritt vor allen Playwright-Tests.
 * Falls Storefront-Passwortschutz aktiv ist (Dev-Stores ja), wird er
 * via SHOPIFY_STOREFRONT_PASSWORD umgangen.
 *
 * Wichtig: Schlaegt der Login fehl, BRICHT das Setup ab — sonst laufen
 * alle Tests unauthentifiziert gegen die Passwortseite und produzieren
 * Dutzende irrefuehrende Failures.
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

  try {
    if (password) {
      let loggedIn = false;
      let lastError = "";
      for (let attempt = 1; attempt <= 3 && !loggedIn; attempt++) {
        try {
          await page.goto(`${STORE_BASE}/password`, { waitUntil: "domcontentloaded", timeout: 30_000 });
          const hasPasswordForm = (await page.locator('input[type="password"]').count()) > 0;
          if (!hasPasswordForm) {
            // Kein Passwortschutz aktiv
            loggedIn = true;
            break;
          }
          await page.locator('input[type="password"]').first().fill(password);
          await page.locator('form button[type="submit"], form input[type="submit"]').first().click();
          await page.waitForURL((url) => !url.pathname.startsWith("/password"), { timeout: 15_000 });
          loggedIn = true;
        } catch (e) {
          lastError = (e as Error).message;
          console.warn(`Storefront-Login Versuch ${attempt}/3 fehlgeschlagen: ${lastError}`);
          await page.waitForTimeout(2000 * attempt);
        }
      }

      if (!loggedIn) {
        throw new Error(`Storefront-Login nach 3 Versuchen fehlgeschlagen: ${lastError}`);
      }

      // Verifizieren, dass die Session den Passwortschutz wirklich umgeht
      const response = await page.goto(`${STORE_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (page.url().includes("/password")) {
        throw new Error(`Storefront-Session ungueltig (Redirect auf /password, Status ${response?.status()}).`);
      }
    }

    await context.storageState({ path: statePath });
  } finally {
    await browser.close();
  }
}
