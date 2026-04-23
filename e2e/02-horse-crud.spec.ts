import { test, expect } from "@playwright/test";

const HORSE_ID = "0da6e65c-61a9-4b05-9b12-f8488f593fc6"; // Jackson

// ─── CRÉATION CHEVAL ──────────────────────────────────────────────────

test.describe("Création de cheval", () => {
  test("page /horses/new charge correctement", async ({ page }) => {
    await page.goto("/horses/new");
    await page.waitForLoadState("networkidle");
    // Le formulaire doit avoir un champ nom
    await expect(page.locator("input").first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── FICHE CHEVAL ─────────────────────────────────────────────────────

test.describe("Fiche cheval", () => {
  test("fiche cheval existant charge correctement", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /jackson/i })).toBeVisible({ timeout: 15000 });
  });

  test("cheval inexistant → page 404", async ({ page }) => {
    const res = await page.goto("/horses/00000000-0000-0000-0000-000000000000");
    // Soit 404, soit redirect, soit page "not found"
    const status = res?.status();
    const url = page.url();
    const is404 = status === 404 || url.includes("404") || url.includes("not-found");
    expect(is404).toBe(true);
  });

  test("onglets navigation fonctionnent", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}`);
    await page.waitForLoadState("networkidle");
    // Vérifier qu'au moins un onglet de navigation est visible
    const tabs = ["Travail", "Santé", "Concours", "Budget"];
    let found = false;
    for (const tab of tabs) {
      if (await page.getByText(tab).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});

// ─── NAVIGATION DASHBOARD ─────────────────────────────────────────────

test.describe("Navigation dashboard", () => {
  test("dashboard charge correctement", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // La sidebar doit avoir les chevaux
    await expect(page.locator("a[href*='/horses/']").first()).toBeVisible({ timeout: 15000 });
  });

  test("sidebar contient les liens de navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/dashboard/i).first()).toBeVisible({ timeout: 10000 });
  });
});
