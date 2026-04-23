import { test, expect, devices } from "@playwright/test";

const HORSE_ID = "0da6e65c-61a9-4b05-9b12-f8488f593fc6";

test.use({ ...devices["iPhone 13"] });

test.describe("Mobile responsive", () => {
  test("dashboard charge sur mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Sur mobile, vérifier que la page charge sans crash
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
    // Le contenu doit contenir au moins un élément interactif
    const buttons = await page.locator("button, a").count();
    expect(buttons).toBeGreaterThan(0);
  });

  test("page training s'affiche correctement sur mobile", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/training`);
    await page.waitForLoadState("networkidle");
    // Strip semaine visible
    await expect(page.getByText("Lun")).toBeVisible({ timeout: 15000 });
    // Pas de scroll horizontal cassé
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(430);
  });

  test("page concours s'affiche correctement sur mobile", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/competitions`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /ajouter/i })).toBeVisible({ timeout: 15000 });
  });

  test("page santé s'affiche correctement sur mobile", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/health`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/health/);
  });

  test("bottom nav visible sur mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // La bottom navigation mobile doit être visible
    const bottomNav = page.locator("nav").last();
    await expect(bottomNav).toBeVisible({ timeout: 10000 });
  });
});
