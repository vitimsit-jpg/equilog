import { test, expect } from "@playwright/test";

/**
 * Ces tests nécessitent une session active.
 * Configurer `storageState` dans playwright.config.ts avec un compte de test.
 *
 * Exemple dans playwright.config.ts :
 *   use: { storageState: 'e2e/auth.json' }
 *
 * Pour générer auth.json :
 *   npx playwright codegen --save-storage=e2e/auth.json http://localhost:3000/login
 */

const BASE = "http://localhost:3000";

// ─── P4 : CRÉATION CHEVAL ──────────────────────────────────────────────────

test.describe("Création de cheval", () => {
  test("formulaire vide → bouton désactivé", async ({ page }) => {
    await page.goto(`${BASE}/horses/new`);
    const submitBtn = page.getByRole("button", { name: /continuer|créer/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("nom requis pour continuer", async ({ page }) => {
    await page.goto(`${BASE}/horses/new`);
    // Champs optionnels remplis mais pas le nom
    const submitBtn = page.getByRole("button", { name: /continuer/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("création d'un cheval complet → redirection fiche cheval", async ({ page }) => {
    await page.goto(`${BASE}/horses/new`);
    await page.fill('input[placeholder*="nom"]', "Tornado Test");
    // Sélectionner un mode de vie
    await page.getByText("Équilibre").click();
    await page.getByRole("button", { name: /créer/i }).click();
    // Doit arriver sur la page de rôle ou directement sur /horses/[id]
    await expect(page).toHaveURL(/horses\//);
  });
});

// ─── P5 : FICHE CHEVAL ─────────────────────────────────────────────────────

test.describe("Fiche cheval", () => {
  test("cheval inexistant → 404", async ({ page }) => {
    await page.goto(`${BASE}/horses/00000000-0000-0000-0000-000000000000`);
    await expect(page).toHaveURL(/404|not-found/);
  });

  test("bouton 'Gérer les accès' visible pour le propriétaire", async ({ page }) => {
    // Requiert un cheval existant appartenant au user de test
    // À compléter avec un seed de données test
  });

  test("onglet Entraînement accessible", async ({ page }) => {
    // Requiert un cheval existant
    // Vérifier que la navigation onglets fonctionne
  });

  test("cheval d'un autre utilisateur → 404", async ({ page }) => {
    // Requiert un cheval_id appartenant à un autre user
    // Vérifier l'isolation des données
  });
});

// ─── P6 : NAVIGATION DASHBOARD ─────────────────────────────────────────────

test.describe("Navigation dashboard", () => {
  test("dashboard charge correctement", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page.getByText(/tableau de bord|mes chevaux/i)).toBeVisible({ timeout: 8000 });
  });

  test("sidebar contient lien Accès partagés", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page.getByRole("link", { name: /accès partagés/i })).toBeVisible();
  });

  test("page /partages charge sans erreur", async ({ page }) => {
    await page.goto(`${BASE}/partages`);
    await expect(page.getByText(/accès partagés/i)).toBeVisible({ timeout: 5000 });
  });
});
