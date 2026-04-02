import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Tests sans authentification (auth flows, protection routes, API sécurité)
    {
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["**/01-auth.spec.ts", "**/03-sharing.spec.ts"],
    },

    // Tests avec session utilisateur pro
    // Générer avec : npx playwright codegen --save-storage=e2e/auth-pro.json http://localhost:3000/login
    {
      name: "authenticated-pro",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/auth-pro.json",
      },
      testMatch: ["**/02-horse-crud.spec.ts", "**/04-paywall.spec.ts"],
    },

    // Tests mobile (smoke tests uniquement)
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
      testMatch: ["**/01-auth.spec.ts"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
