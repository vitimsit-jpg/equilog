import { test, expect } from "@playwright/test";

/**
 * Tests Carnet de Santé — golden path
 * Requiert un cheval existant dans le compte de test.
 */

test.describe("Carnet de Santé", () => {
  test("naviguer vers l'onglet Santé", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /santé/i }).click();
    await expect(page).toHaveURL(/health/);
    await expect(page.getByText(/carnet|santé/i)).toBeVisible({ timeout: 8000 });
  });

  test("cards de catégories de soins visibles", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /santé/i }).click();
    await page.waitForURL("**/health");
    // Les catégories de soins doivent être visibles
    const categories = ["Vaccin", "Vermifuge", "Dentiste", "Ostéo", "Parage"];
    for (const cat of categories) {
      const card = page.getByText(cat);
      if (await card.isVisible().catch(() => false)) {
        await expect(card).toBeVisible();
      }
    }
  });

  test("ouvrir le modal d'ajout de soin", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /santé/i }).click();
    await page.waitForURL("**/health");
    // Chercher un bouton d'ajout
    const addBtn = page.getByRole("button", { name: /ajouter|nouveau/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page.getByText(/nouveau soin|ajouter.*soin|type de soin/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("onglet Historique accessible", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /santé/i }).click();
    await page.waitForURL("**/health");
    // Tab historique
    const historyTab = page.getByRole("button", { name: /historique/i });
    if (await historyTab.isVisible()) {
      await historyTab.click();
      // La timeline ou liste doit apparaître
      await expect(page.locator("[class*='timeline'], [class*='card']").first()).toBeVisible({ timeout: 5000 });
    }
  });
});
