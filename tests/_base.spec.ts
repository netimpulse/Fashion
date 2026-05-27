import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { QA, withTheme } from "./fixtures";

/**
 * Generische Visual-Checks fuer die QA-Block-Test-Page.
 *
 * Diese Tests laufen ALLE Block-spezifischen Tests voraus und stellen sicher,
 * dass die QA-Page ueberhaupt sauber rendert: keine Konsolenfehler, kein
 * leeres Layout, keine defekten Bilder.
 *
 * Block-spezifische Tests legt Claude unter tests/blocks/<name>.spec.ts an.
 */
test.describe("QA Block-Page – Generische Visual-Checks", () => {
  test("rendert ohne Konsolen- oder Page-Errors", async ({ page }, testInfo) => {
    const errors: string[] = [];
    // Shopify-Plattform-Rauschen (Shop Pay / shop.app Cross-Origin-Handshake,
    // Payment-Ressourcen auf dem passwortgeschuetzten Preview-Store) ist kein
    // Theme-Defekt und wird ignoriert. Echte Theme-Fehler kommen als pageerror
    // oder als console.error ohne diese Marker durch.
    const platformNoise = [
      "pay.shopify.com",
      "shop.app",
      "401 (Unauthorized)",
      "403 (Forbidden)",
    ];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const text = m.text();
      if (!platformNoise.some((n) => text.includes(n))) {
        errors.push(`console: ${text}`);
      }
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    const response = await page.goto(withTheme(QA.paths.qaBlock), {
      waitUntil: "networkidle",
    });
    expect(response?.ok(), `HTTP-Status: ${response?.status()}`).toBe(true);

    const dir = "qa-screenshots";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, `${testInfo.project.name}-base.png`),
      fullPage: true,
    });

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Hauptinhalt ist sichtbar (kein leeres Layout)", async ({ page }) => {
    await page.goto(withTheme(QA.paths.qaBlock));
    // Dieses Skeleton-Theme rendert content_for_layout direkt in <body> ohne
    // <main>-Wrapper; .shopify-section existiert immer fuer gerenderte Sections.
    const main = page
      .locator("main, [role='main'], #MainContent, .shopify-section")
      .first();
    await expect(main).toBeVisible();
    const box = await main.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(50);
  });

  test("keine offensichtlich kaputten Bilder", async ({ page }) => {
    await page.goto(withTheme(QA.paths.qaBlock), { waitUntil: "networkidle" });
    const broken = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      return imgs
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src);
    });
    expect(broken, `Kaputte Bilder:\n${broken.join("\n")}`).toEqual([]);
  });
});
