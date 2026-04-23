import { test, expect } from "@playwright/test";

const HORSE_ID = "0da6e65c-61a9-4b05-9b12-f8488f593fc6"; // Jackson

/**
 * Visual regression tests — capture des screenshots de référence.
 * Premier run : crée les snapshots dans e2e/__snapshots__/
 * Runs suivants : compare pixel par pixel avec un seuil de tolérance.
 *
 * Pour mettre à jour les snapshots de référence :
 *   npx playwright test 13-visual --update-snapshots
 */

test.describe("Visual regression — pages clés", () => {
  test("login page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login.png", { maxDiffPixelRatio: 0.05 });
  });

  test("register page", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("register.png", { maxDiffPixelRatio: 0.05 });
  });
});

test.describe("Visual regression — pages authentifiées", () => {
  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Attendre que le contenu soit chargé (pas les skeletons)
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("dashboard.png", { maxDiffPixelRatio: 0.05 });
  });

  test("fiche cheval", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("horse-profile.png", { maxDiffPixelRatio: 0.05 });
  });

  test("training page", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/training`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("training.png", { maxDiffPixelRatio: 0.05 });
  });

  test("competitions page", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/competitions`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("competitions.png", { maxDiffPixelRatio: 0.05 });
  });

  test("health page", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/health`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("health.png", { maxDiffPixelRatio: 0.05 });
  });
});
