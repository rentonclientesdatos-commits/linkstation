# Phase 06 — Tests cobertura final + docs + ADRs 020/021/022

## Context Links

- [plan.md](./plan.md) — overview
- Fases 01-05 cerradas con sus propios tests unit. Esta fase añade integration tests cross-component, sube coverage al ≥80% del módulo `crm/`, documenta arquitectura y aprueba 3 ADRs.

## Overview

- **Prioridad:** P1 (consolida calidad antes del sprint close)
- **Status inicial:** 🔘 Pendiente
- **Descripción:** completar la cobertura de tests con casos integration (factory + TokenManager + provider + WriteGuard end-to-end), crear `docs/architecture/crm-adapters.md`, redactar 3 ADRs (020 Public App HubSpot, 021 write_policy semantics, 022 TokenManager dedup), actualizar `help_sections` con sección Integrations.
- **Tiempo estimado:** 10h 00min

## Key insights

- Integration tests con MSW v2 reusan handlers de Phase 02/03 — no duplicar mocks.
- ADRs siguen formato `docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md` (ya existe — añadir bloques ADR-020/021/022 al final).
- `help_sections` es la tabla de Sprint 1 — añadir row "integrations" con HTML/markdown para tooltips contextuales.
- Coverage threshold ≥80% para `src/lib/integrations/crm/**` excepto `providers/*` que es ≥85%.

## Requirements

### Funcionales

- Integration tests:
  - **factory + TokenManager + Zoho provider** end-to-end: getProvider(id) → first call refreshes token → second call uses cache → 31min later refresh again.
  - **factory + HubSpot provider** análogo.
  - **WriteGuard end-to-end con Zoho**: getLead → applyWritePolicy (append_only) → updateLead solo con campos vacíos → assert audit no se llamó.
  - **WriteGuard end-to-end con HubSpot + overwrite_with_audit**: getLead → policy overwrite → audit row insertado en `crm_write_audit` (mock supabase).
- Coverage target ≥80% en `src/lib/integrations/crm/**`, ≥85% en `providers/`.
- Doc `docs/architecture/crm-adapters.md` (300-500 líneas) cubre: arquitectura, interface, flujo OAuth, write_policy semantics, TokenManager, error model, capability matrix HubSpot vs Zoho, guía para añadir nuevo provider.
- ADR-020 Public App HubSpot (decisión + alternativas + consecuencias).
- ADR-021 write_policy semantics (append_only behavior, overwrite_with_audit, audit DB-level append-only).
- ADR-022 TokenManager dedup (Promise Map, scaling path Redis futuro).
- `help_sections` row "integrations": markdown explicativo con instrucciones de conexión + write_policy.

### No funcionales

- Doc en español, audiencia equipo dev. Diagramas ASCII (Mermaid si necesario).
- ADRs cumplen formato del proyecto (Decisión / Contexto / Alternativas / Consecuencias / Status).
- Tests integration <300 líneas combinadas.

## Architecture

```
tests/integrations/crm/
  ├── unit/ (Fases 01-05 ya cubierto)
  └── integration/ (Phase 06 nueva)
      ├── factory-zoho-end-to-end.test.ts
      ├── factory-hubspot-end-to-end.test.ts
      ├── write-guard-zoho-append-only.test.ts
      └── write-guard-hubspot-overwrite-audit.test.ts

docs/
  ├── architecture/
  │   └── crm-adapters.md (NEW)
  └── audit/
      └── DECISIONES-AUDITOR-JAVIER-HP.md (APPEND ADR-020/021/022)

supabase/migrations/
  └── 20260524110000_help_sections_integrations.sql (NEW seed)
```

## Related Code Files

### Modificar

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md` (append ADR-020/021/022)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/vitest.config.ts` (asegurar coverage thresholds activos para `src/lib/integrations/crm/**`)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/docs/development-roadmap.md` (marcar tareas Sprint 2 ya cerradas en este punto)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/docs/project-changelog.md` (entry v0.2.0-rc Sprint 2 highlights)

### Crear

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/integration/factory-zoho-end-to-end.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/integration/factory-hubspot-end-to-end.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/integration/write-guard-zoho-append-only.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/integration/write-guard-hubspot-overwrite-audit.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/docs/architecture/crm-adapters.md`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/supabase/migrations/20260524110000_help_sections_integrations.sql`

## Implementation steps

1. **Crear `factory-zoho-end-to-end.test.ts`**: seed integration en mock DB → factory.getProvider → mock token expired → assert refresh call → assert cipher updated en DB mock → segunda call sin refresh.
2. **Crear `factory-hubspot-end-to-end.test.ts`** análogo + assert `portal_id` se usa en metadata.
3. **Crear `write-guard-zoho-append-only.test.ts`**: setup zoho mock returning lead with `Email='existing@x.com'` → applyWritePolicy con `fields={Email:'new', Phone:'+34...'}` → assert updateLead llamado solo con `{Phone}`.
4. **Crear `write-guard-hubspot-overwrite-audit.test.ts`**: setup hubspot mock con contact `firstname='Pepe'` → policy `overwrite_with_audit` + `override_fields=['firstname']` → applyWritePolicy → assert updateLead con `{firstname:'Juan'}` + mock supabase recibe insert con `old_value='Pepe', new_value='Juan'`.
5. **Run coverage**: `npm run test -- --coverage`. Identificar gaps. Añadir tests focales hasta hit ≥80%/85%.
6. **Crear `docs/architecture/crm-adapters.md`**:
   - Sección 1: Arquitectura general (ASCII diagram capa-por-capa)
   - Sección 2: `ICRMProvider` interface (responsabilidades + métodos)
   - Sección 3: OAuth flow (start → callback → completeOAuth, diagrama)
   - Sección 4: TokenManager (cache + dedup + DB writeback)
   - Sección 5: WriteGuard + write_policy (semántica append_only vs overwrite_with_audit + audit DB-level)
   - Sección 6: Error model (CRMError + categorías + retry)
   - Sección 7: Capability matrix HubSpot vs Zoho (tabla)
   - Sección 8: Guía "Añadir nuevo provider" (10 pasos: implements interface, registra factory, registra TokenManager.callRefreshEndpoint, añade UI card, etc.)
   - Sección 9: Limitaciones conocidas (HubSpot no revoke, Zoho refresh DC-bound, etc.)
7. **Append ADR-020 a `DECISIONES-AUDITOR-JAVIER-HP.md`**: Decisión = HubSpot Public App + OAuth 2.0. Contexto = multi-tenant requirement. Alternativas rechazadas = Private App (un solo portal). Consecuencias = manage refresh tokens, register app, scopes config.
8. **Append ADR-021**: write_policy semantics. Decisión = `append_only` default + `overwrite_with_audit` opt-in con whitelist. Audit append-only DB-level (sin UPDATE/DELETE policies). Consecuencias: caller debe llamar `getLead` antes; audit fire-and-forget no bloquea CRM writes.
9. **Append ADR-022**: TokenManager Promise dedup. Decisión = in-process `Map<integrationId, Promise>` lock. Alternativa rechazada = Redis (YAGNI MVP single-instance). Migración futura: cuando se escale horizontal, reemplazar Map por Redis SETNX.
10. **Crear migración `20260524110000_help_sections_integrations.sql`**: INSERT row con `key='integrations'`, `title='Integraciones CRM'`, `content_md='...explicación...'`. Idempotente (UPSERT).
11. **Actualizar `docs/development-roadmap.md`** marcando SP-3 tareas como 🟢 / 🔵 según estado (lo hará `roadmap-keeper` en CLOSE-5 — preparar terreno aquí marcando los hitos completados).
12. **Actualizar `docs/project-changelog.md`** con entry v0.2.0-rc Sprint 2: lista features + breaking changes + migraciones.
13. **Run final coverage**: confirm threshold met. Si <80%, añadir tests específicos.
14. **`npm run typecheck` + `npm run lint` + `npm run test -- --coverage` + `npm run build` verdes.**
15. **Commit** `docs(sprint-2): architecture crm-adapters + ADR 020/021/022 + integration tests + changelog`.

## Todo list

- [ ] Integration test factory + Zoho end-to-end
- [ ] Integration test factory + HubSpot end-to-end
- [ ] Integration test WriteGuard + Zoho append-only
- [ ] Integration test WriteGuard + HubSpot overwrite-audit
- [ ] Coverage ≥80%/85% confirmado
- [ ] Doc `crm-adapters.md` completo (9 secciones)
- [ ] ADR-020 HubSpot Public App
- [ ] ADR-021 write_policy semantics
- [ ] ADR-022 TokenManager dedup
- [ ] Migración help_sections integrations
- [ ] Update development-roadmap.md (preparar para CLOSE-5)
- [ ] Update project-changelog.md
- [ ] typecheck + lint + test --coverage + build verdes
- [ ] Commit

## Success criteria

- `npm run test -- --coverage` retorna ≥80% para `src/lib/integrations/crm/**`, ≥85% para `providers/`.
- 3 integration tests cubren cross-component flows.
- `crm-adapters.md` legible y sirve como onboarding para Renzo (>300 líneas).
- 3 ADRs aprobados (Status = "Aprobado") en DECISIONES doc.
- `help_sections` UPSERT idempotente probado (2 ejecuciones no fallan).
- `npm run build` exit 0.

## Risk assessment

| Riesgo                                                                    | Likelihood | Impact | Mitigación                                                                                     |
| ------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------- |
| Coverage gaps no triviales en error paths del request() wrappers          | Media      | Bajo   | Tests específicos para mock 500, 429 con Retry-After missing, network errors (`fetch` throws). |
| Doc `crm-adapters.md` se desactualiza tras Sprint 3                       | Alta       | Bajo   | Aceptable. Documentar "última revisión: 2026-05-XX" en header. Sprint 3 actualizará.           |
| ADRs requieren approval del usuario (Bea/Javi) antes de marcar "Aprobado" | Alta       | Bajo   | Marcar Status "Propuesto" hasta validación. CLOSE-5 captura aprobación final.                  |

## Security considerations

- ADR-021 documenta que audit no puede ser tampered (DB-level append-only).
- Doc `crm-adapters.md` sección 9 lista security considerations: encryption AES-256-GCM, OAUTH_STATE_SECRET fail-fast, RLS multi-tenant.
- `help_sections` markdown NO contiene secretos ni env vars.

## Tests requeridos

- Integration: 4 tests cross-component (factory/TokenManager/provider/WriteGuard).
- Coverage threshold gate en vitest config.
- Lint clean en docs/markdown (markdownlint si está configurado).

## Dependencies

- Phase 01-05 🟢 todas.

## Next phase

- Phase 07 (Sprint close).
