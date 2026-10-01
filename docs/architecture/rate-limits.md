# Rate limits — linkstation

> Sprint 3 phase-05 Hardening (4-06 + 4-08). Documenta los rate limits aplicados por capa y cómo añadir nuevos.

## Resumen por capa

| Capa                           | Implementación                            | Cubre                                    | Storage                     |
| ------------------------------ | ----------------------------------------- | ---------------------------------------- | --------------------------- |
| **Middleware Edge** (Next.js)  | ❌ NO usamos rate limit aquí              | —                                        | — (Edge no soporta ioredis) |
| **API Routes Node** (críticos) | `rateLimit()` invocado dentro del handler | `/api/*` selectivos                      | ioredis sliding window      |
| **Server Actions**             | `withRateLimit()` HOF wrap                | Server Actions LLM y escrituras costosas | ioredis sliding window      |
| **Widget público**             | `rateLimitWidget()` (Sprint 0 1-27)       | `/widget/[id]` chatbot                   | ioredis (mismo Redis)       |
| **Webhooks**                   | NO rate-limited a nivel app               | Validados por HMAC signature             | —                           |

> **Decisión arquitectónica (25-05-2026)**: el middleware de Next.js corre en Edge runtime y `ioredis` requiere TCP sockets — NO compatible. Por eso el rate limit se aplica a nivel de handler (Node runtime) en vez de middleware global. Si en futuro queremos un rate limit edge, usar `@upstash/redis` (REST API).

## Buckets y límites configurados

### API Routes (a aplicar `rateLimit()` directo en cada handler crítico)

| Endpoint                             | Límite      | Ventana | Identificador                     |
| ------------------------------------ | ----------- | ------- | --------------------------------- |
| `/api/auth/*` (post-login flow)      | 5 req/min   | 60s     | `ip:{ip}:auth`                    |
| `/api/webhooks/*` (no aplica — HMAC) | —           | —       | —                                 |
| `/api/admin/*`                       | 50 req/min  | 60s     | `ip:{ip}:admin`                   |
| `/api/orchestration/*`               | 20 req/min  | 60s     | `tenant:{tenantId}:orchestration` |
| `/api/*` (resto)                     | 100 req/min | 60s     | `ip:{ip}:api`                     |

### Server Actions (vía `withRateLimit()`)

| Server Action                                                  | Límite | Identidad     | Por qué                                     |
| -------------------------------------------------------------- | ------ | ------------- | ------------------------------------------- |
| `getChatbotResponse` (widget)                                  | 10/min | `widgetId:ip` | Anti-abuso público (1-27 Sprint 0)          |
| `generateSimulatorResponse` (futuro)                           | 10/min | `tenantId`    | Cada llamada cuesta tokens LLM              |
| `generateEmbeddings` (futuro)                                  | 30/min | `tenantId`    | `text-embedding-3-small` cuesta por request |
| `runAgentVariant` (futuro A/B testing)                         | 5/min  | `tenantId`    | Comparativas LLM caras                      |
| Otros consumidores `openai.chat.completions.create()` directos | 10/min | `tenantId`    | Default conservador                         |

### Widget público (Sprint 0 1-27)

- 30 mensajes/min por `widgetId:ip` — implementado en `src/lib/actions/widget.ts`.
- Migrar a `withRateLimit()` genérico en Sprint 4 (deuda técnica).

## Cómo añadir un nuevo rate limit

### A. API Route

```typescript
// src/app/api/algo-caro/route.ts
import { NextResponse } from "next/server";
import { rateLimit, extractClientIp } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  const ip = extractClientIp(req);
  const { allowed, resetMs, remaining } = await rateLimit(`ip:${ip}:algo-caro`, 20, 60_000);
  if (!allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(resetMs / 1000)),
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  // ... handler ...

  return NextResponse.json({ success: true, remaining });
}
```

### B. Server Action

```typescript
// src/lib/actions/algo-caro.ts
"use server";

import { withRateLimit } from "@/lib/api/with-rate-limit";
import { getActiveTenantId } from "@/lib/actions/tenant";

async function _doExpensiveLLMWork(prompt: string) {
  // ... lógica real ...
  return { success: true, response: "..." };
}

export const doExpensiveLLMWork = withRateLimit(_doExpensiveLLMWork, {
  key: "expensive-llm",
  perMinute: 10,
  identify: async () => (await getActiveTenantId()) ?? "",
});
```

El consumidor en UI debe manejar el caso `rate_limit_exceeded`:

```tsx
const res = await doExpensiveLLMWork(prompt);
if ("error" in res && res.error === "rate_limit_exceeded") {
  toast.error(res.message); // muestra `resetSec` al usuario
  return;
}
// res.success === true → usar res.response
```

## Convención de keys Redis

```
rl:{type}:{identity}:{bucket}
```

- `rl:` prefijo del namespace de rate-limiter (separado de `bull:*` de BullMQ).
- `{type}` — `ip` | `sa` | `widget` | `tenant`.
- `{identity}` — `ip:{ip}:{endpoint}` o `tenantId` o `widgetId:ip`.
- `{bucket}` — `Math.floor(now / windowMs)` (calculado automático).

Ejemplos reales:

- `rl:ip:203.0.113.1:auth:30943215` → IP 203.0.113.1 hitting /api/auth/\* en bucket de 1 min.
- `rl:sa:simulator:tenant-abc:30943215` → tenant-abc invocando Server Action `simulator`.

## Política fail-open

Si Redis cae o lanza timeout, el rate limiter retorna `{ allowed: true }` — fail-open. NO bloqueamos al usuario por un fallo de infra del rate limiter.

Justificación: prefiero usuario funcional + posible abuso temporal a usuario bloqueado por falsa positiva de infra. Sentry/Pino capturan el fallo Redis para investigación post-incident.

Si se quisiera fail-closed (security-first), cambiar el catch de `rateLimit()` a `return { allowed: false, ... }`.

## Tests

- `tests/unit/rate-limiter.test.ts` — sliding window + fail-open + extractClientIp.
- `tests/unit/with-rate-limit.test.ts` — HOF correcto bloqueo + identity error → límite agresivo.

Cada nueva Server Action wrapped DEBE añadir su propio test que verifique el rate limit.

## Referencias

- [Sprint 3 phase-05 plan](../../plans/260520-1342-sprint-3-hardening/phase-05-hardening-headers-rate-limits.md) — sección 4-08.
- `src/lib/rate-limiter.ts` — helper raw.
- `src/lib/api/with-rate-limit.ts` — HOF wrap Server Actions.
- Sprint 0 1-27 widget rate limit (será migrado en Sprint 4).
