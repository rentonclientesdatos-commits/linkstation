---
title: "Sprint 6 — Llamadas de Voz (v0.6.0)"
plan_id: 260610-1545-sprint-06-llamadas-voz
status: PLANNED
version_target: v0.6.0
branch: feature/sprint-06-llamadas-voz
owner: Javi HP
estimate_realistic: 14-20h
created: 2026-06-10
blockedBy: []
blocks: []
relates_to:
  - 260608-1518-sprint-05-zoho-entrada-leads # Sprint 5 (Zoho), precede a este
  - 260522-1830-sprint-refinamiento-herramientas-post-mvp # parte de voz (/calls) MOVIDA aquí desde Refinamiento
---

# Sprint 6 — Llamadas de Voz (v0.6.0)

> CRM comercial linkstation. Sprint dedicado a llevar el canal **voz** a paridad
> funcional con WhatsApp en la experiencia de inbox, métricas y lista de leads.
> Backend de voz (Retell + Ultravox + webhook + tabla `llamadas`) **ya existe y es real**.

## Objetivo

Que el equipo comercial pueda **operar y auditar el canal de voz** igual que opera WhatsApp:
una bandeja de "Conversaciones de Voz", configuración centralizada de agentes de voz,
y trazabilidad completa de cada llamada en el dashboard de Llamadas y en la Lista de Leads.

## Decisiones de arquitectura cerradas (Javi HP, 10-06-2026)

1. **Conversaciones de Voz = inbox reutilizado parametrizado por canal**, NO copia-pega.
   `AIAgentInbox` (2281 líneas) acepta `channel: 'whatsapp' | 'voz'` (default 'whatsapp').
   ⚠️ **CORRECCIÓN tras review**: el refactor NO es "mínimo y aditivo" — el componente está cableado a WhatsApp
   en ~12 puntos (botón "Plantilla Meta", "WhatsApp Activo", placeholders, timeline, `getWhatsAppTemplates`).
   Requiere condicionales transversales por canal. Por eso fase 02 se divide en **02a (read-only)** + **02b (audio/transcripción)**.
2. **Fuente de datos del panel de voz = tabla `llamadas`** (verdad inequívoca), NO `chat_messages`.
   ⚠️ **CORRECCIÓN tras review**: `getChatHistory` hoy mapea las llamadas a `SYSTEM_LOG` y **descarta**
   `url_grabacion`/`transcripcion`. No existe tipo `VOICE_CALL` ni audio player. Hay que **crear un tipo de item de voz nuevo**
   (`VoiceCallMessage` o union) y un componente `VoiceCallCard`, NO forzar la estructura `ChatMessage`.
3. La parte de **lanzador `/calls` real (Retell SDK)** se absorbe aquí. ⚠️ **CORRECCIÓN tras review**: doble rotura —
   (a) `calls/page.tsx` es un mock `setTimeout` que ni llama al endpoint; (b) `/api/calls/manual` **no acepta `lead_id`**
   → el webhook no puede asociar la llamada. Fase 05 debe arreglar AMBOS. **Ultravox queda DESCOPEADO** (el lanzador solo
   soporta Retell hoy); integración Ultravox del dialer → post-Sprint 6. **Transcripción "en vivo" (WebSocket) DESCOPEADA**
   (el LiveMonitor actual es mockup); el cierre valida que la llamada se dispara y aparece tras el webhook, no streaming en vivo.
4. **Lista de Leads** gana 2 columnas booleanas: **"Whats"** y **"Voz"** (verde=usó el canal / rojo=no).
   "Voz" = `EXISTS(llamadas por lead)` (fiable). "Whats" = mensajes no-voz en `chat_messages`. ⚠️ La columna debe
   alimentarse desde la server action `fetchCalls` (server), no en cliente — `HistorialTable` es client component.

## ⚠️ Hallazgo de seguridad PRE-EXISTENTE detectado en el review (NO es del Sprint 6)

**RLS-001 (potencial CRÍTICO, en verificación):** `base_schema.sql` (líneas 449-450) crea una política
`authenticated_read_*` con `FOR SELECT TO authenticated USING (true)` para `chat_messages`, `lead`, `llamadas`,
`conversaciones_whatsapp` y otras — permitiría a cualquier rol `authenticated` leer filas de otros tenants
**si la app hiciera queries directas desde el cliente con la anon/authenticated key**. La app actual usa service_role

- filtro `tenant_id` en código, por lo que el riesgo real depende de si existe alguna query client-side directa.
  **Acción**: verificar `pg_policies` en el VPS real antes de actuar (decisión Javi HP 10-06-2026). Si se confirma,
  abrir BUG-SEC fuera del alcance del Sprint 6. La migración `conversaciones_voz` de fase 01 debe NACER con RLS
  correcto (filtrado por `tenant_id`), NO replicar el patrón permisivo `USING (true)`.

## Fases

| Fase | Nombre                                                                                  | Estim.      | Status | Archivo                                                                                |
| ---- | --------------------------------------------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------- |
| 01   | Datos: tabla `conversaciones_voz` + flags Whats/Voz + origen voz + idempotencia webhook | 2h 30min–4h | 🔘     | [phase-01-datos-flags-canal.md](phase-01-datos-flags-canal.md)                         |
| 02   | Inbox por canal (02a read-only + 02b audio/transcripción) + ruta + sidebar              | 6h–9h       | 🔘     | [phase-02-conversaciones-voz-inbox.md](phase-02-conversaciones-voz-inbox.md)           |
| 03   | Config de voz centralizada en `/dashboard/voice-agents` (con audit report)              | 1h–2h       | 🔘     | [phase-03-config-voz-centralizada.md](phase-03-config-voz-centralizada.md)             |
| 04   | Dashboard Llamadas (auditar gaps) + Lista de Leads (2 columnas Whats/Voz)               | 3h–4h       | 🔘     | [phase-04-metricas-llamadas-lista-leads.md](phase-04-metricas-llamadas-lista-leads.md) |
| 05   | Lanzador `/calls` real (Retell, +lead_id) + Cierre (CLOSE-1..5)                         | 2h–3h       | 🔘     | [phase-05-lanzador-real-y-cierre.md](phase-05-lanzador-real-y-cierre.md)               |

**Total estimado realista: 14–20h** (revisado al alza tras review adversarial del plan 10-06-2026 — ver
[reports/plan-review-sprint-6.md](reports/plan-review-sprint-6.md)). El 8-14h original subestimaba el acoplamiento
WhatsApp de `AIAgentInbox` (2281 líneas) y daba por funcional el lanzador `/calls` (es STUB).

### Dependencias intra-sprint (DAG)

```
Fase 01 ──┬──▶ Fase 02 (02a → 02b)
          └──▶ Fase 04
Fase 03  (independiente, paralelizable)
Fase 02 + Fase 04 ──▶ Fase 05 (lanzador + cierre)
```

Fase 02 y 04 NO pueden empezar hasta que Fase 01 cree `conversaciones_voz` + flags. Fase 03 es independiente.

## Dependencias clave

- **Precede**: Sprint 5 (Zoho entrada de leads) debe estar mergeado a `developer` (lo está, PR #25).
- **Backend voz existente** (NO se reimplementa, solo se consume):
  - `src/lib/integrations/retell.ts`, `src/lib/integrations/ultravox.ts`
  - `src/app/api/webhooks/retell/route.ts` (poblador de `chat_messages` + `llamadas`)
  - Tablas: `voice_agents`, `voice_agent_variants`, `llamadas`, `chat_messages`, `lead`
- **Template a reutilizar**: `src/components/agents/AIAgentInbox.tsx`, `src/lib/actions/inbox.ts`, `src/app/dashboard/conversaciones/page.tsx`

## Riesgos transversales

- `AIAgentInbox.tsx` es enorme (2281 líneas). El refactor por canal debe ser **mínimo y aditivo**
  (prop + filtros condicionales), sin reescribir el componente, para no desestabilizar WhatsApp.
- RLS multi-tenant: cualquier tabla/consulta nueva (conversaciones_voz, flags) filtra por `tenant_id`.
- Tests con BD real (no mocks Supabase) — política de proyecto.

## Definición de "hecho" del Sprint

- [ ] Sub-item "Conversaciones de Voz" en grupo Leads del sidebar, misma UX que WhatsApp.
- [ ] Panel central de voz muestra transcripción + grabación + duración por llamada.
- [ ] Toda config de agentes de voz accesible desde `/dashboard/voice-agents`.
- [ ] Toda llamada se refleja en Métricas > Llamadas (KPIs cuadran con `llamadas`).
- [ ] Leads de voz aparecen en Lista de Leads con `origen='llamada_voz'`.
- [ ] Lista de Leads muestra columnas "Whats" y "Voz" (verde/rojo) correctas.
- [ ] CLOSE-1..5 verdes (typecheck/lint/build/test + E2C local + push + PR a developer).
