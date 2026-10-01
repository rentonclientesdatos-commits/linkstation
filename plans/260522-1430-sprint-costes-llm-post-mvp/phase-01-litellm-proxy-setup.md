---
title: "Phase 01 — LiteLLM Proxy setup en Dokploy + virtual keys multi-tenant + fallbacks"
sprint: SP-5B
phase: 1
tasks: [C-01-new]
adr: ADR-024 (Draft)
effort_nominal: 8-14h
effort_realistic: 4-7h
status: pending
agents: [af-agents:deployment, af-agents:database, af-agents:code]
---

# Phase 01 — LiteLLM Proxy setup en Dokploy + virtual keys multi-tenant + fallbacks

## Context Links

- Plan overview: [plan.md](plan.md)
- ADR-024 (Draft): [`docs/adr/ADR-024-llm-observability-gateway-litellm-langfuse.md`](../../docs/adr/ADR-024-llm-observability-gateway-litellm-langfuse.md)
- RoadMap: [RoadMap.md](../RoadMap.md) §Fase 4.5 (C-01 sustituida)
- Reporte consultivo: [`plans/visuals/consultivo-stack-evaluacion-280526.md`](../visuals/consultivo-stack-evaluacion-280526.md) §4 LiteLLM
- LiteLLM Proxy docs: <https://docs.litellm.ai/docs/simple_proxy>
- LiteLLM multi-tenant: <https://docs.litellm.ai/docs/proxy/multi_tenant_architecture>
- LiteLLM virtual keys: <https://docs.litellm.ai/docs/proxy/virtual_keys>
- Sustituye contenido previo C-01 (custom `llm_usage_logs` + LangChain `CostTrackingCallback`) — ver §Histórico en plan.md

## Overview

- **Priority:** P2
- **Status:** Pendiente
- **Descripción:** Desplegar LiteLLM Proxy v1.85.x como contenedor Dokploy en el VPS Hetzner, provisionar schema Postgres `litellm_proxy` dentro del cluster Supabase existente, configurar `model_list` con Anthropic + OpenAI + Google Genai, declarar fallbacks runtime, y crear virtual keys + budgets per tenant. Reemplaza por completo la propuesta original de tabla custom `llm_usage_logs` + helper `recordLlmUsage()`.

## Key Insights

- **Único modo viable**: el stack es Node.js/TypeScript. LiteLLM no tiene SDK JS oficial. Modo Proxy es la única opción técnica (consumimos REST API OpenAI-compatible).
- **Persistencia nativa**: LiteLLM Proxy persiste cost tracking en su schema Postgres propio (`LiteLLM_SpendLogs`, `LiteLLM_VerificationToken`, etc.). No necesitamos tabla `llm_usage_logs` paralela.
- **Multi-tenant mapping**: `tenant_id (academia) → Organization`, `user admin academia → Team`, `agente/feature (chat, extractor, resumen) → User`, `runtime key → Key`. Permite budget USD/mes por academia y rate-limit per feature.
- **Fallback declarativo**: en el YAML se declara `fallbacks: [["claude-3-5-sonnet", "gpt-4o", "gemini-2.0-flash"]]`. Cero código de fallback en app. Resuelve riesgo histórico de rate-limit Anthropic en horas pico.
- **Caching Redis**: respuestas idempotentes (extracción de hechos, resúmenes batch) cachean automáticamente. Ahorro 20-40% en cargas batch.
- **SPOF mitigado**: si el contenedor LiteLLM Proxy se cae, todos los agentes fallan. Mitigación: detector de proxy down en código + ramo de emergencia que llama directo al SDK del provider. ~2h trabajo incluido en esta phase.
- **Latencia añadida**: <2ms intra-VPS (mismo cluster Dokploy). Despreciable.
- **Sin SDK Python ni Cloud**: el proyecto NO usa LiteLLM Cloud (vendor lock + datos sensibles fuera de UE) ni el SDK Python (stack TS).

## Requirements

### Funcionales

- Contenedor LiteLLM Proxy desplegado en Dokploy panel del VPS Hetzner:
  - Imagen: `ghcr.io/berriai/litellm:main-stable` con tag SemVer concreto pineado (ej. `v1.85.x`, NO `latest`).
  - Red interna Dokploy (sin exposición Traefik público).
  - Healthcheck `/health/readiness` cada 30s.
  - Recursos: 2 vCPU + 4 GB RAM. Cabe en VPS actual sin escalar.
  - Variables de entorno: `LITELLM_MASTER_KEY` (generada con `crypto.randomBytes(32).toString('base64url')`), `DATABASE_URL` (apuntando a schema `litellm_proxy` del Supabase Postgres), `STORE_MODEL_IN_DB=true`, `LITELLM_LOG=INFO`.
- Schema Postgres `litellm_proxy` provisionado en cluster Supabase existente:
  - Migración SQL ad-hoc (NO en `supabase/migrations/` para no mezclar con migraciones del app).
  - Schema separado: `CREATE SCHEMA IF NOT EXISTS litellm_proxy;` + LiteLLM ejecuta sus propias migraciones internas al arrancar.
  - Sin acceso de la app linkstation a este schema (aislamiento estricto).
- `config.yaml` del Proxy con:
  - `model_list` cubriendo todos los modelos en uso por el proyecto (Anthropic Claude Opus/Sonnet/Haiku; OpenAI GPT-4o/4o-mini/o1; Google Gemini Flash/Pro).
  - `fallbacks: [["claude-3-5-sonnet-20241022", "gpt-4o", "gemini-2.0-flash"]]` (orden por preferencia + coste).
  - `litellm_settings.cache: true` con Redis (reutilizar el Redis ya existente del proyecto en otra DB).
  - `general_settings.master_key`, `database_url` referenciadas vía env var.
- Bootstrap script `scripts/setup-litellm-tenants.ts` que, dado el listado actual de tenants en Supabase, crea Organizations + Teams + Keys en LiteLLM Proxy via su admin REST API. Budgets iniciales conservadores (ej. 10 USD/mes per tenant, ajustables luego).
- Ramo de emergencia en código:
  - `src/lib/llm/litellm-client.ts`: cliente HTTP que apunta al proxy + health-check periódico (cada 60s).
  - `src/lib/llm/emergency-fallback.ts`: si health-check falla 3 veces consecutivas, llamadas LLM caen a SDK directo del provider (Anthropic, OpenAI, Gemini).
  - Sentry breadcrumb cuando se activa ramo de emergencia.
- Migración config existente:
  - `src/lib/llm/agent-factory.ts` (o equivalente): apuntar `ChatOpenAI` / `ChatAnthropic` / `ChatGoogleGenerativeAI` de LangChain con `baseURL: process.env.LITELLM_PROXY_URL` y `apiKey: tenant-specific-key`.
  - 5 call sites OpenAI directos (WhatsAppAIProcessor, RescueWorker, widget.ts, FactExtractor, AIAnalysis): apuntar `openai.chat.completions.create()` al proxy con virtual key.

### No funcionales

- **Failure mode**: si LiteLLM Proxy retorna 5xx, el cliente reintenta 2 veces con backoff antes de activar ramo de emergencia. Si ramo de emergencia falla, propagar error al caller normal.
- **Variables `.env.example`** actualizadas con `LITELLM_PROXY_URL`, `LITELLM_MASTER_KEY` (placeholders).
- **Documentación operativa**: runbook `runbook-litellm.md` en este mismo directorio con comandos para: añadir nuevo tenant, ajustar budget cap, ver logs del proxy, restart manual.
- **Persistencia**: el schema `litellm_proxy` debe quedar fuera del backup automático de Supabase del proyecto principal (configurar política aparte). Razón: datos de cost tracking no son críticos para recuperar el sistema, restaurarlos sobreescribiría tracking real reciente.

## Architecture

```text
                      ┌──────────────────────────┐
                      │      VPS Hetzner         │
                      │       (Dokploy)          │
                      │                          │
   Next.js  ──────►   │  LiteLLM Proxy :4000     │  ──────►  Anthropic API
   (LangChain         │    ├ virtual keys        │  ──────►  OpenAI API
    + SDK directo)    │    ├ budgets             │  ──────►  Google Genai API
                      │    ├ fallback runtime    │
                      │    ├ rate-limit          │
                      │    └ cache (Redis)       │
                      │             │            │
                      │             ▼            │
                      │   Postgres schema        │
                      │   `litellm_proxy`        │
                      │   (Supabase cluster)     │
                      └──────────────────────────┘

   FALLBACK DE EMERGENCIA:
   Si LiteLLM Proxy down (health-check fail 3x):
       Next.js ──────►  SDK directo Anthropic/OpenAI/Gemini (sin proxy)
       Sentry breadcrumb registrado para alerting
```

## Related Code Files

### Crear

- `infra/litellm-proxy/config.yaml` — configuración del proxy (model_list, fallbacks, cache).
- `infra/litellm-proxy/docker-compose.dokploy.yml` — definición Dokploy del servicio.
- `infra/litellm-proxy/migrations/001_init_schema.sql` — provisión schema vacío (LiteLLM ejecuta sus migrations al arrancar).
- `scripts/setup-litellm-tenants.ts` — bootstrap de Organizations/Teams/Keys.
- `src/lib/llm/litellm-client.ts` — cliente HTTP + health-check.
- `src/lib/llm/emergency-fallback.ts` — ramo de emergencia a SDK directo.
- `src/lib/llm/__tests__/emergency-fallback.test.ts` — tests del fallback.
- `plans/260522-1430-sprint-costes-llm-post-mvp/runbook-litellm.md` — operativa.

### Modificar

- `src/lib/llm/agent-factory.ts` (o equivalente) — apuntar LangChain chat models al proxy.
- `src/lib/whatsapp/whatsapp-ai-processor.ts` — apuntar `openai.chat.completions.create()` al proxy con virtual key.
- `src/lib/rescue/ai-rescue-service.ts` — idem.
- `src/lib/actions/widget.ts` — idem.
- `src/lib/extraction/fact-extractor.ts` — idem.
- `src/lib/analysis/ai-analysis.ts` — idem.
- `.env.example` — añadir `LITELLM_PROXY_URL`, `LITELLM_MASTER_KEY` placeholders.
- `docs/dev-onboarding.md` — sección breve sobre cómo arrancar el proxy en local (modo desarrollo sin Dokploy).

### Eliminar / no crear (vs plan original descartado)

- ❌ `supabase/migrations/YYYYMMDD_llm_usage_logs.sql` (NO crear — tabla descartada).
- ❌ `src/lib/llm-pricing.ts` (NO crear — pricing lo gestiona LiteLLM internamente).
- ❌ `src/lib/llm-cost-tracker.ts` (NO crear — LiteLLM persiste nativamente).
- ❌ Helper `recordLlmUsage()` (NO crear — innecesario).

## Implementation Steps

1. **Setup Dokploy service** (~1-2h)
   - Crear nueva app en Dokploy panel con imagen `ghcr.io/berriai/litellm:main-stable`.
   - Configurar volúmenes para `/app/config.yaml` y persistir `litellm_proxy` schema en Postgres.
   - Configurar red interna sin exposición Traefik público.
   - Healthcheck Dokploy nativo apuntando a `/health/readiness`.

2. **Provisionar schema Postgres** (~30min)
   - Conectar vía `psql` al Postgres del cluster Supabase.
   - `CREATE SCHEMA IF NOT EXISTS litellm_proxy;`
   - Configurar user dedicado `litellm_admin` con permisos solo sobre ese schema.
   - Aislar de las políticas RLS del schema `public` del app.

3. **Generar master key + config inicial** (~30min)
   - Generar `LITELLM_MASTER_KEY` con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
   - Guardar en vault del proyecto (`.secrets/` gitignored).
   - Editar `config.yaml` con `model_list` + `fallbacks` + `cache.redis`.

4. **Bootstrap tenants** (~1h)
   - Ejecutar `scripts/setup-litellm-tenants.ts` que lee tenants actuales de Supabase y crea Organizations + budgets iniciales (10 USD/mes).
   - Validar via REST API admin que las virtual keys existen.

5. **Migrar call sites LangChain** (~1-2h)
   - Apuntar `agent-factory.ts` al proxy con `baseURL`.
   - Validar en logs LiteLLM admin que las llamadas pasan por el proxy.

6. **Migrar 5 call sites SDK directo** (~1h)
   - Cambiar `openai.chat.completions.create()` para usar el proxy con virtual key tenant-specific.

7. **Implementar ramo de emergencia** (~2h)
   - Health-check periódico cada 60s.
   - Si falla 3 veces → switch a SDK directo.
   - Sentry breadcrumb + log estructurado.
   - Tests: simular proxy down, validar fallback.

8. **Validar fallback runtime cross-provider** (~30min)
   - Forzar 429 manual contra Claude → verificar que la llamada cae a OpenAI sin intervención del caller.

9. **Validar budget cap** (~30min)
   - Configurar budget 0.10 USD para 1 tenant de prueba.
   - Hacer N llamadas hasta superar el cap.
   - Validar que LiteLLM devuelve 429 / `BudgetExceeded`.

10. **Documentación runbook** (~30min)
    - Comandos curl para admin API (añadir tenant, modificar budget, listar usage).
    - Pasos para restart del proxy desde Dokploy.

## Todo List

- [ ] Servicio Dokploy LiteLLM Proxy levantado y healthy.
- [ ] Schema Postgres `litellm_proxy` provisionado.
- [ ] `config.yaml` con `model_list` + fallbacks + cache Redis.
- [ ] Master key generada y guardada en vault.
- [ ] Bootstrap tenants ejecutado, virtual keys creadas.
- [ ] LangChain chat models apuntan al proxy.
- [ ] 5 call sites SDK directos apuntan al proxy con virtual key.
- [ ] Ramo de emergencia implementado y testeado (proxy down → SDK directo).
- [ ] Fallback runtime cross-provider validado (Claude fail → OpenAI).
- [ ] Budget cap validado (429 al superar threshold).
- [ ] `.env.example` actualizado.
- [ ] Runbook operativo `runbook-litellm.md` creado.
- [ ] Sección breve en `docs/dev-onboarding.md` para arrancar proxy local.
- [ ] PR phase-01 → branch `feature/sprint-costes-llm-post-mvp`.

## Success Criteria

- Todas las llamadas LLM del proyecto pasan por el proxy (verificable en LiteLLM admin logs).
- Cost tracking visible en LiteLLM admin UI por tenant + modelo.
- Fallback runtime funciona sin código adicional en app.
- Budget cap activo y devuelve 429 al superar threshold.
- Ramo de emergencia activa SDK directo si proxy cae 3x.
- `npm run typecheck` + `lint` + `build` → 0 errores.
- Tests `litellm-client.test.ts` y `emergency-fallback.test.ts` pasan.

## Risk Assessment

| Riesgo                                                            | Mitigación                                                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Schema Postgres `litellm_proxy` conflicta con migraciones del app | Schema separado físicamente. User dedicado sin acceso a `public`.                                                 |
| Master key filtrada en logs                                       | Variable de entorno, nunca en código. Sentry sanitize rules.                                                      |
| Latencia añadida >10ms                                            | Medición en Ph2 (Langfuse mide latencia P50/P95). Si pasa, troubleshoot config Dokploy.                           |
| Versión LiteLLM rompe API entre releases                          | Pinear tag SemVer concreto. No auto-update. Antes de upgrade, leer CHANGELOG y testear en local.                  |
| Bootstrap tenants olvida alguno → llamadas fallan                 | Script idempotente + validación post-bootstrap (count Organizations vs count tenants en Supabase debe coincidir). |

## Security Considerations

- Master key generada con `crypto.randomBytes(32)`, persistida en vault (`.secrets/litellm-vault.env` gitignored).
- Virtual keys per tenant nunca abandonan el VPS (red interna Dokploy).
- `LITELLM_PROXY_URL` interno (`http://litellm-proxy:4000`), nunca expuesto a Internet.
- Postgres user `litellm_admin` con privilegios mínimos solo sobre schema `litellm_proxy`.
- Cache Redis comparte instancia con BullMQ pero usa DB distinta (configurar `REDIS_DB=1` o equivalente).

## Next Steps

→ Phase 02 — Langfuse integration + masking PII + callback handlers LangChain + wrappers SDK directos.
