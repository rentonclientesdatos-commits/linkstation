# Pendientes post-/clear — Sprint 4 SPIKE-PULL-8 E2E real

> **Generado**: 03-06-2026 ~12:00 GMT+2, sesión maratón Sprint 4 cierre OAuth real.
> **Próxima sesión**: leer este fichero PRIMERO + memoria `MEMORY.md`.

## 🟢 Estado al cerrar sesión (validado en BD)

### ✅ Lo que está funcionando END-TO-END en local

| Stack                 | Estado                   | Detalle                                                                            |
| --------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Next dev 8501         | 🟢 UP                    | `npm run dev` background task `bots9ib1c`                                          |
| ngrok tunnel          | 🟢 UP estable            | `https://perjurer-dorsal-unframed.ngrok-free.dev` (PID 98596, v3.39.6 auth válido) |
| Supabase local Docker | 🟢 healthy 11 containers | reset hecho + todas migrations aplicadas                                           |
| Redis af-redis        | 🟢 PONG 6379             |                                                                                    |
| Cloudflared zombie    | ✅ matado                | PID 26212 (no daba ruido real, ya muerto)                                          |

### ✅ Flujo OAuth Google Sheets validado en BD

```sql
-- integration:
id=ae023cc1-b68c-4b3c-ba7a-50e7abb7fa7e
crm_type=google_sheets, is_active=true
has_cid=t, has_secret=t (cifrados AES-256)
has_tokens=t (access+refresh cifrados)
connected_email=LinkStation@gmail.com

-- sheet_connection:
id=4fc3188b-9587-4d43-a6db-d408c2ed1f91
spreadsheet_id=14IOEqK5hdMfiRMS0XrF0_NgzqGJ-7FujA2is3_oqsEI
sheet_tab_name=Hoja 1
purpose=leads_inbound
has_watch=t (Drive watch channel registrado)
n_columns=7 (column_mapping autocompletado)
writeback_enabled=false (default)
```

### 🔑 Variables y URLs clave

**ngrok (HTTPS público)**: `https://perjurer-dorsal-unframed.ngrok-free.dev`

- Authtoken guardado en `.secrets/google-test-account.env` como `NGROK_AUTHTOKEN=3EcS...zVKmcze`
- ngrok config: `C:\Users\javih\AppData\Local\ngrok\ngrok.yml`
- Binary: `C:/Users/javih/AppData/Local/Microsoft/WinGet/Packages/Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe/ngrok.exe`

**Google Cloud project**: `automatiza-dashboard-dev` (number `30317895538`)

- OAuth Client ID: `30317895538-0k6qp83dlani3fldn0h1q137634471o3.apps.googleusercontent.com`
- Client Secret: ver `.secrets/client_secret_dev.json` (NUNCA en git)
- Picker API Key: ver `.secrets/google-test-account.env` (`GOOGLE_PICKER_API_KEY`, gitignored — NUNCA en git)
- Test users autorizados: LinkStation@gmail.com, info@ai2you.ai, renton.clientes.datos@gmail.com

**Authorized redirect URIs en Google Cloud** (debe estar AMBAS):

- ✅ `http://localhost:8501/api/integrations/google/callback` (OAuth, BUG-4-02 fix)
- ✅ `https://perjurer-dorsal-unframed.ngrok-free.dev/api/integrations/google/callback` (legacy, opcional)

**Sheet test**: `https://docs.google.com/spreadsheets/d/14IOEqK5hdMfiRMS0XrF0_NgzqGJ-7FujA2is3_oqsEI/edit`

- 7 columnas: Nombre | Apellidos | Email | Teléfono | Empresa | Cargo | Estado
- 5 leads ficticios pre-cargados (Ana, Luis, María, Carlos, Sara)

**Usuario admin dashboard**: `LinkStation@gmail.com` / `BeaOli#AF*2026!`

- Tenant default: "LinkStation" (id=521a95da-fdce-48e1-8e53-7255bf039585)
- `is_admin=true` en `app_metadata` (ya promoted)

## 🔧 Commits pendientes en worktree (sin pushear)

```
M  package.json                                                    # 8500→8501
M  src/app/api/integrations/google/auth/route.ts                   # BUG-4-01 + BUG-4-02
M  src/app/api/integrations/google/callback/route.ts               # BUG-4-01 + BUG-4-02
M  src/lib/integrations/sheets/actions.ts                          # BUG-4-01
M  src/lib/integrations/sheets/adapter.ts                          # BUG-4-02 (getOAuthBaseUrl)
M  src/lib/integrations/sheets/credentials.ts                      # NEW: getOAuthBaseUrl()
M  src/lib/integrations/sheets/outbox-processor.ts                 # R-014 audit insert
M  src/lib/integrations/sheets/writeback.ts                        # R-014 writtenCells[]
M  src/lib/schemas/integrations.ts                                 # R-014 CrmWriteAuditSchema
M  supabase/migrations/20260524110000_help_sections_integrations.sql  # FIX schema bug
M  supabase/migrations/20260526100000_campaigns_and_holidays.sql       # FIX user_tenants→tenants
M  tests/unit/sheets/outbox.test.ts                                # +2 tests R-014
?? supabase/migrations/20260529000000_crm_write_audit_align_schema.sql  # NEW R-014 migration
?? tests/e2e/sheets/sheets-e2c-local-runbook.md                    # NEW runbook
```

**Verificación pre-commit pendiente**:

- ✅ Typecheck (verde tras BUG-4-02)
- ✅ Vitest 274/274
- ❌ Lint baseline 105 (preexistente, no nuestro)
- ❌ Build (no probado tras BUG-4-02)

## 🚦 Lo que QUEDA por hacer

### Paso E2E pendiente (Step 5-7 runbook)

| Step | Tarea                                                                                                                                                                                                                                                                                 | Tiempo est. |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 5    | Añadir 3 leads nuevos a la Sheet → ver pull automático via Drive webhook → 3 leads creados en BD `public.lead` con metadata.sheet_source poblado                                                                                                                                      | 15 min      |
| 6    | Idempotencia: re-sync manual → 0 leads nuevos (skip por row_hash)                                                                                                                                                                                                                     | 5 min       |
| 7    | Activar writeback (`UPDATE sheet_connections SET writeback_enabled=true`) + flip column lead.current_stage `writeback=true` + UPDATE lead.current_stage → ver outbox procesar → ver celda actualizada en Sheet → **verificar fila en `crm_write_audit` con campos completos (R-014)** | 25 min      |

### Cierre Sprint 4 formal (CLOSE-1..5)

| Subtarea                                 | Estado                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| CLOSE-1 typecheck + lint + build + tests | typecheck ✅ tests 274/274 ✅, lint 105 (preexistente baseline), build pendiente |
| CLOSE-1.5 security delta (OWASP)         | NO ejecutado — agentes proactivos lo cubren al cierre                            |
| CLOSE-2 E2C local WCAG 2.2 AA            | Pendiente Lighthouse score ≥95                                                   |
| CLOSE-3 Test manual dev                  | DIFERIDO a SP-4B (regla CLAUDE.md sprints MVP)                                   |
| CLOSE-4 fix bugs encontrados             | BUG-4-01 ✅ FIXED, BUG-4-02 ✅ FIXED. Más bugs posibles en Step 5-7              |
| CLOSE-5 push + PR a developer (NO merge) | Pendiente                                                                        |
| Bump v0.5.0 en package.json              | Pendiente                                                                        |

### Deudas técnicas detectadas durante sesión (NO bloqueantes Sprint 4)

1. **DEUDA SEG**: Client Secret OAuth Google expuesto en screenshot — usuario decidió no rotar. Memoria `project-google-oauth-secret-exposed-debt.md`.
2. **Fix migrations preexistentes** aplicados in-line:
   - `20260524110000_help_sections_integrations.sql`: columnas `content_md, audience` → `content_markdown, scope`
   - `20260526100000_campaigns_and_holidays.sql`: tabla inexistente `user_tenants` (7 refs) → `tenants/auth_user_id`
3. **Supabase Docker auto-corrupción**: el entrypoint `cat >> postgresql.conf` acumula 1959 bloques + NULL bytes tras meses. Problema documentar: cualquier reset largo del local. No bloqueante (con `supabase stop --no-backup && supabase start` se recupera).
4. **ngrok free-tier interstitial**: el usuario verá pantalla "Visit Site" 1 vez por sesión browser, normal.

## 🚀 Próximas acciones recomendadas (orden)

1. **Leer este fichero + memoria `MEMORY.md`** (especialmente `project-google-cloud-test-users.md` y deuda OAuth Secret).
2. **Verificar stack alive**: `curl localhost:8501/api/health` + ngrok URL responde 200 + Supabase healthy.
3. **Ejecutar Step 5 runbook** (añadir leads a Sheet → ver pull). Runbook completo en [tests/e2e/sheets/sheets-e2c-local-runbook.md](../../tests/e2e/sheets/sheets-e2c-local-runbook.md).
4. **Ejecutar Step 7 audit R-014** (lo más importante: validar que `crm_write_audit` recibe filas con todos los campos correctos).
5. **CLOSE-1**: `npm run typecheck && npm test -- --run && npm run build`.
6. **Bump SemVer** `0.3.0-rc.1` → `0.5.0` en package.json.
7. **Commit + push + PR a developer** (SIN merge, esperar orden usuario).

## 🔄 Servicios en background al cerrar sesión

⚠️ **Cuando cierres VSCode/PowerShell, estos procesos morirán**:

| Proceso         | PID              | Cómo relanzar                                                                                                                               |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ngrok tunnel    | 98596            | `C:/Users/javih/AppData/Local/Microsoft/WinGet/Packages/Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe/ngrok.exe http 8501 --log=stdout` |
| Next dev        | (auto-spawned)   | `cd worktrees/sprint-04-google-sheets && npm run dev`                                                                                       |
| Supabase Docker | (resiste reboot) | `npx supabase start` si caen                                                                                                                |

⚠️ **Si reinicias el equipo**, ngrok te dará URL distinta. Tendrás que repetir Google Cloud add redirect URI + actualizar `.env.local`.

## 📝 Mensaje EXACTO para arrancar siguiente sesión

> "Retomo Sprint 4 SPIKE Pull-8 E2E real desde el Step 5 del runbook. Lee primero `plans/260521-0000-sprint-4-google-sheets/PENDIENTES-POST-CLEAR-030626.md`. Verifica que el stack está UP (Next 8501 + ngrok + Supabase) o relánzalo. Sheet test ya conectada en BD (`spreadsheet_id=14IOEqK5...`). Voy a añadir 3 leads ficticios a la Sheet de Google y ver el pull automático llegar al backend."

---

> Generado al cierre de sesión 03-06-2026 12:00 GMT+2.
