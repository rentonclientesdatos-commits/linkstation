# Phase 04 — WriteGuard + crm_write_audit integration

## Context Links

- [plan.md](./plan.md) — overview
- [researcher-03-adapter-pattern.md](./research/researcher-03-adapter-pattern.md) §2 (WriteGuard), §3 (crm_write_audit table)
- Decisión R-014 (memoria proyecto): append-only por default; sobrescritura con audit trail.

## Overview

- **Prioridad:** P1 (regla de negocio R-014 obligatoria)
- **Status inicial:** 🔘 Pendiente
- **Descripción:** crear `WriteGuard` standalone que filtra el payload antes de llamar `provider.updateLead()`: en `append_only` skip cualquier campo que ya tenga valor en CRM; en `overwrite_with_audit` solo permite campos en `override_fields[]` whitelist y registra cada cambio en `crm_write_audit` vía service_role.
- **Tiempo estimado:** 6h 00min

## Key insights

- `append-only` ≠ "nunca UPDATE". Significa: skip campos que ya tienen valor — el CRM puede recibir UPDATEs para campos null/vacíos (researcher-03 §2 "append-only semantics clarification").
- WriteGuard recibe `currentCRMFields` del caller (no hace round-trip propio — el caller llamó antes a `getLead`). Esto evita doble llamada y respeta SRP.
- `crm_write_audit` insert es fire-and-forget — fallo de audit no debe bloquear el write CRM (researcher-03 §2). Pero **se debe loguear** error de audit.
- Solo `updateLead` necesita guard. `createLead` siempre es additive. `addTags` es append-safe nativo. `createTask/createEvent` son activities, no fields.
- RLS DB nivel: `crm_write_audit` no permite UPDATE/DELETE (sin policies) — el código no puede borrar audit aunque tenga `service_role` (researcher-03 §3b).

## Requirements

### Funcionales

- `applyWritePolicy(opts: WriteGuardOptions): Promise<Record<string, unknown>>` standalone function.
- Caso `policy = append_only`:
  - For each `(key, value)` en `fields`: si `currentCRMFields[key]` es null/undefined/empty string → incluir en output. Sino skip silencioso.
  - NO escribe audit.
  - Returns filtered fields.
- Caso `policy = overwrite_with_audit`:
  - For each `(key, value)` en `fields`: si `allowedOverrideFields.includes(key)` → incluir + agregar audit row. Sino skip silencioso.
  - Insert batch a `crm_write_audit` con `service_role` (supabaseAdmin). Fire-and-forget pero loguea error.
  - Returns filtered fields.
- `updateLead` flow caller debe: `getLead()` → `applyWritePolicy()` → `provider.updateLead(safeFields)`.
- Helper `auditViewQuery(tenantId, leadId, limit=50)` para Phase 05 UI: SELECT `crm_write_audit` filtrado por tenant + lead, ordenado DESC.

### No funcionales

- File `write-guard.ts` <150 líneas.
- Sin `any` en interfaces públicas.
- Audit insert no bloqueante (`.then().catch()` o promise no-awaited).

## Architecture

```
Caller (server action / API route):
  ┌────────────────────────────────────────────────┐
  │ 1. provider.getLead(leadId) → CRMLead          │
  │ 2. const safe = await applyWritePolicy({       │
  │      tenantId, integrationId, provider: 'zoho',│
  │      leadId, fields: incomingPayload,          │
  │      currentCRMFields: lead.fields,            │
  │      actorId: session.user.id,                 │
  │      policy: integration.write_policy,         │
  │      allowedOverrideFields: integration.override_fields │
  │    })                                          │
  │ 3. if (Object.keys(safe).length === 0) return  │
  │      { skipped: true, reason: 'no_writable_fields' }│
  │ 4. await provider.updateLead(leadId, safe)     │
  └────────────────────────────────────────────────┘

WriteGuard:
  applyWritePolicy({...}):
    if (policy === 'append_only'):
      safeFields = filter where currentCRMFields[k] is null/empty
      return safeFields  // no audit
    if (policy === 'overwrite_with_audit'):
      safeFields = filter where allowedOverrideFields.includes(k)
      audit rows = build from safeFields with old/new values
      supabaseAdmin.from('crm_write_audit').insert(audit rows)
        .then on error → console.error (do NOT throw)
      return safeFields
```

## Related Code Files

### Modificar

- (ninguno — WriteGuard se invoca desde server actions/API routes que se construyen en Phase 05)

### Crear

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/write-guard.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/audit-query.ts` (helper SELECT para UI)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/write-guard.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/audit-query.test.ts`

## Implementation steps

1. **Crear `write-guard.ts`** con `WriteGuardOptions`, `WritePolicy` types y `applyWritePolicy` function (researcher-03 §2 literal).
2. **Crear `audit-query.ts`**: `getAuditLog({ tenantId, leadId, limit })` retorna array de audit rows ordered DESC. Usa supabase client browser-safe (RLS limita por tenant).
3. **Test `write-guard.test.ts`**:
   - **append_only happy:** `fields = { email: 'a', phone: 'b' }`, `currentCRMFields = { email: 'x', phone: null }` → output `{ phone: 'b' }`. No insert call.
   - **append_only todo lleno:** todos los campos ya tienen valor → output `{}`. No insert.
   - **append_only treat empty string as null:** `currentCRMFields = { phone: '' }` → permite write.
   - **overwrite_with_audit con whitelist:** `fields = { email, phone }`, `allowedOverrideFields = ['phone']` → output `{ phone }`. Insert 1 row con `old_value`, `new_value`.
   - **overwrite sin whitelist:** `allowedOverrideFields = []` → output `{}`. No insert.
   - **audit insert falla:** mock supabase devuelve error → función igualmente retorna `safeFields`, error logueado a console.error.
   - **multiple fields audit batch:** 3 fields overrideables → 1 insert call con array de 3 rows.
4. **Test `audit-query.test.ts`**:
   - Returns rows DESC by created_at.
   - Respeta RLS: con tenant A solo ve sus rows (mock supabase con dos tenants seed).
   - Empty case retorna `[]`.
5. **Smoke integration (Phase 06 lo cubrirá):** combine factory + zoho mock + WriteGuard + assert que `updateLead` solo se llama con campos safe.
6. **`npm run typecheck` + `npm run test -- write-guard` verdes.**
7. **Commit** `feat(sprint-2): write-guard append-only + overwrite-audit + audit-query helper`.

## Todo list

- [x] Crear `write-guard.ts` con `applyWritePolicy`
- [x] Crear `audit-query.ts` con `getAuditLog`
- [x] Tests write-guard cubriendo todos los casos + audit failure
- [x] Tests audit-query con RLS multi-tenant
- [x] typecheck + test verdes
- [x] Commit

## Success criteria

- Coverage `write-guard.ts` y `audit-query.ts` ≥95% (lógica pura, fácil testear).
- Test "audit insert falla" demuestra fire-and-forget: write CRM no se bloquea.
- Test "RLS multi-tenant" demuestra que tenant A no ve audit de tenant B (incluso con bug en código aplicación).

## Risk assessment

| Riesgo                                                                                                              | Likelihood | Impact | Mitigación                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fire-and-forget oculta errores de audit a producción                                                                | Media      | Medio  | Loguear error a console.error CON `integration_id` y `lead_id`. Sprint 3 añadirá observability con Sentry para alertar audit failures. Documentar como known limitation en ADR-021.                                                                                                                                                         |
| `currentCRMFields` puede contener nested objects (Zoho retorna structs) — comparación naive falla                   | Media      | Bajo   | Decisión MVP: `applyWritePolicy` solo compara primitivos (string/number/bool/null). Si caller pasa objetos en `fields`, asume "skip" en append_only. Documentar en JSDoc.                                                                                                                                                                   |
| Caller olvida llamar `getLead` antes y pasa `currentCRMFields = {}`                                                 | Media      | Alto   | En `append_only`, `{}` significa "todo está vacío" → permite escribir TODO → posible overwrite accidental. **Mitigación:** WriteGuard valida que `currentCRMFields` esté presente (no undefined) y loguea warning si vacío `{}`. Documentar en JSDoc explícito: "MUST call getLead first". Phase 05 server action wraps esto correctamente. |
| Race condition: 2 escrituras concurrentes mismo lead, ambas leen `currentCRMFields` con campo vacío, ambas escriben | Baja       | Bajo   | MVP acepta esto. Es write-after-write contention típica. Sprint 3 puede añadir advisory lock via `pg_advisory_xact_lock(hash(lead_id))`.                                                                                                                                                                                                    |

## Security considerations

- `applyWritePolicy` recibe `actorId` que se persiste en audit. Debe ser `auth.uid()` real (server-side validated), no input del cliente.
- Audit table no tiene UPDATE/DELETE policies — no se puede tamper con audit ni con bug en código.
- `supabaseAdmin` (service_role) solo se importa server-side. Verificar no se filtra a bundle browser.
- `audit-query` usa client autenticado (no service_role) — RLS filtra automáticamente por tenant. Verificar.
- Logs: `console.error` no debe incluir `old_value`/`new_value` (pueden ser PII). Loguear solo `integration_id`, `lead_id`, `field_name`, `error.message`.

## Tests requeridos

- Unit: `write-guard.test.ts` (8 casos), `audit-query.test.ts` (3 casos).
- Integration: cubierto en Phase 06 con factory + provider + WriteGuard en flujo completo.
- RLS test: insert directo desde `authenticated` client a `crm_write_audit` debe fallar (probado en Phase 01 SQL test).

## Dependencies

- Phase 01 (migración `crm_write_audit` aplicada + RLS) 🟢 obligatorio.

## Next phase

- Phase 05 (UI integra toggle write_policy + viewer audit log) — depende de 04 🟢.
- Paralelo con Phase 02 (Zoho) y Phase 03 (HubSpot).
