import { test, expect } from "@playwright/test";

const HORSE_ID = "0da6e65c-61a9-4b05-9b12-f8488f593fc6";

test.describe("Module Concours", () => {
  test("page concours charge correctement", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/competitions`);
    await expect(page).toHaveURL(/competitions/, { timeout: 15000 });
  });

  test("bouton ajouter un concours visible", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/competitions`);
    await page.waitForLoadState("networkidle");
    const addBtn = page.getByRole("button", { name: /ajouter/i });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
  });

  test("formulaire s'ouvre au clic sur Ajouter", async ({ page }) => {
    await page.goto(`/horses/${HORSE_ID}/competitions`);
    await page.waitForLoadState("networkidle");
    const addBtn = page.getByRole("button", { name: /ajouter/i });
    await addBtn.waitFor({ state: "visible", timeout: 15000 });
    await addBtn.click();
    await expect(page.getByText(/nouveau concours/i)).toBeVisible({ timeout: 5000 });
  });
});
