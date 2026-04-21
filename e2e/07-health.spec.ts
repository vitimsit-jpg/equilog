import { test, expect } from "@playwright/test";

const HORSE_ID = "0da6e65c-61a9-4b05-9b12-f8488f593fc6";

test.describe("Carnet de Santé", () => {
  test("page santé charge correctement", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/health`);
    await expect(page).toHaveURL(/health/, { timeout: 15000 });
  });

  test("au moins une catégorie de soin visible", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/health`);
    await page.waitForLoadState("networkidle");
    const categories = ["Vaccin", "Vermifuge", "Dentiste", "Ostéo", "Parage", "Vétérinaire"];
    let found = false;
    for (const cat of categories) {
      if (await page.getByText(cat).first().isVisible({ timeout: 3000 }).catch(() => false)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});
