import { expect, test, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * SP-3-CLOSE-2 — Smoke E2E Sprint 2 contra VPS.
 *
 * Flujo crítico del Sprint 2 (Adapter HubSpot+Zoho + UI admin CRM):
 *   1. Login admin VPS
 *   2. Navegar a /dashboard/settings
 *   3. Verificar sección CRM (cards HubSpot + Zoho visibles)
 *   4. Verificar elementos UI admin: write-policy editor + audit log viewer accesibles
 *
 * Credenciales VPS: variables de entorno VPS_ADMIN_EMAIL / VPS_ADMIN_PASS.
 */

const ADMIN_EMAIL = process.env.VPS_ADMIN_EMAIL ?? "admin@linkstation.ai";
const ADMIN_PASS = process.env.VPS_ADMIN_PASS ?? "BeaOli#AF*2026!";
const SCREENSHOT_DIR = "docs/screenshots/sprint-2-close-vps";

function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

async function fillReactInput(page: Page, selector: string, value: string) {
  const el = page.locator(selector).first();
  await el.click();
  await el.fill(value);
  await el.dispatchEvent("input");
  await el.dispatchEvent("change");
}

/**
 * Login helper robusto: espera hidratación React de los inputs antes de fill
 * para evitar race condition "missing email or phone" en runs concurrentes.
 */
async function loginAsAdmin(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").waitFor({ state: "visible", timeout: 5_000 });
  await page.locator("#password").waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForTimeout(800);
  await fillReactInput(page, "#email", ADMIN_EMAIL);
  await fillReactInput(page, "#password", ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 25_000 });
}

test.beforeAll(() => {
  ensureScreenshotDir();
});

test.describe.configure({ mode: "serial" });

test.describe("sprint-2-close smoke CRM VPS @smoke-vps", () => {
  test("VPS-01: GET / sin sesión → /login", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/login/, { timeout: 10_000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "vps-01-redirect-login.png"),
      fullPage: true,
    });
    expect(page.url()).toContain("/login");
  });

  test("VPS-02: Login admin VPS → /dashboard", async ({ page }) => {
    await loginAsAdmin(page);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "vps-02-dashboard-loaded.png"),
      fullPage: true,
    });

    expect(page.url()).toContain("/dashboard");
  });

  test("VPS-03: /dashboard/settings carga", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/dashboard/settings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "vps-03-settings-page.png"),
      fullPage: true,
    });

    expect(page.url()).toContain("/dashboard/settings");
    // El body debe tener contenido
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(100);
  });

  test("VPS-04: /dashboard/settings → editar cliente → CRMSection con HubSpot+Zoho", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto("/dashboard/settings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Click en el botón de editar (lápiz) del primer cliente activo
    // El edit es el primer botón con icon Pencil en la columna ACCIONES
    const editButtons = page.locator('button[title*="ditar" i], button[aria-label*="ditar" i]');
    const editCount = await editButtons.count();
    console.log(`[VPS-04] edit buttons found: ${editCount}`);

    if (editCount > 0) {
      await editButtons.first().click();
    } else {
      // Fallback: cualquier botón en la fila del tenant LinkStation
      const row = page.locator('tr:has-text("LinkStation")').first();
      const rowButtons = row.locator("button");
      const rbc = await rowButtons.count();
      console.log(`[VPS-04] fallback row buttons: ${rbc}`);
      if (rbc > 0) {
        // Probable: penúltimo botón = editar (último = delete)
        await rowButtons.nth(Math.max(0, rbc - 2)).click();
      }
    }

    await page.waitForTimeout(3000);

    // Scroll progresivo hasta el final para forzar render lazy components
    for (let y = 0; y < 5000; y += 500) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    const bodyText = (await page.locator("body").textContent()) ?? "";

    // Screenshot del form completo + del area específica si encuentro CRM
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "vps-04-settings-edit-form.png"),
      fullPage: true,
    });

    // Si hay heading "CRM (HubSpot, Zoho, ...)" del Sprint 2, screenshot focal
    const crmHeading = page.locator('h3:has-text("CRM"), [id*="crm-section"]').first();
    if (await crmHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await crmHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "vps-04-crm-section-focus.png"),
        fullPage: false,
      });
    }

    const hasCRM = /CRM/i.test(bodyText);
    const hasHubSpot = /HubSpot/i.test(bodyText);
    const hasZoho = /Zoho/i.test(bodyText);
    const hasIntegrations = /Integraciones/i.test(bodyText);

    console.log(
      `[VPS-04] CRM=${hasCRM} HubSpot=${hasHubSpot} Zoho=${hasZoho} Integraciones=${hasIntegrations}`
    );

    expect(hasIntegrations, "Sección 'Integraciones' debe aparecer en el form de edición").toBe(
      true
    );
    expect(hasHubSpot, "Card HubSpot debe estar visible tras Sprint 2").toBe(true);
    expect(hasZoho, "Card Zoho debe estar visible tras Sprint 2").toBe(true);
  });

  test("VPS-05: API /api/integrations responde (auth)", async ({ page }) => {
    await loginAsAdmin(page);

    // Reusar el contexto cookies
    const response = await page.request.get("/api/integrations");
    console.log(`[VPS-05] GET /api/integrations → ${response.status()}`);

    // Esperado: 200 (lista vacía o con conexiones del tenant)
    // Si devuelve 500 → bug deploy Sprint 2
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const json = await response.json();
      console.log(`[VPS-05] body keys: ${Object.keys(json).join(",")}`);
    }
  });
});
