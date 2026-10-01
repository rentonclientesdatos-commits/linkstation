---
title: "7-04 — Webhook pull + idempotency"
status: pending
priority: P2
estimation: 3-8h
phase_id: 7-04
sprint_id: SP-7
branch: feature/sprint-07-activecampaign-adapter
created: 2026-05-21
---

# Phase 04 — Webhook pull (7-04)

## Context Links

- [plan.md](plan.md) — overview Sprint 7
- Source phase legacy: `../260520-1342-sprint-4-post-mvp-crms/phase-04-activecampaign-adapter.md`
- [phase-02](phase-02-contacts-tags.md) — Adapter listo

## Overview

- **Prioridad:** P2
- **Estado:** Pendiente — requiere 7-02
- **Descripción:** Endpoint `POST /api/webhooks/activecampaign` con idempotency, registro automático del webhook en AC al activar integración, parse de eventos `contact_update`, `deal_update` y apply R-014.

## Key Insights

- AC webhooks NO firman con HMAC nativo → validación por API Key adicional o IP whitelist (limitada)
- Mejor approach: registrar webhook con un `token` único por tenant en query string y validarlo
- AC garantiza "at least once" → idempotency obligatoria
- Webhook registro: `POST /webhooks` con `events: ['contact_update', 'deal_update']`
- Guardar `ac_webhook_id` para poder eliminar al desconectar

## Requirements

**Funcionales:**

- Endpoint `POST /api/webhooks/activecampaign?token=<per-tenant>` valida token
- Auto-registro de webhook en AC al activar integración
- Idempotency via `sync_events`
- Apply R-014 al update lead
- Handler para `contact_update` y `deal_update`

**No funcionales:**

- Response 200 inmediato + procesamiento async BullMQ
- Audit log
- Token único por tenant (HMAC firmado con secret server)

## Architecture

```
Setup (al activar integración):
  ACWebhookRegistrar.register(tenantId, accountUrl, apiKey)
    → generar token único per-tenant (HMAC server-secret + tenantId)
    → POST /webhooks
      url: https://app.linkstation.ai/api/webhooks/activecampaign?token=<token>
      events: ['contact_update', 'deal_update']
    → persist ac_webhook_id en crm_connections

Webhook in:
  POST /api/webhooks/activecampaign?token=<token>
    → validate token (HMAC check)
    → find tenant by token
    → idempotency sync_events
    → enqueue BullMQ "ac-pull"
    → respond 200

BullMQ worker ac-pull:
  → switch event.type:
      contact_update → GET /contacts/{id} → diff → R-014 → persist
      deal_update → GET /deals/{id} → update deal en BD
  → audit log
```

## Related Code Files

**Crear:**

- `src/app/api/webhooks/activecampaign/route.ts`
- `src/jobs/ac-pull.job.ts`
- `src/lib/integrations/activecampaign/ac-webhook-registrar.ts`

**Modificar:**

- `src/lib/actions/ac-connect.ts` (call register tras conexión)

## Implementation Steps

1. `ac-webhook-registrar.ts` con generación de token HMAC
2. POST `/webhooks` al activar integración
3. Persistir `ac_webhook_id`
4. Route handler `/api/webhooks/activecampaign` con token validation
5. Lookup tenant by token
6. Enqueue + respond 200
7. BullMQ worker `ac-pull.job.ts`
8. Handlers contact_update + deal_update
9. Apply R-014
10. Audit log entries
11. Delete webhook en AC al desconectar (DELETE `/webhooks/{id}`)

## Todo List

- [ ] `ac-webhook-registrar.ts` con token HMAC
- [ ] Auto-registro POST `/webhooks`
- [ ] Persistir `ac_webhook_id`
- [ ] Route `/api/webhooks/activecampaign`
- [ ] Token validation
- [ ] Lookup tenant
- [ ] Response 200 + enqueue
- [ ] BullMQ worker `ac-pull.job.ts`
- [ ] Handler contact_update
- [ ] Handler deal_update
- [ ] Apply R-014
- [ ] Idempotency sync_events
- [ ] Audit log entries
- [ ] DELETE webhook al desconectar

## Success Criteria

- Webhook AC → lead Esden actualizado < 2 min
- Token tampered → 401 rechazado
- Webhook duplicado → no doble update
- R-014 aplicado correctamente
- Webhook eliminado en AC al desconectar

## Risk Assessment

| Riesgo                                | Prob  | Impacto | Mitigación                                 |
| ------------------------------------- | ----- | ------- | ------------------------------------------ |
| Token expone tenant_id en URL         | Media | Bajo    | HMAC opaco — no es legible                 |
| AC API cambia formato webhook payload | Baja  | Medio   | Tests integration verifican payload schema |
| Webhook duplicado masivo              | Alta  | Bajo    | sync_events idempotency robusto            |

## Security Considerations

- Token HMAC firmado con secret server-only
- No exponer información sensible en endpoint público
- Rate limiting básico
- Constant-time compare en validación token

## Next Steps

- Habilita 7-05 (UI admin con badge webhook)
