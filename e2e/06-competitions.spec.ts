import { test, expect } from "@playwright/test";

/**
 * Tests Module Concours — golden path
 * Requiert un cheval existant dans le compte de test.
 */

test.describe("Module Concours", () => {
  test("naviguer vers l'onglet Concours", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /concours/i }).click();
    await expect(page).toHaveURL(/competitions/);
    await expect(page.getByText(/concours/i)).toBeVisible({ timeout: 8000 });
  });

  test("ouvrir le formulaire 'Ajouter un concours'", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /concours/i }).click();
    await page.waitForURL("**/competitions");
    const addBtn = page.getByRole("button", { name: /ajouter/i });
    await addBtn.click();
    await expect(page.getByText(/nouveau concours/i)).toBeVisible({ timeout: 5000 });
  });

  test("formulaire — statut Passé affiche les champs résultats", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /concours/i }).click();
    await page.waitForURL("**/competitions");
    await page.getByRole("button", { name: /ajouter/i }).click();
    // Cliquer sur "Passé"
    await page.getByRole("button", { name: /passé/i }).click();
    // Les champs résultats doivent apparaître
    await expect(page.getByText(/résultats/i)).toBeVisible();
    await expect(page.getByText(/participation/i)).toBeVisible();
  });

  test("formulaire — statut Éliminé masque classement", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /concours/i }).click();
    await page.waitForURL("**/competitions");
    await page.getByRole("button", { name: /ajouter/i }).click();
    await page.getByRole("button", { name: /passé/i }).click();
    // Sélectionner Éliminé
    await page.getByRole("button", { name: /éliminé/i }).click();
    // Classement ne doit pas être visible
    await expect(page.getByLabel(/classement/i)).not.toBeVisible();
    // Motif doit apparaître
    await expect(page.getByText(/motif/i)).toBeVisible();
  });

  test("formulaire — niveau obligatoire si Passé", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /concours/i }).click();
    await page.waitForURL("**/competitions");
    await page.getByRole("button", { name: /ajouter/i }).click();
    // Remplir le minimum sans niveau
    await page.fill('input[value=""]', "Test Concours E2E");
    await page.getByRole("button", { name: /enregistrer/i }).click();
    // Doit afficher le message d'erreur
    await expect(page.getByText(/niveau/i)).toBeVisible({ timeout: 3000 });
  });

  test("timeline de progression visible si concours existants", async ({ page }) => {
    await page.goto("/dashboard");
    const firstHorseLink = page.locator("a[href*='/horses/']").first();
    await firstHorseLink.click();
    await page.getByRole("link", { name: /concours/i }).click();
    await page.waitForURL("**/competitions");
    // Si des concours existent, la timeline doit être visible
    const timeline = page.getByText(/progression/i);
    const hasCompetitions = await page.getByText(/concours disputés/i).isVisible().catch(() => false);
    if (hasCompetitions) {
      await expect(timeline).toBeVisible({ timeout: 5000 });
    }
  });
});
