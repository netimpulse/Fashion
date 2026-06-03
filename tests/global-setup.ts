import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Globaler Setup-Schritt vor allen Playwright-Tests.
 * Holt das storefront_digest Cookie via POST an /password, damit
 * der Password-Schutz fuer alle Tests umgangen wird.
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
      await page.goto(`${STORE_BASE}/password`, { waitUntil: "domcontentloaded" });
      const passwordInput = page.locator('input[type="password"]').first();
      if ((await passwordInput.count()) > 0) {
        await passwordInput.fill(password);

        const submitBtn = page.locator('form button[type="submit"], form input[type="submit"]').first();
        await Promise.all([
          page.waitForResponse((r) => r.url().includes("/password") && r.request().method() === "POST", { timeout: 15_000 }).catch(() => {}),
          submitBtn.click(),
        ]);

        // Warte bis das storefront_digest Cookie gesetzt ist (max 8s)
        const deadline = Date.now() + 8_000;
        while (Date.now() < deadline) {
          const cookies = await context.cookies();
          if (cookies.some((c) => c.name === "storefront_digest")) break;
          await page.waitForTimeout(250);
        }

        // Sanity-Check: lade Homepage und schau ob immer noch /password
        await page.goto(`${STORE_BASE}/`, { waitUntil: "domcontentloaded" });
        if (page.url().includes("/password")) {
          console.warn("[global-setup] Storefront-Login eventuell fehlgeschlagen — weiter mit aktuellem State.");
        } else {
          console.log("[global-setup] Storefront-Login erfolgreich.");
        }
      }
    } catch (e) {
      console.warn("Storefront-Login uebersprungen:", (e as Error).message);
    }
  }

  await context.storageState({ path: statePath });
  await browser.close();
}
