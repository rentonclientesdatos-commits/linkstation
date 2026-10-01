---
title: "4-02 — Template Sheets por tenant + DB migration"
status: pending
priority: P2
estimation: 6-10h
phase_id: 4-02
sprint_id: SP-4
branch: feature/sprint-04-google-sheets
created: 2026-05-21
---

# Phase 02 — Template Sheets por tenant + DB migration (4-02)

## Context Links

- [plan.md](plan.md) — overview Sprint 4
- Source phase legacy: `../260520-1342-sprint-4-post-mvp-crms/phase-01-google-sheets-bidireccional.md`
- [phase-01](phase-01-oauth2-drive-setup.md) — depende de OAuth válido

## Overview

- **Prioridad:** P2
- **Estado:** Pendiente — puede iniciar en paralelo con 4-01 (migration), pero copy template requiere 4-01 completo
- **Descripción:** Migración de BD para columnas Sheets-específicas en `crm_connections` + copia automática de la plantilla maestra al activar la integración por tenant.

## Key Insights

- Plantilla maestra única en Drive de LinkStation, compartida en modo "anyone with link can copy"
- Cada tenant recibe su propia copia (no acceso a la maestra)
- Columnas obligatorias de la plantilla: `lead_id`, `email`, `firstName`, `lastName`, `phone`, `leadStatus`, `_esden_updated_at`
- `_esden_updated_at` es la marca de idempotencia — clave para evitar bucle push/pull
- Drive `files.copy` requiere scope `drive.file` (el copy queda en Drive del tenant)

## Requirements

**Funcionales:**

- Migration añade columnas `spreadsheet_id`, `gsheet_channel_id`, `gsheet_channel_expiry`, `gsheet_template_id` a `crm_connections`
- Función `copyTemplateToTenant(tenantId, oauth2Client)` crea spreadsheet en Drive del tenant
- Validación post-copia: leer columnas y verificar headers esperados
- Vincular `spreadsheet_id` resultante a `crm_connections` del tenant

**No funcionales:**

- Migration idempotente (re-ejecutable sin error)
- Si copy falla → no crear registro en `crm_connections` (transaccional)

## Architecture

```
src/db/migrations/2026XXXX_crm_connections_sheets_columns.sql
  ALTER TABLE crm_connections ADD COLUMN spreadsheet_id text,
                              ADD COLUMN gsheet_channel_id text,
                              ADD COLUMN gsheet_channel_expiry timestamptz,
                              ADD COLUMN gsheet_template_id text;

src/lib/integrations/sheets/sheets-template.ts
  - MASTER_TEMPLATE_ID = env GOOGLE_SHEETS_MASTER_TEMPLATE_ID
  - copyTemplateToTenant(tenantId, oauth2Client): { spreadsheetId }
  - verifyTemplateStructure(spreadsheetId): { ok, missingColumns }
```

## Related Code Files

**Crear:**

- `src/db/migrations/2026XXXX_crm_connections_sheets_columns.sql`
- `src/lib/integrations/sheets/sheets-template.ts`

**Modificar:**

- `src/lib/schemas/integrations-schema.ts` (añadir campos opcionales Sheets)
- `.env.example` (añadir `GOOGLE_SHEETS_MASTER_TEMPLATE_ID`)

**Depende de:**

- `src/lib/integrations/sheets/sheets-oauth.ts` (4-01)

## Implementation Steps

1. Escribir migration SQL con `ADD COLUMN IF NOT EXISTS`
2. Ejecutar `psql` en local + verificar columnas
3. Subir plantilla maestra a Drive de Automatiza, configurar permisos copy
4. Guardar `GOOGLE_SHEETS_MASTER_TEMPLATE_ID` en `.env.example`
5. Implementar `copyTemplateToTenant()` con `drive.files.copy`
6. Implementar `verifyTemplateStructure()` con `sheets.spreadsheets.values.get` sobre fila 1
7. Hook en UI admin: tras OAuth callback exitoso → copy template → persist spreadsheetId
8. Tests unitarios con mocks de Drive API

## Todo List

- [ ] Migration SQL crm_connections columnas Sheets
- [ ] Ejecutar migration en local
- [ ] Plantilla maestra subida a Drive AF
- [ ] `GOOGLE_SHEETS_MASTER_TEMPLATE_ID` en `.env.example`
- [ ] `sheets-template.ts` esqueleto
- [ ] `copyTemplateToTenant()` implementado
- [ ] `verifyTemplateStructure()` valida headers
- [ ] Wire en flow post-OAuth callback
- [ ] Transacción: rollback si copy falla
- [ ] Tests unitarios con mocks googleapis
- [ ] Documentar columnas obligatorias plantilla

## Success Criteria

- Tras OAuth de tenant nuevo, su `crm_connections.spreadsheet_id` apunta a un sheet propio
- Headers de la copia coinciden 1:1 con la plantilla maestra
- Migration aplicable y revertible sin pérdida de datos

## Risk Assessment

| Riesgo                                | Prob  | Impacto | Mitigación                                          |
| ------------------------------------- | ----- | ------- | --------------------------------------------------- |
| Tenant ya tiene spreadsheet existente | Media | Bajo    | UI ofrece "usar existente" o "crear copia"          |
| Drive quota límite del tenant         | Baja  | Medio   | Capturar 403 quota y mostrar error claro            |
| Plantilla maestra renombrada/borrada  | Baja  | Alto    | Lockear ID en env + monitorear health check semanal |

## Security Considerations

- Plantilla maestra solo otorga permiso de `copy`, no `read` ni `write`
- El spreadsheet del tenant queda en su Drive — Automatiza NO mantiene acceso
- `spreadsheet_id` no es secreto pero su acceso queda gobernado por OAuth del tenant

## Next Steps

- Habilita 4-03 (push) y 4-04 (pull) que asumen `spreadsheet_id` persistido
