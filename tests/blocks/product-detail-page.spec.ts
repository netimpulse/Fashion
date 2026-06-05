import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { QA, withTheme } from "../fixtures";

/**
 * Visual & functional tests for the new Product Detail Page (PDP).
 * Targets /products/essential-tee on the QA preview theme.
 */

test.describe("PDP — rendering & structure", () => {
  test("renders without console/page errors", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    const response = await page.goto(withTheme(QA.paths.product), { waitUntil: "networkidle" });
    expect(response?.ok(), `HTTP-Status: ${response?.status()}`).toBe(true);

    const dir = "qa-screenshots";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, `${testInfo.project.name}-pdp.png`),
      fullPage: true,
    });

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("renders the <product-page> root and inner sections", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    await expect(page.locator("product-page")).toBeVisible();
    await expect(page.locator(".pdp__media").first()).toBeVisible();
    await expect(page.locator(".pdp__content")).toBeVisible();
  });

  test("title and price blocks are visible", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    await expect(page.locator(".pdp-title")).toBeVisible();
    await expect(page.locator("price-display .pdp-price__amount")).toBeVisible();
  });
});

test.describe("PDP — media gallery", () => {
  test("active slide is shown and others are hidden", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const slides = page.locator(".pdp__main-media-slide");
    const count = await slides.count();
    if (count === 0) {
      // Product has no media → placeholder rendered instead. That's an expected
      // graceful state, not a failure.
      const placeholder = page.locator(".pdp__main-media--placeholder");
      await expect(placeholder).toBeVisible();
      return;
    }
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(page.locator(".pdp__main-media-slide.is-active").first()).toBeVisible();
  });

  test("thumbnail click swaps the active main slide", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const thumbs = page.locator(".pdp__thumb");
    const count = await thumbs.count();
    if (count < 2) test.skip(true, "Product has fewer than 2 media — nothing to swap");
    const firstActiveId = await page
      .locator(".pdp__main-media-slide.is-active")
      .first()
      .getAttribute("data-media-id");
    await thumbs.nth(1).click();
    await page.waitForTimeout(150);
    const newActiveId = await page
      .locator(".pdp__main-media-slide.is-active")
      .first()
      .getAttribute("data-media-id");
    expect(newActiveId).not.toBe(firstActiveId);
  });
});

test.describe("PDP — option selectors", () => {
  test("color swatch click updates the variant ID in the form", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const swatches = page.locator(".pdp-color__swatch:not(.is-unavailable)");
    const count = await swatches.count();
    if (count < 2) test.skip(true, "Product has fewer than 2 available colors");
    const variantInputBefore = await page.locator('input[name="id"]').first().inputValue();
    await swatches.nth(1).click();
    await page.waitForTimeout(200);
    const variantInputAfter = await page.locator('input[name="id"]').first().inputValue();
    expect(variantInputAfter).not.toBe(variantInputBefore);
  });

  test("size button click updates aria-pressed and active state", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const sizes = page.locator(".pdp-size__option:not(.is-unavailable):not([disabled])");
    const count = await sizes.count();
    if (count < 2) test.skip(true, "Product has fewer than 2 available sizes");
    await sizes.nth(1).click();
    await expect(sizes.nth(1)).toHaveClass(/is-active/);
    await expect(sizes.nth(1)).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("PDP — fit slider", () => {
  test("fit marker is positioned (0–100%)", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const marker = page.locator(".pdp-fit__marker").first();
    if (await marker.count() === 0) test.skip(true, "Fit slider block not rendered");
    const style = await marker.getAttribute("style");
    expect(style).toMatch(/left:\s*\d+(\.\d+)?%/);
  });

  test("fit labels are all visible", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const labels = page.locator(".pdp-fit__labels span");
    if (await labels.count() === 0) test.skip(true, "Fit slider block not rendered");
    expect(await labels.count()).toBe(3);
  });
});

test.describe("PDP — accordion", () => {
  test("clicking an accordion summary toggles open state", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const items = page.locator(".pdp-accordion-item");
    if (await items.count() === 0) test.skip(true, "No accordion items");
    const first = items.first();
    const wasOpen = await first.evaluate((el) => (el as HTMLDetailsElement).open);
    await first.locator(".pdp-accordion-item__summary").click();
    await page.waitForTimeout(100);
    const isOpen = await first.evaluate((el) => (el as HTMLDetailsElement).open);
    expect(isOpen).toBe(!wasOpen);
  });
});

test.describe("PDP — favorite/wishlist", () => {
  test("favorite toggle persists via aria-pressed", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const fav = page.locator(".pdp-favorite").first();
    if (await fav.count() === 0) test.skip(true, "Favorite button not enabled");
    const before = await fav.getAttribute("aria-pressed");
    await fav.click();
    await page.waitForTimeout(100);
    const after = await fav.getAttribute("aria-pressed");
    expect(after).not.toBe(before);
  });
});

test.describe("PDP — buy button", () => {
  test("add to cart button is present and not disabled when in stock", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const btn = page.locator("[data-add-button]");
    await expect(btn).toBeVisible();
    const disabled = await btn.getAttribute("disabled");
    expect(disabled).toBeNull();
  });
});

test.describe("PDP — delivery info", () => {
  test("delivery date is computed and rendered", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const dateEl = page.locator("[data-delivery-date]").first();
    if (await dateEl.count() === 0) test.skip(true, "Delivery date block not enabled");
    const text = await dateEl.textContent();
    expect(text?.trim()).not.toBe("—");
    expect(text?.length || 0).toBeGreaterThan(2);
  });
});

test.describe("PDP — no horizontal scroll", () => {
  test("no horizontal overflow at 1440 desktop or 390 mobile", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
