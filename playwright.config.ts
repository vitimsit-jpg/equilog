import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Tests sans authentification (auth flows, protection routes)
    {
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["**/01-auth.spec.ts", "**/03-sharing.spec.ts"],
    },

    // Tests avec session utilisateur authentifié
    {
      name: "authenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/auth-pro.json",
      },
      testMatch: [
        "**/02-horse-crud.spec.ts",
        "**/04-paywall.spec.ts",
        "**/05-training.spec.ts",
        "**/06-competitions.spec.ts",
        "**/07-health.spec.ts",
        "**/08-full-training-flow.spec.ts",
        "**/09-full-competition-flow.spec.ts",
        "**/10-deletion-flows.spec.ts",
      ],
    },

    // Tests mobile (smoke tests) — sans auth
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
      testMatch: ["**/01-auth.spec.ts"],
    },

    // Tests mobile authentifiés
    {
      name: "mobile-auth",
      use: {
        ...devices["iPhone 13"],
        storageState: "e2e/auth-pro.json",
      },
      testMatch: ["**/11-mobile-responsive.spec.ts"],
    },
  ],

  webServer: {
    command: "npm run dev -- -p 3002",
    url: "http://localhost:3002",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
