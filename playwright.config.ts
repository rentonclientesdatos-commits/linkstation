import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — linkstation
 *
 * Convención local:
 *   - El dev server se lanza con `npm run dev` (puerto 8500).
 *   - Playwright NO arranca el server automáticamente en local — reusa el que ya tengas.
 *   - En CI sí lo arranca (cuando se active CI en Sprint 3+).
 *
 * Política sprint 0 / sprint 3:
 *   - Solo chromium activo. Firefox/webkit se añaden en Sprint 3 (hardening).
 *   - Tests E2E del cierre de sprint van en `tests/e2e/sprint-XX/`.
 *   - Tests transversales (auth, RLS multi-tenant, smoke) van en `tests/e2e/core/`.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8500";
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  // Limitar workers locales a 2: con 8 workers concurrentes Supabase Auth
  // local satura ocasionalmente (race en POST /auth/v1/token, ver
  // BUG-3-05 fix 26-05-2026). 2 workers da paralelismo razonable sin flakiness.
  workers: IS_CI ? 1 : 2,
  reporter: IS_CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: IS_CI ? "retain-on-failure" : "off",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: IS_CI
    ? {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
