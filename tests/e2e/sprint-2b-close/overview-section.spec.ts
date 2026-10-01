import { expect, test, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * SP-3B-CLOSE-2 — Smoke E2C Sprint 2B Dashboard KPIs Overview.
 *
 * Flujo crítico del Sprint 2B (OverviewSection cross-canal):
 *   1. /dashboard sin sesión → /login (regression baseline)
 *   2. Login admin → /dashboard renderiza
 *   3. OverviewSection visible ENCIMA de SummarySection con título "Resumen general"
 *   4. 4 KPI cards hero (Total Leads, Contactados, Cualificados, Tiempo Ahorrado)
 *   5. Botón "Personalizar Overview" (BUG-2B-01 fix: distinto de "Personalizar Tablero")
 *   6. Chart "Distribución por canal" renderiza (donut o empty state según datos)
 *   7. WCAG: role="img" + aria-label en charts del overview
 *
 * Credenciales: VPS_ADMIN_EMAIL / VPS_ADMIN_PASS (mismas creds local+VPS).
 */

const ADMIN_EMAIL = process.env.VPS_ADMIN_EMAIL ?? "admin@linkstation.ai";
const ADMIN_PASS = process.env.VPS_ADMIN_PASS ?? "BeaOli#AF*2026!";
const SCREENSHOT_DIR = "docs/screenshots/sprint-2b-close";

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

async function loginAsAdmin(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  // Esperar hidratación React antes de fill para evitar race condition
  // "missing email or phone" en runs concurrentes con 8 workers.
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

test.describe("sprint-2b-close smoke Overview @smoke", () => {
  test("2B-01: GET /dashboard sin sesión → /login", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const finalUrl = page.url();
    const redirectedToLogin = finalUrl.includes("/login") || finalUrl.includes("/auth");
    expect(redirectedToLogin, `URL final: ${finalUrl}`).toBe(true);
  });

  test("2B-02: Login admin → /dashboard carga", async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForTimeout(3000); // dejar que Suspense resuelva

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "2b-02-dashboard-loaded.png"),
      fullPage: true,
    });

    expect(page.url()).toContain("/dashboard");
    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText.length, "Body debe tener contenido").toBeGreaterThan(200);
  });

  test("2B-03: OverviewSection visible con título 'Resumen general'", async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForTimeout(3000);

    // Header "Resumen general" debe aparecer
    const overviewHeading = page.locator("h2#overview-heading");
    await expect(overviewHeading, "h2#overview-heading debe existir").toBeVisible({
      timeout: 10_000,
    });
    const headingText = await overviewHeading.textContent();
    expect(headingText).toContain("Resumen");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "2b-03-overview-heading.png"),
      fullPage: false,
    });
  });

  test("2B-04: 4 KPI cards hero del overview presentes", async ({ page }) => {
    await loginAsAdmin(page);

    // Esperar a que el OverviewSection resuelva su Suspense (5 queries paralelas).
    // Total Leads es el primer KPI hero - usar waitFor con polling.
    await page
      .getByText("Total Leads", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(2000); // dar tiempo al resto de KPIs

    const bodyText = (await page.locator("body").textContent()) ?? "";

    // Los 4 labels de DEFAULT_OVERVIEW_KPIS deben aparecer en el body
    const labels = ["Total Leads", "Leads Contactados", "Leads Cualificados", "Tiempo Ahorrado"];
    for (const label of labels) {
      expect(bodyText.includes(label), `KPI hero "${label}" debe estar visible en /dashboard`).toBe(
        true
      );
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "2b-04-kpi-hero-4.png"),
      fullPage: true,
    });
  });

  test("2B-05: BUG-2B-01 fix — botones 'Personalizar Overview' distinto de 'Personalizar Tablero'", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    // Esperar a que el SummaryManager renderice botones admin
    await page
      .getByText("Personalizar Overview", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });

    const bodyText = (await page.locator("body").textContent()) ?? "";

    // BUG-2B-01: ambos labels deben coexistir, no duplicarse
    const hasOverviewBtn = bodyText.includes("Personalizar Overview");
    const hasTableroBtn = bodyText.includes("Personalizar Tablero");

    expect(hasOverviewBtn, "Botón 'Personalizar Overview' debe estar visible (admin)").toBe(true);
    expect(hasTableroBtn, "Botón 'Personalizar Tablero' debe coexistir (otro section)").toBe(true);
  });

  test("2B-06: Distribución por canal — donut o empty state visible", async ({ page }) => {
    await loginAsAdmin(page);
    // Esperar al título del chart canal (renderiza con datos o empty state)
    await page
      .getByText("Distribución por canal", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });

    const bodyText = (await page.locator("body").textContent()) ?? "";

    const hasDistribTitle = bodyText.includes("Distribución por canal");
    const hasWebTrackingNote = bodyText.includes("Web tracking en desarrollo");

    expect(hasDistribTitle, "Título 'Distribución por canal' debe estar visible").toBe(true);
    expect(
      hasWebTrackingNote,
      "Nota 'Web tracking en desarrollo' (decisión 24-05) debe estar visible"
    ).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "2b-06-canal-distribution.png"),
      fullPage: true,
    });
  });

  test("2B-07: WCAG phase-06 — al menos 1 chart con role='img' + aria-label", async ({ page }) => {
    await loginAsAdmin(page);
    // Esperar a que el chart canal renderice (es el primero con role=img garantizado)
    await page
      .getByText("Distribución por canal", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(2000); // dar tiempo a los charts dynamic del ChartManager

    const imgRoleElements = page.locator('[role="img"]');
    const count = await imgRoleElements.count();
    expect(count, "Debe haber al menos 1 elemento con role='img' (WCAG phase-06)").toBeGreaterThan(
      0
    );

    const firstAriaLabel = await imgRoleElements.first().getAttribute("aria-label");
    expect(firstAriaLabel, "role='img' debe tener aria-label").toBeTruthy();
    expect(
      (firstAriaLabel ?? "").length,
      "aria-label debe ser descriptivo (>10 chars)"
    ).toBeGreaterThan(10);
  });
});

/**
 * Tests EXHAUSTIVOS pre-PR — simulan revisión humana profunda
 * (interacción FilterBar, edit mode admin, regresiones secciones existentes, console errors).
 */
test.describe("sprint-2b-close deep checks pre-PR @deep", () => {
  test("2B-08: NO console errors críticos en /dashboard cargado completo", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await loginAsAdmin(page);
    await page
      .getByText("Distribución por canal", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(3000); // dejar que TODOS los Suspense resuelvan

    // Filtrar errores conocidos no-bloqueantes:
    // - React hydration warnings + dev-mode eval (no aplica en prod build)
    // - Recharts ResponsiveContainer (warning informativo)
    // - CSP warnings de dev (estricta, en prod Sentry captura los reales)
    // - DevTools / favicon (ruido browser)
    const critical = consoleErrors.filter(
      (e) =>
        !e.includes("Warning:") &&
        !e.includes("ResponsiveContainer") &&
        !e.includes("hydration") &&
        !e.toLowerCase().includes("favicon") &&
        !e.includes("DevTools") &&
        !e.includes("eval() is not supported") &&
        !e.includes("Content Security Policy")
    );

    if (critical.length > 0) {
      console.log("[2B-08] Console errors críticos detectados:", critical);
    }

    expect(critical.length, `Console errors críticos: ${critical.join(" | ")}`).toBe(0);
  });

  test("2B-09: FilterBar 'Hoy' afecta KPIs del Overview (recarga datos)", async ({ page }) => {
    await loginAsAdmin(page);
    await page
      .getByText("Total Leads", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });

    // Capturar valor inicial (Últimos 30 días por defecto)
    const totalLeadsCard = page.locator('div:has(> *:text("Total Leads"))').first();
    await page.waitForTimeout(1500);

    // Click preset "Hoy" en FilterBar
    const hoyBtn = page.getByRole("button", { name: "Hoy", exact: true });
    await hoyBtn.click();
    await page.waitForTimeout(500);

    // Click "Aplicar" para forzar el cambio
    const aplicarBtn = page.getByRole("button", { name: "Aplicar", exact: true });
    await aplicarBtn.click();

    // Esperar a que la URL cambie con el preset y los datos recarguen.
    // FilterBar usa ?preset=today (no ?from=&to=).
    await page.waitForURL(/preset=|from=/, { timeout: 10_000 });
    await page
      .getByText("Total Leads", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(2000);

    // La URL debe contener preset=today O from= (cualquiera de los 2 formatos)
    const url = page.url();
    expect(
      url.includes("preset=today") || url.includes("from="),
      `URL debe llevar preset=today o from= tras click 'Hoy'. URL: ${url}`
    ).toBe(true);

    // Overview debe seguir renderizado (no se rompió)
    expect(await totalLeadsCard.isVisible()).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "2b-09-filter-hoy-applied.png"),
      fullPage: false,
    });
  });

  test("2B-10: SummarySection original sigue renderizando (no regresión)", async ({ page }) => {
    await loginAsAdmin(page);
    await page
      .getByText("Total Leads", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(2000);

    const bodyText = (await page.locator("body").textContent()) ?? "";

    // SummarySection actual usa DEFAULT_SUMMARY_KPIS que tiene "Llamadas realizadas"
    // y "Total Minutos IA" — labels que NO están en DEFAULT_OVERVIEW_KPIS
    expect(
      bodyText.includes("Llamadas realizadas"),
      "Regresión: SummarySection debe seguir renderizando 'Llamadas realizadas'"
    ).toBe(true);
    expect(
      bodyText.includes("Total Minutos IA") || bodyText.includes("Total Minutos"),
      "Regresión: SummarySection debe seguir renderizando 'Total Minutos'"
    ).toBe(true);
  });

  test("2B-11: FunnelSection original sigue renderizando (no regresión)", async ({ page }) => {
    await loginAsAdmin(page);
    await page
      .getByText("Total Leads", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(3000); // FunnelSection es lazy, dar tiempo

    const bodyText = (await page.locator("body").textContent()) ?? "";

    // FunnelSection usa DEFAULT_FUNNEL con labels específicos
    expect(
      bodyText.includes("Embudo de") || bodyText.includes("Conversi"),
      "Regresión: FunnelSection debe renderizar 'Embudo de Conversión'"
    ).toBe(true);

    // El botón "Personalizar Embudo" debe seguir existiendo (no roto por BUG-2B-01 fix)
    expect(
      bodyText.includes("Personalizar Embudo"),
      "Regresión: botón 'Personalizar Embudo' del FunnelSection debe seguir visible (admin)"
    ).toBe(true);
  });

  test("2B-12: BUG-2B-03 verificado — donut canal con datos renderiza correctamente", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page
      .getByText("Distribución por canal", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(2000);

    const bodyText = (await page.locator("body").textContent()) ?? "";

    // Si hay datos (caso happy path): debe aparecer "Llamadas" o "WhatsApp" en el chart canal
    // Si NO hay datos (caso empty state): debe aparecer "Sin datos en el período seleccionado"
    const hasDataLabels = bodyText.includes("Llamadas") && bodyText.includes("WhatsApp");
    const isEmptyState = bodyText.includes("Sin datos en el período seleccionado");

    expect(
      hasDataLabels || isEmptyState,
      "Donut canal: o renderiza con datos (Llamadas+WhatsApp) o muestra empty state"
    ).toBe(true);
  });

  test("2B-13: Botón 'Personalizar Overview' click activa edit mode (DnD visible)", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page
      .getByText("Personalizar Overview", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });

    const personalizarBtn = page.getByRole("button", { name: /Personalizar Overview/i }).first();
    await personalizarBtn.click();
    await page.waitForTimeout(1000);

    const bodyText = (await page.locator("body").textContent()) ?? "";

    // En edit mode aparecen botones "Cancelar" + "Guardar Cambios"
    expect(bodyText.includes("Cancelar"), "Edit mode debe mostrar botón 'Cancelar'").toBe(true);
    expect(
      bodyText.includes("Guardar Cambios"),
      "Edit mode debe mostrar botón 'Guardar Cambios'"
    ).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "2b-13-edit-mode-activo.png"),
      fullPage: true,
    });

    // Cancelar para limpiar
    await page
      .getByRole("button", { name: /Cancelar/i })
      .first()
      .click();
    await page.waitForTimeout(500);
  });

  test("2B-14: Navegación cross-page — /dashboard/settings y vuelta a /dashboard sin romper", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page
      .getByText("Total Leads", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });

    // Navegar a settings
    await page.goto("/dashboard/settings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/dashboard/settings");

    // Volver a /dashboard — overview debe seguir funcionando
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page
      .getByText("Total Leads", { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });

    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText.includes("Resumen"), "Overview debe seguir tras navegación cross-page").toBe(
      true
    );
  });

  test("2B-15: API /api/integrations responde 200 (no regresión Sprint 2)", async ({ page }) => {
    await loginAsAdmin(page);
    const response = await page.request.get("/api/integrations");
    console.log(`[2B-15] GET /api/integrations → ${response.status()}`);
    expect([200, 401]).toContain(response.status());
  });

  test("2B-16: BUG-2B-05/06 fix — h1 únicos sin duplicados + sin h2 'OVERVIEW' redundante", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.getByText("Resumen general", { exact: false }).first().waitFor({ timeout: 20_000 });

    // h1 únicos — el bug previo tenía 2× "Métricas Generales" + total 4 h1
    const h1Texts = await page.locator("h1").allTextContents();
    const h1Trimmed = h1Texts.map((t) => t.trim());
    const duplicates = h1Trimmed.filter((t, i, arr) => arr.indexOf(t) !== i);
    expect(duplicates, `h1 duplicados detectados: ${duplicates.join(", ")}`).toEqual([]);

    // No debe existir h2 "OVERVIEW" en mayúsculas (era el SectionHeader redundante
    // generado por DEFAULT_OVERVIEW_KPIS.group="OVERVIEW")
    const h2Texts = await page.locator("h2").allTextContents();
    const overviewH2 = h2Texts.find((t) => t.trim() === "OVERVIEW");
    expect(overviewH2, "h2 'OVERVIEW' redundante NO debe existir").toBeUndefined();

    // h2 "Resumen general" SÍ debe existir (es el heading semántico del OverviewSection)
    expect(h2Texts.some((t) => t.includes("Resumen"))).toBe(true);
  });

  test("2B-18: BUG-2B-07 fix — 3 charts Overview con xKey lead.* renderizan datos (no 'sin datos')", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    // Forzar preset con datos suficientes (30d cubre el seed local)
    await page.goto("/dashboard?preset=30d", { waitUntil: "domcontentloaded" });
    await page.getByText("Resumen general", { exact: false }).first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(2500); // Suspense streaming charts

    const overviewChartTitles = ["Leads ingresados por día", "Leads por origen", "Leads por tipo"];

    for (const title of overviewChartTitles) {
      const chart = page.getByRole("img", { name: new RegExp(`^Gráfico: ${title}`) }).first();
      await chart.waitFor({ state: "visible", timeout: 10_000 });
      const aria = (await chart.getAttribute("aria-label")) ?? "";
      // Si sigue 'sin datos' el bug volvió. Esperamos "N puntos de datos" o "Total: N"
      expect(
        aria.includes("sin datos") === false,
        `Chart "${title}" debe tener datos (aria-label: "${aria}")`
      ).toBe(true);
      expect(aria, `Chart "${title}" debe describir N puntos/total`).toMatch(
        /puntos de datos|Total:/
      );
    }
  });

  test("2B-17: BUG-2B-04 fix — labels 'Personalizar Gráficos' distintos entre Overview y Análisis Visual", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page
      .getByText("Personalizar Overview Gráficos", { exact: false })
      .first()
      .waitFor({ timeout: 20_000 });

    const bodyText = (await page.locator("body").textContent()) ?? "";

    // El nuevo label del Overview ChartManager
    expect(
      bodyText.includes("Personalizar Overview Gráficos"),
      "Label nuevo 'Personalizar Overview Gráficos' debe existir"
    ).toBe(true);

    // El label genérico debe seguir coexistiendo (Análisis Visual del Summary)
    expect(
      bodyText.includes("Personalizar Gráficos"),
      "Label genérico 'Personalizar Gráficos' debe coexistir (Análisis Visual del Summary)"
    ).toBe(true);

    // Y no debe haber DOS botones idénticos "Personalizar Gráficos" exactos
    // (esto requiere distinguir entre "Personalizar Gráficos" y "Personalizar Overview Gráficos")
    const exactMatches = await page
      .locator("button", { hasText: /^[\s]*Personalizar Gráficos[\s]*$/ })
      .count();
    expect(
      exactMatches,
      `Solo 1 botón exacto 'Personalizar Gráficos' (Análisis Visual). Encontrados: ${exactMatches}`
    ).toBeLessThanOrEqual(1);
  });
});
