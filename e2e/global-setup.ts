/**
 * Playwright Global Setup — Authentification automatique
 * Se connecte via le formulaire login et sauvegarde le storage state
 * pour que les tests authentifiés n'aient pas à se reconnecter.
 */

import { chromium, type FullConfig } from "@playwright/test";

const AUTH_FILE = "e2e/auth-pro.json";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Login avec le compte de test
  await page.goto(`${baseURL}/login`);
  await page.fill('input[type="email"]', process.env.TEST_EMAIL || "vi.timsit@gmail.com");
  await page.fill('input[type="password"]', process.env.TEST_PASSWORD || "");
  await page.click('button[type="submit"]');

  // Debug : attendre un peu et voir où on est
  await page.waitForTimeout(5000);
  const currentUrl = page.url();
  console.log(`[global-setup] After login, URL: ${currentUrl}`);

  // Si toujours sur /login, le login a échoué
  if (currentUrl.includes("/login")) {
    const bodyText = await page.textContent("body");
    console.log(`[global-setup] Login may have failed. Page text: ${bodyText?.slice(0, 200)}`);
  }

  // Attendre la redirection (dashboard ou onboarding)
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 });

  // Sauvegarder le storage state
  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}

export default globalSetup;
