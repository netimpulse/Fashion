import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { QA, withTheme } from "../fixtures";

const PDP_URL = withTheme(QA.paths.product);

test.describe("Streetwear PDP", () => {
  test("rendert ohne console- oder page-errors", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    const response = await page.goto(PDP_URL, { waitUntil: "networkidle" });
    expect(response?.ok(), `HTTP-Status: ${response?.status()}`).toBe(true);

    const dir = "qa-screenshots";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, `${testInfo.project.name}-pdp.png`),
      fullPage: true,
    });

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Section, Titel und Preis sind sichtbar", async ({ page }) => {
    await page.goto(PDP_URL);

    const section = page.locator("[data-section-type='product']").first();
    await expect(section).toBeVisible();

    const title = section.locator(".product__title").first();
    await expect(title).toBeVisible();
    const titleText = (await title.textContent())?.trim() ?? "";
    expect(titleText.length).toBeGreaterThan(0);

    const priceWrap = section.locator("[data-price-wrapper]").first();
    await expect(priceWrap).toBeVisible();
    const priceText = (await priceWrap.textContent())?.trim() ?? "";
    expect(priceText.length).toBeGreaterThan(0);
  });

  test("Media-Galerie hat ein aktives Slide und (falls vorhanden) klickbare Thumbs", async ({ page }) => {
    await page.goto(PDP_URL);
    const gallery = page.locator("media-gallery").first();
    await expect(gallery).toBeVisible();

    const activeSlides = gallery.locator(".product-gallery__slide.is-active");
    await expect(activeSlides).toHaveCount(1);

    const thumbCount = await gallery.locator("[data-thumb]").count();
    if (thumbCount > 1) {
      const firstActive = await gallery
        .locator("[data-thumb].is-active")
        .first()
        .getAttribute("data-media-id");

      const secondThumb = gallery.locator("[data-thumb]").nth(1);
      await secondThumb.click();
      await expect(secondThumb).toHaveClass(/is-active/);
      const newActive = await gallery
        .locator("[data-thumb].is-active")
        .first()
        .getAttribute("data-media-id");
      expect(newActive).not.toBe(firstActive);
    }
  });

  test("Variant-Picker: Klick auf andere Variante updated Auswahl-Label (wenn Optionen vorhanden)", async ({ page }) => {
    await page.goto(PDP_URL);
    const picker = page.locator("variant-picker").first();
    const exists = await picker.count();
    test.skip(exists === 0, "Produkt hat keine Optionen");

    const firstGroup = picker.locator(".variant-picker__group").first();
    const labels = firstGroup.locator(".variant-picker__option");
    const labelCount = await labels.count();
    test.skip(labelCount < 2, "Nur eine Option im ersten Group");

    const initial = (await firstGroup.locator(".variant-picker__legend-value").textContent())?.trim();
    await labels.nth(1).click();
    await expect(firstGroup.locator(".variant-picker__legend-value")).not.toHaveText(initial ?? "", { timeout: 3000 });
  });

  test("Quantity-Stepper: + erhoeht, - senkt nicht unter min", async ({ page }) => {
    await page.goto(PDP_URL);
    const stepper = page.locator("quantity-stepper").first();
    await expect(stepper).toBeVisible();

    const input = stepper.locator("[data-quantity-input]");
    await expect(input).toHaveValue("1");

    await stepper.locator("[data-quantity-increase]").click();
    await expect(input).toHaveValue("2");

    await stepper.locator("[data-quantity-decrease]").click();
    await expect(input).toHaveValue("1");

    // Should clamp at min
    await stepper.locator("[data-quantity-decrease]").click();
    await expect(input).toHaveValue("1");
  });

  test("Add-to-Cart Klick triggert cart.added Event (falls Variante verfuegbar)", async ({ page }) => {
    await page.goto(PDP_URL);
    const atc = page.locator("[data-atc-button]").first();
    await expect(atc).toBeVisible();

    const disabled = await atc.isDisabled();
    test.skip(disabled, "Variante ist sold-out — ATC erwartungsgemaess disabled");

    const cartAddedPromise = page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const t = setTimeout(() => resolve(false), 5000);
        document.addEventListener("cart:added", () => {
          clearTimeout(t);
          resolve(true);
        }, { once: true });
      });
    });

    await atc.click();
    const fired = await cartAddedPromise;
    expect(fired).toBe(true);
  });

  test("Collapsible-Row oeffnet sich bei Klick", async ({ page }) => {
    await page.goto(PDP_URL);
    const collapsibles = page.locator(".product__collapsible");
    const count = await collapsibles.count();
    test.skip(count === 0, "Keine Collapsible-Rows konfiguriert");

    const first = collapsibles.first();
    const isOpenBefore = await first.evaluate((el) => (el as HTMLDetailsElement).open);
    await first.locator(".product__collapsible-summary").click();
    const isOpenAfter = await first.evaluate((el) => (el as HTMLDetailsElement).open);
    expect(isOpenAfter).toBe(!isOpenBefore);
  });

  test("Mobile (375px): kein horizontaler Scroll, Layout ist gestapelt", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(PDP_URL);

    const hOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(hOverflow).toBeLessThanOrEqual(1);

    const mediaBox = await page.locator(".product__media-col").first().boundingBox();
    const infoBox = await page.locator(".product__info-col").first().boundingBox();
    expect(mediaBox && infoBox).toBeTruthy();
    if (mediaBox && infoBox) {
      expect(infoBox.y).toBeGreaterThan(mediaBox.y);
    }
  });
});
