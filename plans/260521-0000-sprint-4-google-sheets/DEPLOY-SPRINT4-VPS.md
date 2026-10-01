# Runbook de despliegue VPS — Sprint 4 (Google Sheets pull/writeback)

> **Generado 03-06-2026.** Pasos EXACTOS para promover Sprint 4 al VPS sin perder
> datos ni romper leads históricos. **Probar TODO en local primero** (sección 0).
>
> ⚠️ **Regla de oro**: la migración de columnas SIEMPRE va ANTES que el código.
> Si despliegas el código nuevo contra una BD sin `current_stage`, el orchestrator
> y el pull de Sheets fallan (igual que fallaban en local — BUG-4-04).

## Contexto: qué cambia en este sprint

| Cambio                                                                               | Tipo                       | Riesgo si se omite                                           |
| ------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------ |
| Columnas `current_stage`, `assigned_advisor_id`, `last_advisor_assignment` en `lead` | **Migración SQL**          | Orchestrator + pull Sheets fallan ("column does not exist")  |
| Worker `sheets-pull` arranca en boot (`instrumentation.ts`)                          | Código                     | Sin él, ningún pull se procesa (BUG-4-03)                    |
| `removeOnComplete: true` en cola sheets-pull                                         | Código                     | Cada Sheet se procesa 1 vez y queda muda (BUG-4-09)          |
| Claim outbox en 2 pasos                                                              | Código                     | Writeback nunca procesa (BUG-4-06)                           |
| Autorelleno Estado + semáforo AF (`status_column`)                                   | Código + config por-tenant | Opcional: si no hay `status_column`, no se activa (no rompe) |

## 0. Validación EN LOCAL antes de tocar VPS (hacer primero)

Reproduce el camino del VPS contra Supabase local + un tenant limpio:

```bash
# 0.1 Estado código
cd worktrees/sprint-04-google-sheets
npm run typecheck            # exit 0
npm test                     # 278+ pass
npm run build                # exit 0

# 0.2 Simular BD "vieja" (sin las columnas nuevas) y aplicar migración
#     para verificar que el backfill no rompe nada:
docker exec supabase_db_linkstation-dashboard psql -U postgres -d postgres \
  -c "SELECT current_stage, status, COUNT(*) FROM public.lead GROUP BY 1,2;"
#     → confirmar que el backfill mapeó status→current_stage correctamente.
```

Checklist local (todo ✅ ya el 03-06-2026):

- [x] Pull automático vía webhook Drive (~30s) — lead llega solo a BD.
- [x] Idempotencia: re-pull no duplica.
- [x] Editar fila → UPDATE del lead (no duplica) — BUG-4-08.
- [x] Writeback stage → celda Sheet + `crm_write_audit` R-014.
- [x] Autorelleno Estado vacío → QUALIFICATION escrito en Sheet.
- [x] Semáforo AF 🔴→🟢 + backfill históricos sin duplicar.

## 1. Aplicar migración a VPS (ANTES del código)

La migración es **idempotente** (`IF NOT EXISTS`) y trae **backfill** desde `status`
(no pierde datos). Aplicar vía pg-meta REST (SSH key denegada — ver memoria
`reference-vps-pg-meta`):

```bash
# Archivo: supabase/migrations/20260603100000_lead_add_current_stage_and_advisor_fields.sql
# Aplicar su contenido vía POST a https://dev.linkstation.ai/supabase/pg/query
# con el service_role JWT (NUNCA imprimir el valor en logs/transcript).
```

**Verificación post-migración (VPS):**

```sql
-- 1. columnas creadas
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='lead'
  AND column_name IN ('current_stage','assigned_advisor_id','last_advisor_assignment');
-- esperado: 3 filas

-- 2. backfill correcto (ningún lead con current_stage NULL)
SELECT status, current_stage, COUNT(*) FROM public.lead GROUP BY 1,2 ORDER BY 1;
-- esperado: PENDING→QUALIFICATION, QUALIFIED→SCHEDULING, CLIENTE→COMPLETED, REJECTED→DROPPED

-- 3. recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
```

⚠️ Si PostgREST cachea schema viejo tras la migración: reiniciar contenedor
`supabase_rest` Y `supabase_kong` (orden: rest primero, luego kong), o el cliente
verá "column does not exist" / 502 (lección de la sesión 03-06).

## 2. Desplegar código (después de migración verde)

Las migraciones preexistentes corregidas en esta rama también deben estar en VPS:

- `20260524110000_help_sections_integrations.sql` (fix `content_md`→`content_markdown`)
- `20260526100000_campaigns_and_holidays.sql` (fix `user_tenants`→`tenants`)
- `20260527000002_sheets_writeback_trigger.sql` (usa `NEW.current_stage` — requiere paso 1)
- `20260529000000_crm_write_audit_align_schema.sql` (R-014)

Deploy del código vía Dokploy (push a `developer`→ promoción → staging → main según
flujo del proyecto). El worker `sheets-pull` arranca solo vía `instrumentation.ts`
(requiere `NEXT_RUNTIME=nodejs` + Redis accesible).

**Variables de entorno necesarias en VPS:**

- `REDIS_URL` — worker BullMQ (ya existe).
- `NEXT_PUBLIC_APP_URL` — **HTTPS público** (Drive solo notifica a HTTPS). En VPS
  es la URL real del dominio, no ngrok.
- `ENCRYPTION_KEY`, `OAUTH_STATE_SECRET` — OAuth Sheets (ya existen Sprint 1/2).
- `CRON_SECRET` — opcional, protege `/api/internal/sheets/cron`.

## 3. Leads históricos del VPS

El backfill de la migración (paso 1) ya asigna `current_stage` a TODOS los leads
existentes. No hay acción manual adicional para los leads. **No se pierde nada**:
`status` se conserva intacto, `current_stage` es columna nueva e independiente.

## 4. Columna AF (semáforo) — configuración POR TENANT (no global)

El semáforo AF NO es una migración. Es la clave `status_column` en el
`column_mapping` de cada `sheet_connection`. Es **opcional**: tenants sin ella
simplemente no ven semáforo (no da error).

Para activarlo en un tenant:

1. Añadir físicamente una columna en su Google Sheet (ej. "AF" tras la última).
2. Setear `status_column` con su letra:
   ```sql
   UPDATE public.sheet_connections
   SET column_mapping = jsonb_set(column_mapping, '{status_column}', '"H"'::jsonb)
   WHERE id = '<connection_id>';
   ```
3. (Opcional) Backfill 🟢 de leads ya sincronizados de ese tenant: re-pull o
   script de backfill (escribe solo en la columna AF de filas con lead existente,
   NO toca BD → no duplica). Patrón validado el 03-06.

> **Pendiente UI (futuro)**: exponer `status_column` en el wizard de Sheets para
> que el tenant lo configure sin SQL. Tarea separada de frontend.

## 5. Verificación post-deploy (VPS)

- [ ] `/api/health` → 200.
- [ ] Logs muestran `sheets-pull worker started` al boot.
- [ ] Conectar una Sheet de prueba → añadir fila → lead aparece en `/dashboard/historial` con `current_stage=QUALIFICATION` en < 1 min.
- [ ] Editar fila → lead actualizado (no duplicado).
- [ ] `crm_write_audit` recibe fila en writeback.

## 6. Rollback

- **Código**: revertir el deploy Dokploy a la imagen anterior.
- **Migración**: las columnas nuevas son aditivas y nullable-safe; dejarlas no
  rompe el código viejo (que ignora `current_stage`). NO hace falta DROP. Si se
  quisiera revertir: `ALTER TABLE public.lead DROP COLUMN current_stage, ...`
  (pierde el backfill, pero `status` sigue intacto).

---

> Generado 03-06-2026. Validar sección 0 en local antes de ejecutar 1-5 en VPS.
