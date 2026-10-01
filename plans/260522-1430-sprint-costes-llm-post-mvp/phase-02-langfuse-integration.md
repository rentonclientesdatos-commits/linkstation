---
title: "Phase 02 — Langfuse Cloud Hobby integration + masking PII + callbacks LangChain + wrappers SDK directos"
sprint: SP-5B
phase: 2
tasks: [C-02-new]
adr: ADR-024 (Draft)
effort_nominal: 14-20h
effort_realistic: 6-10h
status: pending
agents: [af-agents:code, af-agents:security, af-agents:testing]
---

# Phase 02 — Langfuse Cloud Hobby integration + masking PII + callbacks LangChain + wrappers SDK directos

## Context Links

- Plan overview: [plan.md](plan.md)
- ADR-024 (Draft): [`docs/adr/ADR-024-llm-observability-gateway-litellm-langfuse.md`](../../docs/adr/ADR-024-llm-observability-gateway-litellm-langfuse.md)
- Phase 01: [phase-01-litellm-proxy-setup.md](phase-01-litellm-proxy-setup.md)
- RoadMap: [RoadMap.md](../RoadMap.md) §Fase 4.5 (C-02 sustituida)
- Reporte consultivo: [`plans/visuals/consultivo-stack-evaluacion-280526.md`](../visuals/consultivo-stack-evaluacion-280526.md) §3 Langfuse
- Langfuse docs: <https://langfuse.com/>
- LangChain integration cookbook: <https://langfuse.com/guides/cookbook/integration_langchain>
- PII masking: <https://langfuse.com/docs/observability/features/masking>
- Pricing Cloud: <https://langfuse.com/pricing>
- Sustituye contenido previo C-02 (dashboard Recharts custom) — ver §Histórico en plan.md

## Overview

- **Priority:** P2
- **Status:** Pendiente
- **Descripción:** Conectar el proyecto a Langfuse Cloud Hobby (free 50k units/mes) para observabilidad LLM completa: tracing span-level de cadenas LangChain, captura automática de inputs/outputs/tokens/coste/latencia, masking PII obligatorio, prompt management versionado. Las llamadas LLM ya pasan por LiteLLM Proxy (Phase 01); aquí añadimos la capa de observabilidad encima. Reemplaza por completo el dashboard Recharts custom planificado originalmente.

## Key Insights

- **Cloud Hobby gratis cubre volumen MVP**: 50k units/mes; volumen esperado academia mediana (2-5k calls × ~5 spans) = 25k units/mes. Sobra holgura para crecer a 2× sin overage.
- **LangChain callback nativo**: integración 1 línea via `CallbackHandler` en `config.callbacks` de cualquier cadena `.invoke()/.stream()/.batch()`. Captura todo sin instrumentación adicional.
- **5 call sites SDK directo**: requieren wrappers manuales (`langfuse.openai` o decorador `@observe()`). Mismas 5 ubicaciones que en Phase 01 (WhatsApp, RescueWorker, widget, FactExtractor, AIAnalysis).
- **Multi-tenant via tags + metadata**: 1 Project Langfuse por entorno (dev/staging/prod), `tenant_id` como `tag` + en `metadata`. Filtrado server-side via API REST o filtros nativos de la UI.
- **PII crítico**: transcripts Retell/Ultravox traen DNI, teléfonos, emails de leads. Función `mask()` client-side ANTES de enviar a Langfuse + regex server-side adicional. Tests con lead sintético antes de exponer producción real.
- **Replay**: cada trace en Langfuse es replayable — ideal para detectar regresiones al cambiar modelo (ej. Claude Sonnet 3.5 → 4) o prompt.
- **Prompt management**: prompts conversacionales (system messages largos) viven en Langfuse UI con versionado. App los recupera via `langfuse.getPrompt(name)` con cache server (5min) + client (sticky).
- **Complementario con Sentry**: Sentry = errores app (excepciones, performance APM). Langfuse = traces LLM. No se solapan, ambos se mantienen.

## Requirements

### Funcionales

- Cuenta Langfuse Cloud Hobby creada por Javi HP con email `admin@linkstation.ai`.
- 3 Projects creados: `linkstation-dev`, `linkstation-staging`, `linkstation-prod`.
- Variables de entorno `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL=https://cloud.langfuse.com` (o `eu.langfuse.com` si EU). Guardadas en vault del proyecto + Dokploy.
- `src/lib/observability/langfuse-client.ts`:
  - Singleton del SDK `@langfuse/node` v3.x.
  - `mask()` function obligatoria que aplica regex sobre payloads (DNI español 8 dígitos + letra, teléfonos +34 y 9 dígitos, emails RFC 5322).
  - Helper `withLangfuseTags(tenantId, agentName, sessionId)` que devuelve `{ tags, metadata, userId }` consistente para todas las cadenas.
- LangChain integration:
  - `src/lib/llm/agent-factory.ts` (modificado en Phase 01): inyectar `langfuseCallback` en `config.callbacks` de cada cadena creada.
  - Todas las cadenas reciben automáticamente `tenant_id` + `agent_name` como tags.
- Wrappers SDK directos (5 call sites):
  - WhatsAppAIProcessor: envolver llamada `openai.chat.completions.create()` con `langfuse.openai` wrapper.
  - RescueWorker (`AIRescueService`): idem.
  - `widget.ts` (server action): idem.
  - FactExtractor: idem.
  - AIAnalysis (`analyzeConversation`): idem.
- Prompt management (migración mínima MVP):
  - Identificar 3-5 prompts conversacionales largos en el código (system messages de WhatsApp + Widget + Rescue).
  - Subirlos a Langfuse UI con nombre versionado (`whatsapp-system-v1`, `widget-system-v1`, etc.).
  - Refactor: app los recupera via `langfuse.getPrompt('whatsapp-system')` con cache.
- Tests obligatorios:
  - Test masking: enviar payload con DNI `12345678X` + email `test@example.com` + tel `+34666123456` → validar que el trace en Langfuse contiene `[MASKED:DNI]`, `[MASKED:EMAIL]`, `[MASKED:PHONE]`.
  - Test multi-tenant: 2 traces simultáneos de tenant A y tenant B → validar filtrado por `metadata.tenant_id`.
  - Test prompt cache: `langfuse.getPrompt('x')` cacheado por 5min, no llama API en cada invocación.

### No funcionales

- **Failure mode**: si Langfuse Cloud down, las cadenas LLM NO deben fallar. SDK Langfuse hace background queue + retry con backoff. Si queda perdido un trace, log a Pino warn pero no romper flujo.
- **Latencia añadida**: <50ms p99 (SDK Langfuse es async, no bloquea cadena).
- **Coste runtime**: 0 € durante Cloud Hobby (cabe en free tier). Si pasa a 50k units/mes, planificar migración a self-hosted Dokploy en sprint posterior.
- **DPA con Langfuse Inc.**: solicitar Data Processing Agreement antes de exponer producción con datos reales. Documentación legal en `docs/legal/dpa-langfuse.pdf` (a recibir).
- **Documentación operativa**: `runbook-langfuse.md` con: cómo crear nuevo prompt, cómo añadir nuevo agente al dashboard, cómo invitar nuevo user al project.

## Architecture

```text
   Next.js / LangChain                     Langfuse Cloud Hobby
   ─────────────────────                   ──────────────────────
                                           ┌─────────────────────┐
   chain.invoke(input, {                   │ Project: prod       │
     callbacks: [langfuseCB],              │  ├ Traces (spans)   │
     metadata: { tenant_id, session }      │  ├ Prompts (vN)     │
   })                                      │  ├ Evals (judge)    │
       │                                   │  ├ Datasets         │
       │  ┌─────────────────┐              │  └ Users (RBAC)     │
       └─►│ mask()          │              │                     │
          │ - DNI           │ ──────►      │ Filtros nativos:    │
          │ - email         │  POST        │  tag=tenant_X       │
          │ - phone +34     │  /api/public │  agent=whatsapp     │
          └─────────────────┘  /traces     │  model=claude-sonnet│
                                           │  date>2026-08-25    │
   SDK directo:                            │                     │
   const openai = wrapOpenAI(client,       │ Replay conversación │
     { langfuseClient, tags, metadata })   │ A/B prompts         │
                                           │ Cost per tenant     │
                                           └─────────────────────┘
```

## Related Code Files

### Crear

- `src/lib/observability/langfuse-client.ts` — singleton SDK + `mask()` + `withLangfuseTags()` helper.
- `src/lib/observability/pii-mask.ts` — regex DNI/teléfono/email + tests.
- `src/lib/observability/__tests__/pii-mask.test.ts` — tests de masking con casos sintéticos.
- `src/lib/observability/__tests__/langfuse-integration.test.ts` — test e2e contra Project `linkstation-dev`.
- `plans/260522-1430-sprint-costes-llm-post-mvp/runbook-langfuse.md` — operativa Langfuse UI.

### Modificar

- `src/lib/llm/agent-factory.ts` — inyectar `langfuseCallback` en `config.callbacks`.
- `src/lib/whatsapp/whatsapp-ai-processor.ts` — usar `langfuse.openai` wrapper.
- `src/lib/rescue/ai-rescue-service.ts` — idem.
- `src/lib/actions/widget.ts` — idem.
- `src/lib/extraction/fact-extractor.ts` — idem.
- `src/lib/analysis/ai-analysis.ts` — idem.
- `.env.example` — añadir `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`.
- `package.json` — añadir dependencia `@langfuse/node` (versión pineada).
- `docs/dev-onboarding.md` — sección breve "Cómo ver traces en Langfuse Cloud durante desarrollo".

### Eliminar / no crear (vs plan original descartado)

- ❌ Dashboard Recharts custom en `src/app/(dashboard)/admin/costs/page.tsx` (NO crear — Langfuse UI cubre).
- ❌ Server actions `getCostsByTenant`, `getCostsByModel` custom (NO crear — Langfuse API REST cubre).
- ❌ Components Recharts custom para gráficas de coste (NO crear).

### Posible (opcional Sprint 3+)

- 🟡 Embed Langfuse dashboard público iframe en `/admin/costs` del proyecto si la clienta quiere vista integrada (decisión a tomar en SP-5B según feedback Bea).

## Implementation Steps

1. **Setup cuenta Langfuse Cloud Hobby** (~30min)
   - Javi HP registra cuenta con `admin@linkstation.ai`.
   - Crea 3 Projects: `linkstation-dev`, `linkstation-staging`, `linkstation-prod`.
   - Genera 3 pares Public Key + Secret Key. Guarda en vault `.secrets/langfuse-keys.env`.
   - Solicita DPA via support@langfuse.com.

2. **Instalar SDK + setup cliente singleton** (~1h)
   - `npm install @langfuse/node@^3.x` (pineado).
   - Crear `src/lib/observability/langfuse-client.ts` con instancia singleton.
   - Configurar `LANGFUSE_BASE_URL` (Cloud EU si disponible, sino US).

3. **Implementar masking PII** (~2-3h)
   - `src/lib/observability/pii-mask.ts` con regex:
     - DNI español: `/\b\d{8}[A-HJ-NP-TV-Z]\b/g`
     - Teléfono ES: `/(\+34\s?)?[6-9]\d{8}/g`
     - Email RFC 5322: regex estándar
   - Tests sintéticos con 20+ casos edge.
   - Función `mask(payload)` recorre objeto recursivamente y reemplaza in-place.
   - Validar con un trace dummy contra Project dev.

4. **Integrar callback handler en LangChain** (~1-2h)
   - Modificar `agent-factory.ts` para inyectar `new CallbackHandler({ langfuseClient, tags, metadata })`.
   - Helper `withLangfuseTags(tenantId, agentName, sessionId)` para consistencia.
   - Validar en Project dev que un trace de chat WhatsApp aparece con todos los spans.

5. **Wrappers SDK directos en 5 call sites** (~2h)
   - Usar `wrapOpenAI(openaiClient, { langfuseClient, tags: ['widget'], metadata: { tenant_id } })`.
   - Cambio mecánico, 5 lugares.

6. **Migración 3-5 prompts a Langfuse UI** (~1h)
   - Identificar prompts conversacionales largos del repo (system messages).
   - Subir a Langfuse UI con nombre y versión v1.
   - Refactor app: `const prompt = await langfuse.getPrompt('whatsapp-system'); chain.invoke({ ...prompt })`.
   - Validar cache 5min (1 sola call API en N invocaciones).

7. **Tests automatizados** (~1-2h)
   - PII masking 20 casos.
   - Multi-tenant filter (traces de A no visibles en filtro de B).
   - Prompt cache.

8. **Runbook operativo** (~30min)
   - Cómo añadir nuevo prompt al sistema.
   - Cómo invitar nuevo user al project (RBAC).
   - Cómo crear eval LLM-as-judge.

## Todo List

- [ ] Cuenta Langfuse Cloud Hobby creada + 3 Projects + 3 pares de keys.
- [ ] DPA solicitado a Langfuse Inc.
- [ ] `@langfuse/node` instalado y pineado.
- [ ] `langfuse-client.ts` singleton + helpers operativos.
- [ ] `pii-mask.ts` con regex DNI/email/teléfono + tests verdes.
- [ ] Callback handler inyectado en `agent-factory.ts`, traces visibles en dev project.
- [ ] 5 call sites SDK directos usan `langfuse.openai` wrapper.
- [ ] 3-5 prompts conversacionales migrados a Langfuse UI con versionado.
- [ ] App recupera prompts vía `langfuse.getPrompt()` con cache.
- [ ] Tests masking (20 casos) + multi-tenant filter + prompt cache → 🟢.
- [ ] `.env.example` actualizado.
- [ ] `runbook-langfuse.md` creado.
- [ ] Sección breve en `docs/dev-onboarding.md` para devs.
- [ ] PR phase-02 → branch `feature/sprint-costes-llm-post-mvp`.

## Success Criteria

- Todas las cadenas LangChain producen traces visibles en Project Langfuse correspondiente.
- Los 5 call sites SDK directos producen traces vía wrapper.
- Filtro `tag=tenant_X` muestra solo traces de ese tenant (multi-tenant validado).
- Test sintético con DNI/email/teléfono confirma masking (no aparecen valores reales en Langfuse).
- Dashboard Langfuse muestra cost per tenant + modelo + día sin código custom.
- A/B prompt funcional: 2 versiones del mismo prompt comparables en UI.
- `npm run typecheck` + `lint` + `build` → 0 errores.

## Risk Assessment

| Riesgo                                                    | Mitigación                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| PII leak a Langfuse Cloud sin masking correcto            | Tests sintéticos antes de exponer prod. Defense-in-depth: client mask + server mask. DPA firmado.  |
| Volumen supera 50k units/mes Cloud Hobby                  | Monitor semanal `Usage` Langfuse. Plan B: migración self-hosted Dokploy (~10-20€/mes), exportable. |
| Multi-tenant Langfuse no es nativo (1 Project ≠ 1 tenant) | Usar tags + metadata + filtrado server-side. RBAC granular solo en feature Enterprise.             |
| Prompt cache desactualizado tras edit en UI               | Cache 5min + bust manual via `langfuse.refreshPrompt(name)` si cambio crítico.                     |
| SDK rompe API entre versiones major                       | Pineado tag SemVer concreto. Antes de upgrade, leer CHANGELOG.                                     |
| Latencia añadida por callback síncrono                    | SDK Langfuse es async background. Validar p99 <50ms con benchmarks.                                |

## Security Considerations

- Keys Langfuse en vault `.secrets/langfuse-keys.env` gitignored + Dokploy env vars.
- `LANGFUSE_SECRET_KEY` solo accesible server-side (nunca expuesto a client browser).
- Masking PII validado por tests automáticos antes de cualquier deploy.
- DPA firmado con Langfuse Inc. antes de producción con datos reales.
- Project per entorno: dev/staging/prod aislados (no fugar trazas dev a prod).
- RBAC inicial: 2 users (Javi HP + Renzo). Sin acceso de la clienta al panel Langfuse en MVP (decisión SP-5B+1 si se quiere abrir).

## Next Steps

→ Phase 03 — Persistir `completion.usage` en `chat_messages.metadata` (legacy C-03 preservada, complementa Langfuse con vista por mensaje).
