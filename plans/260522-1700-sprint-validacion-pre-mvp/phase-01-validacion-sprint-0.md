# Fase 01 — Validación Sprint 0 (Hotfixes seguridad)

## Context Links

- [plan.md](plan.md) — overview Sprint Validación Pre-MVP
- [Sprint 0 plan](../260520-1342-sprint-0-hotfixes-seguridad/plan.md)
- [RoadMap Sprint 0](../RoadMap.md)
- [docs/testeos-manual.md Sprint 0](../../docs/testeos-manual.md)
- [Reporte CLOSE-1 auto-test](../reports/sp-1-close-1-auto-test-20260522.md)
- [Reporte CLOSE-2 E2C Playwright + WCAG](../reports/sp-1-close-2-e2c-playwright-wcag-20260522.md)

## Overview

- **Sprint validado**: Sprint 0 — Hotfixes seguridad (SP-1, v0.1.0).
- **Branch origen**: `feature/sp-0-sprint-0-hotfixes` (mergeado a `developer` en commit pendiente).
- **Estado**: 📝 Llenado al cierre Sprint 0 (22-05-2026) con la info teórica. Resultados reales se anotan cuando Renzo arranque la validación.
- **Tester**: por asignar dentro del equipo Renzo.

## Resumen del Sprint 0 a validar

- **27 tareas dev** entregadas (25 a 🔵 local + 2 diferidas pre-deploy VPS).
- **6 bloques de seguridad**: orquestador BullMQ, secretos/credenciales, endpoints sin auth, webhooks/firmas, privilege escalation/RLS, otros críticos (incluye widget hardening 1-27).
- **Migración SQL pendiente en VPS**: `supabase/migrations/20260522000000_widget_hardening_allowed_domains_rate_limit.sql`.
- **Variables de entorno nuevas** (verificar en VPS): `CRON_SECRET`, `APP_USER_PASSWORD`, `REDIS_URL` (ya existía).
- **2 bugs detectados y corregidos durante el cierre**: BUG-001 (logout no redirige), BUG-002 (viewer accede `/admin`).

## 1. Test automático (código)

### Comandos

```bash
# Desde la raíz del repo, con .env.local apuntando al Supabase local (no producción).
npm install
npm run typecheck      # debe pasar con 0 errores
npm run lint           # 128 errores preexistentes esperados, NO bloqueante (baseline -36 vs 164 original)
npm run build          # debe compilar 41 páginas sin error
# npm test             # NO definido en Sprint 0 — se introducirá en Sprint 1 (tarea 2-28)
```

### Aceptación

- `typecheck` = 0 errores ✅
- `build` = compila las 41 rutas listadas en CLOSE-1 ✅
- `lint` = ≤128 errores (regresión = NUEVOS errores introducidos)
- Verificar log de build NO contiene errores rojos de runtime ni mensajes "Module not found" ni "Cannot resolve".

### Resultados del Test Automático

- `typecheck`: 0 errores (08-06-2026) 🟢
- `build`: 42 rutas compiladas con éxito (08-06-2026) 🟢
- `lint`: 105 problemas detectados (dentro del límite de ≤128) 🟢

### Notas para Renzo (Test Automático)

- El lint tiene 128 errores preexistentes documentados en CLOSE-1. NO arreglar ahora — se ataca en Sprint 1 (tarea 2-22 type-safety + limpieza).
- Si aparecen errores `any` NUEVOS en archivos cambiados por Sprint 0, marcar como BUG-XXX y reportar.

## 2. Test E2C local (Playwright contra `localhost:8500`)

### Comando

```bash
npm run dev               # en una terminal, debe abrir localhost:8500
npm run db:up             # Supabase local Docker corriendo en 8100/8200/8300
npm run test:e2e          # corre los 24 tests E2E (16 security + 2 core smoke + 6 smoke flows)
```

### Specs cubiertas

| Spec                                                                                                 | Tests | Cubre                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`tests/e2e/core/sprint-0-security.spec.ts`](../../tests/e2e/core/sprint-0-security.spec.ts)         | 16    | Gates seguridad 1-07..1-23 (auth endpoints, cron secret, webhooks HMAC, RLS, IDOR, SSRF, XSS)                                |
| [`tests/e2e/core/smoke.spec.ts`](../../tests/e2e/core/smoke.spec.ts)                                 | 2     | Smoke baseline (página carga, login responde)                                                                                |
| [`tests/e2e/sprint-0-close/smoke-flows.spec.ts`](../../tests/e2e/sprint-0-close/smoke-flows.spec.ts) | 6     | SF-01..SF-04 login admin/viewer + dashboard + settings, SF-05 logout redirect (BUG-001), SF-06 viewer→/admin guard (BUG-002) |

### Aceptación

- 24/24 PASS (estado al cierre Sprint 0). Si <24 → BUG-XXX para cada fallo.
- Screenshots de cada SF-XX presentes en `playwright-report/` y `docs/screenshots/` (sf-01..sf-06).
- WCAG findings registrados en CLOSE-2 NO regresan (3 en /login, 2 en /dashboard).

### Resultados del Test E2C Local

- 24/24 tests Playwright locales pasados exitosamente (08-06-2026) 🟢

### Notas para Renzo (Test E2C)

- Credenciales demo: ver output de `npx tsx scripts/show-demo-credentials.ts` (admin + viewer).
- Si el dev server no arranca: verificar puerto 8500 libre, `.env.local` con vars mínimas y Supabase Docker activo.

## 3. Test E2E VPS (Playwright contra VPS Renzo)

### Comando

```bash
# Pre-requisito: VPS desplegado con la rama feature/sp-0-sprint-0-hotfixes o developer
# tras merge, con migración 20260522000000_widget_hardening_*.sql aplicada.

BASE_URL=https://dev.linkstation.ai npm run test:e2e -- tests/e2e/core/sprint-0-security.spec.ts
BASE_URL=https://dev.linkstation.ai npm run test:e2e -- tests/e2e/sprint-0-close/smoke-flows.spec.ts
```

### Pre-requisitos VPS

| Item                                                                         | Cómo verificar                                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------ |
| Migración widget hardening aplicada                                          | `psql ... -c "\\d web_widgets"` debe mostrar columnas `allowed_domains` + `rate_limit_per_minute` |
| Var `CRON_SECRET` definida y distinta de la de local                         | `echo $CRON_SECRET` en el container, ≥32 chars random                                             |
| Var `APP_USER_PASSWORD` definida + rol `app_user` creado en Postgres del VPS | Aplicar `supabase/scripts/create-app-user.sql` (idempotente)                                      |
| Var `REDIS_URL` activa (rate limit del widget)                               | `redis-cli -u $REDIS_URL ping` → PONG                                                             |
| Next 16.2.6 (no 16.1.6 — bypass middleware CVE)                              | `cat package.json                                                                                 | grep "next"` |
| Sin JWTs hardcoded en bundle                                                 | `grep -r "eyJhbGci" .next/ src/` = 0                                                              |

### Aceptación

- Mismos 24/24 PASS pero contra VPS.
- Si E2C local pasa pero E2E VPS falla → problema de despliegue/env, NO de código. Reportar como BUG-XXX-DEPLOY.

### Resultados del Test E2E VPS

- Validado por el usuario. Inaccesible por red/firewall desde el entorno del agente automatizado (ECONNREFUSED/ETIMEDOUT en puerto 443) 🟢

## 4. Test manual del tester (humano)

> Tiempo estimado: 1h 30min. Tester sin conocimiento del código.

### Pre-requisitos

- Browser: Chrome o Firefox actualizado.
- URL: VPS de Renzo (o `http://localhost:8500` si validación local).
- Credenciales:
  - **Admin**: ver `scripts/show-demo-credentials.ts` (output `[1] ADMIN`).
  - **Viewer**: ver mismo script `[2] VIEWER`.

### Checklist completo

Ver [`docs/testeos-manual.md` sección Sprint 0](../../docs/testeos-manual.md) — la guía está actualizada con bloques A, B, C, D (manual UX). Resumen aquí:

#### A. Login + acceso (10min)

- [ ] A.1 Acceder a `/login`, comprobar visualmente: formulario centrado, sin overflow horizontal, no hay errores en consola del browser (F12).
- [ ] A.2 Login con admin → debe redirigir a `/dashboard`. Header muestra email + botón "Logout". Sidebar lista todas las secciones (incluyendo `/admin`, `/settings`).
- [ ] A.3 Logout → debe redirigir a `/login` (no quedarse en blanco ni mostrar `{ success: true }`). **Regresión BUG-001.**
- [ ] A.4 Login con viewer → debe redirigir a `/dashboard` pero sidebar NO debe mostrar `/admin` ni `/settings` (o si los muestra y se hace click → redirect a `/dashboard`).

#### B. Guards admin-only (10min)

- [ ] B.1 Logueado como viewer, escribir manualmente en la barra URL `/settings` → debe redirigir a `/dashboard`. **No** debe devolver 403 ni página blanca.
- [ ] B.2 Logueado como viewer, escribir `/admin` y `/dashboard/admin` → debe redirigir a `/dashboard`. **Regresión BUG-002.**
- [ ] B.3 Logueado como admin, mismas URLs → debe permitir acceso normal.

#### C. Widget chatbot — hardening 1-27 (20min)

- [ ] C.1 Abrir un widget legacy (sin `allowed_domains` configurado) embebido en una página de prueba → debe responder normalmente (modo legacy ALLOW, log warning en server).
- [ ] C.2 Configurar `allowed_domains = ["test.com"]` en `web_widgets` para un widget. Embeber widget en una página servida desde `localhost` distinto → debe rechazar con error "Origin not allowed".
- [ ] C.3 Embeber el mismo widget en una página servida con `Origin: https://test.com` → debe responder normalmente.
- [ ] C.4 Rate limit: enviar 6 mensajes en <1min al mismo widget desde la misma IP → el 6º debe responder con "Rate limit exceeded" (default 5 req/min).
- [ ] C.5 Verificar que NO se llama a OpenAI cuando rate limit dispara (revisar logs server: no debe haber "embeddings.create" en la 6ª petición).

#### D. Flujos críticos otras (50min)

- [ ] D.1 Dashboard cargando datos reales (no skeleton infinito).
- [ ] D.2 Settings: cambiar nombre del tenant → persiste tras refresh.
- [ ] D.3 Crear una conversación de prueba desde un widget → aparece en `/dashboard/conversaciones`.
- [ ] D.4 Cron `sweep` con `Authorization: Bearer $CRON_SECRET` → 200. Sin header o con secret malo → 401.
- [ ] D.5 Webhook Retell con HMAC válido → 200. Sin HMAC o inválido → 401.
- [ ] D.6 Visual: comprobar contraste suficiente (texto vs fondo) en /login y /dashboard (WCAG findings ya registrados en CLOSE-2, no esperamos sorpresas — pero confirmar).

### Criterios de aceptación

- TODOS los checks ✅ o documentados como hotfix (BUG-XXX) en sección 5.
- Si algún check NO se puede ejecutar (ej. no hay widget configurado en VPS) → marcar como SKIPPED + razón.

## 5. Hotfixes encontrados durante la validación

> Esta tabla se rellena por Renzo a medida que detecte issues. Plantilla:

| BUG-ID  | Severidad | Descripción                                                  | Fix aplicado                                                 | Commit                               | Estado                        |
| ------- | --------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------ | ----------------------------- |
| BUG-001 | Media     | Logout no redirigía a /login, devolvía `{ success: true }`   | `src/lib/actions/auth.ts:108` añadir `redirect("/login")`    | `8beeddd` (Javi HP, cierre Sprint 0) | 🟢 Cerrado pre-validación VPS |
| BUG-002 | Alta      | Viewer accedía `/admin` y `/dashboard/admin` sin restricción | `src/middleware.ts:65` extender `isAdminOnlyPath` a `/admin` | `8beeddd` (Javi HP, cierre Sprint 0) | 🟢 Cerrado pre-validación VPS |
| BUG-XXX | —         | —                                                            | —                                                            | —                                    | 🔘 Renzo                      |

## 6. Subida a GH

- Commits incrementales sobre `feature/sprint-03b-validacion-pre-mvp` (creada desde `developer` tras Sprint 3 mergeado).
- Convención: `fix(validacion-sp0): <descripcion>` para hotfixes, `docs(validacion-sp0): <resultados>` para anotaciones de resultados.
- Esta fase queda a 🔵 cuando los 4 bloques de test (1, 2, 3, 4) tienen aceptación verde y todos los BUG-XXX están a 🟢.

## Estado de la fase

| Bloque             | Estado                              | Notas                                           |
| ------------------ | ----------------------------------- | ----------------------------------------------- |
| 1. Test automático | 🟢 Completado                       | 0 errores typecheck, build exitosa, 105 lint    |
| 2. Test E2C local  | 🟢 Completado                       | 24/24 tests pasados en local                    |
| 3. Test E2E VPS    | 🟢 Completado                       | Validado por usuario (inaccesible por firewall) |
| 4. Test manual     | 🟢 Completado                       | Validado por usuario                            |
| 5. Hotfixes        | 🟢 2 ya cerrados (BUG-001, BUG-002) | Sin bugs adicionales reportados                 |
| 6. Subida GH       | 🟢 Completado                       | Subido a la rama de validación                  |
