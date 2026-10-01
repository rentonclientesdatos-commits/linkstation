---
description: Test E2C exhaustivo y reusable EN LOCAL (localhost:8500). Mismo plan maestro que /e2etotal pero contra entorno de desarrollo. Más rápido, sin riesgo, recomendado para cada PR y antes del test manual humano.
argument-hint: [--only-fase N] [--skip-fase N,M] [--no-cleanup] [--apps slug1,slug2]
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, TodoWrite, AskUserQuestion, Task]
---

# /e2ctotal — E2C Full Test Run (entorno local)

> **E2C** = End-to-End **C**lient-side / E2E **en Casa** / local. Mismo concepto que E2E pero contra `localhost:8500` con Supabase + Redis locales. Más rápido, sin riesgo, sin tocar VPS.

**AUTONOMOUS EXECUTION**: idéntico protocolo que `/e2etotal`. No preguntar confirmación en cada paso. Solo pausar:

- Por error crítico bloqueante (Fase 00-02 fallidas, RLS leak detectado).
- Al cerrar cada fase para reportar progreso resumido (1 línea).
- Al final con `INFORME-FINAL.md` completo.

## Diferencia con /e2etotal

| Aspecto            | `/e2ctotal` (este)                                             | `/e2etotal` (VPS)                                              |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- |
| **Entorno**        | `localhost:8500` (E2C local)                                   | `https://dev.linkstation.ai` (VPS Dokploy)            |
| **Cuándo usarlo**  | Cada PR · antes del test manual humano · cierre Sprint CLOSE-2 | Tras deploy a VPS · cierre Sprint CLOSE-5 paso 7 · SP-4B Renzo |
| **Velocidad**      | ~17 min                                                        | ~25-30 min (latencia red + deploy)                             |
| **Riesgo**         | Cero (entorno aislado)                                         | Bajo, pero toca infra real                                     |
| **Cleanup**        | Obligatorio (Fase 08)                                          | Obligatorio + verificación Dokploy logs                        |
| **Pre-requisitos** | `npm run dev` + `npm run db:up` + `npm run redis:up` corriendo | Deploy a Dokploy en verde + DNS resolviendo                    |

**Equivalencia técnica**: `/e2ctotal` es equivalente a `/e2etotal --env local`. Se ha separado en comando propio para evitar confusión sobre qué entorno se está testeando (regla del proyecto desde 27-may-2026 — llamar cada cosa por su nombre).

## Referencias autoritativas

- **Plan maestro**: [`docs/e2e-full-test-plan.md`](../../docs/e2e-full-test-plan.md) — la lógica de las 8 fases, entidades, RBAC matrix, criterios de éxito vive AHÍ. NO duplicar contenido aquí.
- **Histórico**: [`docs/e2e-runs-history.md`](../../docs/e2e-runs-history.md) — entrada nueva al inicio tras cada run.

## Pre-checks (paralelos, antes de arrancar)

Ejecutar en una sola pasada y reportar tabla. Forzar entorno = local:

1. `git status --porcelain` — debe estar vacío o stash hecho.
2. `git rev-parse --abbrev-ref HEAD` — capturar branch.
3. `git rev-parse --short HEAD` — capturar SHA.
4. `curl -fsSL http://localhost:8500/api/health` — 200 esperado (si falla → abortar pidiendo `npm run dev`).
5. `curl -fsSL http://localhost:8500/api/version` — capturar versión app.
6. `npm run db:status` — Supabase local debe mostrar running. Si no → abortar pidiendo `npm run db:up`.
7. `docker ps | grep redis` — Redis local debe estar arriba. Si no → abortar pidiendo `npm run redis:up`.
8. **Detectar acceso a creds admin** (CRÍTICO — sandbox bloquea `.env.local` por defecto). Ver sección "Acceso a credenciales en sandbox Claude Code" del plan maestro. Probar:
   - **8a (recomendada)**: `Bash` → `if [ -n "$NEW_ADMIN_PASSWORD" ]; then echo "ENV_SHELL=ok"; else echo "ENV_SHELL=missing"; fi`. Si `ok` → usar esta vía.
   - **8b (fallback)**: `Read .env.local` — extraer `NEW_ADMIN_PASSWORD` si el sandbox lo permite.
   - **8c (último recurso)**: pedir al usuario con `AskUserQuestion`. Avisar que queda en transcript.
9. `npx playwright --version` — debe responder.

Si cualquier check crítico falla → abortar y reportar al usuario qué arreglar.

## Setup, ejecución y output

**IDÉNTICO** al de `/e2etotal`, salvo:

- `TARGET_URL` = `http://localhost:8500` (fijado, sin pregunta).
- Creds: `NEW_ADMIN_PASSWORD` desde env shell o `.env.local`.
- Sin verificación de Dokploy logs en post-run.

Para el detalle de las 8 fases, reglas durante run, naming bugs y output final → ver [`.claude/commands/e2etotal.md`](./e2etotal.md) (mismo contenido).

## Argumentos opcionales

| Flag                                         | Default | Uso                                                                            |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `--only-fase N` (multi: `--only-fase 03,05`) | todas   | Ejecuta solo las fases listadas. Útil para iterar.                             |
| `--skip-fase N` (multi: `--skip-fase 04,06`) | ninguna | Salta las fases listadas. Útil si feature aún no implementada.                 |
| `--no-cleanup`                               | false   | NO ejecuta Fase 08 cleanup (deja entidades test en DB para inspección manual). |
| `--apps slug1,slug2`                         | todas   | Filtra Fase 03 a entidades concretas (ej. `--apps leads,agents`).              |
| `--ci`                                       | false   | Modo CI: arranca dev server propio, headless, output JUnit XML adicional.      |

No tiene `--env` (es siempre local) ni `--vps-readonly` (no aplica).

## Cuándo usar /e2ctotal vs /e2etotal

| Situación                                               | Comando recomendado                   | Razón                                         |
| ------------------------------------------------------- | ------------------------------------- | --------------------------------------------- |
| Antes de cerrar PR a `developer`                        | `/e2ctotal`                           | Rápido, sin riesgo VPS                        |
| Cierre Sprint CLOSE-2 (E2C Local + WCAG)                | `/e2ctotal`                           | Es exactamente lo que pide el protocolo       |
| Antes del test manual humano (CLOSE-3 o SP-4B bloque 4) | `/e2ctotal`                           | Detecta el 80% de bugs antes que el humano    |
| Tras hotfix de bug CRIT                                 | `/e2ctotal`                           | Regression check rápido                       |
| Cierre Sprint CLOSE-5 paso 7 (E2E VPS, condicional)     | `/e2etotal`                           | Valida que el deploy VPS funciona             |
| SP-4B Validación Pre-MVP (Renzo)                        | Ambos                                 | Primero `/e2ctotal`, luego `/e2etotal` en VPS |
| Smoke test rápido contra producción                     | `/e2etotal --env prod --vps-readonly` | Solo R, sin destructivos                      |

## Notas de adaptación al proyecto

linkstation es SaaS multi-tenant → Fase Auth + RLS son críticas (NO se pueden saltar).

Ver el resto de notas y sugerencias futuras en [`.claude/commands/e2etotal.md`](./e2etotal.md).
