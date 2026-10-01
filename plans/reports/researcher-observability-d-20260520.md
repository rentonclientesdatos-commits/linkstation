---
title: "Researcher Report — Observabilidad y Dashboard Costes LLM — Sprint 3"
date: 2026-05-20
agent: researcher-observability (Sonnet)
sprint: 4
---

# Researcher: Observabilidad y Dashboard Costes LLM

## 1. Logging estructurado — Decisión

### Pino vs Winston para Next.js 16

| Criterio | Pino | Winston |
|----------|------|---------|
| Velocidad | ~5x más rápido (sin toString en hot path) | Más lento (serialización síncrona) |
| Compatibilidad Next.js 16 App Router | ✅ Server Actions + API Routes + Workers | ✅ Pero más config para JSON |
| Edge runtime | ❌ No compatible (Node APIs) | ❌ Igual |
| Bundle size | ~50KB | ~120KB |
| Mantenimiento | Activo (v9.x) | Activo pero menos momentum |
| Integración pino-http | ✅ Middleware Express/Node | N/A |

**DECISIÓN: Pino v9.x** con `pino-http` para API Routes y logging directo en Server Actions/Workers.

### Setup Pino en Next.js 16 App Router

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: 'linkstation' },
});
```

Campos estructurados recomendados por log entry:
```json
{
  "level": "info",
  "time": 1716239040000,
  "service": "linkstation",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "trace_id": "uuid",
  "action": "lead.created",
  "duration_ms": 45,
  "msg": "Lead creado exitosamente"
}
```

Pino escribe a **stdout** — Easypanel captura automáticamente. No se necesita transporte adicional para el MVP.

---

## 2. OpenTelemetry con Next.js 16

### Peer dep declarada

Next.js 16 declara `@opentelemetry/api ^1.1.0` como peer dep opcional. Instalado implícitamente vía `@vercel/otel` pero no configurado en el proyecto actual.

### Paquetes mínimos (Sprint 3)

```
devDependencies:
  @opentelemetry/api ^1.9.0              (ya es peer dep de next, probablemente instalado)
  @opentelemetry/sdk-node ^0.58.0        (runtime SDK)
  @opentelemetry/instrumentation-http    (auto-instrumenta HTTP)
  @opentelemetry/instrumentation-pg      (auto-instrumenta PostgreSQL queries)
```

### BullMQ + OpenTelemetry

BullMQ v5+ tiene soporte nativo de telemetry vía el constructor `telemetry` option:
```typescript
const queue = new Queue('leads', {
  telemetry: new BullMQOtel('leads-queue') // requiere @opentelemetry/api
});
```
Genera spans por cada job processed, waiting time, etc.

### Exportador para Easypanel

**Recomendación MVP:** Exportar a `stdout` (OTLP JSON) → Easypanel recoge logs → enviar a Grafana Cloud free tier (retención 14 días, 50GB/mes gratis). Sin servidor OTel collector propio.

### OpenTelemetry vs solo Pino

| Escenario | Usar |
|-----------|------|
| Logging estructurado básico (MVP) | Pino |
| Trazas distribuidas (request → worker → LLM → webhook) | OpenTelemetry |
| Correlación entre múltiples servicios | OpenTelemetry |

**DECISIÓN Sprint 3:** Pino para logging + OpenTelemetry básico para métricas BullMQ. Trazas distribuidas completas = futuro Sprint 4.

---

## 3. Métricas BullMQ

### Built-in metrics BullMQ v5.73+

BullMQ expone via `Queue.getMetrics()`:
- `waiting`: jobs en cola esperando
- `active`: jobs procesándose ahora
- `completed`: jobs completados (con ventana configurable)
- `failed`: jobs fallidos
- `delayed`: jobs con delay programado
- `paused`: cola pausada

```typescript
const metrics = await queue.getJobCounts('waiting', 'active', 'failed', 'completed');
```

### bull-board para UI

`@bull-board/api@^6.x` + `@bull-board/nextjs@^6.x` — UI de monitoreo de colas integrable en Next.js App Router como API Route. Compatible con BullMQ v5. Requiere auth middleware (no exponer sin protección).

**Estimación instalación:** 3-4h (instalar + ruta protegida + auth check tenant admin).

### Prometheus exporter

No existe exporter oficial. Opción: `bullmq-prometheus` (community, ~200 stars) — RIESGO: no auditado, requiere ADR.

**DECISIÓN:** bull-board UI (devDep) + métricas básicas via `getJobCounts()` almacenadas en PostgreSQL cada 5min (cron propio, sin deps externas). Sin Prometheus en MVP.

---

## 4. Dashboard Costes LLM

### LangChain Callback para tracking tokens

LangChain expone `CallbackHandler` que recibe eventos `on_llm_end` con `LLMResult` incluyendo `usage` (prompt_tokens, completion_tokens). Patrón:

```typescript
// lib/llm-cost-tracker.ts
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

class CostTrackingCallback extends BaseCallbackHandler {
  name = 'cost-tracker';
  
  async handleLLMEnd(output: LLMResult, runId: string, parentRunId?: string) {
    const { promptTokens, completionTokens } = output.llmOutput?.tokenUsage || {};
    await saveLLMUsage({ tenantId, provider, model, promptTokens, completionTokens });
  }
}
```

### Tabla PostgreSQL recomendada

```sql
CREATE TABLE llm_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL,          -- 'anthropic' | 'openai' | 'google' | 'bedrock'
  model TEXT NOT NULL,             -- 'claude-3-5-sonnet' | 'gpt-4o' etc.
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6),          -- calculado en app
  session_id UUID,
  lead_id UUID REFERENCES leads(id),
  action TEXT,                     -- 'qualification' | 'chat' | 'analysis'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: tenant_id = auth.jwt() ->> 'tenant_id'
CREATE INDEX ON llm_usage_logs(tenant_id, created_at);
CREATE INDEX ON llm_usage_logs(tenant_id, provider, created_at);
```

### Precios LLM (mayo 2026, por 1M tokens)

| Proveedor | Modelo | Input | Output |
|-----------|--------|-------|--------|
| Anthropic | Claude 3.5 Sonnet | $3.00 | $15.00 |
| Anthropic | Claude 3.5 Haiku | $0.80 | $4.00 |
| Anthropic | Claude 3 Opus | $15.00 | $75.00 |
| OpenAI | GPT-4o | $2.50 | $10.00 |
| OpenAI | GPT-4o mini | $0.15 | $0.60 |
| OpenAI | GPT-4 Turbo | $10.00 | $30.00 |
| Google | Gemini 1.5 Pro | $1.25 | $5.00 |
| Google | Gemini 1.5 Flash | $0.075 | $0.30 |
| AWS Bedrock | Claude 3.5 Sonnet | $3.00 | $15.00 |

**NOTA:** Los precios hardcodeados en el código actual (DA-4-005) están obsoletos (GPT-4 de 2023). Corregir en Sprint 3.

### LangSmith vs custom PostgreSQL

| Opción | Pro | Con |
|--------|-----|-----|
| LangSmith | Tracing completo, UI lista | SaaS externo, $0.50/1K trazas, PII de leads |
| Custom PostgreSQL | Control total, RLS multi-tenant, sin PII externa | Implementación ~8h |

**DECISIÓN:** Custom PostgreSQL + Recharts dashboard. LangSmith solo si el equipo escala a debugging LLM complejo (futuro).

### Dashboard UI con Recharts

Recharts ya está en el stack. Componentes recomendados:
- `BarChart`: costes por proveedor por mes
- `LineChart`: evolución costes por tenant
- `PieChart`: distribución por proveedor

Vista admin global (superadmin) + vista por tenant.

---

## 5. Monitoring externo — Evaluación

| Opción | Compatibilidad | Precio | Decisión |
|--------|---------------|--------|---------|
| Sentry | ✅ Next.js 16 App Router, v8.x | Free: 5K errores/mes | ✅ USAR para error tracking (devDep) |
| Logflare | ✅ Supabase nativo | Incluido en Supabase self-hosted | ✅ USAR para logs SQL |
| Vercel Analytics | ❌ No aplica (Easypanel, no Vercel) | — | ❌ EXCLUIR |
| Easypanel monitoring | ✅ CPU/RAM/logs Docker | Incluido | ✅ USAR como base |
| Grafana Cloud | ✅ Free 14 días retención, 50GB | Free | ✅ OPCIONAL (futuro) |

**DECISIÓN MVP:** Pino → stdout → Easypanel + Sentry para errores críticos. Grafana Cloud = Sprint 4.

---

## Estimaciones de implementación

| Componente | Estimación |
|-----------|-----------|
| Setup Pino + campos estructurados + integración Workers/API | 4-6h |
| BullMQ métricas + bull-board UI protegida | 4-6h |
| Tabla llm_usage_logs + RLS + callback LangChain | 6-8h |
| Dashboard Recharts costes LLM (UI admin) | 8-12h |
| Sentry setup básico (errores) | 2h |
| **Total 3-03 observabilidad** | **10-14h** |
| **Total 3-04 dashboard LLM** | **14-20h** |

---

**Status:** DONE
**Summary:** Stack recomendado para Sprint 3: Pino v9 para logging estructurado, BullMQ getJobCounts para métricas de colas, bull-board para UI de monitoring, tabla PostgreSQL custom para costes LLM con LangChain CallbackHandler, Recharts para dashboard UI. Sentry para error tracking. Sin OpenTelemetry completo en MVP (aplazar trazas distribuidas a Sprint 4).
