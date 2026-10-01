# Phase 02 — Endpoints `/api/health` + `/api/version` (SP-4-NEW-13)

> Sub-plan de phase-02 Observabilidad (Sprint 3 Hardening). Tarea SP-4-NEW-13. Estim: 30min – 1h.

## Context Links

- Sprint 3: [phase-02-observabilidad-logging-metricas.md](phase-02-observabilidad-logging-metricas.md)
- Origen: fricción detectada en SP-3B-CLOSE-5 (25-05-2026) verificando autodeploy VPS post-merge PR #13. ETag de Next.js prerender resultó opaco — mismo `Etag "778yfwjt2f6lb"` 20min después del merge sin poder distinguir si era build nuevo igual o build viejo.
- RoadMap entry: tabla "Tareas de desarrollo (Fase 3)" → SP-4-NEW-13.

## Overview

- **Prioridad**: P2 (no bloquea MVP pero ahorra horas de debug en cada cierre de sprint).
- **Status**: 🔘 Pendiente (Sprint 3).
- **Resumen**: Dos endpoints públicos, sin auth, Edge runtime, ultra-rápidos. `/api/health` para uptime monitoring estándar. `/api/version` para verificación post-deploy fiable.

## Key Insights

- **Next.js prerender ETag es opaco**: `Etag "778yfwjt2f6lb"` puede coincidir entre builds si el HTML root no cambia. Inútil para verificar "¿este VPS sirve mi último commit?".
- **Dokploy webhook autodeploy puede atascarse**: build cola encolado o webhook GitHub no recibido. Sí tenemos acceso SSH al VPS Hetzner (`bash infra/supabase-vps/scripts/ssh-vps.sh`) para inspeccionar containers/logs Docker manualmente, pero no es práctico hacerlo en cada cierre de sprint.
- **Sin endpoint /api/version cada cierre de sprint sufre la misma fricción**: Sprint 2 lo evitó porque cambios visibles fueron drásticos (CRM admin nuevo). Sprint 2B solo añadía sección dentro de `/dashboard` → indistinguible vía cURL si la sirve build viejo o nuevo.
- **Estándar industrial**: prácticamente todo backend en producción expone `/health` + `/version`. Heroku, Kubernetes, ECS, Vercel lo asumen.

## Requirements

### Funcionales

1. `GET /api/health` → `200 OK` con `{status: "ok", timestamp: ISO8601}`. Sin auth. Sin cache.
2. `GET /api/version` → `200 OK` con `{version, commit, branch, deployedAt, nodeVersion}`. Sin auth. Sin cache.
3. Ambos endpoints en Edge runtime (`export const runtime = "edge"`) para latencia mínima (<50ms).
4. Ambos con `export const dynamic = "force-dynamic"` para asegurar que nunca se sirven desde cache de Next.js.

### No funcionales

- Latencia p99 <100ms.
- No exponer nada sensible: solo metadata pública del build.
- Compatible con uptime monitors externos (UptimeRobot, BetterStack, Pingdom).
- Sin dependencia de Supabase ni Postgres (endpoints "anclados" para detectar siempre si el contenedor está vivo).

## Architecture

### Flujo deploy → version disponible

```
git push developer
       ↓
Dokploy webhook
       ↓
Docker build:
  - npm ci
  - npm run build
  - ARG GIT_COMMIT_SHA=<sha>
  - ARG GIT_BRANCH=developer
  - ARG BUILD_TIMESTAMP=<ISO>
       ↓
Container start con ENV vars inyectadas
       ↓
GET /api/version retorna esas vars
```

### Diagrama

```
┌──────────────────┐                ┌─────────────────┐
│  Build pipeline  │  GIT_COMMIT    │  Next.js Edge   │
│  (Dokploy)     │ ─────────────► │  /api/version   │
│  Docker ARG/ENV  │                │                 │
└──────────────────┘                └─────────────────┘
                                          ▲
                                          │ GET (público)
                                          │
                                    ┌─────────────────┐
                                    │  Cliente:       │
                                    │  - cURL post-   │
                                    │    deploy       │
                                    │  - Uptime mon.  │
                                    │  - E2E pre-suite│
                                    │  - Debug clienta│
                                    └─────────────────┘
```

## Related Code Files

### A crear

- `src/app/api/health/route.ts` (~15 líneas)
- `src/app/api/version/route.ts` (~20 líneas)

### A modificar

- `Dockerfile` — añadir build args `GIT_COMMIT_SHA`, `GIT_BRANCH`, `BUILD_TIMESTAMP` y propagarlos a ENV.
- Panel Dokploy (`panel.linkstation.ai`) → servicio `dev-dash` → sección "Build Args" — pasar build args al Docker build.
- `tests/integration/api/health.test.ts` (NEW)
- `tests/integration/api/version.test.ts` (NEW)

### Referencias

- Sprint 2B fricción: SP-3B-CLOSE-5 nota en RoadMap.md L711.
- Política releases: `CLAUDE.md` sección GitHub Releases.

## Implementation Steps

### 1. Endpoint `/api/health`

```ts
// src/app/api/health/route.ts
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
```

### 2. Endpoint `/api/version`

```ts
// src/app/api/version/route.ts
import packageJson from "../../../../package.json";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      version: packageJson.version,
      commit: process.env.GIT_COMMIT_SHA ?? "unknown",
      branch: process.env.GIT_BRANCH ?? "unknown",
      deployedAt: process.env.BUILD_TIMESTAMP ?? "unknown",
      nodeVersion: process.version,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
```

### 3. Dockerfile — build args + ENV

```dockerfile
# Añadir antes del CMD final
ARG GIT_COMMIT_SHA
ARG GIT_BRANCH
ARG BUILD_TIMESTAMP

ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV GIT_BRANCH=${GIT_BRANCH}
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP}
```

### 4. Dokploy config — inyectar build args

Verificar en Dokploy dashboard cómo pasar build args al Docker build. Probables opciones:

- Variables de entorno marcadas como "build-time".
- Plantilla Nixpacks con script custom que invoque `docker build --build-arg`.
- Si Dokploy no expone build args programáticamente: alternativa = leer `process.env.SOURCE_COMMIT` que Dokploy inyecta por defecto en algunas configs.

### 5. Tests integración

```ts
// tests/integration/api/health.test.ts
import { describe, it, expect } from "vitest";

describe("GET /api/health", () => {
  it("retorna 200 con status ok y timestamp ISO8601", async () => {
    const res = await fetch("http://localhost:8500/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("nunca usa cache (Cache-Control no-store)", async () => {
    const res = await fetch("http://localhost:8500/api/health");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});
```

```ts
// tests/integration/api/version.test.ts
import { describe, it, expect } from "vitest";
import packageJson from "../../../package.json";

describe("GET /api/version", () => {
  it("retorna versión sincronizada con package.json", async () => {
    const res = await fetch("http://localhost:8500/api/version");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe(packageJson.version);
  });

  it("expone metadata de build (commit, branch, deployedAt)", async () => {
    const res = await fetch("http://localhost:8500/api/version");
    const body = await res.json();
    expect(body).toHaveProperty("commit");
    expect(body).toHaveProperty("branch");
    expect(body).toHaveProperty("deployedAt");
    expect(body).toHaveProperty("nodeVersion");
  });
});
```

### 6. E2E spec contra VPS (post-deploy verification)

Añadir helper en `tests/e2e/utils/vps-version.ts` reutilizable por TODOS los specs E2E VPS:

```ts
// tests/e2e/utils/vps-version.ts
import { expect, type APIRequestContext } from "@playwright/test";

export async function expectVpsServingCommit(request: APIRequestContext, expectedSha: string) {
  const res = await request.get("/api/version");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(
    body.commit.startsWith(expectedSha.slice(0, 7)),
    `VPS sirve commit ${body.commit}, esperado ${expectedSha.slice(0, 7)} (build aún no aplicado?)`
  ).toBe(true);
}
```

Uso en specs:

```ts
test.beforeAll(async ({ request }) => {
  await expectVpsServingCommit(request, process.env.EXPECTED_COMMIT_SHA!);
});
```

### 7. Documentar en `docs/operations/deployment.md`

Sección "Verificación post-deploy" que diga:

```bash
# Comprobar que VPS está vivo
curl https://dev.linkstation.ai/api/health

# Comprobar qué commit/version sirve
curl https://dev.linkstation.ai/api/version | jq
```

## Todo List

- [ ] Crear `src/app/api/health/route.ts`
- [ ] Crear `src/app/api/version/route.ts`
- [ ] Modificar `Dockerfile` con build args
- [ ] Configurar Dokploy para pasar GIT_COMMIT_SHA + GIT_BRANCH + BUILD_TIMESTAMP en build
- [ ] Tests integración `tests/integration/api/health.test.ts`
- [ ] Tests integración `tests/integration/api/version.test.ts`
- [ ] Helper E2E `tests/e2e/utils/vps-version.ts`
- [ ] Actualizar specs E2E VPS existentes para usar `expectVpsServingCommit` en beforeAll
- [ ] Documentar en `docs/operations/deployment.md` sección verificación post-deploy
- [ ] Validar primer deploy con `/api/version` real en VPS

## Success Criteria

- `curl https://dev.linkstation.ai/api/health` → 200 + JSON `{status, timestamp}`.
- `curl https://dev.linkstation.ai/api/version` → 200 + JSON con `version`, `commit` (7+ chars), `branch`, `deployedAt`.
- Latencia p99 medida con `ab -n 100 -c 10` <100ms ambos endpoints.
- Test integración Vitest verde local.
- En el siguiente cierre de sprint, `expectVpsServingCommit` falla si autodeploy no aplicado → señal clara, no más debug a ciegas.

## Risk Assessment

- **Riesgo 1**: Dokploy no permite pasar build args fácilmente.
  - **Mitigación**: investigar 3 alternativas (build args nativos, ENV vars build-time, script Nixpacks). Si las 3 fallan: usar `process.env.SOURCE_COMMIT` u otra var que Dokploy inyecte por defecto. Plan B: leer `git rev-parse HEAD` en runtime durante el build via Next.js custom build step.
- **Riesgo 2**: Endpoint Edge runtime no compatible con import `package.json`.
  - **Mitigación**: si falla, copiar version a constante en build-time (codegen script) o usar `NEXT_PUBLIC_APP_VERSION` env var.
- **Riesgo 3**: `process.version` no disponible en Edge runtime.
  - **Mitigación**: fallback a string fijo `"edge"` o omitir el campo en Edge. Si se quiere precisión, mover el endpoint a Node runtime (`export const runtime = "nodejs"`) — la latencia sube ~50ms pero sigue siendo aceptable.

## Security Considerations

- Endpoints públicos sin auth: ✅ correcto (no exponen nada sensible).
- `commit` SHA es público en GitHub. `branch` es público (developer/staging/main).
- NO exponer: env vars sensibles, paths internos, versiones de dependencias (vector de fingerprinting). Solo metadata del build.
- Rate limiting: heredan el global del middleware (no necesitan especial). Si abuso detectado, añadir rate limit específico vía 4-06.

## Next Steps

- Tras completar SP-4-NEW-13, actualizar TODOS los specs E2E VPS existentes (`tests/e2e/sprint-*-close/`) para usar `expectVpsServingCommit` en `beforeAll`.
- Comunicar a Renzo: usar `/api/version` en SP-4B phase-04 para asegurar QA contra build correcto.
- Mencionar endpoint `/api/health` a UptimeRobot/BetterStack si la clienta quiere monitoring externo (release v0.3.0 GA o posterior).
