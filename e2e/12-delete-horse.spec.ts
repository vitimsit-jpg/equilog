import { test, expect } from "@playwright/test";

// Juvenis le Romain — cheval de test pour la suppression
const HORSE_ID = "e3e81b35-bd07-4bba-b301-0a6a59c7ec65";
const HORSE_NAME = "Juvenis le Romain";

test.describe("Flux suppression cheval", () => {
  test("le bouton supprimer existe sur la fiche cheval", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}`);
    await page.waitForLoadState("networkidle");
    const deleteBtn = page.locator("button[title='Supprimer ce cheval']");
    await expect(deleteBtn).toBeVisible({ timeout: 15000 });
  });

  test("la modale de confirmation s'ouvre et demande le nom", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}`);
    await page.waitForLoadState("networkidle");
    await page.locator("button[title='Supprimer ce cheval']").click();

    // Modale de confirmation visible
    await expect(page.getByText(/irréversible/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(`Supprimer ${HORSE_NAME}`)).toBeVisible();

    // Bouton Supprimer désactivé tant que le nom n'est pas tapé
    const confirmBtn = page.getByRole("button", { name: /supprimer/i }).last();
    await expect(confirmBtn).toBeDisabled();
  });

  test("mauvais nom → bouton reste désactivé", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}`);
    await page.waitForLoadState("networkidle");
    await page.locator("button[title='Supprimer ce cheval']").click();

    // Taper un mauvais nom
    await page.fill('input[placeholder="' + HORSE_NAME + '"]', "Mauvais Nom");
    const confirmBtn = page.getByRole("button", { name: /supprimer/i }).last();
    await expect(confirmBtn).toBeDisabled();
  });

  test("annuler ferme la modale sans supprimer", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}`);
    await page.waitForLoadState("networkidle");
    await page.locator("button[title='Supprimer ce cheval']").click();
    await expect(page.getByText(/irréversible/i)).toBeVisible({ timeout: 5000 });

    // Cliquer Annuler
    await page.getByRole("button", { name: /annuler/i }).click();
    // Modale fermée
    await expect(page.getByText(/irréversible/i)).not.toBeVisible({ timeout: 3000 });
    // Toujours sur la fiche cheval
    await expect(page).toHaveURL(new RegExp(HORSE_ID));
  });

  test("suppression complète — nom correct → supprime et redirige", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}`);
    await page.waitForLoadState("networkidle");
    await page.locator("button[title='Supprimer ce cheval']").click();

    // Taper le bon nom
    await page.fill('input[placeholder="' + HORSE_NAME + '"]', HORSE_NAME);
    const confirmBtn = page.getByRole("button", { name: /supprimer/i }).last();
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Toast de succès + redirection vers dashboard
    await expect(page.getByText(/supprimé/i)).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });
});
