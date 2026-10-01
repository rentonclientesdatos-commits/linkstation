# Runbook E2C Local — Sprint 4 Google Sheets (cierre formal)

> **Propósito**: ejecutar el flujo Google Sheets **completo** en local (`http://localhost:8501`), incluyendo el bloque **R-014 audit** integrado en sesión 29-05-2026.
>
> **Diferencia con `sheets-spike-manual-runbook.md`**: ese runbook (Sprint 4 SPIKE inicial) corre en puerto 8500 y NO valida `crm_write_audit`. Este runbook reemplaza+amplía con el audit R-014.
>
> **Entorno target**: worktree `worktrees/sprint-04-google-sheets/` rama `feature/sprint-04-google-sheets` + Supabase Docker local (no VPS).

## Pre-requisitos

### 0.1 Estado código

- [ ] Rama `feature/sprint-04-google-sheets` con HEAD ≥ `e573d65` (incluye hotfix turbopack + bloque R-014).
- [ ] `npm install` ejecutado en el worktree (Husky activado).
- [ ] Typecheck ✅ (`npm run typecheck`).
- [ ] Tests unitarios ✅ (`npm test -- --run`), debe reportar **274 passed**.

### 0.2 Migraciones aplicadas a Supabase local

Containers Docker arrancados:

```bash
docker ps --filter "name=supabase" --format "{{.Names}} {{.Status}}"
```

Migrations Sprint 4 + R-014 aplicadas:

- `20260527000000_sheet_connections.sql`
- `20260527000001_integrations_tenant_oauth_app.sql`
- `20260527000002_sheets_writeback_trigger.sql`
- `20260529000000_crm_write_audit_align_schema.sql` (R-014 align)

Verificación rápida:

```bash
docker exec supabase_db_linkstation-dashboard psql -U postgres -d postgres \
  -c "\d public.crm_write_audit" | grep -E "crm_type|operation|result|payload_hash"
```

Esperado: 4 líneas, todas con tipo `text`.

### 0.3 Secrets locales

Fichero `.secrets/google-test-account.env` (gitignored) con:

```dotenv
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_PICKER_API_KEY=AIzaSy...
NGROK_HTTPS_URL=https://xxxx.ngrok-free.app
TEST_SHEET_URL=https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
TEST_GMAIL=ai2you.email@gmail.com
```

`.env.local` con:

```dotenv
PORT=8501
NEXT_PUBLIC_APP_URL=${NGROK_HTTPS_URL}   # IMPORTANTE: Drive solo notifica a HTTPS público
ENCRYPTION_KEY=<32 bytes hex>
OAUTH_STATE_SECRET=<≥32 chars base64url>
REDIS_URL=redis://localhost:6379
```

### 0.4 Servicios externos

- [ ] Redis local activo: `docker ps | grep redis` o `redis-cli ping` → `PONG`.
- [ ] Túnel HTTPS público corriendo: `ngrok http 8501` (o `cloudflared tunnel --url http://localhost:8501`).
- [ ] La URL HTTPS pública del túnel está pegada como `NEXT_PUBLIC_APP_URL` en `.env.local`.
- [ ] Google Cloud OAuth Client tiene **AMBOS** redirect URIs registrados:
  - `http://localhost:8501/api/integrations/google/callback`
  - `${NGROK_HTTPS_URL}/api/integrations/google/callback`

### 0.5 Dev server

```bash
cd worktrees/sprint-04-google-sheets
npm run dev   # arranca en 8501
```

En terminal aparte, tail de logs JSON:

```bash
# Filtrar logs sheets relevantes
npm run dev 2>&1 | grep -E "sheets|orchestrator|writeback|audit|webhook"
```

---

## Step 1 — Login + tenant ready

1. `http://localhost:8501/login` → login con cuenta dev (vault `infra/supabase-vps/.vault/dev-user.env` o equivalente local).
2. Navegar a `/dashboard`. Debe cargar sin errores.
3. **Capturar screenshot**: `docs/screenshots/sprint-4-e2c/01-dashboard-loaded.png`.

**Verificación SQL**:

```sql
SELECT id, slug, auth_user_id FROM public.tenants WHERE auth_user_id = auth.uid();
```

Guardar el `id` devuelto como `$TENANT_ID` para los siguientes pasos.

## Step 2 — Wizard Google Sheets · Step 1 (credenciales app)

1. Navegar a `/dashboard/settings/integrations/google-sheets`.
2. **Estado UI esperado**: Stepper con 4 pasos, Step 1 activo (azul), Steps 2-4 grises.
3. Rellenar formulario:
   - `Client ID` = `$GOOGLE_CLIENT_ID`
   - `Client Secret` = `$GOOGLE_CLIENT_SECRET`
4. Click **Guardar y seguir**.
5. **Esperado**: toast verde "Credenciales guardadas", Step 2 pasa a activo.

**WCAG check (lighthouse o axe-devtools)**:

- [ ] Stepper con `aria-current="step"` en el activo.
- [ ] Inputs con `<label>` asociado.
- [ ] Contraste botón principal ≥ 4.5:1.

**Verificación SQL**:

```sql
SELECT id, crm_type,
       app_client_id_cipher IS NOT NULL AS has_cid,
       app_client_secret_cipher IS NOT NULL AS has_secret,
       is_active
FROM public.integrations
WHERE tenant_id = '$TENANT_ID' AND crm_type = 'google_sheets';
```

Esperado: 1 fila, `has_cid=true`, `has_secret=true`, `is_active=true`.

**Screenshot**: `docs/screenshots/sprint-4-e2c/02-step1-credentials-saved.png`.

## Step 3 — Wizard Step 2 (OAuth flow Google)

1. Click **Conectar con Google**.
2. Redirige a `accounts.google.com`. Elegir cuenta `$TEST_GMAIL`.
3. Consent screen: muestra nombre del proyecto Google Cloud (no "Automatiza").
4. Click **Continuar** → **Permitir**.
5. Vuelve a `http://localhost:8501/dashboard/settings/integrations/google-sheets?connected=1`.
6. **Esperado**: banner verde "Cuenta Google conectada correctamente · $TEST_GMAIL".

**Verificación SQL**:

```sql
SELECT credentials_cipher IS NOT NULL AS has_tokens,
       metadata->>'connected_email' AS email,
       scopes,
       oauth_state IS NULL AS state_cleared
FROM public.integrations
WHERE tenant_id = '$TENANT_ID' AND crm_type = 'google_sheets';
```

Esperado: `has_tokens=true`, `email='$TEST_GMAIL'`, `scopes` contiene `drive.file` y `spreadsheets`, `state_cleared=true`.

**Screenshot**: `docs/screenshots/sprint-4-e2c/03-step2-oauth-connected.png`.

## Step 4 — Wizard Step 3 (Picker + Sheet test)

1. Click **Conectar hoja(s)**.
2. Picker carga (puede tardar 2-3s). Buscar `$TEST_SHEET_URL` por nombre.
3. Seleccionar la Sheet → **Select**.
4. **Esperado**: toast "1 hoja conectada", lista de hojas muestra el nuevo registro.

**Verificación SQL**:

```sql
SELECT id, spreadsheet_id, sheet_tab_name, purpose,
       drive_channel_id IS NOT NULL AS has_watch,
       drive_channel_expiry > NOW() + INTERVAL '6 days' AS expiry_ok,
       jsonb_array_length(column_mapping->'columns') AS n_columns,
       writeback_enabled
FROM public.sheet_connections
WHERE tenant_id = '$TENANT_ID';
```

Esperado: 1 fila, `has_watch=true`, `expiry_ok=true`, `n_columns >= 6`, `writeback_enabled=false` (default).

**Verificación column_mapping**:

```sql
SELECT jsonb_pretty(column_mapping->'columns')
FROM public.sheet_connections
WHERE tenant_id = '$TENANT_ID';
```

Esperado: array con targets como `lead.nombre`, `lead.email`, `lead.telefono`, `lead.current_stage`, etc.

**Screenshot**: `docs/screenshots/sprint-4-e2c/04-step3-sheet-connected.png`.

## Step 5 — Pull leads (añadir filas en Sheet)

1. Abrir `$TEST_SHEET_URL` en navegador (Google).
2. Añadir 3 filas nuevas:
   ```
   Ana | García | ana.test@example.com | +34666999001 | Esden Business | Comercial | QUALIFICATION
   Luis | Pérez | luis.test@example.com | +34666999002 | Esden Business | Soporte | QUALIFICATION
   María | López | maria.test@example.com | +34666999003 | Esden Business | Ventas | QUALIFICATION
   ```
3. Esperar 10-20s (Drive push notification + worker BullMQ).

**Verificación logs dev server**:

```
[webhook.google-sheets] sheets-pull enqueued desde webhook Drive
[queue.sheets-pull] sheets-pull job START
[queue.sheets-pull] sheets-pull job DONE { rows_total: 4, rows_new: 3, leads_created: 3 }
[ORCHESTRATOR] handleNewLead leadId=... x3
```

**Verificación SQL leads**:

```sql
SELECT id, nombre, apellidos, email, telefono, current_stage,
       metadata->'sheet_source'->>'spreadsheet_id' AS sheet_id,
       (metadata->'sheet_source'->>'row_index')::int AS row_idx
FROM public.lead
WHERE tenant_id = '$TENANT_ID'
  AND email IN ('ana.test@example.com', 'luis.test@example.com', 'maria.test@example.com')
ORDER BY fecha_creacion DESC;
```

Esperado: 3 filas, todas con `sheet_id` poblado.

**Screenshot Google Sheet con datos**: `docs/screenshots/sprint-4-e2c/05a-sheet-with-rows.png`.
**Screenshot listado leads dashboard**: `docs/screenshots/sprint-4-e2c/05b-leads-in-dashboard.png`.

## Step 6 — Idempotencia pull

1. En la UI wizard (Step 3 / lista hojas), click sync manual (icono Refresh).
2. **Esperado logs**:
   ```
   [queue.sheets-pull] sheets-pull job DONE { rows_total: 4, rows_new: 0, rows_skipped: 3, leads_created: 0 }
   ```
3. **Verificación SQL** — no se crearon leads duplicados:
   ```sql
   SELECT COUNT(*) FROM public.lead
   WHERE tenant_id = '$TENANT_ID'
     AND email IN ('ana.test@example.com', 'luis.test@example.com', 'maria.test@example.com');
   ```
   Esperado: `3` (no `6`).

## Step 7 — Writeback + AUDIT R-014 (bloque nuevo sesión 29-05-2026)

### 7.1 Activar writeback en la connection

```sql
UPDATE public.sheet_connections
SET writeback_enabled = true,
    column_mapping = jsonb_set(
      column_mapping,
      '{columns}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN col->>'target' = 'lead.current_stage' THEN col || '{"writeback": true}'::jsonb
            ELSE col
          END
        )
        FROM jsonb_array_elements(column_mapping->'columns') col
      )
    )
WHERE tenant_id = '$TENANT_ID';
```

Verificar:

```sql
SELECT writeback_enabled,
       jsonb_pretty(column_mapping->'columns')
FROM public.sheet_connections WHERE tenant_id = '$TENANT_ID';
```

Esperado: `writeback_enabled=true`, en columns la entry de `lead.current_stage` tiene `"writeback": true`.

### 7.2 Disparar writeback cambiando stage de un lead

UPDATE en BD → trigger `trg_lead_writeback` encola en `sheets_writeback_outbox`:

```sql
UPDATE public.lead
SET current_stage = 'SCHEDULING'
WHERE email = 'ana.test@example.com' AND tenant_id = '$TENANT_ID';
```

Verificar outbox encolada:

```sql
SELECT id, lead_id, changes, status, attempts
FROM public.sheets_writeback_outbox
WHERE tenant_id = '$TENANT_ID'
ORDER BY created_at DESC LIMIT 1;
```

Esperado: 1 fila `status='pending'`, `changes = {"lead.current_stage": "SCHEDULING"}`.

### 7.3 Procesar outbox (manual o esperar al cron)

Opción A — disparar manualmente:

```bash
curl -X POST http://localhost:8501/api/internal/sheets/cron \
  -H "Authorization: Bearer $INTERNAL_CRON_SECRET"
```

Opción B — esperar al cron (verificar `src/app/api/internal/sheets/cron/route.ts` para intervalo).

Verificar outbox procesada:

```sql
SELECT status, processed_at, last_error
FROM public.sheets_writeback_outbox
WHERE tenant_id = '$TENANT_ID'
ORDER BY created_at DESC LIMIT 1;
```

Esperado: `status='done'`, `processed_at IS NOT NULL`, `last_error IS NULL`.

### 7.4 ✅ Verificar AUDIT R-014 (lo nuevo de esta sesión)

```sql
SELECT id, crm_type, operation, local_entity, local_entity_id,
       provider, lead_id, field_name, new_value, result, write_policy,
       payload_hash IS NOT NULL AS hash_ok,
       crm_entity_id
FROM public.crm_write_audit
WHERE tenant_id = '$TENANT_ID'
ORDER BY created_at DESC LIMIT 5;
```

**Esperado** (1+ filas):

- `crm_type='google_sheets'`
- `operation='update'`
- `local_entity='lead'`
- `local_entity_id` = id del lead Ana
- `provider='google_sheets'`
- `field_name='lead.current_stage'`
- `new_value='SCHEDULING'`
- `result='success'`
- `write_policy='overwrite_with_audit'`
- `hash_ok=true`
- `crm_entity_id` matches pattern `<spreadsheet_id>#row=<n>`

**Verificación append-only (intentar UPDATE debe fallar a nivel app, RLS bloquea)**:

```sql
SET ROLE authenticated;
UPDATE public.crm_write_audit SET result = 'tampered' WHERE tenant_id = '$TENANT_ID';
RESET ROLE;
```

Esperado: `UPDATE 0` o error de permisos (no hay policy UPDATE para authenticated).

### 7.5 Verificar celda en la Sheet

Abrir Google Sheet → fila de Ana, columna Estado debe haber pasado de `QUALIFICATION` a `SCHEDULING`.

**Screenshot**: `docs/screenshots/sprint-4-e2c/07-writeback-applied-to-sheet.png`.

## Step 8 — WCAG 2.2 AA del wizard completo

Ejecutar (mientras estás en `/dashboard/settings/integrations/google-sheets`):

```bash
# Opción A: axe-core via npm script (si existe)
npx playwright test tests/e2e/sprint-3-close/wcag-accessibility.spec.ts

# Opción B: Chrome DevTools manual
# DevTools → Lighthouse → Accessibility only → Generate report
```

**Criterios mínimos**:

- [ ] Score ≥ 95.
- [ ] Cero issues serios/críticos.
- [ ] Navegación por teclado (Tab/Shift+Tab) recorre el stepper en orden.
- [ ] Focus visible en todos los botones.

**Screenshot reporte**: `docs/screenshots/sprint-4-e2c/08-wcag-report.png`.

## Step 9 — Cleanup

1. UI → eliminar la connection (botón papelera).
2. Verificar logs: `stopWatch` invocado sin error.
3. **Verificación SQL**:

   ```sql
   SELECT COUNT(*) FROM public.sheet_connections WHERE tenant_id = '$TENANT_ID';
   -- esperado: 0

   SELECT COUNT(*) FROM public.sheet_row_processed
   WHERE sheet_connection_id NOT IN (SELECT id FROM public.sheet_connections);
   -- esperado: 0 (CASCADE)

   -- crm_write_audit NO se borra (append-only, queda histórico)
   SELECT COUNT(*) FROM public.crm_write_audit WHERE tenant_id = '$TENANT_ID';
   -- esperado: >= 1
   ```

## ✅ Criterios de éxito Sprint 4 cierre

- [ ] Step 2: credenciales OAuth app cifradas y persistidas.
- [ ] Step 3: tokens OAuth usuario guardados + email detectado.
- [ ] Step 4: connection + watch channel + column_mapping autocompletado.
- [ ] Step 5: 3 leads creados desde Sheet en < 30s, orchestrator invocado.
- [ ] Step 6: re-pull idempotente (0 duplicados).
- [ ] Step 7.3: outbox procesa writeback sin errors.
- [ ] **Step 7.4: audit R-014 inserta 1+ filas en `crm_write_audit` con todos los campos correctos**.
- [ ] Step 7.5: cambio reflejado en la Sheet real.
- [ ] Step 8: WCAG score ≥ 95.
- [ ] Step 9: cleanup completo, audit preservado.

## Bugs encontrados (rellenar durante E2C)

| ID       | Step | Descripción | Severidad | Fix commit |
| -------- | ---- | ----------- | --------- | ---------- |
| BUG-4-XX | -    | -           | -         | -          |

## Troubleshooting

| Síntoma                                       | Causa probable                                                         | Fix                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Webhook Drive nunca llega                     | `NEXT_PUBLIC_APP_URL` apunta a localhost                               | Pegar URL del túnel HTTPS                                        |
| OAuth 403 redirect_uri_mismatch               | Ambas URIs (localhost + ngrok) deben estar registradas en GCloud       | Añadir las 2 en GCloud → OAuth Client → Authorized redirect URIs |
| `audit insert falló` en logs                  | tenant sin `integration` activa de `google_sheets` (Step 3 incompleto) | Repetir OAuth flow                                               |
| Outbox queda `pending` siempre                | Cron interno no se dispara                                             | curl manual al endpoint o revisar BullMQ scheduler               |
| Migration `crm_write_audit_align` ya aplicada | Idempotente (IF NOT EXISTS)                                            | OK, no es error                                                  |

## Salida esperada del runbook

Al terminar este runbook con todos los criterios verdes:

1. Marcar como completed la tarea `Ejecutar E2C Local Playwright Sprint 4` en TodoWrite.
2. Pasar a CLOSE-1..5 formal (typecheck + lint baseline + build + tests + bundle commit + PR).
3. Bump SemVer `package.json` a `0.5.0` antes del PR.

---

> Generado 29-05-2026, sesión Sprint 4 cierre.
> Reemplaza a `sheets-spike-manual-runbook.md` para el cierre formal (este runbook NO duplica, AMPLÍA).
