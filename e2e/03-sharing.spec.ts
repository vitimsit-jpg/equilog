import { test, expect } from "@playwright/test";

/**
 * Tests du système de partage V2.1
 * Nécessite : compte propriétaire (auth.json) + compte invité (auth-guest.json)
 */

// baseURL est configuré dans playwright.config.ts

// ─── P7 : GESTION DES PARTAGES ─────────────────────────────────────────────

test.describe("Partage — côté propriétaire", () => {
  test("page /partage accessible pour le propriétaire", async ({ page }) => {
    // À compléter avec horse_id de test
    // await page.goto(`/horses/HORSE_ID/partage`);
    // await expect(page.getByText("Gérer les accès")).toBeVisible();
  });

  test("inviter un email invalide → erreur", async ({ page }) => {
    // await page.goto(`/horses/HORSE_ID/partage`);
    // await page.fill('input[type="email"]', "pas-un-email");
    // await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
    // await expect(page.getByText(/email invalide/i)).toBeVisible();
  });

  test("inviter son propre email → erreur", async ({ page }) => {
    // await page.goto(`/horses/HORSE_ID/partage`);
    // await page.fill('input[type="email"]', "mon-email@test.com");
    // await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
    // await expect(page.getByText(/vous ne pouvez pas/i)).toBeVisible();
  });

  test("révoquer un accès → confirmation requise", async ({ page }) => {
    // Vérifier que window.confirm est déclenché
    // page.on('dialog', dialog => dialog.dismiss()); // Cancel
    // Cliquer sur la corbeille
    // Vérifier que l'accès n'est PAS révoqué après cancel
  });

  test("révoquer un accès → confirmation → accès supprimé de la liste", async ({ page }) => {
    // page.on('dialog', dialog => dialog.accept());
    // Cliquer sur la corbeille
    // Vérifier que la ligne disparaît
  });

  test("page partage inaccessible pour un invité", async ({ page }) => {
    // Avec session d'invité (auth-guest.json)
    // await page.goto(`/horses/HORSE_ID/partage`);
    // await expect(page).toHaveURL(/404|not-found/);
  });
});

// ─── P8 : ACCÈS PARTAGÉS ───────────────────────────────────────────────────

test.describe("Partage — côté invité", () => {
  test("page /partages affiche les chevaux partagés", async ({ page }) => {
    // Avec session d'invité ayant un partage actif
    // await page.goto(`/partages`);
    // await expect(page.getByText("Actif")).toBeVisible();
  });

  test("invité peut accéder à la fiche du cheval partagé", async ({ page }) => {
    // await page.goto(`/horses/SHARED_HORSE_ID`);
    // await expect(page.getByText("HORSE_NAME")).toBeVisible();
    // Vérifier que le bouton HorseEditModal n'est PAS visible
    // await expect(page.getByRole("button", { name: /modifier/i })).not.toBeVisible();
  });

  test("invité ne voit pas le bouton 'Gérer les accès'", async ({ page }) => {
    // await page.goto(`/horses/SHARED_HORSE_ID`);
    // await expect(page.getByTitle("Gérer les accès")).not.toBeVisible();
  });

  test("cheval non partagé avec l'invité → 404", async ({ page }) => {
    // Avec session invité, accès à un cheval non partagé
    // await page.goto(`/horses/UNSHARED_HORSE_ID`);
    // await expect(page).toHaveURL(/404|not-found/);
  });
});

// ─── P9 : API SHARES ────────────────────────────────────────────────────────

test.describe("API Shares — sécurité", () => {
  // Le middleware Next.js redirige (307) les requêtes non-auth vers /login
  // Playwright suit la redirection → on vérifie que le résultat n'est PAS un JSON valide avec des données
  test("POST /api/horses/[id]/shares sans auth → bloqué", async ({ request }) => {
    const res = await request.post(`/api/horses/fake-id/shares`, {
      data: { email: "test@test.com", role: "coach" },
      maxRedirects: 0,
    });
    // 307 redirect ou 401 — les deux sont acceptables
    expect([307, 401]).toContain(res.status());
  });

  test("DELETE /api/horses/[id]/shares/[shareId] sans auth → bloqué", async ({ request }) => {
    const res = await request.delete(`/api/horses/fake-id/shares/fake-share-id`, {
      maxRedirects: 0,
    });
    expect([307, 401]).toContain(res.status());
  });

  test("GET /api/shares/received sans auth → bloqué", async ({ request }) => {
    const res = await request.get(`/api/shares/received`, {
      maxRedirects: 0,
    });
    expect([307, 401]).toContain(res.status());
  });
});
