# Reporte consultivo — Evaluación stack ampliado (Engram, Biome, Langfuse, LiteLLM)

**Fecha**: 28-05-2026
**Solicitante**: Javi HP
**Carácter**: Consultivo (NO ejecutar, NO instalar — material para decisión)
**Versión proyecto al evaluar**: linkstation tras Sprint 3 cerrado (PR #14), pendientes PR #16 (sentry-test removal) y posible Sprint 4 Sheets SPIKE.

---

## 🎯 Resumen ejecutivo (TL;DR)

| Herramienta  | Recomendación          | Cuándo                                      | Esfuerzo         | Riesgo                              |
| ------------ | ---------------------- | ------------------------------------------- | ---------------- | ----------------------------------- |
| **Engram**   | Sí (piloto)            | Post-MVP v0.4.0                             | 30-60 min setup  | Madurez (proyecto 3 meses)          |
| **Biome**    | No por ahora           | Q4 2026 (post-MVP)                          | 13-17h migración | Bajo, pero alto coste oportunidad   |
| **Langfuse** | **Sí, en SP-5B**       | Sprint Costes-LLM `v0.5.1` (Lun 24-08-2026) | 32-50h           | Bajo (MIT, exportable)              |
| **LiteLLM**  | Sí, junto con Langfuse | Sprint Costes-LLM `v0.5.1` (mismo sprint)   | 16-23h           | Medio (SPOF, otro servicio Dokploy) |

---

## 📍 Ubicación en RoadMap (CRÍTICO — leer antes de actuar)

### Estado actual del Sprint Costes-LLM (RoadMap.md líneas 1425-1481)

**El sprint Costes-LLM YA EXISTE en RoadMap** pero NO menciona Langfuse ni LiteLLM. Está planificado con **solución custom in-house**:

| ID                    | Tarea actual (RoadMap)                                                         | Estim.              |
| --------------------- | ------------------------------------------------------------------------------ | ------------------- |
| C-01                  | Tabla `llm_usage_logs` + RLS + `llm-cost-tracker.ts` LangChain CallbackHandler | 5-7h                |
| C-02                  | Dashboard de costes LLM por tenant/proveedor con Recharts                      | 16-22h              |
| C-03                  | Persistir `completion.usage` en `chat_messages.metadata`                       | 2h                  |
| **Total dev**         |                                                                                | **23-31h**          |
| + Cierre (CLOSE-1..5) |                                                                                | **5h 30min + bugs** |

**Datos sprint:**

- **Sprint ID**: `SP-5B`
- **Versión objetivo**: `v0.5.1` (patch tras Sheets `v0.5.0`)
- **Rama**: `feature/sprint-costes-llm-post-mvp`
- **Inicio**: Lun 24-08-2026 09:00 (post-Sprint 4 Sheets)
- **Fin Est.**: Jue 27-08-2026 19:00 (3-4 días lab)
- **Asignado a**: Javi HP
- **Orden fijo** (decisión clienta 22-05-2026): JUSTO DESPUÉS de Google Sheets, ANTES de Salesforce
- **Plan detallado existe**: `plans/260522-1430-sprint-costes-llm-post-mvp/` (4 phase files + plan.md)

### Decisión arquitectónica abierta

Este reporte propone CAMBIAR la estrategia del SP-5B:

| Opción                                            | Estado RoadMap  | Esfuerzo total | Capacidades cubiertas                                                                                              |
| ------------------------------------------------- | --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| **A — Custom in-house** (planificado actualmente) | 🔘 Definida     | 28-37h         | Solo cost tracking + dashboard básico                                                                              |
| **B — Langfuse + LiteLLM** (este reporte)         | Propuesta nueva | 48-73h         | Cost tracking + tracing + evals + prompt mgmt + fallback runtime + virtual keys multi-tenant + rate-limit + replay |

**Decisión pendiente del usuario**: validar Opción B con clienta y, si OK, redactar **ADR-020 LLM Observability & Gateway** + actualizar RoadMap reemplazando C-01/C-02/C-03 por nuevas tareas que reflejen la adopción de Langfuse + LiteLLM Proxy en Dokploy.

---

## 1️⃣ Engram (memoria persistente Claude Code)

**Estado**: NO es un repositorio único. Existen 10+ proyectos open-source llamados "Engram". Candidato más probable: [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram) (3.8k stars, Go, MIT, v1.15.15 mayo 2026, binario local + plugin Claude Code + MCP server).

**Nota sobre "SRI"**: No es un término oficial en ningún Engram documentado. Probable confusión con FTS5 (SQLite Full-Text Search) o "semantic retrieval". Pendiente confirmación por el usuario.

**Funcionamiento**:

- Binario Go local + SQLite en `~/.engram/engram.db`
- **Cero cloud, cero API key** — 100% local
- MCP server consultable por Claude Code on-demand
- ~10 tools MCP: `save_memory`, `recall`, `list`, `forget`...
- Retrieval híbrido: FTS5 lexical + LLM-judged semantic conflict detection

**Encaje con sistema actual** (`C:\Users\javih\.claude\projects\.../memory/` + 60+ `.md`):

- **Complementa, NO reemplaza CLAUDE.md** (que sigue siendo overrides de comportamiento)
- Sustituye la carga estática de `MEMORY.md` por queries on-demand

**Ahorro tokens estimado**:

- Benchmark LOCOMO claim: 80% accuracy con 96.6% menos tokens vs full-context
- Tu workflow: 10 chats/día Opus × 30k tokens redundantes ≈ **~135 €/mes ahorrables** si llega al 90%

**Esfuerzo**: 30-60 min setup + migración manual de 60 `.md` (script ad-hoc o re-input).

**Riesgos**:

- Proyecto JOVEN (creado 16-02-2026, 3 meses de vida)
- 62 issues abiertas + breaking changes plausibles en 0.x/1.x
- Fragmentación ecosistema (10+ forks compitiendo) → vendor lock al elegir uno
- Sin paridad con tu taxonomía (`feedback-*`, `project-*`, `user-*`) — pierdes organización manual si no replicas con tags

**Privacidad**: ✅ 100% local SQLite. Cero datos a cloud. Compatible con confidencialidad cliente.

**Recomendación**:

- **NO instalar AHORA** (Sprints 0-3 + Sprint 4 Sheets en marcha — freeze de toolchain dev)
- **Pilotar post-MVP v0.4.0** (~22-06-2026 + buffer) durante 1 semana, medir tokens antes/después
- **Alternativa 80/20 INMEDIATA**: hook que comprima `MEMORY.md` automáticamente (truncar entradas viejas, agrupar por sprint cerrado) → **2h trabajo, ~20% ahorro tokens inmediato sin instalar nada**

---

## 2️⃣ Biome (linter + formatter Rust)

**Estado**: v2.4.16 (27-05-2026), MIT+Apache-2.0, 24.8k stars, releases semanales. Cubre JS/TS/JSX/TSX/JSON/CSS/GraphQL. ~85% paridad ts-eslint type-aware, ~97% paridad Prettier.

**Performance medida**: pre-commit en repos 1-3k archivos TS baja de ~10-15s a <500ms (10-25x más rápido).

**Reglas ESLint NO cubiertas** relevantes para linkstation:

| Regla / Plugin                            | Estado en Biome                           | Impacto                                                      |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `next/no-html-link-for-pages`             | Ausente                                   | Bajo (Next 16 App Router minimiza uso)                       |
| `eslint-plugin-tailwindcss` (sort)        | `useSortedClasses` en nursery, fix unsafe | **Medio** — UI heavy Tailwind                                |
| `eslint-plugin-testing-library`           | Ausente                                   | Medio (tests Vitest + RTL)                                   |
| `@typescript-eslint/no-floating-promises` | 75% paridad                               | **Alto** — código async-heavy (BullMQ, LangChain, multi-LLM) |
| `eslint-plugin-vitest`                    | Ausente                                   | Medio                                                        |

**Esfuerzo migración**: 13-17h reales (mapping reglas + re-baseline warnings + actualizar husky/lint-staged + ADR).

**Impacto en `SP-4-LINT-ZERO`** (114 warnings → 0): Biome NO traduce 1:1 el baseline ESLint. Migrar AHORA invalida el baseline. **Orden correcto**: cerrar SP-4-LINT-ZERO con ESLint → migrar a Biome con baseline limpio.

**Recomendación**: **NO migrar ahora**. Esperar a Q4 2026 (post-MVP v0.4.0). Mientras tanto:

- **Alternativa inmediata 80/20**: migrar `.eslintrc` legacy → `eslint.config.js` flat config + `--cache` (1-3h, 5-10x más rápido en runs incrementales, riesgo cero).

**Condiciones para reconsiderar Biome** (Q4 2026):

1. `useSortedClasses` sale de nursery con fix safe
2. `noFloatingPromises` alcanza ≥95% paridad con ts-eslint
3. Aparece `biome-plugin-next` oficial cubriendo `no-html-link-for-pages` etc.
4. MVP v0.4.0 cerrado y SP-4-LINT-ZERO completado

---

## 3️⃣ Langfuse (LLM observability)

**Estado**: v3 estable, MIT (Cloud + Self-hosted), ~14k stars GitHub, YC W23. Production-ready (Khan Academy, Twilio, Samsara, Merck).

**Capacidades únicas vs solo Sentry + custom**:

- Tracing span-level cadenas LLM (input/output/tokens/coste por step)
- Prompt management versionado + caché
- LLM-as-judge evals + datasets de regresión
- Cost tracking automático por modelo/tenant/agente
- Replay de conversaciones para detectar regresiones al cambiar modelo

**Encaje con stack linkstation**:

- **LangChain**: integración 1 línea (`CallbackHandler` en `config.callbacks`)
- **VPS Hetzner Dokploy**: viable. Stack mínimo: Web + Worker + Postgres separado (NO reusar Supabase) + ClickHouse (single-node 2 vCPU/8 GB para volumen MVP)
- **Multi-tenant**: 1 Project por entorno (dev/staging/prod) + `tenant_id` como tag/metadata + filtrado server-side via RBAC
- **GDPR + PII**: cumple GDPR self-hosted. Masking client-side + server-side obligatorio desde día 1 (transcripts Retell/Ultravox traen DNI, teléfonos)

**Esfuerzo dev integración**:

| Tarea                                                        | Horas       |
| ------------------------------------------------------------ | ----------- |
| LangChain callback handler en agentes existentes             | 4-6h        |
| Wrappers SDK directos (Anthropic + OpenAI + Gemini)          | 6-10h       |
| Setup self-hosted Dokploy (compose + secrets + healthchecks) | 8-12h       |
| Masking PII multi-tenant + tests                             | 8-12h       |
| Mapping `tenant_id` + RBAC + dashboards iniciales            | 6-10h       |
| **Total integración base**                                   | **~32-50h** |

**Pricing Cloud (28-05-2026)**:

- **Hobby gratis**: 50k units/mes, 30 días retención, 2 users
- Core $29/mes: 100k units
- Pro $199/mes: compliance + 3 años retención
- Para academia mediana (5k calls × ~5 spans = 25k units/mes) → cabe en Hobby con holgura

**Recomendación**:

- **Adoptar SÍ, canalizado al Sprint Costes-LLM SP-5B (v0.5.1)** — NO antes
- **Empezar en Cloud Hobby (gratis)** durante PoC SP-5B
- **Migrar a self-hosted Dokploy** solo si: (a) clienta exige por compliance, o (b) volumen >200k units/mes sostenidos
- **Crítico**: si se aprueba, **NO crear tabla `llm_calls` custom en Sprint 1** — Langfuse la sustituye después. Ahorra ~6h Sprint 1.

**Comparativa solapamiento con plan actual SP-5B**:

| Tarea RoadMap actual                         | Reemplazada por Langfuse       | Mantener                                   |
| -------------------------------------------- | ------------------------------ | ------------------------------------------ |
| C-01 (tabla `llm_usage_logs` + tracker)      | ✅ Sí completamente            | Solo persistir en `chat_messages.metadata` |
| C-02 (dashboard Recharts custom)             | ✅ Sí parcialmente             | Dashboard agregado básico (vista tenant)   |
| C-03 (`completion.usage` en `chat_messages`) | ❌ NO — sigue siendo necesario | ✅                                         |

---

## 4️⃣ LiteLLM (AI Gateway)

**Estado**: v1.85.x (mayo 2026), MIT, BerriAI (YC), >12k stars, releases semanales. SemVer 2.0 desde v1.84.0.

**Modalidades**:

- LiteLLM Python SDK — **NO aplica** (stack Node.js/TS)
- **LiteLLM Proxy Server** — Docker self-hosted, REST API OpenAI-compatible ← única vía técnica para AF
- LiteLLM Cloud — descartable (vendor lock + datos sensibles)

**SDK Node.js/TS oficial: NO existe.** Integración desde TS: consumir Proxy vía HTTP con `openai` npm package o `langchain` JS apuntando `basePath` al proxy.

**Capacidades únicas vs Langfuse** (son complementarios, NO compiten):

- Routing/fallback runtime declarativo (`fallbacks: [["claude-3-5-sonnet", "gpt-4o", "gemini-2.0-flash"]]`)
- Virtual keys + budgets per tenant/team/key
- Rate limiting per tenant (RPM/TPM/budget USD)
- Caching de respuestas (Redis) — ahorro 20-40% en cargas batch idempotentes
- Audit log por call

**Multi-tenant mapping**: `tenant_id (academia) → Organization` · `admin academia → Team` · `agente/feature → User` · `runtime → Key`

**Esfuerzo integración**:

| Tarea                                                          | Horas      |
| -------------------------------------------------------------- | ---------- |
| Setup Dokploy service (Postgres schema + Docker + config YAML) | 4-6h       |
| Migración LangChain JS a `basePath` proxy                      | 3-5h       |
| Diseño mapping tenant → org/team/key + bootstrap script        | 4-6h       |
| Tests integración con Supabase RLS (key por tenant)            | 3-4h       |
| Documentación ADR + runbook                                    | 2h         |
| **Total**                                                      | **16-23h** |

**Infra adicional**: 2 vCPU + 4 GB RAM en Hetzner (~5-10€/mes). Postgres schema dentro del cluster Supabase existente.

**Riesgos**:

- **SPOF**: si Proxy cae → todos los agentes fallan. Mitigación: health-check + ramo de emergencia a SDK directo, o 2 réplicas
- **Otro servicio que mantener**: sumar a stack Dokploy monitorizado; pinear versión, no auto-update
- **Latencia añadida**: <2ms intra-VPS — despreciable

**Recomendación**:

- **Adoptar SÍ, en Sprint Costes-LLM SP-5B (v0.5.1)** junto con Langfuse
- Setup recomendado: **A) LiteLLM Proxy + Langfuse** (complementarios)

**Comparativa setups**:

| Setup                                      | Cost tracking | Fallback runtime | Multi-tenant    | Evals/prompts | Complejidad infra  |
| ------------------------------------------ | ------------- | ---------------- | --------------- | ------------- | ------------------ |
| **A) LiteLLM + Langfuse**                  | ✅✅ doble    | ✅ nativo        | ✅ virtual keys | ✅ Langfuse   | Alta (2 servicios) |
| B) Langfuse + LangChain                    | ✅ via traces | ❌ manual        | ❌ no nativo    | ✅ Langfuse   | Media              |
| C) Solo LiteLLM                            | ✅ nativo     | ✅ nativo        | ✅ nativo       | ❌ no cubre   | Media              |
| **D) Custom Supabase** (plan ACTUAL SP-5B) | 🟡 propio     | 🟡 propio        | 🟡 propio       | ❌            | Baja               |

---

## 🚦 Decisión recomendada

### Para MVP inmediato (Sprints 0-3 + Sprint 4 Sheets — ahora hasta Lun 13-07-2026)

1. **Engram**: NO instalar. Optimizar `MEMORY.md` con hook de compresión (2h).
2. **Biome**: NO migrar. Mantener ESLint + cerrar `SP-4-LINT-ZERO` al final del MVP.
3. **Langfuse + LiteLLM**: NO instalar. PERO si se decide adoptarlos en SP-5B → **NO construir tabla `llm_usage_logs` custom en Sprint 1**. Si Sprint 1 ya cerró con esa tabla, mantener pero no expandir.

### Para Sprint Costes-LLM SP-5B (Lun 24-08-2026 → Jue 27-08-2026)

**Decisión arquitectónica pendiente del usuario y clienta**:

- **Opción A** (RoadMap actual): mantener plan custom in-house (28-37h, cubre 30% del valor potencial)
- **Opción B** (este reporte): cambiar a Langfuse Cloud Hobby + LiteLLM Proxy Dokploy (48-73h, cubre 100% del valor: tracing + evals + prompts + fallback + virtual keys + cost tracking)

Si se aprueba Opción B, acciones concretas:

1. ADR-020 LLM Observability & Gateway via `af-agents:adr`
2. Reemplazar C-01/C-02/C-03 en RoadMap por nuevas tareas (estimación actualizada)
3. Sprint Costes-LLM pasa de 23-31h dev → 48-73h dev (+25-42h)
4. Re-evaluar fecha fin: Jue 27-08-2026 → posible Lun 31-08-2026 (+2 días lab)
5. Sprint 5 Salesforce desplazado +2 días desde Vie 28-08 a Mar 01-09-2026

### Post-MVP v0.4.0 (>22-06-2026 + buffer)

- **Engram**: piloto 1 semana, medir tokens antes/después.
- **Biome**: revisar Q4 2026 si cumplen condiciones (useSortedClasses safe + noFloatingPromises ≥95%).

---

## 📚 Fuentes y referencias

### Engram

- https://github.com/Gentleman-Programming/engram (3.8k stars, MIT, Go)
- https://www.engram.fyi/ (variante TS)
- https://engram.to/ (variante distinta)
- Paper arxiv: 2511.12960 (ENGRAM architecture)
- Self-RAG paper arxiv: 2310.11511

### Biome

- https://biomejs.dev/
- https://biomejs.dev/blog/biome-v2/ (codename Biotype)
- https://github.com/biomejs/biome (24.8k stars)
- Vercel — Stress testing Biome `noFloatingPromises`
- fireup.pro case study — pre-commit 15x faster

### Langfuse

- https://langfuse.com/
- https://github.com/langfuse/langfuse (~14k stars, MIT)
- https://langfuse.com/self-hosting (Docker Compose stack)
- https://langfuse.com/docs/observability/features/masking (PII masking)
- https://langfuse.com/pricing

### LiteLLM

- https://github.com/BerriAI/litellm (>12k stars, MIT)
- https://docs.litellm.ai/docs/simple_proxy
- https://docs.litellm.ai/docs/proxy/multi_tenant_architecture
- https://docs.litellm.ai/docs/proxy/virtual_keys
- https://docs.litellm.ai/docs/proxy/cost_tracking

---

## ❓ Cuestiones abiertas para resolver

1. **Engram**: ¿"SRI" venía de un blog/video específico? ¿Qué repo Engram concreto leíste? (10+ variantes existen)
2. **Langfuse**: ¿La clienta acepta SaaS (Cloud Hobby) durante PoC o exige self-host desde día 1?
3. **Langfuse**: ¿Hay requisito explícito de "todo dentro de Supabase" para auditoría? Si sí, alternativa custom obligada.
4. **LiteLLM**: ¿Existe ya cost log parcial en `src/lib/llm/` o todas las llamadas son fire-and-forget?
5. **LiteLLM**: ¿La clienta requiere budget cap por academia desde el MVP o lo asume post-MVP? Si MVP → adelantar parte de LiteLLM al Sprint 3.
6. **Langfuse + LiteLLM**: ¿Cifrado at-rest de prompts/respuestas en audit log es requisito legal (LOPDGDD/RGPD con datos de alumnos menores)?
7. **Engram**: ¿Renzo usa también Claude Code? Engram no comparte DB entre devs nativamente (cada uno tiene su `~/.engram/`).

---

**Fin del reporte consultivo. Material para decisión, no para ejecución.**
