import { test, expect } from "@playwright/test";

// Jackson d Harryj — cheval de test principal
const HORSE_ID = "0da6e65c-61a9-4b05-9b12-f8488f593fc6";

test.describe("Journal de Travail", () => {
  test("page travail charge correctement", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/training`);
    await expect(page).toHaveURL(/training/, { timeout: 15000 });
  });

  test("le strip semaine affiche les jours", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/training`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Lun")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Dim")).toBeVisible();
  });

  test("section compléments visible", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/training`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/compléments/i)).toBeVisible({ timeout: 15000 });
  });
});
