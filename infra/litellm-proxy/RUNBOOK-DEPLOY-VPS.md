# Runbook — Deploy del proxy LiteLLM al VPS Dokploy (Sprint 8)

> Creado 13-06-2026. Guía pre-deploy del stack LiteLLM Proxy + Langfuse en el VPS
> Hetzner (Dokploy). El stack se validó E2E en local (v1.85.5 + Postgres propio,
> completion real + SpendLog). Falta levantarlo en el VPS.

## Contexto

- **Rama**: `feature/sprint-08-costes-llm` (PR #32 a `developer`, OPEN + MERGEABLE, sin merge).
- **Stack**: `infra/litellm-proxy/docker-compose.dokploy.yml` (proxy `v1.85.5` + `litellm-db` Postgres propio AISLADO del cluster Supabase).
- **Acceso VPS**: ver `docs/handoff/acceso-panel-dokploy-vps.md`. Panel `panel.linkstation.ai/` (SIN puerto :3000, bloqueado al exterior). SSH: `infra/supabase-vps/.vault/ssh-vps.env` + helper `infra/supabase-vps/scripts/ssh-vps.sh`. Memoria: SSH key ed25519 puede estar denegada → usar pg-meta REST o panel Dokploy directo.

## Decisiones de diseño ya tomadas (red-team Sprint 8)

- Postgres PROPIO para LiteLLM (NO el cluster Supabase de prod → evita pool exhaustion + fuga spend cross-tenant).
- Imagen pineada `ghcr.io/berriai/litellm:v1.85.5` (NO main-stable / NO v1.41).
- Sin labels Traefik → proxy NO expuesto a Internet, solo red interna `dokploy-network`.
- Master key + DB password vía secret manager Dokploy, NUNCA hardcodeadas.
- Routing SOLO de call sites async no-críticos (fact-extractor, ai-analysis, ai-rescue). WhatsApp/widget NO migrados (sin SPOF).
- Budget caps: alert-only (enforce diferido).

## Variables a configurar en el secret manager de Dokploy (servicio LiteLLM)

| Var | Valor | Origen |
|-----|-------|--------|
| `LITELLM_MASTER_KEY` | generar `crypto.randomBytes(24).toString('base64url')` con prefijo `sk-` | nuevo, al vault |
| `LITELLM_DB_USER` | `litellm` | nuevo |
| `LITELLM_DB_PASSWORD` | generar 24+ chars random | nuevo, al vault |
| `OPENAI_API_KEY` | la del proyecto | env VPS existente |
| `ANTHROPIC_API_KEY` | la del proyecto | env VPS (puede faltar — verificar) |
| `GEMINI_API_KEY` | la del proyecto | env VPS (puede faltar — verificar) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis del VPS (Dokploy ya tiene `dokploy-redis`) | env VPS existente |

Y en el servicio de la APP Next.js (para que use el proxy):
| Var | Valor |
|-----|-------|
| `LITELLM_BASE_URL` | `http://litellm-proxy:4000` (nombre interno del contenedor en dokploy-network) |
| `LITELLM_API_KEY` | el mismo `LITELLM_MASTER_KEY` (o una virtual key si se crean) |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` | de la cuenta Langfuse (crear cuenta Hobby para dev/staging; self-host para prod con PII — decisión Bea) |

## Pasos de deploy

1. **Mergear PR #32 a developer** (orden del usuario — NO automático).
2. En Dokploy: crear nuevo servicio Compose apuntando a `infra/litellm-proxy/docker-compose.dokploy.yml` (o pegar el compose). Conectar a `dokploy-network`.
3. Configurar las env vars del secret manager (tabla arriba).
4. Deploy. Verificar arranque:
   - `litellm-db` healthy primero (depends_on).
   - `litellm-proxy` corre migraciones Prisma al arrancar (tarda — por eso `start_period: 60s`).
   - Health: `curl http://litellm-proxy:4000/health/readiness` desde otro contenedor de la red → `{"status":"healthy","db":"connected"}`.
5. Configurar `LITELLM_BASE_URL`/`LITELLM_API_KEY` en el servicio de la APP + redeploy de la app.
6. **Caos test E2E** contra el VPS: forzar `LITELLM_FORCE_DOWN=true` en la app o parar el contenedor del proxy → verificar que fact-extractor/ai-analysis caen al SDK directo sin romper (breadcrumb Sentry). Quitar el flag.
7. Verificar SpendLogs: `psql` en `litellm-db` → `SELECT model, spend FROM "LiteLLM_SpendLogs" ORDER BY "startTime" DESC LIMIT 5;` tras disparar un fact-extractor real.

## Gotchas conocidos (de la validación local)

- **Formato `fallbacks`**: ya corregido en `config.yaml` a lista-de-dicts (v1.85). NO revertir.
- La key OpenAI NO debe contaminarse con caracteres no-ASCII al exportarla (cuidado con banners de dotenv).
- El proxy tarda ~30-60s en pasar healthy por las migraciones Prisma — normal.

## Pendientes Bea (antes de prod con PII real)

- Langfuse: Cloud Hobby solo dev/staging con datos sintéticos. Producción con PII → self-host en Dokploy.
- Budget enforce: activar tras ~1 semana de consumo observado.

## Estado al cerrar sesión 13-06

- Código Sprint 8 completo, PR #32 (9 commits) listo, E2E local del proxy + E2C visual del dashboard verificados.
- Fix auth-cliente Supabase incluido (createBrowserClient) — dashboard de costes muestra coste IA real.
- ⚠️ Build limpio recomendado antes de merge: el hook pre-push falló una vez por caché stale `.next/dev/types/validator.ts` (NO código). Hacer `rm -rf .next && npm run build` para confirmar.
