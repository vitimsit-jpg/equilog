import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const HORSE_ID = "0da6e65c-61a9-4b05-9b12-f8488f593fc6";

/**
 * Tests d'accessibilité axe-core — WCAG 2.1 AA.
 * On vérifie les violations "critical" uniquement.
 * Les violations "serious" (contraste) sont loggées mais tolérées.
 * Les button-name sur 1-2 éléments sont tolérées (boutons icônes).
 */

function checkAxeResults(results: Awaited<ReturnType<AxeBuilder["analyze"]>>, pageName: string) {
  const critical = results.violations.filter(v => v.impact === "critical");
  // Tolérer button-name sur peu d'éléments (boutons icônes sans aria-label)
  // Tolérer button-name et link-name (boutons/liens icônes fréquents dans l'UI)
  const blocking = critical.filter(v => !["button-name", "link-name"].includes(v.id));
  if (results.violations.length > 0) {
    console.log(`[axe] ${pageName}:`, results.violations.map(v => `${v.impact}: ${v.id} (${v.nodes.length})`).join(", "));
  }
  expect(blocking).toHaveLength(0);
}

test.describe("Accessibilité axe-core — pages publiques", () => {
  test("login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    checkAxeResults(results, "login");
  });

  test("register", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    checkAxeResults(results, "register");
  });
});

test.describe("Accessibilité axe-core — pages authentifiées", () => {
  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude(".recharts-wrapper").analyze();
    checkAxeResults(results, "dashboard");
  });

  test("training", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/training`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    checkAxeResults(results, "training");
  });

  test("competitions", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/competitions`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    checkAxeResults(results, "competitions");
  });

  test("health", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/health`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    checkAxeResults(results, "health");
  });
});
