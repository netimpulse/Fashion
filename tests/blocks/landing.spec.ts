import { test, expect } from "@playwright/test";
import { QA, withTheme } from "../fixtures";

/**
 * Komponenten-Tests fuer die Fashion-Landingpage-Bloecke.
 * Alle rendern auf der QA-Block-Page (templates/page.qa-block-test.json).
 */
test.describe("Landing blocks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(withTheme(QA.paths.qaBlock), { waitUntil: "networkidle" });
  });

  test("editorial hero rendert mit sichtbarer Headline", async ({ page }) => {
    const hero = page.locator("editorial-hero").first();
    await expect(hero).toBeVisible();
    await expect(hero.locator(".ed-hero__heading")).toBeVisible();
    // Kinetic reveal: IntersectionObserver muss is-visible setzen.
    await expect(hero).toHaveClass(/is-visible/, { timeout: 5000 });
  });

  test("marquee ist vorhanden und full-width", async ({ page }) => {
    const marquee = page.locator(".marquee").first();
    await expect(marquee).toBeVisible();
    const vw = page.viewportSize()!.width;
    const box = await marquee.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(vw - 2);
  });

  test("drop carousel hat Produktkarten und ist ein Scroll-Container", async ({ page }) => {
    const viewport = page.locator(".drops__viewport").first();
    await expect(viewport).toBeVisible();
    const cards = viewport.locator(".drops__item");
    expect(await cards.count()).toBeGreaterThan(0);

    // Unabhaengig von der Produktanzahl der Fixture-Collection muss der
    // Viewport horizontal scrollbar konfiguriert sein.
    const overflowX = await viewport.evaluate(
      (el) => getComputedStyle(el).overflowX
    );
    expect(["auto", "scroll"]).toContain(overflowX);
  });

  test("lookbook hotspot oeffnet die Produktkarte beim Klick", async ({ page }) => {
    const hotspot = page.locator(".lookbook-hotspot").first();
    const pin = hotspot.locator(".lookbook-hotspot__pin");
    await expect(pin).toBeVisible();
    await expect(pin).toHaveAttribute("aria-expanded", "false");
    await pin.click();
    await expect(pin).toHaveAttribute("aria-expanded", "true");
    await expect(hotspot.locator(".lookbook-hotspot__card")).toBeVisible();
  });

  test("bento grid zeigt mehrere Kacheln", async ({ page }) => {
    const tiles = page.locator(".bento-tile");
    expect(await tiles.count()).toBeGreaterThanOrEqual(3);
    await expect(tiles.first()).toBeVisible();
  });

  test("style club newsletter ist ausfuellbar", async ({ page }) => {
    const input = page.locator(".club__input").first();
    await expect(input).toBeVisible();
    await input.fill("qa@example.com");
    await expect(input).toHaveValue("qa@example.com");
    await expect(page.locator(".club__btn").first()).toBeVisible();
  });

  test("kein horizontaler Overflow", async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
  });
});
