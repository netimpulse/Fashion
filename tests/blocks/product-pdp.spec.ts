import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { QA, withTheme } from "../fixtures";

/**
 * PDP Visual + Functional Tests
 *
 * Hits the QA fixture product (essential-tee). Tests:
 * - renders without console / page errors
 * - title, price, ATC button visible
 * - gallery thumb click switches main media
 * - variant option click updates URL + hidden id input
 * - quantity +/- buttons mutate qty input
 * - ATC button submits AJAX (POST /cart/add.js) and shows success state
 * - accordion details open/close
 */

test.describe("Product Detail Page", () => {
  test("renders without console / page errors", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    const response = await page.goto(withTheme(QA.paths.product), { waitUntil: "networkidle" });
    expect(response?.ok(), `HTTP-Status: ${response?.status()}`).toBe(true);

    const dir = "qa-screenshots";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `${testInfo.project.name}-pdp.png`), fullPage: true });

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("title, price and ATC button visible", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    await expect(page.locator(".pdp__title")).toBeVisible();
    await expect(page.locator(".pdp__price-current").first()).toBeVisible();
    const atc = page.locator("[data-atc]");
    await expect(atc).toBeVisible();
    const atcText = (await atc.textContent())?.trim() || "";
    expect(atcText.length).toBeGreaterThan(0);
  });

  test("gallery thumbnail click switches main media", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const thumbs = page.locator("[data-thumb]");
    const thumbCount = await thumbs.count();
    if (thumbCount < 2) test.skip(true, "Product hat nur 1 Media-Item");

    const secondThumb = thumbs.nth(1);
    const targetId = await secondThumb.getAttribute("data-target-id");
    await secondThumb.click();

    const activeMedia = page.locator(`.pdp__media[data-media-id="${targetId}"]`);
    await expect(activeMedia).toHaveClass(/is-active/);
    await expect(secondThumb).toHaveClass(/is-active/);
  });

  test("variant option click updates hidden id input and URL", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const inputs = page.locator("[data-option-input]:not(:checked):not(:disabled)");
    const count = await inputs.count();
    if (count === 0) test.skip(true, "Product hat nur eine Variante");

    const target = inputs.first();
    const labelId = await target.getAttribute("id");
    if (!labelId) throw new Error("Option input ohne id");
    await page.locator(`label[for="${labelId}"]`).click();

    const hidden = page.locator("[data-variant-id-input]");
    await expect.poll(async () => (await hidden.inputValue()).length).toBeGreaterThan(0);

    await expect.poll(() => page.url()).toContain("variant=");
  });

  test("quantity + / − buttons mutate quantity input", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const qty = page.locator("[data-qty-input]");
    await expect(qty).toHaveValue("1");

    await page.locator("[data-qty-plus]").click();
    await expect(qty).toHaveValue("2");

    await page.locator("[data-qty-plus]").click();
    await expect(qty).toHaveValue("3");

    await page.locator("[data-qty-minus]").click();
    await expect(qty).toHaveValue("2");

    await page.locator("[data-qty-minus]").click();
    await page.locator("[data-qty-minus]").click();
    await expect(qty).toHaveValue("1"); // clamped at min
  });

  test("ATC submits via AJAX and shows success feedback", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));

    const cartReq = page.waitForResponse(
      (resp) => resp.url().includes("/cart/add.js") && resp.request().method() === "POST",
      { timeout: 10_000 }
    );

    await page.locator("[data-atc]").click();
    const resp = await cartReq;
    expect(resp.status(), `cart/add status ${resp.status()}`).toBeLessThan(400);

    const feedback = page.locator("[data-form-feedback]");
    await expect(feedback).toHaveAttribute("data-state", "success", { timeout: 5_000 });
  });

  test("accordion: description detail toggles open/close", async ({ page }) => {
    await page.goto(withTheme(QA.paths.product));
    const detail = page.locator(".pdp__detail").first();
    const isOpen = await detail.getAttribute("open");
    const summary = detail.locator(".pdp__detail-summary");

    if (isOpen !== null) {
      await summary.click();
      await expect(detail).not.toHaveAttribute("open", "");
      await summary.click();
      await expect(detail).toHaveAttribute("open", "");
    } else {
      await summary.click();
      await expect(detail).toHaveAttribute("open", "");
    }
  });

  test("mobile viewport: no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(withTheme(QA.paths.product));
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
