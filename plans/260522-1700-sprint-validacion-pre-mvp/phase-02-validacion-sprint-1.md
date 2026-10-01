# Fase 02 — Validación Sprint 1 (Capa de datos)

## Context Links

- [plan.md](plan.md) — overview Sprint Validación Pre-MVP
- [Sprint 1 plan](../260520-1342-sprint-1-capa-datos/plan.md)
- [RoadMap Sprint 1](../RoadMap.md)
- [SP-2-CLOSE-summary.md](../260520-1342-sprint-1-capa-datos/SP-2-CLOSE-summary.md) — resumen ejecutivo del cierre

## Overview

- **Sprint validado**: Sprint 1 — Capa de datos sin ORM nuevo (SP-2, v0.2.0).
- **Branch origen**: `feature/sprint-01-capa-datos` (a fecha cierre — pendiente merge a `developer` por orden explícita del usuario, ver CLAUDE.md staging/main protection).
- **Estado**: 🟡 **Lista para validación SP-4B**. Rellenada por el orquestador AI en `SP-2-CLOSE-5`.
- **Tester**: por asignar dentro del equipo Renzo.

## Resumen del Sprint 1 a validar

Sprint 1 entrega la capa de datos completa: schemas Zod + repositorios tenant-scoped + RLS hardening + cifrado AES-256 de tokens OAuth + nuevo modelo de oportunidades múltiples con dedup + enum unificado de estados de lead + hook automation de tracking de tiempos. ADRs: 014 (handoff), 015 (orchestrator dual), 016 (Supabase upgrade), 017 (cifrado), 018 (defer hardening deps), 019 (migración incremental queries/as any).

**Commits en `feature/sprint-01-capa-datos` (desde `developer`):**

```
226be31 test(unit): Bloque 2.7 - Vitest setup + 58 unit tests + 4 integration skip-by-env
f490945 feat(logger): Bloque 2.4-2.5 partial - logger 2-37 + ADR-019 migración incremental
ccd6a50 refactor(services): 2-02.b + 2-03 DI cleanup - services usan getAdminSupabaseClient
4c58c5b feat(opportunities): NEW-06 modelo oportunidades múltiples + dedup 48h
8c800fc feat(hooks): Bloque 2.8 - hook productivity-logger + types-node@24 + ADR-018 defer hardening
f11bebf feat(security): Bloque 2.6 RLS hardening + 2-26 cifrado AES-256-GCM tokens OAuth
(commit Bloque 2.3 — Repository pattern: c.f. git log)
7b6d7af feat(enums): NEW-02 enum unificado estados lead/cualificación + UNREACHABLE
9f1fbca fix(lint): destructured vars _ en saveAgentVariant
588a5e3 feat(schemas): Bloque 2.2 capa Zod + 2-35 whitelist modelos LLM
3c2dd77 feat(deps): 2-02.a upgrade Supabase ssr 0.10.3 + supabase-js 2.106.1 + ADR-015/016
d9545d9 feat(handoff): NEW-13 política unificada handoff humano (Bea V1)
98b2c70 fix(lint): reposicionar eslint-disable en deepMerge tras reformat prettier
837e12f fix(orchestrator): NEW-01 fix saveOrchestratorConfig + audit 2-01
4b43b78 chore(sprint-1): kickoff Sprint 1 — capa de datos + Bloque 2.9 NEW-XX (Bea+Renzo)
```

## 1. Test automático (código)

Comandos exactos a ejecutar antes de cualquier merge:

```bash
# Typecheck (sin errores):
npm run typecheck

# Lint (baseline 120 warnings 'no-explicit-any' preexistentes documentados en ADR-019; no introducir nuevos):
npm run lint

# Build (41 rutas Next.js):
npm run build

# Tests unitarios Vitest (58 pasando):
npm test

# Tests con cobertura:
npm run test:coverage
# Esperado: cobertura alta en src/lib/schemas/, src/lib/repositories/, src/lib/crypto/, src/lib/utils/logger.ts
```

### Resultados del Test Automático

- `typecheck`: 0 errores (08-06-2026) 🟢
- `lint`: 105 problemas detectados (08-06-2026) 🟢
- `build`: 42 rutas compiladas con éxito (08-06-2026) 🟢
- `test`: 228 tests unitarios exitosos (08-06-2026) 🟢
- `test:coverage`: Generado con éxito, cobertura registrada en los módulos `crypto`, `integrations/crm`, `repositories` y `schemas` (08-06-2026) 🟢

**Suite de tests nuevos en `tests/unit/`:**

- `tests/unit/schemas/*.test.ts` — 35 tests Zod (base, leads, ai-agents, opportunities, integrations)
- `tests/unit/crypto/token-crypto.test.ts` — 8 tests AES-256-GCM (roundtrip, IV unique, JSON wrappers, authTag tamper, ENCRYPTION_KEY missing)
- `tests/unit/utils/logger.test.ts` — 4 tests logger estructurado + scrubbing PII
- `tests/unit/repositories/base-repository.test.ts` — 11 tests paginate/handleSupabaseError/withTenantFilter
- `tests/unit/repositories/lead-opportunities.integration.test.ts` — 4 tests integration con Supabase (skip si no hay env)

**Scripts nuevos en `package.json`:**

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

## 2. Test E2C local (Playwright contra `localhost:8500`)

Nuevos flujos golden path a validar manualmente o vía Playwright:

- **Widget chat (NEW-02 + 2-35):** abrir widget en una página de prueba, escribir mensaje. Verificar que `chat_messages` se persiste, `current_stage` queda en `QUALIFICATION` (no `gpt-4.1` redirigido), y la respuesta usa el modelo configurado.
- **Lead ingest + oportunidades (NEW-06):** POST a `/api/leads/ingest` con `x-api-key` válido y `programa_id` definido → comprobar:
  1. Respuesta `{leadId, opportunityId, isDuplicate: false}`.
  2. Segundo POST mismo lead+programa <48h → `{isDuplicate: true, duplicateOfId: <id-primera>}`.
  3. Tercer POST mismo lead, programa distinto → `{isDuplicate: false}` (otra oportunidad).
- **Handoff (NEW-13):** simular flujo `handleUnreachable(leadId, 'invalid_phone')` → verificar `lead.current_stage = UNREACHABLE`, `lead.tipo_lead = 'ilocalizable'`, sin tarea creada en Zoho (cuando el adapter exista en Fase 2).
- **Encrypted tokens (2-26):** al crear/actualizar una `integrations` row con `credentials_cipher`, comprobar que NO se almacena en plano (psql `SELECT credentials_cipher FROM integrations LIMIT 1;` debe mostrar `iv:ct:tag` formato hex).

Suite E2E Playwright pendiente para Sprint 1: aún no añadida (E2E completo es SP-4B alcance).

Comando: `npm run test:e2e -- tests/e2e/sprint-1/*.spec.ts` (cuando existan).

## 3. Test E2E VPS (Playwright contra VPS Renzo)

**Migraciones SQL nuevas a aplicar en VPS antes de promoción:**

```
supabase/migrations/20260522210000_ai_agent_variants_model_name_cleanup.sql
supabase/migrations/20260522220000_rls_ai_agents_hardening.sql
supabase/migrations/20260522220001_rls_web_widgets_hardening.sql
supabase/migrations/20260522220002_rls_programas_hardening.sql
supabase/migrations/20260522220003_integrations_table.sql
supabase/migrations/20260522230000_lead_opportunities.sql
```

Aplicar en orden lexicográfico (las dos primeras `20260522200000_*` y `20260522210000_*` ya estaban en commits previos).

**Variables de entorno nuevas que el VPS necesita:**

```bash
# CRÍTICO — necesaria por el cifrado AES-256-GCM de tokens OAuth (2-26).
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Guardar copia en gestor de secretos del cliente (perderla = perder acceso a integraciones).
ENCRYPTION_KEY=<64-chars-hex>
```

Resto de env vars sin cambios respecto al cierre Sprint 0.

**Test anti-fuga RLS** (verificar con psql conectado como `authenticated` con JWT de tenant B):

```sql
-- Esperado: 0 rows para cada query con JWT de tenant B contra datos de tenant A
SELECT * FROM ai_agents WHERE tenant_id = '<tenant-A-id>';
SELECT * FROM ai_agent_variants WHERE agent_id IN (SELECT id FROM ai_agents WHERE tenant_id = '<tenant-A-id>');
SELECT * FROM web_widgets WHERE tenant_id = '<tenant-A-id>';
SELECT * FROM programas WHERE tenant_id = '<tenant-A-id>';
SELECT * FROM integrations WHERE tenant_id = '<tenant-A-id>';
SELECT * FROM lead_opportunities WHERE tenant_id = '<tenant-A-id>';
```

Comando E2E VPS: `BASE_URL=https://dev.linkstation.ai npm run test:e2e -- tests/e2e/sprint-1/*.spec.ts` (cuando existan).

## 4. Test manual del tester (humano)

Checklist replicado de `docs/testeos-manual.md` (sección Sprint 1 cuando se elabore):

- [ ] Crear lead vía POST `/api/leads/ingest` con `programa_id`. Verificar respuesta y BD.
- [ ] Crear segundo lead mismo programa <48h. Verificar `isDuplicate: true`.
- [ ] Editar variant en `/dashboard/agents` y guardar con `model_name = "gpt-99"`. Esperar error claro de "modelo inválido".
- [ ] Guardar con `model_name = "gpt-4o-mini"`. Verificar persistencia.
- [ ] Abrir widget de chat embebido. Verificar respuesta de IA. Comprobar logs en stderr (NO `console.log [WIDGET AI] 🤖`).
- [ ] Cualificar lead → verificar `current_stage = SCHEDULING` (no string literal).
- [ ] Verificar UI Historial sigue funcionando con leads que tienen `current_stage = UNREACHABLE`.
- [ ] Tester con cuenta de tenant A intenta leer datos de tenant B (RLS): debe fallar (0 rows).
- [ ] Hook PostToolUse `af-productivity-logger.cjs`: editar manualmente una línea de estado de tarea en `plans/RoadMap.md` desde Claude Code → verificar que aparece `additionalContext` con `task_id`, `from_status`, `to_status` en la siguiente vuelta.

## 5. Hotfixes encontrados durante la validación

| BUG-ID  | Severidad | Descripción | Fix aplicado | Commit | Estado |
| ------- | --------- | ----------- | ------------ | ------ | ------ |
| BUG-XXX | —         | —           | —            | —      | 🔘     |

Política: cualquier bug detectado en SP-4B se anota aquí + se abre BUG-XXX en RoadMap. Convención commit: `fix(validacion-sp1): <descripcion>`.

## 6. Subida a GH

- Convención commit: `fix(validacion-sp1): <descripcion>`.
- Branch validación: `feature/sp-4b-validation-sprint-1` (creada cuando arranque SP-4B).

## Estado de la fase

| Bloque             | Estado                                      |
| ------------------ | ------------------------------------------- |
| 1. Test automático | 🟢 Completado                               |
| 2. Test E2C local  | 🟡 Hand-off completado, listo para ejecutar |
| 3. Test E2E VPS    | 🟡 Hand-off completado, listo para ejecutar |
| 4. Test manual     | 🟡 Hand-off completado, listo para ejecutar |
| 5. Hotfixes        | 🔘 Plantilla                                |
| 6. Subida GH       | 🔘 Plantilla                                |
