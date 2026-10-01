# Testeos manuales — linkstation

Checklist de pruebas manuales que el equipo de desarrollo debe ejecutar antes del cierre de cada sprint. Complementa a los tests automatizados (`npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`).

## Convenciones

- **Estado**: `[ ]` pendiente · `[~]` yo lo estoy haciendo · `[x]` hecho.
- Marcar la fecha y el dev en la columna **Notas** al cerrar (`DD-MM-YYYY HH:MM · Javi`).
- Si el test falla, anotar el bug encontrado en notas y abrir tarea en la sección "Bugs detectados" del RoadMap del sprint en curso.
- Los pasos asumen `.env.local` configurado y `npm run dev` corriendo. **Puerto fijo del proyecto: `8500`** (definido en `package.json` con `next dev -p 8500`). Si arranca en otro puerto, algo va mal — revísalo, no parchees URLs.
- **URLs clickables**: en VSCode Markdown Preview y en GitHub los enlaces `[texto](http://localhost:8500/...)` se abren con Ctrl+Click.

---

## Índice por sprint

- [Sprint 0 — Hotfixes seguridad](#sprint-0--hotfixes-seguridad)
- [Sprint 1 — Capa de datos](#sprint-1--capa-de-datos)
- [Sprint 2 — Adapter HubSpot + Zoho](#sprint-2--adapter-hubspot--zoho)
- [Sprint 3 — Hardening](#sprint-3--hardening)
- [Sprint 4 — Google Sheets bidireccional](#sprint-4--google-sheets-bidireccional)
- [Sprint 5 — Salesforce adapter](#sprint-5--salesforce-adapter)
- [Sprint 6 — GoHighLevel adapter](#sprint-6--gohighlevel-adapter)
- [Sprint 7 — ActiveCampaign adapter](#sprint-7--activecampaign-adapter)
- [Sprint 8 — Adapter pattern generalization](#sprint-8--adapter-pattern-generalization)
- [Sprint 9 — CRMs Tier 2 on-demand](#sprint-9--crms-tier-2-on-demand)

---

## Sprint 0 — Hotfixes seguridad

> Versión objetivo: `v0.1.0` · Rama: `feature/sp-0-sprint-0-hotfixes` · Cubre: tareas 1-07..1-26 + 2 bugfixes detectados en E2C (BUG-001 logout, BUG-002 viewer→admin).

### Cobertura automatizada vs manual

**Filosofía**: lo que la máquina puede testear, la máquina lo testea. El test manual del dev se enfoca en **UX**, **navegación percibida**, **edge cases visuales** y **verificación de fixes recientes**.

| Capa | Cobertura | Dónde |
| --- | --- | --- |
| 16 gates seguridad Sprint 0 (1-07..1-23) | ✅ Automatizado | [`tests/e2e/core/sprint-0-security.spec.ts`](../tests/e2e/core/sprint-0-security.spec.ts) |
| Smoke flows golden path (login admin/viewer, dashboard, settings, logout) | ✅ Automatizado | [`tests/e2e/sprint-0-close/smoke-flows.spec.ts`](../tests/e2e/sprint-0-close/smoke-flows.spec.ts) |
| BUG-002 (viewer→/admin bloqueado) | ✅ Automatizado | smoke-flows.spec.ts SF-06 |
| BUG-001 (logout redirige a /login) | ✅ Automatizado | smoke-flows.spec.ts SF-05 |
| UX subjetiva, navegación percibida, accesibilidad visual, edge cases | 🟡 Manual | Esta guía (bloques A-D) |

**Antes de pasar al manual**: `npm run test:e2e` debe estar 24/24 en verde. Si rojo, fix primero — no tiene sentido test manual sobre app rota.

### Pre-requisitos del entorno

- `.env.local` con `CRON_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `ALLOW_INTERNAL_TENANT_URLS=true` (dev local), `OPENAI_API_KEY` real.
- Supabase local Docker corriendo (`npm run db:status` → todos los servicios `Up (healthy)`).
- Dev server en `http://localhost:8500` (`npm run dev`).
- Credenciales test (ver `npx tsx scripts/show-demo-credentials.ts`):
  - **Admin**: `demo@af.local` / `<password en .env.local DEMO_USER_PASSWORD>`
  - **Viewer**: `viewer@af.local` / `<regenerable, ver script>`
- Migraciones SQL Sprint 0 ya aplicadas (si vienes de `db:reset` están al día).

### Bloque A — Smoke golden path (≤10 min)

> Validar que el flujo principal de la app funciona con datos reales. Es lo que el cliente va a tocar primero.

| #    | Estado | Acción                                                                            | Esperado                                                                                  |
| ---- | :----: | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A-01 | `[ ]`  | Abrir [http://localhost:8500/](http://localhost:8500/) sin sesión                 | Redirect a `/login`                                                                       |
| A-02 | `[ ]`  | Login con admin (`demo@af.local`)                                                 | Llega a `/dashboard`; charts cargan (Citas, Llamadas, Cualificación, Razón, Anulación)    |
| A-03 | `[ ]`  | Click en cada chart / KPI                                                         | Tooltips funcionan, hover responde, no hay errores en consola DevTools                    |
| A-04 | `[ ]`  | Navegar a [/dashboard/settings](http://localhost:8500/dashboard/settings)         | Renderiza sección Settings completa sin errores                                           |
| A-05 | `[ ]`  | Navegar a [/dashboard/admin](http://localhost:8500/dashboard/admin) (admin)       | Renderiza panel admin (lista de tenants, datos internos)                                  |
| A-06 | `[ ]`  | Logout desde Topbar                                                               | Redirect a `/login`, cookie `sb-*-auth-token` borrada (DevTools → Application → Cookies)  |
| A-07 | `[ ]`  | Re-login con viewer (`viewer@af.local`)                                           | Llega a `/dashboard`, ve datos del tenant pero secciones admin/settings restringidas      |

### Bloque B — Spot check anti-regresión seguridad (≤15 min)

> Los 16 gates ya están cubiertos por E2E automatizados. Aquí solo se valida que **el navegador real** se comporta igual que Playwright, y que los curl-tests siguen devolviendo los códigos esperados (por si hubiera diferencias de runtime entre tests headless y browser real).

#### B.1 — Spot check clickable (5 min)

Abre estos 5 enlaces como **admin logueado** o **anónimo** según se indique. Si alguno devuelve un código distinto al esperado, fail.

| #    | Estado | URL                                                                                                                                                                | Sesión   | Esperado                                            |
| ---- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------- |
| B-01 | `[ ]`  | [/api/orchestration/workflows?tenantId=...](http://localhost:8500/api/orchestration/workflows?tenantId=00000000-0000-0000-0000-000000000000)                       | anónimo  | `401 Unauthorized`                                  |
| B-02 | `[ ]`  | [/api/tenant/migrate](http://localhost:8500/api/tenant/migrate)                                                                                                    | anónimo  | `401 Unauthorized`                                  |
| B-03 | `[ ]`  | [/api/widget/embed.js](http://localhost:8500/api/widget/embed.js) (sin id)                                                                                         | anónimo  | `400 Missing widget ID`                             |
| B-04 | `[ ]`  | [/api/widget/embed.js?id=hacker';alert(1);//](http://localhost:8500/api/widget/embed.js?id=hacker%27;alert%281%29;//)                                              | anónimo  | `400 Invalid widget ID format` (no ejecuta XSS)     |
| B-05 | `[ ]`  | [/api/admin/tenants/.../client-sql](http://localhost:8500/api/admin/tenants/00000000-0000-0000-0000-000000000000/client-sql)                                       | viewer   | `401` o `403` (no admin → no accede)                |

#### B.2 — Webhooks via curl (10 min)

Copiar y pegar en terminal. Si recibes `401`/`403`/`503` está OK (el server rechaza correctamente). Si recibes `200` o `500` con stack trace, fail.

```bash
# B-06: Retell webhook sin firma → 401/503
curl -i -X POST http://localhost:8500/api/webhooks/retell -H "content-type: application/json" -d '{"event":"call_ended"}'

# B-07: Retell tools sin firma → 401/503
curl -i -X POST http://localhost:8500/api/webhooks/retell/tools -H "content-type: application/json" -d '{"name":"book_appointment","args":{},"call":{"metadata":{}}}'

# B-08: WhatsApp sin x-hub-signature-256 → 401/503
curl -i -X POST http://localhost:8500/api/webhooks/whatsapp -H "content-type: application/json" -d '{"object":"whatsapp_business_account","entry":[]}'

# B-09: CRM webhook sin x-tenant-id → 400
curl -i -X POST http://localhost:8500/api/webhooks/crm -H "content-type: application/json" -d '{"telefono":"+34600000000"}'

# B-10: CRM con x-tenant-id pero sin firma → 401/403/503
curl -i -X POST http://localhost:8500/api/webhooks/crm -H "x-tenant-id: 00000000-0000-0000-0000-000000000000" -H "content-type: application/json" -d '{"telefono":"+34600000000"}'
```

### Bloque C — Verificar fixes recientes del sprint (≤10 min)

> Bugs detectados en E2C (`SP-1-CLOSE-2`) y corregidos en `SP-1-CLOSE-4`. Validar que no hay regresión visual ni de comportamiento.

| #    | Estado | Test                                          | Pasos                                                                                                                                                                          | Esperado                                                                              |
| ---- | :----: | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| C-01 | `[ ]`  | **BUG-002 — viewer NO accede a `/admin`**     | Login con viewer (`viewer@af.local`). Manualmente teclea la URL [/dashboard/admin](http://localhost:8500/dashboard/admin) en barra del browser.                                | Redirect a `/dashboard`. NO debe mostrar el panel admin ni datos financieros internos. |
| C-02 | `[ ]`  | **BUG-001 — logout redirige a `/login`**      | Login con admin. Click en "Cerrar sesión" en el Topbar.                                                                                                                        | URL cambia a `/login`. Refresh F5: sigue en `/login` (sesión invalidada).             |
| C-03 | `[ ]`  | **viewer no ve link a `/admin` en sidebar**   | Inspeccionar sidebar del viewer logueado.                                                                                                                                      | NO debe aparecer el item "Admin" (defensa en profundidad además del middleware).      |

### Bloque D — Exploración libre (≤20 min)

> Time-box de 20 minutos para usar la app como un usuario real curioso. Reporta **cualquier** cosa rara, aunque no parezca grave. Ideas:
>
> - Refrescar el dashboard 5 veces seguidas → ¿performance percibida estable? ¿flickers?
> - Cambiar tema light/dark → ¿algún componente se rompe?
> - Resize del viewport a mobile (375px) → ¿layout responsive?
> - DevTools console abierta → ¿warnings o errores nuevos en runtime?
> - Network tab → ¿alguna llamada en rojo o 4xx/5xx inesperada?
> - Probar atajos de teclado típicos (Tab, Enter, Esc) en formularios → ¿accesibilidad básica?
> - Click derecho en links → "Abrir en pestaña nueva" → ¿funciona?
> - Logout + refresh manual + back button → ¿no se filtra info de sesión anterior?

Cualquier finding va a la sección **"Bugs detectados"** del RoadMap del sprint para que SP-1-CLOSE-4 los absorba.

---

> **Nota histórica**: el spec [`tests/e2e/core/sprint-0-security.spec.ts`](../tests/e2e/core/sprint-0-security.spec.ts) cubre 16 gates de seguridad automatizados; [`tests/e2e/sprint-0-close/smoke-flows.spec.ts`](../tests/e2e/sprint-0-close/smoke-flows.spec.ts) cubre 6 smoke flows. Si `npm run test:e2e` está 24/24 verde, los bloques A-B son confirmación de que **el browser real coincide con headless**. Si fueras a saltarte algún bloque por tiempo, el orden de prioridad es: **C > A > D > B** (los fixes recientes son lo más nuevo y arriesgado).

### Tests diferidos a sesión pre-deploy (VPS)

| #        | Estado | Test                                                  | Notas                                                                                                                    |
| -------- | :----: | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --- |
| SP0-T-35 | `[ ]`  | **Rotación JWT Supabase VPS (1-03)**                  | Solo aplicable en VPS Easypanel con acceso del cliente.                                                                  |     |
| SP0-T-36 | `[ ]`  | **Cambio password Postgres VPS (1-05)**               | Idem — Supabase local usa Postgres en localhost:8200, riesgo nulo en dev.                                                |     |
| SP0-T-37 | `[ ]`  | **Apply migrations 1-18 + 1-19 + script 1-16 en VPS** | Aplicar los 3 SQL contra Supabase del cliente antes de promover a staging.                                               |     |
| SP0-T-38 | `[ ]`  | **Apply rol `app_user` en VPS (1-06)**                | Aplicar `supabase/scripts/create-app-user.sql` contra Supabase del cliente, set `APP_USER_PASSWORD` en env de Easypanel. |     |

---

## Sprint 1 — Capa de datos

> Versión objetivo: `v0.2.0` · Rama: `feature/sprint-01-capa-datos` · Bloque cubierto: tareas 2-01..2-34.

### Tabla de tests manuales — Sprint 1

| #        | Estado | Test                                                          | Pasos / Resultado esperado                                                                                                                    | Notas |
| -------- | :----: | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| SP1-T-01 | `[ ]`  | **Cliente Supabase unificado (2-01, 2-02)**                   | No quedan imports directos de `pg`/`postgres` en `src/app/api`. Todas las queries pasan por `@supabase/ssr`.                                  |       |
| SP1-T-02 | `[ ]`  | **Validación Zod en POST de leads (2-04..2-11)**              | `POST /api/webhooks/crm` con body que viola schema → `400` con detalle del campo inválido.                                                    |       |
| SP1-T-03 | `[ ]`  | **Repository pattern leads CRUD (2-13)**                      | Las acciones de inbox usan el nuevo repository en vez de llamar `.from("lead")` directamente. Crear/editar/leer/soft-delete OK desde UI.      |       |
| SP1-T-04 | `[ ]`  | **Repository tenants (2-14)**                                 | UI admin de tenants funciona contra repository. Validar `findByTenant`, `create`, `update`, `softDelete`.                                     |       |
| SP1-T-05 | `[ ]`  | **Refactor server actions sin service_role (2-20)**           | Auditar manualmente que ninguna server action arranca con `getAdminSupabaseClient()` salvo justificación.                                     |       |
| SP1-T-06 | `[ ]`  | **0 ocurrencias `as any` / `as unknown` introducidas (2-22)** | `grep -rn "as any\|as unknown" src/` muestra reducción significativa vs baseline 426.                                                         |       |
| SP1-T-07 | `[ ]`  | **RLS ai_agents filtra por tenant (2-23)**                    | Como user A, `SELECT * FROM ai_agents WHERE tenant_id = <B>` → 0 filas.                                                                       |       |
| SP1-T-08 | `[ ]`  | **RLS web_widgets filtra por tenant (2-24)**                  | Idem para `web_widgets`.                                                                                                                      |       |
| SP1-T-09 | `[ ]`  | **getPrograms filtra por tenant (2-25)**                      | `/dashboard/campanas` solo lista programas del tenant activo.                                                                                 |       |
| SP1-T-10 | `[ ]`  | **OAuth tokens cifrados en JSONB (2-26)**                     | Inspeccionar la fila `tenants.config.google_oauth_tokens` en DB → debe estar cifrada (no JSON plano). Decifrar desde código → tokens válidos. |       |
| SP1-T-11 | `[ ]`  | **lucide-react v1.x — iconos renderizan (2-31)**              | Recorrer todas las páginas del dashboard, capturar screenshots y comparar — ningún icono roto.                                                |       |
| SP1-T-12 | `[ ]`  | **shadcn v4.x — componentes y theme OK (2-32)**               | Validar Button, Input, Dialog, Toast, Table, Form en light/dark mode.                                                                         |       |
| SP1-T-13 | `[ ]`  | **Hook `af-productivity-logger.cjs` registra tiempos (2-30)** | Hacer un cambio + commit → revisar log de productividad y verificar que aparece la duración real.                                             |       |

### Tests diferidos a sesión pre-deploy — Sprint 1

| #        | Estado | Test                                         | Notas                                                                 |
| -------- | :----: | -------------------------------------------- | --------------------------------------------------------------------- | --- |
| SP1-T-14 | `[ ]`  | **Migrations Sprint 1 RLS aplicadas en VPS** | Aplicar las migrations RLS de Bloque 2.6 contra Supabase del cliente. |     |

---

## Sprint 2 — Adapter HubSpot + Zoho

> Versión objetivo: `v0.3.0` · Rama: `feature/sprint-02-adapter-hubspot-zoho` · Tareas 3-01..3-07.

### Tabla de tests manuales — Sprint 2

| #        | Estado | Test                                                 | Pasos / Resultado esperado                                                                                                       | Notas |
| -------- | :----: | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----- |
| SP2-T-01 | `[ ]`  | **HubSpot OAuth flow (3-02)**                        | Click "Conectar HubSpot" → redirect a HubSpot → autorizar → callback OK → tokens guardados cifrados en `tenants.config.hubspot`. |       |
| SP2-T-02 | `[ ]`  | **HubSpot — sync de contacts bidireccional (3-02)**  | Crear contact en HubSpot → llega como lead en dashboard. Crear lead en dashboard → aparece en HubSpot.                           |       |
| SP2-T-03 | `[ ]`  | **HubSpot — refresh token automático (3-02)**        | Forzar expiración del access token → siguiente llamada debe refrescar automáticamente sin error en UI.                           |       |
| SP2-T-04 | `[ ]`  | **Zoho OAuth flow EU (3-03)**                        | Idem SP2-T-01 con region EU. Verificar `accounts.zoho.eu` como auth domain.                                                      |       |
| SP2-T-05 | `[ ]`  | **Zoho OAuth flow US (3-03)**                        | Repetir con region US (`accounts.zoho.com`).                                                                                     |       |
| SP2-T-06 | `[ ]`  | **Zoho — sync de leads (3-03)**                      | Crear lead en Zoho → llega como lead en dashboard con campos mapeados.                                                           |       |
| SP2-T-07 | `[ ]`  | **`crm_field_mapping` editable desde admin (3-04)**  | UI permite editar mapeo de campos por tenant. Cambios reflejados en próxima sync.                                                |       |
| SP2-T-08 | `[ ]`  | **`write_policy: append_only` por defecto (3-04)**   | Por defecto, las updates externas a un lead existente NO sobrescriben — crean entry nuevo o se ignoran.                          |       |
| SP2-T-09 | `[ ]`  | **`write_policy: overwrite_with_audit` (3-04)**      | Cambiar el flag de un tenant → updates SÍ sobrescriben, pero cada cambio se registra en `crm_write_audit`.                       |       |
| SP2-T-10 | `[ ]`  | **UI admin conexión CRM (3-05)**                     | Panel admin muestra estado de conexión por CRM. Botones connect/disconnect funcionan. Logs de error legibles.                    |       |
| SP2-T-11 | `[ ]`  | **`crm_write_audit` viewable en panel (3-06)**       | UI del panel muestra historial de escrituras CRM con timestamp, user, before/after.                                              |       |
| SP2-T-12 | `[ ]`  | **Webhook bidireccional anti spoofing (3-02, 3-03)** | Repetir SP0-T-19 con secret real del tenant — firma válida → 200; firma inválida → 401.                                          |       |

---

## Sprint 3 — Hardening

> Versión objetivo: `v0.4.0` (MVP) · Rama: `feature/sprint-03-hardening` · Tareas 4-01..4-07.

### Tabla de tests manuales — Sprint 3

| #        | Estado | Test                                                    | Pasos / Resultado esperado                                                                                                   | Notas |
| -------- | :----: | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----- |
| SP3-T-01 | `[ ]`  | **Suite E2E completa Playwright (4-01)**                | `npm run test:e2e` → 0 fallos, coverage `tests/e2e/sprint-*`.                                                                |       |
| SP3-T-02 | `[ ]`  | **Coverage ≥ 80% unit + integration (4-02)**            | Reporte de coverage muestra ≥ 80% en líneas y branches.                                                                      |       |
| SP3-T-03 | `[ ]`  | **Logging estructurado funciona (4-03)**                | Recorrer flujos golden path → cada step deja log JSON con `tenant_id`, `lead_id`, `request_id`.                              |       |
| SP3-T-04 | `[ ]`  | **Métricas BullMQ visibles (4-03)**                     | Dashboard de observabilidad muestra queue depth, throughput, jobs fallidos.                                                  |       |
| SP3-T-05 | `[ ]`  | **Tabla `llm_usage_logs` registra cada llamada (4-03)** | Tras ejecutar un workflow con LLM, verificar fila nueva con `provider`, `tokens_in`, `tokens_out`, `cost_eur`, `tenant_id`.  |       |
| SP3-T-06 | `[ ]`  | **Dashboard costes LLM (4-04)**                         | `/dashboard/costs` muestra agregados por proveedor, por tenant, por día/mes. Filtros funcionan.                              |       |
| SP3-T-07 | `[ ]`  | **WCAG 2.2 AA — admin panel completo (4-05)**           | Recorrer admin panel con lighthouse-a11y → score ≥ 90; navegación con teclado completa; contraste OK; aria-labels presentes. |       |
| SP3-T-08 | `[ ]`  | **Rate limits por endpoint (4-06)**                     | Hacer 100 requests/min a `/api/webhooks/crm` → eventualmente `429 Too Many Requests`.                                        |       |
| SP3-T-09 | `[ ]`  | **CSP headers presentes (4-06)**                        | `curl -I http://localhost:8500/` muestra `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`.          |       |
| SP3-T-10 | `[ ]`  | **CSRF tokens en server actions (4-06)**                | Inspeccionar POST de form admin → request incluye token CSRF; sin él la action falla.                                        |       |
| SP3-T-11 | `[ ]`  | **Eliminar guard `test_orchestrator_enabled`**          | El flag temporal de 1-09 ya no es necesario; las acciones orquestación funcionan sin él.                                     |       |
| SP3-T-12 | `[ ]`  | **Release notes v0.4.0 publicadas (4-07)**              | Documento `docs/releases/v0.4.0.md` existe, listado completo de cambios desde v0.0.0.                                        |       |

---

## Sprint 4 — Google Sheets bidireccional

> Versión objetivo: `v0.5.0` · Tareas 5-01-a..5-01-f.

### Tabla de tests manuales — Sprint 4

| #        | Estado | Test                                                                | Pasos / Resultado esperado                                                               | Notas |
| -------- | :----: | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| SP4-T-01 | `[ ]`  | **Columnas Sheets en crm_connections (5-01-a)**                     | DB tiene `spreadsheet_id`, `gsheet_channel_id`, `gsheet_channel_expiry`.                 |       |
| SP4-T-02 | `[ ]`  | **OAuth Google Sheets — connect (5-01-b)**                          | Click conectar → flujo OAuth Google → refresh token guardado cifrado.                    |       |
| SP4-T-03 | `[ ]`  | **Push job — lead nuevo aparece en hoja (5-01-c)**                  | Crear lead en dashboard → en ≤ 30s aparece nueva fila en la Google Sheet del tenant.     |       |
| SP4-T-04 | `[ ]`  | **Push idempotente — re-ejecución no duplica (5-01-c)**             | Forzar re-run del job → no se duplica la fila gracias a `_esden_updated_at`.             |       |
| SP4-T-05 | `[ ]`  | **Pull webhook — fila editada en hoja → lead actualizado (5-01-d)** | Editar una celda en la Sheet → en segundos el lead refleja el cambio en dashboard.       |       |
| SP4-T-06 | `[ ]`  | **Renovación canal Drive notifications (5-01-d)**                   | Esperar > 7 días o forzar expiración → cron renueva canal sin intervención.              |       |
| SP4-T-07 | `[ ]`  | **UI form conexión Sheets (5-01-e)**                                | Wizard pide spreadsheet ID, valida acceso, ofrece plantilla maestra.                     |       |
| SP4-T-08 | `[ ]`  | **Field mapper Sheets (5-01-e)**                                    | UI permite mapear columnas Sheet ↔ campos lead. Persistencia OK.                         |       |
| SP4-T-09 | `[ ]`  | **`crm_write_audit` registra cada push/pull (5-01-f)**              | Cada cambio bidireccional aparece en la tabla con `direction`, `source`, `before/after`. |       |

---

## Sprint 5 — Salesforce adapter

> Versión objetivo: `v0.6.0` · Tareas 6-01..6-06.

### Tabla de tests manuales — Sprint 5

| #        | Estado | Test                                              | Pasos / Resultado esperado                                                    | Notas |
| -------- | :----: | ------------------------------------------------- | ----------------------------------------------------------------------------- | ----- |
| SP5-T-01 | `[ ]`  | **`jsforce` instalado y aprobado vía ADR (6-01)** | ADR aprobado, `jsforce@^3.10.15` en `package.json`.                           |       |
| SP5-T-02 | `[ ]`  | **Connected App OAuth — prod (6-02)**             | Flujo OAuth contra org Salesforce prod. Refresh token guardado.               |       |
| SP5-T-03 | `[ ]`  | **Connected App OAuth — sandbox (6-02)**          | Repetir con `instance=sandbox`.                                               |       |
| SP5-T-04 | `[ ]`  | **SalesforceAdapter — Leads CRUD (6-03)**         | Crear/leer/editar/borrar Leads desde dashboard → reflejado en Salesforce.     |       |
| SP5-T-05 | `[ ]`  | **SalesforceAdapter — Contacts CRUD (6-03)**      | Idem para Contacts.                                                           |       |
| SP5-T-06 | `[ ]`  | **SalesforceAdapter — Opportunities CRUD (6-03)** | Idem para Opportunities.                                                      |       |
| SP5-T-07 | `[ ]`  | **Platform Events bidireccional (6-04)**          | Crear Lead en Salesforce → llega evento Streaming API → dashboard sincroniza. |       |
| SP5-T-08 | `[ ]`  | **UI admin Salesforce field mapper (6-05)**       | Campos custom de Salesforce mapeables desde UI.                               |       |
| SP5-T-09 | `[ ]`  | **Tests integración contra sandbox (6-06)**       | Suite contra sandbox real pasa sin errores de auth.                           |       |

---

## Sprint 6 — GoHighLevel adapter

> Versión objetivo: `v0.7.0` · Tareas 7-01..7-05.

### Tabla de tests manuales — Sprint 6

| #        | Estado | Test                                     | Pasos / Resultado esperado                                               | Notas |
| -------- | :----: | ---------------------------------------- | ------------------------------------------------------------------------ | ----- |
| SP6-T-01 | `[ ]`  | **OAuth GoHighLevel (7-01)**             | Flujo OAuth GHL → tokens cifrados guardados.                             |       |
| SP6-T-02 | `[ ]`  | **GHL — sync contacts (7-02)**           | Bidireccional. Validar campos `firstName`, `lastName`, `email`, `phone`. |       |
| SP6-T-03 | `[ ]`  | **GHL — sync opportunities (7-03)**      | Pipelines de GHL importados; cambios bidireccionales.                    |       |
| SP6-T-04 | `[ ]`  | **UI admin GHL conexión (7-04)**         | Estado de conexión + reconnect + disconnect funcionan.                   |       |
| SP6-T-05 | `[ ]`  | **Tests integración sandbox GHL (7-05)** | Suite contra cuenta de prueba pasa.                                      |       |

---

## Sprint 7 — ActiveCampaign adapter

> Versión objetivo: `v0.8.0` · Tareas 8-01..8-05.

### Tabla de tests manuales — Sprint 7

| #        | Estado | Test                             | Pasos / Resultado esperado                                                     | Notas |
| -------- | :----: | -------------------------------- | ------------------------------------------------------------------------------ | ----- |
| SP7-T-01 | `[ ]`  | **API Key auth funciona (8-01)** | Guardar API Key + URL de cuenta AC desde admin. Test de conexión devuelve 200. |       |
| SP7-T-02 | `[ ]`  | **AC — sync contacts (8-02)**    | Bidireccional contacts. Tags y custom fields incluidos.                        |       |
| SP7-T-03 | `[ ]`  | **AC — sync deals (8-03)**       | Pipelines AC importados.                                                       |       |
| SP7-T-04 | `[ ]`  | **UI admin AC conexión (8-04)**  | Form sencillo (API Key + URL).                                                 |       |
| SP7-T-05 | `[ ]`  | **Tests integración AC (8-05)**  | Suite contra cuenta dev pasa.                                                  |       |

---

## Sprint 8 — Adapter pattern generalization

> Versión objetivo: `v0.9.0` · Tareas 9-01..9-04.

### Tabla de tests manuales — Sprint 8

| #        | Estado | Test                                               | Pasos / Resultado esperado                                                      | Notas |
| -------- | :----: | -------------------------------------------------- | ------------------------------------------------------------------------------- | ----- |
| SP8-T-01 | `[ ]`  | **Interface `IntegrationAdapter` extraída (9-01)** | Todos los adapters implementan la misma interface. Tests verifican el contrato. |       |
| SP8-T-02 | `[ ]`  | **Factory por tenant (9-02)**                      | Una sola función `getAdapterForTenant(tenantId, provider)` resuelve el adapter. |       |
| SP8-T-03 | `[ ]`  | **Field mapping unificado (9-03)**                 | `crm_field_mapping` cubre todos los providers con misma estructura.             |       |
| SP8-T-04 | `[ ]`  | **Docs adapter contract (9-04)**                   | `docs/architecture/adapters.md` documenta cómo añadir un nuevo CRM en < 1 día.  |       |

---

## Sprint 9 — CRMs Tier 2 on-demand

> Versión objetivo: `v0.10.x+` · Solo bajo pedido cliente — tabla por CRM activado.

### Plantilla por CRM Tier 2

> Copiar esta tabla cuando se active un nuevo Tier 2. Sustituir `<CRM>` por el nombre real (Clientify / Bitrix24 / Pipedrive / Monday / Holded).

| #                | Estado | Test                                  | Pasos / Resultado esperado                | Notas |
| ---------------- | :----: | ------------------------------------- | ----------------------------------------- | ----- |
| SP9-`<CRM>`-T-01 | `[ ]`  | **OAuth/API auth `<CRM>`**            | Conexión inicial OK.                      |       |
| SP9-`<CRM>`-T-02 | `[ ]`  | **Sync contacts/leads `<CRM>`**       | Bidireccional con campos básicos.         |       |
| SP9-`<CRM>`-T-03 | `[ ]`  | **UI admin conexión `<CRM>`**         | Form conexión + estado.                   |       |
| SP9-`<CRM>`-T-04 | `[ ]`  | **`crm_write_audit` log `<CRM>`**     | Cambios registrados.                      |       |
| SP9-`<CRM>`-T-05 | `[ ]`  | **Tests integración sandbox `<CRM>`** | Cuenta de prueba conectada y suite verde. |       |

---

## Cómo añadir un test nuevo

1. Localiza el sprint correcto (o crea una sección nueva si la tarea cruza sprints).
2. Genera el ID siguiendo el patrón `SP<n>-T-<NN>` (incremental dentro del sprint).
3. Rellena las columnas:
   - **Estado**: empieza en `[ ]`.
   - **Test**: título corto (≤ 80 caracteres).
   - **Pasos / Resultado esperado**: ≤ 2 frases. Incluir command CLI si aplica.
   - **Notas**: vacío hasta que el dev firme.
4. Si el test es **automatizable**, también añadirlo a `tests/e2e/sprint-<N>/` y marcarlo en este doc como `[x]` cubierto por suite — pero mantener la entrada para la revisión manual del cierre.

## Cuándo se ejecuta este checklist

- **Obligatorio**: en `SP-X-CLOSE-3 Test Manual del Dev` (penúltima tarea del cierre de cada sprint).
- **Opcional / mid-sprint**: cuando un bloque grande quede a 🔵 y se quiera verificar antes de seguir.

Los bugs detectados durante esta ronda van a `SP-X-CLOSE-4 Corrección de bugs detectados` como subtareas dinámicas del RoadMap.
