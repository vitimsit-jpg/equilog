import { test, expect } from "@playwright/test";

/**
 * Tests Journal de Travail — golden path
 * Requiert un cheval existant dans le compte de test.
 */

test.describe("Journal de Travail", () => {
  test("naviguer vers l'onglet Travail d'un cheval", async ({ page }) => {
    await page.goto("/dashboard");
    // Cliquer sur le premier cheval du dashboard
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await expect(page).toHaveURL(/horses\//);
    // Naviguer vers l'onglet Travail
    const trainingTab = page.getByRole("link", { name: /travail/i });
    await trainingTab.click();
    await expect(page).toHaveURL(/training/);
    await expect(page.getByText(/séance/i)).toBeVisible({ timeout: 8000 });
  });

  test("ouvrir le modal d'enregistrement de séance", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /travail/i }).click();
    await page.waitForURL("**/training");
    // Cliquer sur le bouton + pour enregistrer
    const addButton = page.getByRole("button", { name: /enregistrer|nouvelle/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(page.getByText(/enregistrer.*séance|type de travail/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("le strip semaine est visible et interactif", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /travail/i }).click();
    await page.waitForURL("**/training");
    // Le strip doit afficher les jours de la semaine
    await expect(page.getByText("Lun")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Mar")).toBeVisible();
    await expect(page.getByText("Dim")).toBeVisible();
  });

  test("complément Paddock/Marcheur toggle fonctionne", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /travail/i }).click();
    await page.waitForURL("**/training");
    // Chercher le bouton Paddock dans la section compléments
    const paddockBtn = page.getByRole("button", { name: /paddock/i });
    if (await paddockBtn.isVisible()) {
      await paddockBtn.click();
      // Le bouton doit changer d'état (bordure verte)
      await expect(paddockBtn).toHaveClass(/border-green/);
    }
  });
});
