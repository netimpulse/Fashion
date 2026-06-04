import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { QA, withTheme } from "../fixtures";

const HOME_URL = withTheme(QA.paths.home);

test.describe("Featured Collection (Landing-Page)", () => {
  test("rendert ohne console- oder page-errors", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    const response = await page.goto(HOME_URL, { waitUntil: "networkidle" });
    expect(response?.ok(), `HTTP-Status: ${response?.status()}`).toBe(true);

    const dir = "qa-screenshots";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, `${testInfo.project.name}-home-featured-collection.png`),
      fullPage: true,
    });

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Section, Heading und View-All sind sichtbar", async ({ page }) => {
    await page.goto(HOME_URL);
    const section = page.locator("[data-section-type='featured-collection']").first();
    await expect(section).toBeVisible();

    const heading = section.locator(".featured-collection__heading").first();
    await expect(heading).toBeVisible();
    expect((await heading.textContent())?.trim().length ?? 0).toBeGreaterThan(0);

    const viewAll = section.locator(".featured-collection__view-all").first();
    if ((await viewAll.count()) > 0) {
      await expect(viewAll).toBeVisible();
      const href = await viewAll.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toContain("/collections/");
    }
  });

  test("Produkt-Cards: Anzahl > 0 und jede Card hat Titel + Preis", async ({ page }) => {
    await page.goto(HOME_URL);
    const cards = page.locator("[data-product-card]");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 4); i++) {
      const card = cards.nth(i);
      const title = card.locator(".product-card__title-link").first();
      await expect(title).toBeVisible();
      const titleText = (await title.textContent())?.trim() ?? "";
      expect(titleText.length).toBeGreaterThan(0);

      const price = card.locator(".product-card__price-current").first();
      await expect(price).toBeVisible();
      expect((await price.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  test("Produkt-Card-Link fuehrt zur PDP", async ({ page }) => {
    await page.goto(HOME_URL);
    const firstCardLink = page.locator("[data-product-card] .product-card__media-link").first();
    const href = await firstCardLink.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toMatch(/^\/products\//);
  });

  test("Quick-Add Button ist vorhanden und hat ein POST-Form (oder ist ein Link bei Varianten)", async ({ page }) => {
    await page.goto(HOME_URL);
    const card = page.locator("[data-product-card]").first();
    const quickAdd = card.locator(".product-card__quick-add, .product-card__quick-add-btn--link").first();
    const exists = await quickAdd.count();
    test.skip(exists === 0, "Quick-add ist disabled");

    const tagName = await quickAdd.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === "form") {
      const action = await quickAdd.getAttribute("action");
      const method = await quickAdd.getAttribute("method");
      expect(action).toContain("/cart/add");
      expect(method?.toLowerCase()).toBe("post");
    } else {
      const href = await quickAdd.getAttribute("href");
      expect(href).toMatch(/^\/products\//);
    }
  });

  test("Grid hat mindestens 2 Spalten auf Desktop (1440px)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(HOME_URL);
    const grid = page.locator(".featured-collection__grid").first();
    const trackExists = await page.locator(".featured-collection__track").count();
    if (trackExists > 0) test.skip(true, "Layout ist carousel, kein grid");

    await expect(grid).toBeVisible();
    const cols = await grid.evaluate((el) => {
      return getComputedStyle(el).gridTemplateColumns.split(" ").length;
    });
    expect(cols).toBeGreaterThanOrEqual(2);
  });

  test("Mobile (375px): kein horizontaler Scroll, Cards stapeln korrekt", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(HOME_URL);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const firstCard = page.locator("[data-product-card]").first();
    await expect(firstCard).toBeVisible();
    const box = await firstCard.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(0);
  });
});
