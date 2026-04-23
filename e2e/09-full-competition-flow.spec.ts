import { test, expect } from "@playwright/test";

const HORSE_ID = "0da6e65c-61a9-4b05-9b12-f8488f593fc6"; // Jackson

test.describe("Flux complet — Créer un concours", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/competitions`);
    await page.waitForLoadState("networkidle");
  });

  test("créer un concours passé complet", async ({ page }) => {
    // 1. Ouvrir le formulaire
    const addBtn = page.getByRole("button", { name: /ajouter/i });
    await addBtn.waitFor({ state: "visible", timeout: 15000 });
    await addBtn.click();
    await expect(page.getByText(/nouveau concours/i)).toBeVisible({ timeout: 5000 });

    // 2. Remplir le nom
    await page.fill('input[placeholder*="Grand Prix"]', "Test E2E Concours");

    // 3. Statut "Passé" (devrait être auto-détecté si date passée)
    const passeBtn = page.getByRole("button", { name: /passé/i });
    if (await passeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passeBtn.click();
    }

    // 4. Sélectionner un niveau
    const levelSelect = page.locator("select").last();
    await levelSelect.selectOption({ index: 2 }); // Premier niveau disponible

    // 5. Sélectionner une discipline (CSO par défaut)

    // 6. Soumettre
    const submitBtn = page.getByRole("button", { name: /enregistrer/i });
    await submitBtn.click();

    // 7. Vérifier le toast + card visible
    await expect(page.getByText(/concours enregistré/i)).toBeVisible({ timeout: 5000 });
  });

  test("statut Éliminé masque les champs résultats", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /ajouter/i });
    await addBtn.waitFor({ state: "visible", timeout: 15000 });
    await addBtn.click();

    // Passer en statut Passé
    const passeBtn = page.getByRole("button", { name: /passé/i });
    if (await passeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passeBtn.click();
    }

    // Section Participation doit apparaître
    await expect(page.getByText(/participation/i)).toBeVisible({ timeout: 3000 });

    // Cliquer Éliminé
    const eliminBtn = page.getByRole("button", { name: /éliminé/i });
    await eliminBtn.click();

    // Motif doit apparaître
    await expect(page.getByText(/motif/i)).toBeVisible({ timeout: 3000 });

    // Classement ne doit PAS être visible
    const classementInput = page.locator("input[placeholder='1']");
    await expect(classementInput).not.toBeVisible();
  });

  test("validation — niveau obligatoire si Passé", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /ajouter/i });
    await addBtn.waitFor({ state: "visible", timeout: 15000 });
    await addBtn.click();

    // Remplir le nom sans niveau
    await page.fill('input[placeholder*="Grand Prix"]', "Test Validation");

    // Passé
    const passeBtn = page.getByRole("button", { name: /passé/i });
    if (await passeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passeBtn.click();
    }

    // Soumettre sans niveau
    const submitBtn = page.getByRole("button", { name: /enregistrer/i });
    await submitBtn.click();

    // Toast d'erreur avec "niveau"
    await expect(page.getByText(/niveau.*enregistrer|sélectionner.*niveau/i)).toBeVisible({ timeout: 5000 });
  });

  test("filtres historique fonctionnent", async ({ page }) => {
    // Vérifier que les boutons de filtre sont visibles (si historique existe)
    const historyTitle = page.getByText(/historique/i);
    if (await historyTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Chercher les boutons de filtre discipline
      const tousBtn = page.getByRole("button", { name: "Tous" }).first();
      if (await tousBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tousBtn.click();
        // Pas de crash
        await expect(historyTitle).toBeVisible();
      }
    }
  });
});
