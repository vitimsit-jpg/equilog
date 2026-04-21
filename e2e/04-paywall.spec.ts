import { test, expect } from "@playwright/test";

/**
 * Tests du paywall (plan starter vs pro/ecurie)
 * Nécessite deux fixtures : starter-auth.json + pro-auth.json
 */

// baseURL est configuré dans playwright.config.ts

// ─── P10 : PAYWALL ─────────────────────────────────────────────────────────

test.describe("Paywall — plan starter", () => {
  // Ces tests requièrent storageState: 'e2e/starter-auth.json'

  test("page Horse Index affiche UpgradeBanner pour starter", async ({ page }) => {
    // await page.goto(`/horses/HORSE_ID`);
    // await expect(page.getByText(/plan pro|upgrade/i)).toBeVisible();
  });

  test("AI Insights → 403 pour starter", async ({ request }) => {
    // Avec session starter
    // const res = await request.post(`/api/ai-insights`, {
    //   data: { horseId: "HORSE_ID" },
    // });
    // expect(res.status()).toBe(403);
  });

  test("coach chat non visible pour starter", async ({ page }) => {
    // await page.goto(`/horses/HORSE_ID`);
    // await expect(page.getByRole("button", { name: /coach/i })).not.toBeVisible();
  });
});

test.describe("Paywall — plan pro/ecurie", () => {
  // Ces tests requièrent storageState: 'e2e/pro-auth.json'

  test("page Horse Index visible pour pro", async ({ page }) => {
    // await page.goto(`/horses/HORSE_ID`);
    // await expect(page.getByText(/horse index/i)).toBeVisible();
    // await expect(page.getByText(/upgrade/i)).not.toBeVisible();
  });

  test("coach chat visible pour pro", async ({ page }) => {
    // await page.goto(`/horses/HORSE_ID`);
    // await expect(page.getByRole("button", { name: /coach/i })).toBeVisible();
  });
});
