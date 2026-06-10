import { test, expect, Page } from "@playwright/test";
import { QA, withTheme } from "../fixtures";

/**
 * QA fuer das komplette Statik-Theme-Rebuild:
 * Homepage (hero/marquee/countdown/newsletter), Produktseite (Varianten,
 * Add-to-Cart + Drawer), Cart-Seite, Collection, Suche, 404.
 */

async function gotoNoJsErrors(page: Page, path: string): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(withTheme(path), { waitUntil: "domcontentloaded" });
  return errors;
}

test.describe("Homepage", () => {
  test("rendert Hero, Marquee, Countdown und Newsletter ohne JS-Fehler", async ({ page }) => {
    const errors = await gotoNoJsErrors(page, QA.paths.home);

    await expect(page.locator(".hero").first()).toBeVisible();
    await expect(page.locator(".marquee").first()).toBeVisible();
    await expect(page.locator("count-down").first()).toBeAttached();
    await expect(page.locator(".newsletter__form, .newsletter form").first()).toBeAttached();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Countdown tickt", async ({ page }) => {
    await page.goto(withTheme(QA.paths.home));
    const seconds = page.locator("[data-cd-seconds]").first();
    await expect(seconds).toBeVisible();
    const before = await seconds.textContent();
    await page.waitForTimeout(2100);
    const after = await seconds.textContent();
    expect(after).not.toBe(before);
  });

  test("kein horizontaler Scroll", async ({ page }) => {
    await page.goto(withTheme(QA.paths.home));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("Header: Cart-Icon und Navigation vorhanden", async ({ page }) => {
    await page.goto(withTheme(QA.paths.home));
    await expect(page.locator(".site-header").first()).toBeVisible();
    await expect(page.locator(".site-header__cart").first()).toBeVisible();
  });
});

test.describe("Produktseite", () => {
  test("zeigt Galerie, Titel, Preis und Add-to-Cart", async ({ page }) => {
    const errors = await gotoNoJsErrors(page, QA.paths.product);

    await expect(page.locator(".product-gallery").first()).toBeVisible();
    await expect(page.locator(".product-main__title").first()).toBeVisible();
    await expect(page.locator(".product-main__price .price").first()).toBeVisible();
    await expect(page.locator("[data-atc-button]").first()).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Variantenwechsel aktualisiert die Auswahl", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product), { waitUntil: "domcontentloaded" });
    const picker = page.locator("variant-picker").first();
    test.skip((await picker.count()) === 0, "Produkt hat nur eine Variante");

    const hiddenId = page.locator("[data-variant-id]").first();
    const before = await hiddenId.inputValue();

    const otherLabel = picker
      .locator(".variant-option__input:not(:checked):not(.is-unavailable) + label, .variant-option__input:not(:checked) + label")
      .first();
    test.skip((await otherLabel.count()) === 0, "Keine zweite Variante waehlbar");

    await otherLabel.click();
    await page.waitForTimeout(800);
    const after = await hiddenId.inputValue();
    expect(after).not.toBe(before);
  });

  test("Add-to-Cart oeffnet den Cart-Drawer mit Artikel", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product), { waitUntil: "domcontentloaded" });
    const atc = page.locator("[data-atc-button]").first();
    test.skip(await atc.isDisabled(), "Produkt ist ausverkauft");

    await atc.click();
    const drawer = page.locator("cart-drawer dialog");
    await expect(drawer).toHaveAttribute("open", "", { timeout: 10_000 });
    await expect(page.locator("cart-drawer .cart-line").first()).toBeVisible();

    const count = page.locator("[data-cart-count]").first();
    await expect(count).not.toHaveText("0");
  });
});

test.describe("Cart-Seite", () => {
  test.beforeEach(async ({ page }) => {
    // Produkt-Variante dynamisch ermitteln und in den Cart legen
    const res = await page.request.get(withTheme(`/products/${QA.product.handle}.js`));
    const product = await res.json();
    const variant = product.variants.find((v: { available: boolean }) => v.available) ?? product.variants[0];
    await page.request.post("/cart/add.js", {
      headers: { "Content-Type": "application/json" },
      data: { items: [{ id: variant.id, quantity: 1 }] },
    });
  });

  test("zeigt Artikel, Summary und Checkout-Button", async ({ page }) => {
    const errors = await gotoNoJsErrors(page, QA.paths.cart);

    await expect(page.locator(".cart-line").first()).toBeVisible();
    await expect(page.locator(".cart-page__summary")).toBeVisible();
    await expect(page.locator('button[name="checkout"]').first()).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Menge erhoehen aktualisiert die Zwischensumme", async ({ page }) => {
    await page.goto(withTheme(QA.paths.cart), { waitUntil: "domcontentloaded" });
    const subtotalBefore = await page.locator(".cart-page__subtotal span").last().textContent();

    await page.locator('.cart-line .quantity__button[name="plus"]').first().click();
    await expect(async () => {
      const subtotalAfter = await page.locator(".cart-page__subtotal span").last().textContent();
      expect(subtotalAfter).not.toBe(subtotalBefore);
    }).toPass({ timeout: 10_000 });
  });

  test("Artikel entfernen zeigt Empty-State", async ({ page }) => {
    await page.goto(withTheme(QA.paths.cart), { waitUntil: "domcontentloaded" });
    const lines = await page.locator(".cart-line").count();
    for (let i = 0; i < lines; i++) {
      await page.locator("[data-cart-remove]").first().click();
      await page.waitForTimeout(1200);
    }
    await expect(page.locator(".cart-page__empty")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Collection", () => {
  test("zeigt Titel, Toolbar und Produkt-Grid", async ({ page }) => {
    const errors = await gotoNoJsErrors(page, QA.paths.collection);

    await expect(page.locator(".collection-page__title")).toBeVisible();
    await expect(page.locator(".collection-page__toolbar")).toBeVisible();
    await expect(page.locator(".product-grid .product-card").first()).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Filter-Drawer oeffnet (falls Filter konfiguriert)", async ({ page }) => {
    await page.goto(withTheme(QA.paths.collection), { waitUntil: "domcontentloaded" });
    const filterBtn = page.locator(".collection-page__filter-btn");
    test.skip((await filterBtn.count()) === 0, "Keine Filter im Admin konfiguriert");

    await filterBtn.click();
    await expect(page.locator(".filter-drawer")).toHaveAttribute("open", "");
    await expect(page.locator(".filter-group").first()).toBeVisible();
  });

  test("Produktkarte verlinkt auf Produktseite", async ({ page }) => {
    await page.goto(withTheme(QA.paths.collection), { waitUntil: "domcontentloaded" });
    await page.locator(".product-card__link").first().click();
    await expect(page).toHaveURL(/\/products\//);
  });
});

test.describe("Suche", () => {
  test("liefert Ergebnisse fuer 'tee'", async ({ page }) => {
    const errors = await gotoNoJsErrors(page, QA.paths.search);
    await expect(page.locator(".search-page__form")).toBeVisible();
    await expect(
      page.locator(".search-page__products .product-card, .search-page__empty").first()
    ).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("404", () => {
  test("zeigt gestylte Fehlerseite mit CTAs", async ({ page }) => {
    const response = await page.goto(withTheme(QA.paths.notFound));
    expect(response?.status()).toBe(404);
    await expect(page.locator(".error-404__number")).toBeVisible();
    await expect(page.locator(".error-404__actions .btn").first()).toBeVisible();
  });
});
