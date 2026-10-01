---
title: "Sprint 2B — Phase 07B — E2E Manual Bloques B-G (post-fix alturas)"
status: in_progress
priority: P2
effort: 3h 30min
sprint_id: SP-3B
task_ids: [SP-3B-E2E-B, SP-3B-E2E-C, SP-3B-E2E-D, SP-3B-E2E-E, SP-3B-E2E-F, SP-3B-E2E-G]
created: 25-05-2026
last_updated: 25-05-2026
---

# Phase 07B — E2E Manual Bloques B-G (post-fix alturas)

## Context Links

- Bloque A (cerrado): commits `7da995c`, `5d9ddcf`, `a5c444b`, `4c720e1`, `7cfc976`. Suite Playwright sprint-2b-close 18/18 ✅ local + VPS.
- Fix de alturas validado: `docs/screenshots/verificacion-alturas-25-05-2026-VPS-overview-fixed.png` (4 cards Overview = 389px).
- Versión actual: v0.2.8 desplegada en VPS `dev.linkstation.ai`. Posible bump a v0.2.9 al cerrar este phase.
- Política CLOSE-3 diferido a SP-4B (CLAUDE.md): este phase ADELANTA el bloque manual al sprint actual a petición explícita del usuario 25-05-2026.

## Overview

**Priority:** P2 (validación adicional pre-bump v0.2.9, no bloqueante para promote staging).
**Brief:** Validación manual cross-funcional con cobertura máxima. 6 bloques (B-G), ~3h 30min total. Ejecutados en VPS `dev.linkstation.ai` con sesión admin (`LinkStation@gmail.com / BeaOli#AF*2026!`).

## Pre-requisitos

- VPS sirviendo commit `7cfc976` (confirmado).
- Navegador MCP Playwright operativo.
- Credenciales admin VPS válidas.
- `docs/screenshots/sprint-2b-bloques-b-g/` para capturas.

## Tareas de bloques

| Bloque | Foco                                                   | Estim | Tests      | Estado |
| ------ | ------------------------------------------------------ | ----- | ---------- | ------ |
| B      | Anti-regresión Sprint 0/1/2 (auth, RLS, integraciones) | 50min | B-01..B-10 | 🟡     |
| C      | WCAG 2.2 AA exhaustivo Overview + charts               | 40min | C-01..C-08 | 🔘     |
| D      | Performance / Core Web Vitals / responsive             | 35min | D-01..D-06 | 🔘     |
| E      | DnD personalizar KPI Builder + Chart Builder           | 40min | E-01..E-08 | 🔘     |
| F      | Multi-tenant / RLS / spot check                        | 25min | F-01..F-05 | 🔘     |
| G      | Exploración libre + edge cases                         | 20min | G-01..G-05 | 🔘     |

**Subtotal:** ~3h 30min.

## Bloque B — Anti-regresión Sprint 0/1/2 (50min)

Validar que cambios del Sprint 2B no rompieron seguridad/datos/integraciones previas.

| #    | Test                                                         | URL/acción                                 | Esperado                                          | Estado |
| ---- | ------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------- | ------ |
| B-01 | Login admin con creds correctas                              | POST `/login`                              | Redirect a `/dashboard`, cookie `sb-*-auth-token` | 🔘     |
| B-02 | Login con password errónea                                   | POST `/login` con pass mala                | Error visible, sigue en `/login`                  | 🔘     |
| B-03 | Logout invalida sesión                                       | Click "Cerrar sesión" → F5                 | Redirect a `/login`, sesión muerta                | 🔘     |
| B-04 | Dashboard sin sesión → /login                                | `/dashboard` anónimo                       | 307 redirect a `/login`                           | 🔘     |
| B-05 | RLS multi-tenant: viewer NO ve datos de otros tenants        | Login viewer → API filtrada                | Body solo trae registros del tenant del viewer    | 🔘     |
| B-06 | Settings Sprint 1 carga sin errores                          | `/dashboard/settings`                      | Página renderiza completa, sin 500                | 🔘     |
| B-07 | Integraciones Sprint 2 (HubSpot/Zoho) listables              | `/dashboard/settings/integrations`         | Tabla de integraciones renderiza, sin 500         | 🔘     |
| B-08 | API webhook CRM rechaza sin x-tenant-id                      | curl POST `/api/webhooks/crm` sin header   | 400 Bad Request                                   | 🔘     |
| B-09 | API webhook retell rechaza sin firma                         | curl POST `/api/webhooks/retell` sin firma | 401/403/503                                       | 🔘     |
| B-10 | Embudo conversión Sprint 1 sigue renderizando (no regresión) | Scroll a sección Funnel en `/dashboard`    | FunnelSection visible con etiquetas               | 🔘     |

## Bloque C — WCAG 2.2 AA exhaustivo Overview + charts (40min)

Validar accesibilidad de la nueva sección Overview cross-canal.

| #    | Test                                                                       | Cómo                                                      | Esperado                                                      | Estado |
| ---- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| C-01 | Charts Overview con `role="img"` + `aria-label` descriptivo                | DevTools inspect 4 charts del Overview                    | Todos tienen role + aria-label con título + summary           | 🔘     |
| C-02 | Navegación con Tab solo (sin ratón)                                        | Tab desde topbar hasta Personalizar Overview              | Focus visible en cada elemento interactivo                    | 🔘     |
| C-03 | Botones "Personalizar Overview" + "Personalizar Tablero" tienen aria-label | Inspect ambos botones                                     | aria-label distintivo, no solo texto interno                  | 🔘     |
| C-04 | Contraste de color en KPI cards (label + value)                            | Lighthouse a11y audit `/dashboard`                        | Contraste ≥ 4.5:1 para texto normal, ≥ 3:1 para large text    | 🔘     |
| C-05 | Donut chart con `aria-label` reading totales                               | Inspect donut "Distribución por canal"                    | aria-label con "X llamadas, Y conversaciones WhatsApp"        | 🔘     |
| C-06 | Skip-link "Saltar al contenido principal" presente                         | Tab desde inicio de la página                             | Primer Tab revela skip-link, Enter lleva a `<main>`           | 🔘     |
| C-07 | Heading hierarchy correcta (h1 → h2 → h3)                                  | Inspect estructura de headings en `/dashboard`            | No salta niveles, h1 único, h2 para secciones, h3 para charts | 🔘     |
| C-08 | Prefers-reduced-motion respetado en reveal-on-scroll                       | Habilitar `prefers-reduced-motion` en DevTools → recargar | Charts aparecen sin fade-in animado                           | 🔘     |

## Bloque D — Performance / Core Web Vitals / responsive (35min)

Validar percepción de rendimiento.

| #    | Test                                                  | Cómo                                                        | Esperado                                                         | Estado |
| ---- | ----------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| D-01 | Refresh `/dashboard` 5 veces seguidas                 | F5 × 5                                                      | TTI < 3s cada vez, sin flickers visibles, charts cargan estables | 🔘     |
| D-02 | Lighthouse Performance audit `/dashboard`             | Lighthouse run en VPS                                       | Performance score ≥ 80, LCP < 2.5s, CLS < 0.1                    | 🔘     |
| D-03 | Resize viewport 1280 → 768 → 375                      | DevTools responsive mode                                    | Grid 12-col colapsa a 1-col en mobile, no overflow horizontal    | 🔘     |
| D-04 | Cambio tema light → dark                              | Click toggle tema en topbar                                 | Cards/charts cambian colores sin glitches, sin re-renders rotos  | 🔘     |
| D-05 | Network throttling "Slow 4G" + reload                 | DevTools Network → Slow 4G → F5                             | App carga con Suspense fallbacks visibles, no crashes            | 🔘     |
| D-06 | Console DevTools abierta durante navegación 5 páginas | Navegar Dashboard → Leads → Campañas → Settings → Dashboard | 0 errores rojos en consola, warnings aceptables documentados     | 🔘     |

## Bloque E — DnD personalizar KPI Builder + Chart Builder (40min)

Funcionalidad nueva del Sprint 2B.

| #    | Test                                                          | Cómo                                  | Esperado                                                     | Estado |
| ---- | ------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ | ------ |
| E-01 | Click "Personalizar Overview" activa edit mode                | Botón Personalizar Overview           | Edit mode visible: handles drag, botones X/Configurar/Layout | 🔘     |
| E-02 | Drag KPI card reordena posición                               | Arrastrar "Total Leads" a 3ª posición | KPIs reordenan en grid, animación smooth                     | 🔘     |
| E-03 | Cambiar tamaño KPI (Layout button cicla 4/6/8/12)             | Click Layout en una KPI card          | col-span cambia visualmente, otros KPIs reflow               | 🔘     |
| E-04 | Toggle visibilidad (Eye button)                               | Click Eye en una KPI                  | KPI se oculta visualmente (opacity 40 + grayscale) en edit   | 🔘     |
| E-05 | Eliminar KPI (Trash button)                                   | Click Trash → confirmar               | KPI desaparece, grid reflow                                  | 🔘     |
| E-06 | Click "Personalizar Overview Gráficos" activa edit mode chart | Botón Personalizar Overview Gráficos  | Charts editables con mismos controles                        | 🔘     |
| E-07 | Click Settings en chart abre sidebar config (xKey/yKey/tipo)  | Click ⚙️ en un chart                  | Sidebar lateral muestra config (Tabla, Columna, Eje X, Y...) | 🔘     |
| E-08 | Guardar config → recarga → cambios persisten                  | Save Cambios → F5                     | Config persiste (overview_kpis/overview_charts en JSONB)     | 🔘     |

## Bloque F — Multi-tenant / RLS / spot check (25min)

Confirmar que el Overview respeta multi-tenancy.

| #    | Test                                                  | Cómo                                          | Esperado                                            | Estado |
| ---- | ----------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ------ |
| F-01 | Cambiar tenant activo (admin con varios)              | Click selector "Cliente activo" → otro tenant | Overview recarga con datos del nuevo tenant         | 🔘     |
| F-02 | KPIs reflejan filtros aplicados (FilterBar)           | Aplicar filtro "Hoy" + verificar Total Leads  | Valor de KPIs cambia, charts recalculan             | 🔘     |
| F-03 | overview_kpis del tenant A no afecta tenant B         | Personalizar tenant A → cambiar a tenant B    | Tenant B muestra DEFAULT_OVERVIEW_KPIS, no los de A | 🔘     |
| F-04 | Viewer NO puede personalizar (botones admin ausentes) | Login viewer → `/dashboard`                   | Sin botones Personalizar visibles (solo admin)      | 🔘     |
| F-05 | API `/api/integrations` filtra por tenant del usuario | curl con cookie admin → respuesta             | Solo trae integraciones del tenant_id del JWT       | 🔘     |

## Bloque G — Exploración libre + edge cases (20min)

Time-box 20min para descubrir cualquier rareza.

| #    | Test                                                        | Cómo                                                    | Esperado                                       | Estado |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------- | ------ |
| G-01 | Filtros combinados (rango + campaña + origen)               | Aplicar 3 filtros a la vez en FilterBar                 | Charts y KPIs reflejan AND de los 3 filtros    | 🔘     |
| G-02 | Filtro rango "Este año" con datos escasos                   | Aplicar "Este año"                                      | KPIs muestran valores reales, charts no rompen | 🔘     |
| G-03 | Hover en cada chart → tooltip                               | Hover sobre cada barra/punto/segmento                   | Tooltip muestra valor + label correctos        | 🔘     |
| G-04 | Click derecho en links del sidebar → abrir en pestaña nueva | Click derecho → "Open in new tab" en `/dashboard/leads` | Funciona, sin perder sesión                    | 🔘     |
| G-05 | Edge: 0 datos en período (probar fecha futura)              | Aplicar "Hoy" si no hay datos hoy                       | Empty state visible, no crash, no NaN visibles | 🔘     |

## Success Criteria

- **Mínimo aceptable**: 90% de checks 🟢 en cada bloque.
- **Bugs detectados**: documentar en RoadMap.md sección "Bugs detectados" del Sprint 2B con ID `BUG-2B-XX`.
- **Bugs críticos** (login roto, RLS fugada, XSS): bloquean bump v0.2.9 hasta fix.
- **Bugs menores** (UX, animaciones, tooltips): documentar pero NO bloquean v0.2.9.

## Risk Assessment

| Riesgo                                          | Mitigación                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Sesión VPS expira durante 3h 30min de tests     | Re-login admin entre bloques si detecta 401                                  |
| Lighthouse audit lento bajo carga VPS           | Ejecutar D-02 en horas valle, retry si timeout                               |
| F-03 requiere 2º tenant existente con datos     | Si solo hay 1 tenant en VPS, marcar F-03 como N/A diferido a SP-4B           |
| Bugs descubiertos requieren fix antes de v0.2.9 | Hot-fix iterativo durante este phase, push directo a developer, redeploy VPS |

## Output esperado

- Tabla actualizada con estados 🟢/🟡/🔴 por test.
- Lista de bugs detectados con repro steps.
- Screenshots de bugs en `docs/screenshots/sprint-2b-bloques-b-g/`.
- Decisión: bump v0.2.9 SI/NO.

## Next Steps

1. Ejecutar Bloque B → si pasa al 90%+, Bloque C.
2. Tras los 6 bloques: si bugs críticos → CLOSE-4 (fix) → re-run bloques afectados.
3. Si todo verde: actualizar RoadMap + commit retros + decisión bump v0.2.9.
