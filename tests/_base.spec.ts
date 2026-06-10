import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { QA, withTheme } from "./fixtures";

/**
 * Generische Visual-Checks fuer die QA-Block-Test-Page.
 *
 * Diese Tests laufen allen Block-spezifischen Tests voraus und stellen sicher,
 * dass die QA-Page ueberhaupt sauber rendert: keine Page-Errors, kein
 * leeres Layout, keine defekten Bilder.
 *
 * Block-spezifische Tests liegen unter tests/blocks/<name>.spec.ts.
 */
test.describe("QA Block-Page – Generische Visual-Checks", () => {
  test("rendert ohne Page-Errors", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    const response = await page.goto(withTheme(QA.paths.qaBlock), {
      waitUntil: "domcontentloaded",
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
    const main = page.locator("main, [role='main'], #MainContent").first();
    await expect(main).toBeVisible();
    const box = await main.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(50);
  });

  test("keine offensichtlich kaputten Bilder", async ({ page }) => {
    await page.goto(withTheme(QA.paths.qaBlock), { waitUntil: "domcontentloaded" });
    const broken = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      return imgs
        .filter((img) => img.complete && img.naturalWidth === 0 && img.loading !== "lazy")
        .map((img) => img.src);
    });
    expect(broken, broken.join("\n")).toEqual([]);
  });
});
