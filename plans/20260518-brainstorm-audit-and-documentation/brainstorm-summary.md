---
title: "Brainstorm — Audit técnico + Documentación integral del linkstation"
date: 2026-05-18
status: approved
type: brainstorm-summary
project: linkstation-main
audience: programadores (interno)
next_step: ejecución del plan de agentes (próxima sesión)
---
# Brainstorm Summary — Audit + Documentación

## 1. Problem statement

El proyecto `linkstation-main` (AI CRM + Workflow Orchestrator v5.0, Next.js 16 + React 19 + Supabase + BullMQ + LangChain multi-LLM + Retell/Ultravox) ha crecido **sin control**. Carencias detectadas en scout previo:

- Sólo 3 .md de proyecto (README, DOCUMENTATION, MASTER_DOSSIER) — sin carpeta `docs/`, sin `plans/`, sin `TASKS.md`.
- Capas mezcladas: `lib/core/`, `lib/services/`, `lib/integrations/`, `lib/actions/` sin contrato claro.
- Doble cliente DB: `@supabase/ssr` + `pg`/`postgres` directos coexistiendo — sin documentar quién usa qué ni por qué.
- Stack LLM disperso: LangChain + Anthropic + OpenAI + Google Genai + AWS Bedrock — sin abstracción visible de proveedor ni gestión de costes documentada.
- 420 commits en GitHub (`LinkStation/linkstation-dashboard`) sin timeline de sprints reconstruido.
- No es repo git localmente (deploy desde zip).

## 2. Objetivo (lo que el usuario quiere)

**NO refactorizar código.** Producir:

1. **Extracción y normalización de la spec de la cliente** (docs entregadas por ella) — fuente autoritaria.
2. **Documentación técnica completa** del estado actual en `docs/`.
3. **Findings priorizados** de errores de planteamiento, seguridad, dependencias, versiones, deuda.
4. **Gap analysis**: qué promete la spec de la cliente vs qué hay en el código.
5. **Listado de sprints/tareas ya realizadas** (inferido de código + git log + dossier).
6. **Roadmap de lo que falta**, cruzando con la spec de la cliente.

Audiencia: **programadores (interno)**. Lenguaje técnico, sin tecnicismos suavizados.

## 2.bis Documentación de la cliente — FUENTE AUTORITARIA

Ubicación: `docs/Docs-entrega-clienta/` (en disco, gitignored — nunca sube a GitHub).

> ⚠️ **Esta documentación MANDA sobre cualquier otra fuente** (incluido el código, MASTER_DOSSIER, README). Si el código contradice la spec de la cliente, el código está mal.

### Archivos clave (ordenados por autoridad)

| #  | Archivo                                                                  | Tipo | Prioridad                | Contenido                                                                                            |
| -- | ------------------------------------------------------------------------ | ---- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| 1  | `Fujos de Trabajo/reunion-inicial-flujo.pdf`                             | PDF  | **TOP — manda sobre todo** | Transcripción/notas de reunión inicial donde la cliente explica el flujo deseado                     |
| 2  | `Fujos de Trabajo/reunion-incial-flujo-deseado.docx`                     | DOCX | Alta                     | Segunda versión / refinamiento de la reunión                                                         |
| 3  | `Estructura/ARQUITECTURA DE BASE DE DATOS SUPABASE.docx`                 | DOCX | Alta                     | Esquema de tablas/relaciones esperado en Supabase                                                    |
| 4  | `Estructura/VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx`                | DOCX | Alta                     | Nomenclatura oficial de variables de leads (cómo deben llamarse)                                     |
| 5  | `Promt-Virginia.md`                                                      | MD   | Alta                     | Prompt del agente IA Virginia (define personalidad/objetivo)                                         |
| 6  | `Fujos de Trabajo/Flujo-agent-ia-voz-whatsapp.png`                       | PNG  | Media                    | Diagrama visual del flujo. **⚠️ Contiene "Airtable" — la cliente NO quiere Airtable, debe ser Supabase** |
| 7  | `Fujos de Trabajo/Agente voz y whatsapp que cualifica.pdf`               | PDF  | Media                    | Descripción del agente de voz + WhatsApp                                                             |
| 8  | `Menú lateral app.docx`                                                  | DOCX | Media                    | Spec del menú/navegación del dashboard                                                               |
| 9  | `VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx` (raíz)                    | DOCX | Media                    | Duplicado de #4 en otra ubicación — confirmar si difieren                                            |
| 10 | `Fujos de Trabajo/Bea & Javi.url`, `Miro-Diagrama de flujo.url`          | URL  | Baja                     | Links externos — consultar sólo si bloqueante                                                        |

### Reglas de uso de la spec

- **Toda decisión arquitectónica del audit se cruza con esta spec.** Si el código hace X y la spec dice Y, eso es un finding `Critical`.
- **Conflictos entre archivos cliente**: gana el más reciente o el explícitamente marcado como autoritario por la cliente. Si no hay forma de saber → flag para preguntarle.
- **Nomenclatura de variables**: la lista #4 es ley. Cualquier variable de lead en código que no coincida con esa nomenclatura es finding.
- **Airtable**: ya identificado como **error conocido en el diagrama** — la cliente quiere Supabase. Auditar dónde aparece Airtable en código y reportar.

### Limitaciones técnicas previstas

- **PDF**: Read tool soporta PDF nativo (con `pages` param para >10 páginas). ✅ OK.
- **DOCX**: Read tool NO soporta DOCX nativo. Opciones para el agente:
  - `pandoc` si está instalado: `pandoc file.docx -o file.md`
  - Extraer XML: `.docx` es un zip → `unzip -p file.docx word/document.xml | sed 's/<[^>]*>//g'` (sucio pero funciona)
  - Solicitar al usuario conversión manual si crítico
- **PNG (diagrama)**: Read tool soporta imágenes vía visión multimodal. ✅ OK.
- **.url (atajos Windows)**: contienen sólo URL, leer como texto plano para extraer link.

## 3. Approaches evaluados

| Enfoque                                        | Pros                                             | Contras                                      | Veredicto                |
| ---------------------------------------------- | ------------------------------------------------ | -------------------------------------------- | ------------------------ |
| **A. Audit paralelo por dimensiones** ⭐ | Cobertura amplia en 4-5h, agentes especializados | Solapamientos requieren reglas de perímetro | **APROBADO**       |
| B. Secuencial top-down                         | Más coherente entre fases                       | 2-3 días, poco paralelismo                  | Descartado por tiempo    |
| C. Inventory-first                             | Más control del usuario                         | Dos rondas, más fricción                   | Descartado               |
| D. Cliente-first (narrativa)                   | Bueno para entregable externo                    | Audiencia es interna, no aplica              | Descartado por audiencia |

## 4. Solución final aprobada — Audit paralelo (Quick Scan)

### Estructura de entrega `docs/`

```
docs/
├── README.md                          ← índice navegable
├── architecture/
│   ├── overview.md
│   ├── layers-and-structure.md
│   ├── orchestrator-and-worker.md
│   ├── llm-stack.md
│   └── data-layer.md
├── Docs-entrega-clienta/             ← INPUT autoritario (gitignored, no tocar)
├── audit/
│   ├── 00-client-spec-extraction.md  ← spec normalizada extraída por Fase 0
│   ├── 00-known-divergences.md       ← gaps preliminares código vs spec
│   ├── 01-structure-findings.md
│   ├── 02-orchestrator-findings.md
│   ├── 03-llm-findings.md
│   ├── 04-data-findings.md
│   ├── gap-analysis-spec-vs-code.md  ← gap analysis final
│   └── findings-summary.md           ← top issues priorizados (Critical/High/Medium/Low)
├── security/
│   ├── secrets-and-env.md
│   ├── auth-and-rls.md
│   └── owasp-quick-check.md
├── dependencies/
│   ├── stack-versions.md
│   ├── outdated.md
│   └── risk-matrix.md
├── timeline/
│   ├── sprints-done.md               ← requiere git clonado
│   └── feature-inventory.md
└── roadmap/
    ├── gaps-and-missing.md            ← placeholder hasta info de cliente
    ├── improvement-backlog.md
    └── future-sprints.md
```

### Plan de agentes (próxima sesión)

> **Fase 0 (PRE-FLIGHT) es BLOQUEANTE**: agentes 1-5 NO arrancan hasta que Fase 0 termine y publique `audit/00-client-spec-extraction.md`. Ese archivo es contexto obligatorio para todos los agentes posteriores.

| # | Fase | Agente | Modelo | Perímetro | Output principal | Estimado |
| - | ---- | ------ | ------ | --------- | ---------------- | -------- |
| **0** | **PRE** | **Client-Spec-Extractor** | **Sonnet** (Opus si DOCX vía pandoc da problemas y hay que razonar mucho) | Leer TODO `docs/Docs-entrega-clienta/`: PDF (Read directo), DOCX (vía pandoc/unzip), PNG (Read multimodal), MD, URL. Extraer: (a) flujo deseado paso a paso, (b) esquema BD Supabase esperado, (c) nomenclatura oficial variables leads, (d) prompt Virginia, (e) menú/navegación, (f) lista de divergencias conocidas (Airtable→Supabase) | `audit/00-client-spec-extraction.md` (spec normalizada, ~3-5 páginas) + `audit/00-known-divergences.md` (lista preliminar de gaps código vs spec) | 45min-1h |
| 1 | Paralelo | Audit-Structure | **Sonnet** | Lee Fase 0. Audita `src/app/`, `src/components/`, `src/lib/` (top-level), imports cruzados, naming, capas. Cruza naming de variables vs spec cliente | `audit/01-structure-findings.md` + `architecture/layers-and-structure.md` | 1h |
| 2 | Paralelo | Audit-Orchestrator | **Sonnet** | Lee Fase 0. Audita `src/lib/core/` (orchestrator, workers, queue, processors, scheduler, sweep-queue, intelligence, multi-agent, compliance, feature-flags) + `worker.js`. Cruza con flujo deseado de spec cliente | `audit/02-orchestrator-findings.md` + `architecture/orchestrator-and-worker.md` | 1h |
| 3 | Paralelo | Audit-LLM | **Sonnet** | Lee Fase 0. Audita `@langchain/*`, `@aws-sdk/client-bedrock*`, `lib/services/ai-*`, `lib/services/fact-extractor`, `lib/services/knowledge-base`, `lib/services/chat-memory`, integración Retell/Ultravox. Cruza prompt código vs `Promt-Virginia.md` | `audit/03-llm-findings.md` + `architecture/llm-stack.md` | 1h |
| 4 | Paralelo | Audit-Data | **Sonnet** | Lee Fase 0. Audita `lib/supabase/`, `supabase/migrations`, `@supabase/ssr`, uso directo `pg`/`postgres`, `middleware.ts`, `lib/auth-config.ts`, RLS, `lib/cache/`. **Cruza esquema actual vs `ARQUITECTURA DE BASE DE DATOS SUPABASE.docx`** y nomenclatura vs `VARIABLES DEFINIDAS`. Busca rastros de Airtable | `audit/04-data-findings.md` + `architecture/data-layer.md` + `security/auth-and-rls.md` | 1h |
| 5 | Paralelo | Audit-Deps+Security | **Sonnet** | `package.json`, `npm outdated`, `npm audit`, grep secrets/credenciales, OWASP top 10, Dockerfile/docker-compose básico. NO depende de Fase 0 pero la lee igualmente | `dependencies/*.md` + `security/secrets-and-env.md` + `security/owasp-quick-check.md` | 45min |
| 6 | Post | Consolidator + Gap Analyst | **Haiku** (Sonnet si gap analysis se complica) | Lee Fase 0 + los 5 reports. Produce: top issues priorizados, **gap analysis spec-cliente vs código**, backlog, índice navegable | `audit/findings-summary.md` + `audit/gap-analysis-spec-vs-code.md` + `roadmap/improvement-backlog.md` + `docs/README.md` + `architecture/overview.md` | 45min |
| 7 | Post | Timeline | **Haiku** | (Cuando git remoto esté clonado) `git log` → tags, releases, features por mes. Cruza con sprints inferidos del código | `timeline/sprints-done.md` + `timeline/feature-inventory.md` | 30min |

**Total**: ~5-6h reales — Fase 0 secuencial (45min-1h) → Fases 1-5 en paralelo (1h) → Fases 6-7 en serie (45min + 30min).

### Por qué Fase 0 es bloqueante

Sin la spec normalizada de la cliente, cada agente auditaría sólo el código en vacío y produciría findings de "el código está mal estructurado" sin saber **contra qué referencia**. Con Fase 0 publicada, cada finding del audit podrá categorizarse como:

- **Divergencia con spec cliente** (Critical por defecto) — código contradice lo pedido.
- **Deuda técnica** (High/Medium) — código mal pero coherente con spec.
- **Mejora opcional** (Low) — código OK pero hay mejor forma.

### Reglas de ejecución

- ❌ Prohibido modificar código fuente (todas las fases).
- ✅ **Quick scan** (esta vuelta): `npm outdated`, `npm ls --depth=0`, `npm audit --json`, `git log`, lectura masiva. NO `npm install`, NO build, NO tests.
- ✅ **Deep audit** (siguiente vuelta): permitido `npm install`, levantar app en local (`npm run dev`), `npm run build`, tests e2e en local (Playwright/Vitest si aplica), análisis de runtime.
- ✅ Cada finding lleva: `archivo:línea`, severidad (Critical/High/Medium/Low), esfuerzo (S/M/L), propuesta de fix textual sin aplicar.
- ✅ Cada agente firma con `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`.
- ✅ Cada agente declara su perímetro al inicio para evitar duplicar trabajo del vecino.

### Autorizaciones de APIs externas

| API                        | Permiso                                | Notas                                                                                |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| Anthropic (Claude)         | ✅ Concedido                           | Inherente a Claude Code                                                              |
| OpenAI                     | ✅ Concedido                           | Para análisis del stack LLM                                                          |
| Google Generative AI       | ✅ Concedido                           | Para análisis del stack LLM                                                          |
| **AWS (Bedrock, S3, ...)** | ⚠️ **REQUIERE AUTORIZACIÓN EXPLÍCITA** | Cualquier agente debe pedir confirmación al usuario antes de invocar APIs AWS        |
| npm registry               | ✅ Concedido                           | `npm audit`, `npm outdated` (sólo metadatos)                                       |
| GitHub (lectura)           | ✅ Concedido                           | `git log`, `gh api` read-only                                                      |

## 5. Acceso a GitHub (paso preparatorio para el usuario)

Repo cliente: `https://github.com/LinkStation/linkstation-dashboard` (usuario tiene acceso como collaborator).

Acción requerida del usuario **antes de la próxima sesión** (opcional pero recomendado):

```powershell
cd e:\ClaudeCode\LinkStation
git clone https://github.com/LinkStation/linkstation-dashboard.git linkstation-git
```

Credenciales: usuario GitHub + Personal Access Token (scope `repo`, read suffices). Generar en <https://github.com/settings/tokens>.

Alternativa: `gh auth login` (HTTPS, paste PAT). Con `gh` autenticado se puede consultar la API sin clonar.

Si no se hace, el agente #7 (Timeline) queda en pending y todo lo demás procede.

## 6. Consideraciones de implementación

### Privacidad / "todo en local"

- Lectura/escritura de archivos: 100% local.
- Análisis LLM: pasa por API Anthropic (cuota de suscripción del usuario). El código va a Anthropic como en cualquier sesión de Claude Code. Usuario ha concedido permiso explícito para usar APIs de LLM (Anthropic, OpenAI, Google).
- **AWS**: el usuario debe autorizar explícitamente cada invocación a AWS (Bedrock, S3, etc.). Agentes deben pedir confirmación antes.
- `npm audit`/`outdated`: consulta a npm registry (sólo metadatos de paquetes).
- Si cliente exige aislamiento total → requiere LLM on-premise (fuera de scope).

### Solapamientos de perímetro

- `intelligence/` (en core) compartido entre #2 Orchestrator y #3 LLM → asignado a #2, referenciado por #3.
- Auth/RLS compartido entre #4 Data y #5 Security → #4 hace la parte funcional, #5 sólo OWASP/secrets.
- `lib/integrations/retell` y `lib/integrations/ultravox` son LLM-voice → asignado a #3.

### Política de modelos aplicada

- Audit con razonamiento sobre arquitectura mainstream (Next/Supabase/BullMQ) = **Sonnet** por defecto.
- Consolidación + redacción de índices + timeline = **Haiku**.
- **Escalado a Opus**: cuando el agente deba ingerir mucho contexto (>200k tokens estimados, archivos grandes cruzados, research multi-fuente) o cuando Sonnet falle. Aplica especialmente a research profundo y planificación.
- **Deep audit posterior**: Opus para concurrencia, seguridad criptográfica, decisiones arquitectónicas con trade-offs no triviales.
- Cuota: respetar 80% threshold con fallback Sonnet→Opus si Sonnet falla, según `CLAUDE.md` global.

## 7. Métricas de éxito (Definition of Done de esta primera vuelta)

- [ ] 5 reports de audit (uno por agente) entregados en `docs/audit/`.
- [ ] 5 docs de arquitectura entregados en `docs/architecture/`.
- [ ] 3 docs de seguridad en `docs/security/`.
- [ ] 3 docs de dependencias en `docs/dependencies/`.
- [ ] `findings-summary.md` con al menos top 30 issues priorizados.
- [ ] `improvement-backlog.md` con propuesta de sprints (no plan detallado).
- [ ] `docs/README.md` como índice navegable.
- [ ] Código fuente intacto (verificable con hash o por inexistencia de modificaciones en `src/`).

## 8. Riesgos identificados y mitigaciones

| # | Riesgo                                                           | Probabilidad | Impacto                                | Mitigación                                                                             |
| - | ---------------------------------------------------------------- | ------------ | -------------------------------------- | --------------------------------------------------------------------------------------- |
| 1 | Git no clonado a tiempo                                          | Media        | Bajo (timeline en pending, no bloquea) | Agente #7 se ejecuta cuando el usuario clone                                            |
| 2 | Falta info de cliente para `gaps-and-missing`                  | Alta         | Medio                                  | Placeholder con preguntas concretas para ella                                           |
| 3 | Solapamiento entre agentes paralelos                             | Media        | Bajo                                   | Perímetros declarados y referencias cruzadas                                           |
| 4 | Findings demasiado verbosos                                      | Media        | Bajo                                   | Plantilla obligatoria de finding (archivo:línea + severidad + esfuerzo + fix sugerido) |
| 5 | `npm audit` revela CVEs urgentes mid-audit                     | Baja         | Alto                                   | Reportar pero NO aplicar fix — entra en backlog                                        |
| 6 | Agente #2 (Orchestrator) excede 1h por densidad de `lib/core/` | Media        | Bajo                                   | Aceptar overrun, prioridad calidad sobre tiempo                                         |

## 9. Lo que NO entra en esta primera vuelta

- Profundidad archivo-por-archivo (entra en **deep audit**, ver §10).
- Análisis de tests (no parece haber tests; confirmar en agente #1).
- Benchmarks de performance reales (load testing, latencias).
- Análisis profundo de Dockerfile / docker-compose / deploy.
- Documentación para cliente externo (audiencia es interna).
- Cambios de código.

## 10. Próximos pasos (en orden)

0. **Git local + branch `auditoria`** ya inicializado en `linkstation-main/.git`. Sin remote (verificable con `git remote -v`). `docs/` y `plans/` gitignored → trabajo del audit nunca subirá a GitHub.
1. **Usuario clona el repo remoto** según §5 (paralelo, no bloqueante) en carpeta hermana `linkstation-git`.
2. **Nueva sesión** (tras `/clear`):
   2.1. Lanzar **Fase 0 (Client-Spec-Extractor)** — bloqueante.
   2.2. Cuando termine, lanzar **Fases 1-5 en paralelo**.
   2.3. Cuando terminen las 5, lanzar **Fase 6 (Consolidator+Gap)**.
   2.4. Lanzar **Fase 7 (Timeline)** si el repo remoto está clonado.
3. Revisión humana del `findings-summary.md` + `gap-analysis-spec-vs-code.md`.
4. **Recordatorio activo**: ejecutar **deep audit** (1-2 semanas, modelo Opus en zonas críticas) tras revisar el quick scan.
5. Completar `roadmap/future-sprints.md` con la cliente (preguntas concretas saldrán del gap analysis).
6. Decidir si invocar `/ck:plan` para convertir el backlog en plan ejecutable con fases.

## 13. Git workflow del audit

- **Repo local independiente**: `git init` ejecutado en `linkstation-main/`. NO conectado al GitHub del cliente (`LinkStation/linkstation-dashboard`).
- **Branch `auditoria`**: rama por defecto donde vive todo el trabajo de auditoría (este `plans/`, futuro `docs/`, configs `.claude/`).
- **`.gitignore` aplicado** (norma global del proyecto):
  - `.claude/` — estado interno de Claude Code, **siempre ignorado**.
  - `docs/` y `plans/` — **SE VERSIONAN** en la rama `auditoria` (decisión del usuario, Opción 1). Quedan fuera del GitHub del cliente porque este repo local NO tiene `origin` configurado.
  - Más: `node_modules/`, `.next/`, `.env*`, build artifacts, IDE configs.
- **Sin remote configurado**: este repo local NUNCA se conecta al GitHub del cliente (`LinkStation/linkstation-dashboard`). Si en el futuro se quisiera entregar parte del trabajo, se hace export manual selectivo o se configura un remote propio del programador distinto al del cliente.

### Garantía operativa (cómo NO contaminar el repo del cliente)

1. **NUNCA ejecutar** `git remote add origin <url-cliente>` en `linkstation-main/`.
2. Si se necesita un remote para backup del audit, usar un repo PRIVADO propio del programador (no del cliente).
3. Antes de cualquier `git push`, verificar con `git remote -v` que el destino NO sea el repo del cliente.
4. La rama `auditoria` es el contenedor único de todo el trabajo de auditoría.

## 11. Pendientes para deep audit (recordatorio explícito)

> ⚠️ **El usuario solicitó recordatorio activo**: tras completar el quick scan, ejecutar una **auditoría profunda** archivo-por-archivo en módulos críticos identificados por el quick scan. Modelo: **Sonnet con escalado selectivo a Opus** sólo en concurrencia, seguridad criptográfica, decisiones arquitectónicas con trade-offs no triviales.

Áreas candidatas a deep audit (a confirmar tras quick scan):

- `lib/core/orchestrator.ts` + `lib/core/workers/` + `lib/core/queue/` (concurrencia, race conditions, idempotencia)
- `lib/core/multi-agent.ts` + `lib/core/intelligence/` (lógica de agentes, prompts, costes)
- `lib/supabase/` + uso paralelo de `pg`/`postgres` (riesgo de bypass de RLS)
- `middleware.ts` + `lib/auth-config.ts` (cadena de auth completa)
- `lib/integrations/retell.ts` + `lib/integrations/ultravox.ts` (latencia <800ms prometida, manejo de errores)
- `lib/services/ai-rescue.ts` (¿qué rescata? ¿de qué? ¿es producción-grade?)

## 12. Dependencias externas para el audit

- Cuota de API Anthropic (suscripción del usuario).
- Conexión a internet (para Claude API + `npm audit` + `git clone`).
- (Opcional) GitHub PAT del usuario para clonar.

---

**Status**: APPROVED — listo para ejecutar plan de agentes en próxima sesión.
**Aprobado por**: Usuario (<admin@2you.ai>), 2026-05-18.
**Brainstormer**: Claude Opus 4.7 (sesión actual).
