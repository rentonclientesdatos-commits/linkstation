---
title: "Dev Onboarding — linkstation"
audience: equipo de desarrollo (interno)
status: vigente
date: 2026-05-20
---

# Dev Onboarding — linkstation

Guía de arranque para cualquier dev que se incorpore al proyecto. Lee esto antes de tocar nada.

## 1. Qué es este proyecto

linkstation — AI CRM + Workflow Orchestrator multi-tenant para academias formativas. Stack: Next.js 16 + React 19 + Supabase (sin ORM nuevo) + Zod + BullMQ + LangChain multi-LLM + Retell/Ultravox + Easypanel. Versión actual: **v0.0.0**.

Lee [`CLAUDE.md`](../CLAUDE.md) del repo raíz para la visión completa del proyecto y las reglas top-level.

## 2. Setup local (primer arranque)

### 2.1 Requisitos previos

- **Node.js 22.22.3** (LTS pinned por `.nvmrc`, codename "Jod", Active LTS hasta Oct 2027). El VPS Dokploy corre Node 22-alpine — usa la misma versión en local para evitar drift (warnings `EBADENGINE`, bugs "funciona en local pero no en prod").
- **npm 10.x+** (ships con Node 22).
- **Git** 2.40+.
- **Docker Desktop** (para PostgreSQL local si no usas el Supabase remoto del equipo).
- **Claude Code CLI** instalado (`npm i -g @anthropic-ai/claude-code` o desde extensión IDE).

> ✅ **Migración Node 20 → 22 LTS completada en Sprint 3** (25-05-2026, SP-4-NODE-22). Local + VPS alineados. `lint-staged@17` desbloqueado.

#### Cómo instalar la versión exacta (recomendado: nvm)

```powershell
# Windows: nvm-windows
nvm install 22.22.3
nvm use 22.22.3
# (en la raíz del repo, el .nvmrc lo selecciona automáticamente si tienes auto-switch)

# macOS/Linux: nvm
nvm install
nvm use
```

Verifica: `node --version` debe devolver `v22.22.3`.

### 2.2 Clonar el repo

```powershell
git clone <repo-url> linkstation
cd linkstation
git checkout developer    # la rama de integración del equipo
```

> ⚠️ **NUNCA** ejecutes `git remote add origin <url-del-cliente>`. Este repo no se conecta al GitHub del cliente.

### 2.3 Variables de entorno

```powershell
cp .env.example .env.local
```

Edita `.env.local` con valores reales. **Las claves reales NO están en git** — pídelas por canal seguro:

- Pide a Javier (Auditor) o al lead del equipo el bundle de secretos (Easypanel env vars, 1Password, o vault interno).
- Para los CRMs de Fase 2 (HubSpot + Zoho) necesitas crear apps OAuth2 en sus developer portals con tu cuenta o usar las credenciales sandbox compartidas.

`.env.local` está en `.gitignore` — nunca lo commitees por accidente.

### 2.4 Instalar dependencias

```powershell
npm install
```

> ⚠️ **Dependency Guard activo**: si intentas instalar una NUEVA dependencia de producción (`npm install <pkg>` sin `-D`), el hook [`af-deps-guard.cjs`](../.claude/hooks/af-deps-guard.cjs) lo bloqueará. Debes pasar por el subagente `af-agents:adr` que verifica compatibilidad y documenta en `docs/adr/`. Esto NO aplica a `npm install` plano (lockfile install) ni a `--save-dev`.

### 2.5 Levantar dev server

```powershell
npm run dev
```

App en `http://localhost:8500` (puerto fijo del proyecto). Worker BullMQ en proceso aparte:

```powershell
node worker.js
```

### 2.6 Puertos del proyecto (fijos)

**Política**: los puertos del proyecto están **fijados de forma permanente** en `package.json` y configs. Si el `npm run dev` se queja de "port in use", **NO dejes que Next salte a otro puerto** — mata el proceso que ocupa el 8500 y vuelve a intentar. Cualquier URL hardcoded del proyecto (OAuth callbacks, Supabase `site_url`, redirects, tests) asume estos puertos.

| Puerto | Servicio                           | Definido en                                                                                    |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `8500` | **Next.js dev server (dashboard)** | `package.json` (`next dev -p 8500` / `next start -p 8500`), `Dockerfile`, `docker-compose.yml` |
| `8100` | Supabase API gateway (Kong)        | Docker container `supabase_kong_*`                                                             |
| `8200` | Supabase Postgres                  | Docker container `supabase_db_*`                                                               |
| `8300` | Supabase Studio (UI)               | Docker container `supabase_studio_*`                                                           |
| `8350` | Supabase Analytics (Logflare)      | Docker container `supabase_analytics_*`                                                        |
| `8400` | Inbucket / Mailpit (mail local)    | Docker container `supabase_inbucket_*`                                                         |
| `6379` | Redis (BullMQ queues)              | `docker-compose.dev.yml`                                                                       |

**Para cambiar el puerto del dashboard** (no debería hacer falta nunca, pero por si acaso), hay que tocar en bloque:

- `package.json` scripts `dev` y `start` (`-p XXXX`)
- `.env.local` → `NEXTAUTH_URL`, `HUBSPOT_REDIRECT_URI`, `ZOHO_REDIRECT_URI`, `NEXT_PUBLIC_APP_URL`
- `.env.example` (mismo conjunto)
- `Dockerfile` → `EXPOSE` + `ENV PORT`
- `docker-compose.yml` → mapping `ports:` + `PORT=`
- `playwright.config.ts` + `tests/e2e/core/sprint-0-security.spec.ts` → `baseURL` fallback
- `supabase/config.toml` → `site_url`, `additional_redirect_urls`, `rp_origins`
- `src/lib/actions/auth.ts` → fallback origin
- `src/lib/services/google-sheets-service.ts`, `src/app/api/integrations/google/{auth,callback}/route.ts` → fallbacks `NEXT_PUBLIC_APP_URL`
- `docs/testeos-manual.md`, `docs/dev-local-setup.md`, `README.md` y este mismo doc
- Re-registrar OAuth redirect URIs en HubSpot / Zoho / Google developer consoles

### 2.7 Credenciales de producción del cliente — política de aislamiento

El equipo de desarrollo del cliente (LinkStation) entregó (22-05-2026) un bundle de credenciales reales de producción en [docs/Docs-entrega-clienta/Estructura/app data doc/env_local_setup.md](./Docs-entrega-clienta/Estructura/app data doc/env_local_setup.md) (folder ignorado por git, regla `.gitignore:64`).

**Política**: estas credenciales **NO** son el entorno local del dev. El local sigue siendo el Supabase Docker self-hosted en `localhost:8100/8200/8300`. La razón:

- Su `SUPABASE_SERVICE_ROLE_KEY` bypassa toda RLS — control total sobre la BD del cliente.
- Los scripts `npm run db:reset`, `npm run db:seed-demo`, `scripts/seed*.ts`, `scripts/migrate-*.ts`, `npm run test:e2e` están diseñados para BD local y **destruirían/contaminarían producción** si el `.env.local` apuntara allí.
- El audit identificó 4 vulnerabilidades RLS activas en producción (Sprint 0 las arregla). No es momento de mezclar entornos.

**Lo que sí aplicamos a `.env.local`**: únicamente la `OPENAI_API_KEY` del bundle, porque es independiente de la BD (sólo inferencia). Coste por uso va a la cuenta del cliente — evita bucles de tests E2E que invoquen LLM.

**Lo que NO aplicamos**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `NODE_TLS_REJECT_UNAUTHORIZED=0` del bundle. Esas variables se guardan en [`.env.production-readonly`](../.env.production-readonly) con prefijo `PROD_` para que ningún script las lea por accidente. Sólo para consultas read-only puntuales con cliente SQL externo (DBeaver, Supabase Studio del cliente con cuenta delegada).

**Si necesitas mirar datos reales de producción**: pide al cliente acceso delegado IAM al Supabase Studio (Sección 5.2 del `roadmap_status_handover.md`). Mejor que compartir service_role_key.

### 2.8 Credenciales de acceso — admin y root del VPS (actualizado 23-05-2026)

**TL;DR:** desde 23-05-2026 los usuarios `demo@af.local` y `viewer@af.local` están **deprecated**. El único admin oficial es `LinkStation@gmail.com`. Las passwords reales NO van a git — están en el vault (`infra/supabase-vps/.vault/`) y/o en `.env.local` de cada dev.

#### Admin del dashboard (local + VPS)

| Item             | Valor                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Email            | `LinkStation@gmail.com`                                                                        |
| Password (local) | en `.env.local` → variable `DEMO_USER_PASSWORD` (escapar `#` con comillas: `DEMO_USER_PASSWORD="..."`) |
| Password (VPS)   | misma password que local, pídela al lead por canal seguro                                              |
| Tenant default   | `LinkStation` (`e3ec5649-5d75-4917-89f3-4b75dfceac54` en local)                               |
| Rol              | admin (`user_metadata.is_admin=true`)                                                                  |
| URL local        | <http://localhost:8500/login>                                                                          |
| URL VPS          | <https://dev.linkstation.ai/login>                                                            |

**Script reutilizable** para (re)crear este usuario en cualquier instancia Supabase:

```bash
# LOCAL (lee .env.local automáticamente)
NEW_ADMIN_EMAIL="LinkStation@gmail.com" \
NEW_ADMIN_PASSWORD='BeaOli#AF*2026!' \
npx tsx scripts/set-admin-user.ts

# VPS (overrides explícitos contra Supabase remoto — solo desde dentro del cluster o
# vía proxy/tunnel; el Supabase del VPS NO está expuesto públicamente)
SUPABASE_URL_OVERRIDE="http://supabase-kong:8000" \
SUPABASE_SERVICE_ROLE_KEY_OVERRIDE="<service_role_key del vault dev-dash-envs.env>" \
NEW_ADMIN_EMAIL="LinkStation@gmail.com" \
NEW_ADMIN_PASSWORD='BeaOli#AF*2026!' \
npx tsx scripts/set-admin-user.ts
```

El script:

- Borra los usuarios legacy `demo@af.local`, `viewer@af.local`, `demo@af.com` (configurable vía `LEGACY_USERS_TO_DELETE`).
- Crea/actualiza el admin con `email_confirm:true` y `user_metadata.is_admin=true`.
- Enlaza `tenants.auth_user_id` al nuevo admin.
- Avisa si la password tiene <12 chars o le falta diversidad (no bloquea — es decisión del dev).

#### Viewer (segundo usuario no-admin para tests de roles)

`scripts/show-demo-credentials.ts` regenera al ejecutarlo un usuario `viewer@af.local` con password aleatoria fuerte (20 chars + sufijo `-Aa1!`). La password se muestra una sola vez por stdout — guárdala si la necesitas.

#### Root SSH del VPS Hetzner

- Host: `46.62.193.169` (puerto 22, user `root`).
- Auth recomendado: SSH key ed25519 en `infra/supabase-vps/.vault/linkstation-vps-key` (gitignored). Public key fingerprint `SHA256:mOKxnaoIXOpRamauhLjkT9ADOeoE3D3i3Pr9JI49MiE`. Si tu dev no la tiene registrada en `/root/.ssh/authorized_keys` del VPS, pide al lead que la añada vía Hetzner Cloud Console (Server → tab Rescue/Console).
- Helper: `bash infra/supabase-vps/scripts/ssh-vps.sh "<cmd>"` o sin argumentos para sesión interactiva. El script auto-detecta OpenSSH (con key) o plink (con password fallback).
- **Reset password root**: la password actual del root vive en el vault `infra/supabase-vps/.vault/ssh-vps.env` → `VPS_PASSWORD`. Fue **reseteada el 23-05-2026 12:30** vía panel Hetzner → Rescue → Reset Root Password (la anterior `qT6lEE8p7*Nd` no coincidía con `/etc/shadow`). Si la SSH key se pierde, se entra por la consola KVM web de Hetzner con esta password.
- **NO hardcodear** ninguna de estas credenciales en código, README, docs commiteables, ni commit messages.

#### Política global (heredada de `~/.claude/CLAUDE.md`)

Cualquier nueva cuenta auto-generada sigue la sección "Password & Credential Policy" del CLAUDE.md global:

- Mínimo 20 chars random con mezcla alfanumérica+símbolos para auto-generación.
- Avisar si una password dictada por el usuario tiene <12 chars o le falta diversidad.
- JWT secrets / encryption keys / service roles → `crypto.randomBytes(32+)`.
- Documentar SIEMPRE dónde vive el secreto (vault file, panel, KMS) — NUNCA el valor en docs.

## 3. Trabajo con Claude Code

### 3.1 Lo que ya tienes al clonar

Al abrir el repo en Claude Code, automáticamente carga:

- **`CLAUDE.md`** del repo raíz (instrucciones específicas Esden, additive a tu `~/.claude/CLAUDE.md` global).
- **`.claude/agents/`** — 19 subagentes especializados (orquestador `af-agents:manager` + 18 más).
- **`.claude/skills/`** — 28 skills filtradas (saas-agents + globales relevantes; sin payment-integration, sin pinokio, sin gepeto).
- **`.claude/hooks/`** — 14 hooks ClaudeKit Engineer + 4 hooks específicos Esden, registrados en `.claude/hooks/hooks.json`.
- **`.claude/rules/`** — 5 normas (development, documentation, orchestration, primary-workflow, team-coordination).
- **`.claude/settings.json`** — permisos del proyecto y plugins habilitados (`context7` + `playwright`).
- **`.claude-plugin/plugin.json`** — manifest del plugin `af-agents` v0.0.0.

**No necesitas copiar nada de la config global de ningún compañero.** Todo viaja en el repo.

### 3.2 Plugins recomendados (instalación 1ª vez)

Asegúrate de tener instalados los plugins oficiales referenciados en `.claude/settings.json enabledPlugins`:

```
/plugin install context7@claude-plugins-official
/plugin install playwright@claude-plugins-official
```

(Si ya los tienes globalmente, Claude Code los reutilizará.)

### 3.3 Cómo trabajar (resumen)

1. **Lee el plan activo**: `plans/YYMMDD-HHmm-slug/` más reciente.
2. **Lanza el orquestador**: pídele al manager que coordine. Ejemplo: _"@manager arranca Fase 1"_.
3. El manager delega a especialistas (`af-agents:database`, `:api`, `:code`, `:testing`...) en paralelo cuando puede.
4. **NUNCA implementes código directamente desde el orquestador** — siempre vía Task tool al especialista.
5. Al cerrar fase, el Phase Completion Protocol corre automático: typecheck + lint + build + tests + browser tests si UI.

### 3.4 Slash commands

Los comandos `/si-edita-doc`, `/no-edita-doc`, `/commit-actual` viven en la **config global** de cada dev (no en el repo). Si tu equipo quiere unificarlos a nivel proyecto, pídeselo al lead — se pueden mover a `.claude/commands/` cuando se decida.

## 4. Ramas y SemVer

```
feature/* → PR → developer → (orden explícita) → staging → (orden explícita) → main
```

- Trabaja siempre en una rama `feature/fase-X-descripcion` partiendo de `developer`.
- Cuando termines: PR a `developer` (review obligatoria del lead).
- `staging` y `main` son **protegidas** — sólo se mueven con orden explícita de Javier o el lead.
- **`staging` y `main` NUNCA reciben** `docs/`, `plans/`, `.claude/`, `.claude-plugin/`, ni `CLAUDE.md`. Sólo código.
- Promociones `developer → staging → main` se hacen vía script `scripts/promote.ps1` (Windows) o `scripts/promote.sh` (Bash). El script limpia automáticamente los artefactos internos. Ver [docs/release-process.md](release-process.md) para el detalle.
- Un CI guard (`.github/workflows/staging-main-purity-check.yml`) bloquea cualquier intento de meter docs/plans/.claude en `staging` o `main`.

**Versionado**:

- `v0.0.0` ahora.
- Patch durante sprint en curso → `v0.0.x`.
- Sprint cerrado → bump a `v0.x.0`.
- MVP completo (post Fase 3, pre Fase 4) → `v1.0.0`.

Tags los crea el script `promote.ps1` automáticamente al promocionar a `main`.

## 5. Reglas top-level que tienes que conocer YA

1. **No Co-Authored-By Claude/Anthropic/IA** en commits. Sí humanos.
2. **No push directo** a `staging` o `main`.
3. **No `git remote add origin <url-cliente>`**.
4. **No introducir Prisma, Dokploy, Airtable, AWS Bedrock** — stack ya decidido en audit.
5. **`.env` real nunca a git** — sólo `.env.example`.
6. **RLS obligatorio** en multi-tenant. Hay 4 vulnerabilidades activas detectadas en audit — ver `plans/20260519-1200-rls-multitenant-hardening/`.
7. **Append-only en sync CRM** por defecto. Sobrescritura sólo con audit trail.
8. **Tests con BD real**, NO mocks de Supabase.
9. **Responsive breakpoint del shell = `lg:` (1024px)**, no `md:`. Sidebar / hamburger / bottom nav usan `lg:hidden|lg:flex|max-lg:*`. `md:` queda para tipografía y spacing solo. Tabla completa: [`docs/dev-team-handover.md §4.bis`](dev-team-handover.md#4bis-responsive-breakpoints-tailwind-v4). Probar siempre 375 / 768 / 1024 / 1440 antes de PR.
10. **PROHIBIDO `any` en TypeScript**. ESLint lo bloquea como `error` y husky aborta tu commit. Usa `unknown` + type guards, `Record<string, unknown>`, generics, interfaces dedicadas o casts puntuales con shape explícito. Guía completa con ejemplos reales: [`docs/architecture/typescript-standards.md`](architecture/typescript-standards.md). **Nunca uses `--no-verify`** para saltarte la regla.

## 6. Recursos clave

| Recurso                  | Dónde                                        |
| ------------------------ | -------------------------------------------- |
| Spec autoritaria cliente | `docs/Docs-entrega-clienta/`                 |
| Audit completo           | `docs/audit/findings-summary.md`             |
| Decisiones del Auditor   | `docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md` |
| Stack confirmado         | `docs/audit/STACK-TECNOLOGICO.md`            |
| Plan rearmado (5 fases)  | Ver R-020-refinement-v2 en DECISIONES        |
| Backlog                  | `docs/roadmap/deep-improvement-backlog.md`   |
| Plans activos            | `plans/YYMMDD-HHmm-slug/`                    |
| Reports de subagentes    | `plans/*/reports/`                           |

## 7. Si te atascas

1. Pregunta al manager: _"@manager status"_.
2. Activa skill `blocker` para registrar el bloqueo con impacto.
3. Si es bug: lanza subagente `debugger` para root cause analysis.
4. Si nada de lo anterior: escala al lead o a Javier (Auditor).

## 8. Política de modelos (heredada de la config global de Javier)

Cada dev puede tener su propia política, pero el proyecto recomienda:

| Modelo | Cuándo                                                                        |
| ------ | ----------------------------------------------------------------------------- |
| Haiku  | Docs, listados, sync, informes con datos ya investigados                      |
| Sonnet | Código CRUD, tests, refactor sencillo, librerías mainstream                   |
| Opus   | Concurrencia, seguridad cripto, decisiones arquitectónicas, research profundo |

**Nunca Opus por defecto.** Quota Fallback al 80% según política global.

---

**Última actualización**: 23-05-2026 (sección 2.8 — admin único `LinkStation@gmail.com` + nota password root VPS).
**Mantenedor**: Javier HP (Auditor).
**Contacto**: admin@2you.ai.
