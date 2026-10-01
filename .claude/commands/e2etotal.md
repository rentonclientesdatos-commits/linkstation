---
description: Test E2E exhaustivo y reusable contra VPS (Dokploy, dev.linkstation.ai). Para local usar /e2ctotal. Cubre auth, RBAC, RLS, CRUD 12 entidades, integrations, webhooks, widget, observabilidad.
argument-hint: [--env vps|staging|prod] [--only-fase N] [--skip-fase N,M] [--no-cleanup] [--apps slug1,slug2] [--vps-readonly]
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, TodoWrite, AskUserQuestion, Task]
---

# /e2etotal — E2E Full Test Run (entornos remotos: VPS / staging / prod)

> **Desde 27-may-2026 este comando NO ejecuta contra local**. Para entorno local usar `/e2ctotal` (mismo plan, contra `localhost:8500`). Regla del proyecto: llamar cada cosa por su nombre — E2C = local, E2E = remoto.

**Default `--env vps`** (`https://dev.linkstation.ai`). Si se pasa `--env local` el comando AVISA y redirige a usar `/e2ctotal` (no aborta — sigue siendo válido el override por compatibilidad temporal).

**AUTONOMOUS EXECUTION**: no preguntar confirmación en cada paso. Solo pausar:

- Al inicio para confirmar entorno target si no se pasa `--env`.
- Por error crítico bloqueante (Fase 00-02 fallidas, RLS leak detectado).
- Al cerrar cada fase para reportar progreso resumido (1 línea).
- Al final con `INFORME-FINAL.md` completo.

## Referencias autoritativas

- **Plan maestro**: [`docs/e2e-full-test-plan.md`](../../docs/e2e-full-test-plan.md) — la lógica de las 8 fases, entidades, RBAC matrix, criterios de éxito vive AHÍ. NO duplicar contenido aquí.
- **Histórico**: [`docs/e2e-runs-history.md`](../../docs/e2e-runs-history.md) — entrada nueva al inicio tras cada run.

## Pre-checks (paralelos, antes de arrancar)

Ejecutar en una sola pasada y reportar tabla:

1. `git status --porcelain` — debe estar vacío o stash hecho.
2. `git rev-parse --abbrev-ref HEAD` — capturar branch.
3. `git rev-parse --short HEAD` — capturar SHA.
4. `curl -fsSL $TARGET_URL/api/health` — 200 esperado.
5. `curl -fsSL $TARGET_URL/api/version` — capturar versión app.
6. **Detectar acceso a creds admin** (CRÍTICO — sandbox bloquea `.env.local` por defecto). Probar las 3 vías en orden y reportar cuál está activa:
   - **6a (recomendada)**: `Bash` → `if [ -n "$NEW_ADMIN_PASSWORD" ]; then echo "ENV_SHELL=ok"; else echo "ENV_SHELL=missing"; fi`. Si `ok` → usar esta vía, no leer disco.
   - **6b (fallback)**: `Read .env.local` — si el sandbox lo permite, extraer `NEW_ADMIN_PASSWORD`. Si devuelve `permission denied / directory denied` → pasar a 6c.
   - **6c (último recurso)**: pedir al usuario con `AskUserQuestion` que pegue el password en chat. Avisar que queda en transcript.
   - **Si las 3 fallan**: abortar con mensaje "Sin acceso a creds admin. Opciones: (1) `$env:NEW_ADMIN_PASSWORD = '<pwd>'` antes de relanzar Claude, (2) permitir Read de `.env.local`, (3) ejecutar `/e2etotal --skip-fase 01,02,03,04` para correr solo fases sin login". Ver sección "Acceso a credenciales en sandbox Claude Code" del plan maestro.
7. `npx playwright --version` — debe responder.
8. Si target=local: `npm run db:status` debe mostrar Supabase running.

Si cualquier check crítico falla → abortar y reportar al usuario qué arreglar.

## Setup del run

1. Leer `docs/e2e-full-test-plan.md` completo (8 fases + reglas + criterios).
2. Leer `docs/e2e-runs-history.md` (últimos 3 runs) para detectar bugs recurrentes/regresiones.
3. Determinar entorno target:
   - Si `--env` pasado → usar ese.
   - Si no pasado → preguntar al usuario con `AskUserQuestion` (opciones: local recomendado / vps / staging / prod).
4. Capturar inventario runtime (por si app creció desde snapshot del plan):
   - `Get-ChildItem src/app -Filter page.tsx -Recurse | Measure-Object` → contar páginas.
   - `Get-ChildItem src/app/api -Filter route.ts -Recurse | Measure-Object` → contar endpoints.
   - Si delta > 10% respecto al plan (28 páginas / 30 endpoints): warning al usuario "plan posiblemente desactualizado, considera bump v1.X tras este run".
5. Crear plan dir `plans/{YYMMDD-HHmm}-e2etotal-run/` con subdirs `screenshots/`, `bugs/`, `logs/`.
6. Inicializar `TodoWrite` con las 8 fases del plan + filtros aplicados (`--only-fase` / `--skip-fase`).
7. Crear stubs vacíos `phase-XX-{slug}.md` para todas las fases que se ejecutarán.

## Ejecución

Ejecutar las 8 fases del plan en orden, según las especificaciones del [plan maestro](../../docs/e2e-full-test-plan.md):

1. **Fase 00 — Pre-checks** (5min, bloqueante)
2. **Fase 01 — Auth + RBAC matrix** (10min, bloqueante)
3. **Fase 02 — RLS multi-tenant** (15min, bloqueante)
4. **Fase 03 — CRUD por entidad** (60min, no-bloqueante por entidad)
5. **Fase 04 — Integraciones CRM OAuth** (20min, no-bloqueante; skip silencioso si CLIENT_ID placeholder)
6. **Fase 05 — Webhooks firmados** (10min, no-bloqueante)
7. **Fase 06 — Widget embed público** (10min, no-bloqueante)
8. **Fase 07 — Observabilidad + Compliance** (15min, no-bloqueante)
9. **Fase 08 — Cleanup + informe** (5min, bloqueante)

**Browser**: usar Playwright vía CLI (`npx playwright test --grep`) cuando haya spec aprovechable, o vía MCP `playwright__browser_*` para flujos nuevos sin spec previa. Catálogos dinámicos (`programas`, `help_sections`) leer en runtime — NO hardcodear.

**Multi-rol obligatorio**: cada fase con permisos diferenciados ejecuta matriz (admin / tenant user / anon) donde aplique.

**CRUD completo por entidad** (Fase 03): C + R + U + D + Restore (si aplica) — sin saltarse pasos. Una entidad con UPDATE roto NO aborta el resto de entidades.

## Reglas durante run

> Detalle completo en sección "Reglas durante run" del plan maestro. Resumen operativo:

- **Naming bugs**: `E2E-{YYMMDD}-{NNN}-{severity}-{slug}` (`CRIT` / `HIGH` / `MED` / `LOW`).
- **Fix automático in-session** si:
  - Fix obvio (typo, missing field, wrong URL).
  - Scope cubierto por Sprint actual.
  - No requiere migración SQL ni nueva env var.
  - Bug fixeable vía admin/service_role: usar scripts admin para arreglar dato + dejar nota en bug.
- **NO PRE-STOPPERS**: una vez la fase arranca, no preguntar confirmación entre sub-pasos. Solo pausar por error crítico bloqueante.
- **Confirmaciones al usuario**: SOLO al cerrar fase, 1 línea por fase ("Fase X 🟢 N/M pass, K bugs").
- **Screenshots**: SIEMPRE en `{plan_dir}/screenshots/`, NUNCA en raíz (regla global proyecto).
- **Console errors + network 5xx**: capturar a `{plan_dir}/logs/`.
- **Tiempo máximo por fase**: 2x estimado del plan; abortar fase si excede y documentar timeout.

## Output final del run

Estructura completa generada (ver detalle en plan maestro sección "Output del run"):

```text
plans/{YYMMDD-HHmm}-e2etotal-run/
├── phase-00..08-*.md
├── INFORME-FINAL.md
├── screenshots/
├── bugs/
└── logs/
```

Más:

- Entrada NUEVA al inicio de `docs/e2e-runs-history.md` con tabla por fase + lista de bugs + métricas.
- Memoria persistente actualizada si hay bugs CRIT/HIGH abiertos (`e2e-bugs-pendientes-{YYMMDD}.md`).
- Stats globales acumulados en `e2e-runs-history.md` recalculados.

## Post-run obligatorio (checklist marcable)

- [ ] `INFORME-FINAL.md` completo con resumen, métricas, bugs, próximos pasos.
- [ ] Entrada añadida al INICIO de `docs/e2e-runs-history.md`.
- [ ] Stats globales (`Runs totales`, `Entidades testeadas`, etc.) actualizadas.
- [ ] Bugs CRIT/HIGH documentados con ID estable + memoria persistente si abiertos.
- [ ] Cleanup verificado (tenants/leads/agents test borrados).
- [ ] Screenshots organizados.
- [ ] Bugs fixeados in-session: commits `fix(e2e): ...` con ref al bug ID.
- [ ] Si run sobre VPS: capturar logs Dokploy del periodo y guardar referencia.
- [ ] Reportar al usuario: 1 párrafo resumen + link al `INFORME-FINAL.md`.

## Argumentos opcionales

| Flag                                         | Default              | Uso                                                                            |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `--env local\|vps\|staging\|prod`            | preguntar al usuario | Selecciona entorno target. Cambia `TARGET_URL` y creds source.                 |
| `--only-fase N` (multi: `--only-fase 03,05`) | todas                | Ejecuta solo las fases listadas. Útil para iterar.                             |
| `--skip-fase N` (multi: `--skip-fase 04,06`) | ninguna              | Salta las fases listadas. Útil si feature aún no implementada.                 |
| `--no-cleanup`                               | false                | NO ejecuta Fase 08 cleanup (deja entidades test en DB para inspección manual). |
| `--apps slug1,slug2`                         | todas                | Filtra Fase 03 a entidades concretas (ej. `--apps leads,agents`).              |
| `--ci`                                       | false                | Modo CI: arranca dev server propio, headless, output JUnit XML adicional.      |
| `--vps-readonly`                             | false                | Si `--env vps prod`: deshabilita Create/Update/Delete de Fase 03 (solo R).     |

## Resolución de ambigüedades

- **Sin `--env`**: preguntar con `AskUserQuestion` (opciones: local / vps / staging / prod).
- **Run anterior detectó bugs CRIT abiertos**: avisar al inicio "previous run dejó N bugs CRIT pendientes — verificar regresión".
- **Plan version > 1.0**: leer changelog en cabecera del plan y aplicar diferencias.
- **Entorno VPS no desplegado**: si `--env vps` y `curl /api/health` falla → preguntar "VPS no responde, ¿caer a local?".

## Notas de adaptación al proyecto

linkstation es SaaS multi-tenant → Fase Auth + RLS son críticas (NO se pueden saltar).
NO hay catálogo marketplace público → no aplica fase "barrido catálogo".
SÍ hay pagos (futuro Sprint Costes-LLM) → cuando se implemente Sepay/Stripe, añadir Fase 09 "Monetization" al plan maestro (bump v1.X).
NO hay backups en MVP → skip esa fase.
SÍ hay compliance básico (audit logs, GDPR pendiente) → Fase 07 cubre lo que hay; ampliar cuando GDPR endpoint exista.
SÍ es web (no mobile/desktop) → Playwright único stack, sin Appium/Detox.

## Sugerencias futuras (no MVP)

- **Modo CI**: `/e2etotal --ci` desde GitHub Actions cron semanal (cuando Sprint 3 active CI completo).
- **Comparador inter-run**: script Node/Python que compare `docs/e2e-runs-history.md` y detecte regresiones de los mismos bug IDs en N runs consecutivos.
- **Visual regression**: añadir Percy/Chromatic o Playwright `toHaveScreenshot()` para 5 rutas críticas.
- **Load tests**: añadir Fase 09 con k6 para webhooks críticos + `/api/leads/ingest` cuando MVP esté en prod.
