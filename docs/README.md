---
title: "Documentacion - Dashboard Esden (Auditoria 2026-05-18)"
date: 2026-05-18
status: final
---

# Dashboard Esden - Indice de Documentacion

Indice navegable de toda la documentacion generada durante la auditoria tecnica
del proyecto linkstation (AI CRM + Workflow Orchestrator para LinkStation).

**Proyecto**: Next.js 16 + React 19 + Supabase + BullMQ + LangChain
**Fecha de auditoria**: 2026-05-18
**Rama**: auditoria
**Carpeta local**: `e:\ClaudeCode\linkstation-dashboard\linkstation-dashboard` (renombrada desde `e:\ClaudeCode\LinkStation\linkstation-main` el 2026-05-20 — ver `docs/rename-guide.md`)

---

## Entry Points Recomendados

1. **Si eres nuevo en el proyecto**: empieza por
   `docs/architecture/overview.md` para entender el sistema de alto nivel,
   luego `docs/audit/00-client-spec-extraction.md` para entender los requisitos.

2. **Si necesitas priorizar trabajo**: lee
   `docs/audit/findings-summary.md` (65 findings priorizados) y
   `docs/roadmap/improvement-backlog.md` (75 items organizados en sprints).

3. **Si hay una discrepancia con la spec**: consulta
   `docs/audit/gap-analysis-spec-vs-code.md` y
   `docs/audit/00-known-divergences.md`.

4. **Si hay un incidente de seguridad**: ve directamente a
   `docs/security/secrets-and-env.md` y
   `docs/security/auth-and-rls.md`.

---

## Spec Cliente (Autoritaria - No Modificar)

Estos archivos contienen los requisitos originales de la cliente. Son la fuente de verdad.
No modificar sin confirmacion de la cliente.

| Archivo | Descripcion |
|---------|-------------|
| `docs/audit/00-client-spec-extraction.md` | Spec normalizada extraida de los documentos entregados. Fuente autoritaria TOP. |
| `docs/audit/00-known-divergences.md` | Divergencias detectadas solo leyendo la spec (antes de auditar codigo). Input para auditores. |

---

## Indice Completo

### docs/audit/

| Archivo | Descripcion | Fase |
|---------|-------------|------|
| `00-client-spec-extraction.md` | Spec normalizada de la cliente - AUTORITARIA | 0 |
| `00-known-divergences.md` | Divergencias preliminares spec vs spec (sin codigo) | 0 |
| `01-structure-findings.md` | Auditoria de estructura del proyecto (15 findings) | 1 |
| `02-orchestrator-findings.md` | Auditoria de orquestador y worker BullMQ (18 findings) | 2 |
| `03-llm-findings.md` | Auditoria del stack LLM (12 findings) | 3 |
| `04-data-findings.md` | Auditoria de capa de datos y RLS (13 findings) | 4 |
| `findings-summary.md` | Consolidado final priorizado (65 findings) | 6 |
| `gap-analysis-spec-vs-code.md` | Analisis de gaps spec cliente vs implementacion | 6 |

### docs/architecture/

| Archivo | Descripcion |
|---------|-------------|
| `overview.md` | Vista de pajaro de la arquitectura global |
| `layers-and-structure.md` | Capas y estructura del proyecto en detalle |
| `orchestrator-and-worker.md` | Orquestador, BullMQ, secuencias de leads |
| `llm-stack.md` | Stack LLM: providers, flujos de IA, prompts, RAG |
| `data-layer.md` | Capa de datos: schema BD, clientes Supabase, RLS |

### docs/security/

| Archivo | Descripcion |
|---------|-------------|
| `secrets-and-env.md` | Secretos hardcodeados y gestion de env vars |
| `owasp-quick-check.md` | OWASP Top 10 2021 - analisis rapido |
| `auth-and-rls.md` | Cadena de autenticacion y estado de RLS por tabla |

### docs/dependencies/

| Archivo | Descripcion |
|---------|-------------|
| `stack-versions.md` | Snapshot de versiones de todas las dependencias |
| `outdated.md` | Dependencias desactualizadas con analisis de impacto |
| `risk-matrix.md` | Matriz de riesgo CVE con recomendaciones de actualizacion |

### docs/roadmap/

| Archivo | Descripcion |
|---------|-------------|
| `improvement-backlog.md` | 75 items de mejora organizados en 5 sprints |

### docs/timeline/

Contiene el historial cronologico de la auditoria (si existe).

### docs/journals/

Notas de sesion generadas durante el proceso de auditoria.

---

## Estructura del arbol docs/

```
docs/
+-- README.md                          (este archivo - indice navegable)
+-- audit/
|   +-- 00-client-spec-extraction.md  (spec cliente - AUTORITARIA)
|   +-- 00-known-divergences.md       (divergencias preliminares)
|   +-- 01-structure-findings.md      (fase 1 - estructura)
|   +-- 02-orchestrator-findings.md   (fase 2 - orquestador)
|   +-- 03-llm-findings.md            (fase 3 - LLM)
|   +-- 04-data-findings.md           (fase 4 - datos)
|   +-- findings-summary.md           (fase 6 - consolidado)
|   +-- gap-analysis-spec-vs-code.md  (fase 6 - gaps)
+-- architecture/
|   +-- overview.md                   (vista de pajaro)
|   +-- layers-and-structure.md       (capas detalladas)
|   +-- orchestrator-and-worker.md    (orquestador y BullMQ)
|   +-- llm-stack.md                  (stack LLM)
|   +-- data-layer.md                 (capa de datos)
+-- security/
|   +-- secrets-and-env.md            (secretos y env vars)
|   +-- owasp-quick-check.md          (OWASP Top 10)
|   +-- auth-and-rls.md               (auth y RLS)
+-- dependencies/
|   +-- stack-versions.md             (versiones actuales)
|   +-- outdated.md                   (dependencias desactualizadas)
|   +-- risk-matrix.md                (matriz CVE)
+-- roadmap/
|   +-- improvement-backlog.md        (backlog de mejoras)
+-- timeline/                         (historial de auditoria)
+-- journals/                         (notas de sesion)
```

---

**Status:** DONE
**Summary:** Indice navegable completo de la documentacion de auditoria linkstation.
