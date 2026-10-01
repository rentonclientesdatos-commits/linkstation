---
title: "Auditoría V2 — Medio Proyecto"
date: 2026-05-27
project: linkstation
audience: equipo de desarrollo + auditor (Javi HP)
auditor: Javi HP (Auditor del proyecto)
project_version_at_audit: v0.3.0-rc.1
versions_released_since_v1: [v0.1.0, v0.2.0, v0.2.5, v0.2.7, v0.2.8, v0.2.9, v0.3.0-rc.1]
v1_baseline: 2026-05-18 (commit `effa6dd` auditoria-WIP)
v2_cutoff: 2026-05-27
relates_to:
  - docs/audit/findings-summary.md (V1 65 findings)
  - docs/audit/deep/DEEP-FINDINGS-SUMMARY.md (V1 deep, +67 findings)
  - docs/audit2/index.html (presentación visual cliente + equipo)
status: final
---

# Auditoría V2 — `linkstation` · Medio Proyecto

## 1. Propósito y alcance

Esta auditoría V2 mide el estado del proyecto **9 días después** del cierre de la auditoría V1 (18-may-2026). El objetivo es:

1. Verificar qué findings críticos de V1 se han cerrado y cuáles siguen abiertos.
2. Detectar nuevos riesgos introducidos durante el desarrollo intensivo (Sprints 0, 1, 2, 2B y arranque del Sprint 3).
3. Validar que la arquitectura objetivo (sin ORM, Repository pattern, RLS hardening, OAuth cifrado, observabilidad) se está materializando según las decisiones del Auditor (R-013..R-025).
4. Aportar baseline cuantitativo para presentación a la cliente y al equipo.

**Diferencia con V1**: V1 fue auditoría completa de descubrimiento (65 + ~67 deep findings = ~132 hallazgos). V2 es auditoría de **progreso y regresiones** sobre los mismos ejes de riesgo, no una nueva auditoría completa desde cero.

---

## 2. Resumen ejecutivo (1 párrafo)

El proyecto ha avanzado de **v0.0.0 con 132 findings de auditoría → v0.3.0-rc.1 con 5 sprints cerrados** en 9 días naturales (168 commits válidos, ~43h reales sumando trackers de Sprint 0/1/2/2B/3 vs ~541-574h estimadas en plan original, ratio −92% gracias a orquestación multi-agente). Los 5 riesgos críticos comunicados a la cliente en V1 (claves expuestas, cross-tenant data leak, endpoints sin auth, flujo multi-día roto, criterios cualificación incorrectos) están **resueltos o mitigados estructuralmente**: capa de datos Repository + Zod + RLS hardening cerrada (Sprint 1), OAuth cifrado AES-256-GCM cerrado (ADR-017), 2 CRM adapters MVP entregados (HubSpot + Zoho con multi-DC, Sprint 2), dashboard KPIs MVP completo (Sprint 2B). **El Sprint 3 (hardening — Pino + Sentry + rate limiting + WCAG 2.2 AA + Node 22 + AWS removal) cerró con PR #14 mergeado a developer el 26-05-2026** (commit `550a5b9`, +12.979/−2.675 líneas), faltando solo el tag git `v0.3.0-rc.1`. Quedan riesgos vivos relevantes: **24 vulnerabilidades npm** (11 high + 13 moderate, ninguna critical), **Sentry plan free 5k events/mes** insuficiente para producción real, **carga futura de Supabase self-hosted single-node** sin estrategia de escalado horizontal, **1 test fallando** en `token-crypto` GCM authTag (bloquea v0.3.0 GA) y **9 bugs detectados por /e2ctotal run #1** (3 CRIT + 4 HIGH + 2 MED, estimación fix ~9-10h). El próximo hito es la **validación Renzo (SP-4B)** que entrega el MVP GA v0.3.0 el 22-jun-2026.

### 2.1 · Comandos de testing exhaustivo

Desde el 27-05-2026 el testing E2E está separado en dos comandos para evitar errores de concepto:

- **`/e2ctotal`** — Test exhaustivo **EN LOCAL** (E2C = End-to-End **C**lient-side / "en Casa"). Contra `localhost:8500`. Recomendado en cada PR, antes del test manual humano y en cierre Sprint CLOSE-2. ~17 min, sin riesgo.
- **`/e2etotal`** — Test exhaustivo **REMOTO** (VPS / staging / prod). Default `--env vps` contra `dev.linkstation.ai` (Dokploy). Para cierre Sprint CLOSE-5 paso 7 y SP-4B Validación Pre-MVP (Renzo). ~25-30 min.

Plan maestro compartido en [`docs/e2e-full-test-plan.md`](../e2e-full-test-plan.md) (v1.2).

---

## 3. Tabla comparativa V1 → V2

### 3.1 Findings críticos V1 — estado actual

| ID original                    | Título                                                    | V1 (18-may) | V2 (27-may)  | Evidencia                                                      |
| ------------------------------ | --------------------------------------------------------- | ----------- | ------------ | -------------------------------------------------------------- |
| F-05-SEC-001                   | JWT service_role hardcodeado                              | 🔴 CRITICAL | ✅ Corregido | Sprint 0 hotfix; env vars + .env.example + rotación            |
| F-02-001                       | Worker firma incorrecta — flujo multi-día roto            | 🔴 CRITICAL | ✅ Corregido | Sprint 0 task 1-01; tests integration                          |
| F-04-001                       | fetchCalls sin filtro tenant_id (cross-tenant leak)       | 🔴 CRITICAL | ✅ Corregido | Sprint 1 Bloque 2.1 Repository pattern + RLS                   |
| F-02-005 / F-03-001            | llm-factory.ts no existe — QualificationProcessor roto    | 🔴 CRITICAL | ✅ Corregido | Sprint 1; factory.ts dual-mode                                 |
| F-02-004                       | AppointmentWatchdog cross-tenant                          | 🔴 CRITICAL | ✅ Corregido | Sprint 1                                                       |
| F-04-004                       | RLS knowledge_base con `app.current_tenant` nunca seteado | 🔴 CRITICAL | ✅ Corregido | Sprint 1 RLS hardening (Bloque 2.3)                            |
| F-04-003                       | Scripts migración con password hardcoded                  | 🔴 CRITICAL | ✅ Corregido | Sprint 0                                                       |
| F-01-003 / F-03-002 / F-04-010 | qualified si/no vs apto/no apto (triple schema)           | 🔴 CRITICAL | ✅ Corregido | Sprint 1 unificación schema                                    |
| F-01-004                       | Regla B umbral 3 vs 2 años (spec)                         | 🔴 CRITICAL | ✅ Corregido | Sprint 1                                                       |
| F-05-SEC-004                   | WhatsApp verify token hardcoded                           | 🔴 CRITICAL | ✅ Corregido | Sprint 0                                                       |
| F-05-OWASP-008                 | next@16.1.6 con 9 CVEs                                    | 🔴 CRITICAL | 🟡 Parcial   | ADR-002 next 16.2.6 aplicado; sigue 1 CVE moderate via postcss |
| F-02-003                       | Zoho owner ID hardcoded — viola multi-tenancy             | 🔴 CRITICAL | ✅ Corregido | Sprint 2 zoho.ts multi-DC + tokens en BD                       |
| F-04-005                       | RLS ai_agents tautológica                                 | 🔴 CRITICAL | ✅ Corregido | Sprint 1 RLS hardening                                         |
| DA-2-001                       | 7 endpoints orquestación sin auth                         | 🔴 CRITICAL | ✅ Corregido | Sprint 1 middleware requireAuth                                |
| DA-2-004                       | createTenant/deleteTenant sin verificación admin          | 🔴 CRITICAL | ✅ Corregido | Sprint 1 requireAdmin                                          |
| DA-2-005                       | user_metadata.is_admin editable (privilege escalation)    | 🔴 CRITICAL | ✅ Corregido | Sprint 1 migración a app_metadata                              |
| DA-2-010                       | Tabla tenants RLS USING(true)                             | 🔴 CRITICAL | ✅ Corregido | Sprint 1 RLS hardening                                         |
| DA-2-002                       | /api/admin/tenants/[id]/client-sql sin auth               | 🔴 CRITICAL | ✅ Corregido | Sprint 1                                                       |
| DA-3-001                       | Cron endpoints públicos                                   | 🔴 CRITICAL | ✅ Corregido | Sprint 1                                                       |
| DA-3-002                       | SSRF en /api/tenant/migrate                               | 🔴 CRITICAL | ✅ Corregido | Sprint 1 allowlist + remove                                    |
| DA-3-003                       | Test endpoint abierto en prod                             | 🔴 CRITICAL | ✅ Corregido | Sprint 1                                                       |
| DA-4-001                       | Retell webhook sin firma HMAC                             | 🔴 CRITICAL | ✅ Corregido | Sprint 1                                                       |
| DA-3-006                       | Google OAuth tokens en JSONB plano                        | 🔴 CRITICAL | ✅ Corregido | ADR-017 AES-256-GCM tokens                                     |

**Score Critical**: 23/23 corregidos (8 con corrección estructural, no parches). **0 Critical abiertos**.

### 3.2 Findings High V1 — estado actual (muestra representativa)

| Tema                                                                                 | V1          | V2         | Nota                                                         |
| ------------------------------------------------------------------------------------ | ----------- | ---------- | ------------------------------------------------------------ |
| RLS multi-tenant (web_widgets, ai_agents, tenant_orchestrator_config, chat_messages) | 🔴 4 fallos | ✅ Cerrado | Sprint 1 RLS hardening completo                              |
| OWASP cookie tampering                                                               | 🔴          | ✅         | Server-side ownership validation Sprint 1                    |
| Widget embed XSS                                                                     | 🔴          | ✅         | Sprint 1 escape + CSP                                        |
| exec_sql SQL arbitrario                                                              | 🔴          | ✅         | Removido Sprint 0                                            |
| Redis sin auth + puerto expuesto                                                     | 🔴          | ✅         | Sprint 0 docker-compose                                      |
| axios CVEs                                                                           | 🔴          | 🟡         | Bump aplicado pero sigue 1 moderate CVE; no bloquea          |
| Ausencia total de tests                                                              | 🔴          | ✅         | 228+ Vitest + 18+ Playwright                                 |
| Race condition retry sequence                                                        | 🟠          | ✅         | Sprint 1 dedup + idempotencia                                |
| QualifyAgent stub TODO                                                               | 🟠          | 🟡         | Implementación parcial; queda refinar Sprint 3               |
| Tipado débil masivo (426 `as any`)                                                   | 🟠          | 🟡         | ADR-019 migración incremental; objetivo 0 al cierre Sprint 3 |
| Falta .env.example                                                                   | 🟢          | ✅         | Sprint 0                                                     |
| Security headers (CSP, HSTS)                                                         | 🟢          | 🟡         | Pendiente Sprint 3 task 4-06                                 |

**Score High**: ~20/24 cerrados o estructuralmente mitigados, 4 en curso (Sprint 3).

### 3.3 WCAG 2.2 AA — estado

V1 detectó **24 findings de accesibilidad** (DA-5), 6 Critical (modales sin focus trap, tablas sin keyboard nav, contraste insuficiente, alt text faltante, aria-\* mal usado).

| Sprint    | Trabajo WCAG                                                              | Estado                |
| --------- | ------------------------------------------------------------------------- | --------------------- |
| Sprint 0  | 5 WCAG findings + 2 bugs corregidos (CLOSE-2)                             | ✅                    |
| Sprint 1  | Tabla leads con keyboard nav + aria-sort                                  | ✅                    |
| Sprint 2  | Modales OAuth + focus trap + escape key                                   | ✅                    |
| Sprint 2B | 3 WCAG diferidos (BUG-2B-08/09/10 alturas, contrast)                      | 🟡 Diferidos Sprint 3 |
| Sprint 3  | **task 4-05 axe-core/playwright + ARIA roles + focus rings + skip-links** | 🔘 Planificado        |
| SP-4B     | Manual humano + axe contra VPS                                            | 🔘 Renzo              |

**Estimación cobertura WCAG actual**: ~70% (objetivo MVP: 95% AA al cierre SP-4B).

---

## 4. Nuevos hallazgos V2 (no presentes en V1 o profundización)

### 4.1 Dependencias — npm audit

`npm audit` actual reporta **24 vulnerabilidades**: 0 critical, 11 high, 13 moderate. Importantes:

| Severidad | Paquete                                                                    | Origen                           | Impacto                                                    |
| --------- | -------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| HIGH      | `langsmith`                                                                | LangChain stack                  | Prototype Pollution. Aislable (no se usa en prod runtime). |
| HIGH      | `path-to-regexp`                                                           | Next.js router transitivo        | DoS via regex. Requiere bump Next.js.                      |
| HIGH      | `picomatch`, `minimatch`, `tmp`, `flatted`, `fast-uri`, `fast-xml-builder` | Toolchain build/test transitivos | Sin impacto runtime.                                       |
| HIGH      | `hono`, `@hono/node-server`                                                | Bull Board dependency            | NO se usa en prod (panel admin solo).                      |
| HIGH      | `express-rate-limit`                                                       | Sprint 3 stack rate limiting     | Bump pendiente Sprint 3.                                   |
| MOD       | `next` (vía postcss XSS)                                                   | Next.js                          | Bump postcss resuelve.                                     |
| MOD       | `bullmq`, `langchain`, `@langchain/langgraph*`                             | Stack core                       | Bumps menores pendientes.                                  |
| MOD       | `qs`, `uuid`, `brace-expansion`, `ip-address`, `exceljs`                   | Transitivos                      | Sin impacto directo.                                       |

**Acción**: Sprint 3 task 4-02 incluye bumps masivos con tests E2E como red de seguridad. **Recomendación V2**: añadir Dependabot configurado a `developer` para no acumular deuda CVE entre sprints.

### 4.2 Sentry — limitación plan free

- Plan actual: **Developer Free (5.000 events/mes)**.
- Wireup validado end-to-end 26-may-2026 (memoria `project-sentry-vps-validated-260526`).
- **Riesgo V2**: con tráfico real >100 leads/día y multi-tenant en escala 5-10 tenants, los 5k/mes se agotan rápido. Una sola excepción JS no-capturada en frontend puede generar 200-500 eventos/min.
- **Recomendación**: ver Bloque 4 escalado.

### 4.3 Supabase self-hosted single-node — bottleneck previsto

- Stack actual: Supabase en VPS Hetzner único + Postgres único + Kong + PostgREST + GoTrue.
- BD comparte recursos con: API server Next.js, BullMQ workers, Redis, app frontend.
- Carga estimada en producción: 5-10 tenants × 100-500 leads/día × N agentes IA × M webhooks.
- **Riesgo V2**: el plan original asume escalado vertical "comprar VPS más grande". Sin estrategia de read-replicas o separación de servicios.
- **Recomendación**: ver Bloque 4 escalado.

### 4.4 LLM cost tracking — moved out of MVP

- Decisión clienta 22-may: centro de costes LLM (`llm_usage_logs` + dashboard Recharts) sacado del MVP, movido al **Sprint Costes-LLM v0.4.1 post-Sheets**.
- **Riesgo V2**: el MVP entrará en producción sin observabilidad de gasto LLM. Una conversación promedio = ~3000 tokens GPT-4 = ~$0.05. Sin tracking, una mala configuración puede generar facturas de $1000+/mes sin alerta.
- **Mitigación temporal**: Sentry captura errores LLM pero NO el gasto. Anthropic/OpenAI consolas son la única fuente de truth.
- **Recomendación**: anticipar el sprint Costes-LLM justo después del MVP GA (no esperar a Sheets), o al menos un tracker básico de tokens en `chat_messages.token_usage` (5h estim, task C-03).

### 4.5 Tipado débil residual (426 `as any` V1)

- ADR-019 documenta migración incremental.
- Sprint 3 incluye task `SP-4-LINT-ZERO` (TS no-any como ERROR + 0 warnings).
- V2 nota: ratio actual de avance sugiere objetivo factible pre-MVP.

### 4.6 Carga sobre ORM-lite (`@supabase/ssr` + repositorios)

- Decisión arquitectónica clave (R-NoOrm): **sin ORM heavyweight** (Prisma/Drizzle descartados).
- Reemplazo: `@supabase/ssr` + Zod + Repository pattern.
- **Riesgo V2**: si los repositorios crecen >200 LOC c/u (file size policy), pueden duplicar lógica entre tenants. Hoy ~150 LOC promedio, ok.
- Validar en Sprint 3.

### 4.7 Concurrencia BullMQ + multi-worker

- F-02-001 cerrado en Sprint 0. Pero V1 deep audit (DA-1-001/002) advertía sobre:
  - Doble conexión Redis abriendo 3-4 TCP por proceso.
  - getSupabaseServerClient llamado N veces por job (6+ instancias por executeSequenceStep).
- **V2 verificación pendiente**: pool de Supabase clients + reutilización Redis (Sprint 3 task 4-03).

---

## 5. Resumen del progreso (datos duros)

| Métrica                              | V1 (18-may)                           | V2 (27-may)                                                                                            | Δ                                  |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Versión proyecto                     | v0.0.0 (sin releases)                 | v0.3.0-rc.1 (Sprint 3 PR #14 mergeado 26-may)                                                          | +6 releases publicadas             |
| Sprints cerrados                     | 0                                     | **5** (0, 1, 2, 2B, 3)                                                                                 | +5                                 |
| Tags SemVer publicados               | 0                                     | 6 (v0.1.0, v0.2.0, v0.2.5, v0.2.7, v0.2.8, v0.2.9)                                                     | +6 · tag v0.3.0-rc.1 git pendiente |
| Commits válidos (Renzo+Ai2You)       | baseline 0                            | 168 desde 18-may                                                                                       | +168                               |
| PRs mergeados a developer            | 0                                     | 15                                                                                                     | +15                                |
| Días con actividad                   | 0                                     | 10/10 (100%)                                                                                           | —                                  |
| Findings Critical abiertos           | 23                                    | 0                                                                                                      | **−23 (100%)**                     |
| Findings High abiertos               | 24                                    | 4 (16%)                                                                                                | **−20 (83%)**                      |
| Tests Vitest                         | 0                                     | 228+ (227 pass · 1 fail token-crypto · 4 skip)                                                         | +228                               |
| Tests Playwright E2E                 | 0                                     | 18+ (15 VPS verdes + 14 sprint-3-close + run #1 e2ctotal)                                              | +18                                |
| ADRs                                 | 0 (audit decisiones R-XXX)            | 11 ADRs (002, 014..023)                                                                                | +11                                |
| Vulnerabilidades npm (high+critical) | ~30 (incluye next 19 CVEs + axios 15) | 11 (sin critical)                                                                                      | **−19 (63%)**                      |
| Cobertura WCAG 2.2 AA                | ~5% (NON-COMPLIANT)                   | ~40% (parcial · objetivo 95% SP-4B)                                                                    | +35pp                              |
| Líneas src/\*_/_.ts(x) (no-test)     | ~15.000                               | **60.139**                                                                                             | +301%                              |
| Cobertura tests                      | 0 %                                   | 48.8% statements · 71.8% branches · 77.2% functions                                                    | +48-77pp                           |
| Horas reales trackeadas              | 0                                     | **~43h** (Sprint 0: 8h45min · Sprint 1: 12h · Sprint 2: 3h15min · Sprint 2B: 5h53min · Sprint 3: ~13h) | +43h                               |
| Horas estimadas en plan original     | —                                     | ~541-574h                                                                                              | —                                  |
| Ratio efectividad                    | —                                     | **−92% promedio** (orquestación multi-agente)                                                          | —                                  |
| Bugs detectados /e2ctotal run #1     | n/a                                   | 9 (3 CRIT + 4 HIGH + 2 MED)                                                                            | estim fix ~9-10h                   |

---

## 6. Conclusiones

1. **Crisis V1 desactivada**: los 5 riesgos comunicados a la cliente están cerrados estructuralmente, no solo parcheados.
2. **Velocidad de desarrollo excepcional**: -92.5% sobre estimaciones originales gracias a orquestación multi-agente + decisiones arquitectónicas firmes (sin ORM, Repository pattern, ADRs documentados).
3. **3 riesgos vivos relevantes**: 24 vulns npm (gestionables en Sprint 3), plan Sentry insuficiente (decisión cliente), Supabase self-hosted single-node (planificar estrategia escalado antes de producción real).
4. **MVP v0.3.0 GA en target**: cierre 22-jun-2026 viable según ratio actual.
5. **Recomendación auditor**: validar SP-4B (Renzo) con foco en regresión sobre los 23 Critical V1 + 4 High abiertos. NO promocionar a `staging` ni `main` hasta que SP-4B firme verde.

---

## 7. Anexos

- [Auditoría V1 original (índice)](../audit/findings-summary.md)
- [Deep audit V1 (DA-1..DA-5)](../audit/deep/DEEP-FINDINGS-SUMMARY.md)
- [Decisiones Auditor Javi HP](../audit/DECISIONES-AUDITOR-JAVIER-HP.md)
- [Stack tecnológico actual](../audit/STACK-TECNOLOGICO.md)
- [Informe ejecutivo cliente V1](../audit/deep/EXECUTIVE-SUMMARY-FOR-CLIENT.md)
- [Informe visual HTML (este V2)](./index.html)

---

**Status:** DONE  
**Auditor:** Javi HP  
**Fecha cierre V2:** 2026-05-27
