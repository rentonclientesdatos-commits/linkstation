# ADR-014 — Política unificada de handoff humano

| Campo      | Valor                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fecha      | 22-05-2026                                                                                                                                               |
| Autor      | Javi HP                                                                                                                                                  |
| Sprint     | Sprint 1 — Bloque 2.9 (tarea NEW-13)                                                                                                                     |
| Estado     | ✅ Aceptado                                                                                                                                              |
| Origen     | Bea correcciones V1 §"Escalado a Humanos (Handoff)" + Renzo V1 §"Handoff (Escalado a Humanos)"                                                           |
| Implementa | `src/lib/core/handoff.ts` + migración `supabase/migrations/20260522200000_lead_unreachable_handoff_policy.sql` + refactor `src/lib/core/orchestrator.ts` |

## Contexto

La auditoría de Renzo V1 confirma que **el escalado a humanos funciona** a nivel técnico (existe `triggerHumanEscalation`, blueprint Zoho para números inválidos, `handoff_on_qualified_not_booked`). Sin embargo, **la política de cuándo escalar no estaba unificada** y la clienta (Bea) detectó dos casos donde el comportamiento actual le hace perder tiempo a sus asesores:

> "No tendría sentido para el cliente que si una llamada falla o si el teléfono está mal, que se lo pasásemos para que sus asesores 'pierdan' tiempo en esto."
>
> "Por llamada fallida o lead con número no válido NO se pasa a cliente para que ellos continúen en seguimiento. Si número no válido, se tipifica en CRM del cliente y en base de datos interna como tal, si es llamada fallida se harán reintentos por WhatsApp y llamada hasta completar número de intentos establecido, y si no se consigue contacto se descartará lead y se tipificará como 'ilocalizable'."

El código actual hace cosas distintas en lugares distintos:

- `executeSequenceStep` (línea 292): nº inválido → blueprint Zoho "Anulado automáticamente por IA - Número Inválido" con tag `NO_CONTACTAR: teléfono falso`. Funciona pero crea ruido en el CRM del cliente.
- `executeRetrySequenceStep` (línea 1315): tras `max_attempts` → `current_stage: "LOST"`, `tipo_lead: "ilocalizable"`. No mete al CRM cliente, OK.
- `handoff_on_qualified_not_booked`: lead cualificado sin agendar tras X horas → `triggerHumanEscalation` → SÍ pasa al CRM cliente. **Esto Bea lo confirma como correcto** (sólo escalar leads cualificados sin agendar).

## Decisión

### 1. Tres niveles de "fin de proceso" para un lead

| Estado lead             | Cuándo se aplica                                    | Comportamiento CRM cliente                  | Notificación asesor |
| ----------------------- | --------------------------------------------------- | ------------------------------------------- | ------------------- |
| **UNREACHABLE (nuevo)** | Nº inválido o tras N intentos sin contacto          | Tipifica como "ilocalizable", NO crea tarea | NO                  |
| **HANDOFF_QUALIFIED**   | Cualificado pero no agenda tras X horas             | SÍ crea tarea para asesor humano            | SÍ                  |
| **DROPPED (existente)** | Lead rechazado explícitamente o anulado manualmente | Marca como descartado                       | NO                  |

### 2. Helper centralizado: `handleUnreachable`

Nuevo módulo `src/lib/core/handoff.ts` con función única `handleUnreachable(leadId, reason)` que:

- Actualiza `lead.current_stage = "UNREACHABLE"`, `lead.tipo_lead = "ilocalizable"`, `lead.unreachable_reason = <reason>`.
- Loguea evento estructurado (`logOrchestrationStep` con `actionType: "UNREACHABLE"`).
- **NO crea tarea ni blueprint en el CRM cliente**. Si el CRM cliente quiere visibilidad (ej. ver lista de ilocalizables), lo hace por sincronización pasiva (read-only) — no por escalado activo.
- Reason values permitidos (extensible, sin CHECK constraint): `invalid_phone`, `max_attempts_exceeded`, `user_requested_stop`.

### 3. Contador de intentos

Nueva columna `lead.contact_attempts INTEGER DEFAULT 0`. El orquestador incrementa cada vez que ejecuta un step de contacto (`call`, `whatsapp`). Cuando supera `tenant.config.max_contact_attempts` (default 5, configurable), `handleUnreachable(leadId, 'max_attempts_exceeded')` se invoca.

### 4. `handoff_on_qualified_not_booked` se mantiene intacto

Bea confirma: si un lead está cualificado pero no agenda tras X horas, **sí** debe pasarse al asesor humano. Esa lógica vive en `executeSequenceStep` (líneas 305-314) y NO se toca.

## Cambios en código

### Refactor `src/lib/core/orchestrator.ts`

**ANTES** (línea 292, blueprint Zoho para nº inválido):

```ts
if (callResult?.status === "FAILED" || callResult?.last_error?.code === "invalid_destination") {
  const provider = CRMFactory.getProvider(tenantId, config);
  await provider.executeAction(activeLead.id_lead_externo || "", "781577000002647388", { ... });
  return;
}
```

**DESPUÉS**:

```ts
if (callResult?.status === "FAILED" || callResult?.last_error?.code === "invalid_destination") {
  await handleUnreachable(activeLead.id, "invalid_phone");
  return;
}
```

**ANTES** (línea 1315, retry exhausted):

```ts
await (supabase.from("lead" as any) as any)
  .update({
    current_stage: "LOST",
    tipo_lead: step.final_status || "ilocalizable",
  })
  .eq("id", lead.id);
```

**DESPUÉS**:

```ts
await handleUnreachable(lead.id, "max_attempts_exceeded");
```

### Config tenant

Añadir validación documentada de `tenant.config.max_contact_attempts` (default 5) en `OrchestratorEscalationConfig` (estructura ya existe — sólo añadir el campo opcional `max_contact_attempts?: number`).

## Consecuencias

### Positivas

- ✅ Asesores del cliente NO reciben más tareas de "número falso" o "no contestó tras 5 intentos" — exactamente lo que pidió Bea.
- ✅ El sistema tiene un único punto donde se marca un lead como ilocalizable → más fácil de auditar y cambiar política a futuro.
- ✅ Dashboard puede mostrar métrica "% ilocalizables" cruzando `lead.unreachable_reason IS NOT NULL`.

### Negativas / aceptadas

- ⚠️ Si el cliente quiere visibilidad de los ilocalizables, debe consultar nuestra BD o consumir un export (no se le entregan via Zoho). Aceptable para MVP.
- ⚠️ El estado `current_stage = "UNREACHABLE"` es nuevo — entra en conflicto con el enum a unificar en NEW-02. **Coordinación**: NEW-02 (enum estados) DEBE incluir `UNREACHABLE` en `LeadStage`. Se documenta en `phase-09-fix-bugs-renzo-y-reqs-bea.md` como dependencia cruzada.
- ⚠️ Leads ya marcados como `LOST` antes de esta migración: NO se retro-migran. Se mantienen como están (Bea no pidió retroactividad).

### Test plan

- Unit test `handleUnreachable` con mock de Supabase: verifica que setea las 3 columnas + log.
- Integration test orchestrator: simular `invalid_destination` → verifica que `lead.unreachable_reason = 'invalid_phone'` y NO se llama a CRMFactory.
- Integration test retry_sequence: simular max_attempts → verifica que `lead.unreachable_reason = 'max_attempts_exceeded'`.

## Alternativas consideradas

1. **Mantener el blueprint Zoho actual** + filtrarlo en el adapter Zoho. Descartada: el comportamiento queda repartido en 2 capas y la responsabilidad no es clara.
2. **Crear una tabla `lead_unreachable_log` separada**. Descartada: añade complejidad sin valor — un `lead` sólo está unreachable o no, no necesita historial.
3. **Hacer la política configurable por tenant** (algunos clientes sí querrían ver "anulados auto" en Zoho). Descartada para MVP: Bea no lo pidió y simplifica el modelo. Si algún cliente lo necesita post-MVP, se añade flag `tenant.config.notify_crm_on_unreachable`.

## Referencias

- Bea correcciones V1: `docs/Docs-entrega-clienta/Correcciones_aclaraciones Bea documentacion sistema  LinkStation V1.pdf` §"Escalado a Humanos"
- Renzo V1: `docs/Informes de programacion/documentacion sistema  LinkStation V1.pdf` §"5. Escalado a Humanos (Handoff)"
- Phase plan: `plans/260520-1342-sprint-1-capa-datos/phase-09-fix-bugs-renzo-y-reqs-bea.md` §NEW-13
- Migración SQL: `supabase/migrations/20260522200000_lead_unreachable_handoff_policy.sql`
