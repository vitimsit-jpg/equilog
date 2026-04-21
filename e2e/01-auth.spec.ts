import { test, expect } from "@playwright/test";

// baseURL est configuré dans playwright.config.ts
const TEST_EMAIL = `test+${Date.now()}@gmail.com`;
const TEST_PASSWORD = "testpassword123";
const TEST_NAME = "Test User";

// ─── P1 : INSCRIPTION ──────────────────────────────────────────────────────

test.describe("Inscription", () => {
  test("formulaire step 1 → step 2 avec données valides", async ({ page }) => {
    await page.goto(`/register`);
    await page.fill('input[type="text"]', TEST_NAME);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.getByText("Avant de commencer")).toBeVisible();
  });

  test("mot de passe trop court → reste sur step 1", async ({ page }) => {
    await page.goto(`/register`);
    await page.fill('input[type="text"]', TEST_NAME);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', "court");
    await page.click('button[type="submit"]');
    // Reste sur step 1 — le formulaire ne passe pas à "Avant de commencer"
    await expect(page.getByText("Avant de commencer")).not.toBeVisible();
    await expect(page.getByText("Créer un compte")).toBeVisible();
  });

  test("bouton 'Créer mon compte' désactivé sans consent", async ({ page }) => {
    await page.goto(`/register`);
    await page.fill('input[type="text"]', TEST_NAME);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    const btn = page.getByRole("button", { name: "Créer mon compte" });
    await expect(btn).toBeDisabled();
  });

  test("retour step 1 depuis step 2", async ({ page }) => {
    await page.goto(`/register`);
    await page.fill('input[type="text"]', TEST_NAME);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.getByText("← Retour").click();
    await expect(page.getByText("Créer un compte")).toBeVisible();
  });
});

// ─── P2 : CONNEXION ────────────────────────────────────────────────────────

test.describe("Connexion", () => {
  test("credentials invalides → message d'erreur", async ({ page }) => {
    await page.goto(`/login`);
    await page.fill('input[type="email"]', "inconnu@test.com");
    await page.fill('input[type="password"]', "mauvaismdp");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid|incorrect|introuvable/i)).toBeVisible({ timeout: 5000 });
  });

  test("utilisateur non connecté redirigé vers /login", async ({ page }) => {
    await page.goto(`/dashboard`);
    await expect(page).toHaveURL(/login/);
  });

  test("utilisateur connecté redirigé depuis /login vers /dashboard", async ({ page, context }) => {
    // Injecter une session valide via storage state (à configurer dans playwright.config.ts)
    await page.goto(`/login`);
    // Si déjà connecté, doit être redirigé
    // Ce test nécessite un fixture de session — à compléter
  });
});

// ─── P3 : PROTECTION ROUTES ────────────────────────────────────────────────

test.describe("Protection des routes", () => {
  const protectedRoutes = [
    "/dashboard",
    "/horses/new",
    "/settings",
    "/mon-ecurie",
    "/partages",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirige vers /login si non connecté`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  const publicRoutes = [
    "/login",
    "/register",
  ];

  for (const route of publicRoutes) {
    test(`${route} accessible sans connexion`, async ({ page }) => {
      await page.goto(route);
      // La page doit charger (pas de redirect vers une autre route protégée)
      await expect(page).toHaveURL(new RegExp(route.replace("/", "\\/")));
    });
  }
});
