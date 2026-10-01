---
date: 2026-05-18 14:30
type: brainstorm
project: linkstation-dashboard  # (renombrado desde `linkstation-main` el 2026-05-20)
tags: [audit, architecture, documentation, orchestration, multi-agent, supabase, llm]
severity: -
status: approved
---

# Brainstorm: Audit & Documentation Strategy — linkstation v5.0

## Contexto

Sesión de brainstorm pura (sin código) para diseñar estrategia de auditoría y documentación del CRM + Workflow Orchestrator. Proyecto: Next.js 16 + React 19 + Supabase + BullMQ + LangChain multi-LLM + Retell/Ultravox + AWS Bedrock. 420+ commits, arquitectura compleja con orquestación multi-agente y coexistencia Supabase+Postgres. Audiencia: desarrolladores internos.

## Decisiones Clave

- **Enfoque arquitectónico aprobado**: 7 agentes en paralelo (5 Sonnet + 2 Haiku). Estructura: Agent Sonnet (proyecto), Orchestrator Sonnet (flujos), LLM Sonnet (integraciones), Data Sonnet (BD), Deps+Security Sonnet (stack) + Consolidator Haiku + Timeline Haiku.
- **Scope**: Quick scan inicial (NO build/tests/npm install), después deep audit archivo-por-archivo con Opus selectivo en zonas críticas (orchestrator, multi-agent, auth, Retell/Ultravox <800ms latencia).
- **Permisos LLM**: APIs Anthropic/OpenAI/Google autorizadas; AWS Bedrock requiere okayed explícito por invocación.
- **Modelos**: Sonnet default, Haiku consolidación/docs, Opus research+crítico.
- **Output**: Docs multi-documento en `docs/` (README, architecture, components, workflows, security, dependencies, performance).

## Setup Técnico Ejecutado

- Git init rama `auditoria` desde zip snapshot (commit fe38b0b).
- `.gitignore` ampliado: excluye `.claude/`, `docs/`, `plans/` del remoto cliente.
- Sin remoto configurado aún.
- Usuario: collaborator en `LinkStation/linkstation-dashboard`, cuenta `LinkStation`, instrucciones PAT pasadas en reporte.

## Trade-off Documentado

Con `docs/` y `plans/` en `.gitignore`, audit work NO se versiona en remoto. **Recomendación**: quitar del gitignore, NUNCA push rama `auditoria` al cliente. **Decisión usuario: pendiente**. Mitigación: entrega final vía carpeta comprimida o reportes fuera del repo.

## Pendientes

- Ejecutar deep audit post-aprobación brainstorm.
- Validar coexistencia Supabase+Postgres (DB splits, transaction atomicity).
- Audit Retell/Ultravox latencia en contexto real (target <800ms).
- Revisar auth (JWT, session, OAuth flows).
- Inventariar AWS Bedrock calls (costo, throttling, fallback).
- Testear multi-LLM fallback chain (Anthropic → OpenAI → Google).
- Verificar BullMQ job persistence y retry strategy.

## Próximo Paso

Ejecutar quick scan con 5 Sonnet en paralelo (Structure, Orchestrator, LLM, Data, Deps) y consolidar findings en `plans/20260518-brainstorm-audit-and-documentation/` antes de deep audit.
