# LinkStation

> **Versión:** v0.8.0 &nbsp;·&nbsp; **Actualizado:** 2026-06-13 14:30 UTC

AI CRM + Workflow Orchestrator SaaS multi-tenant. Plataforma integral de gestión de llamadas IA, agendamiento y contactabilidad para cualquier tipo de negocio.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend / SSR | Next.js 16 + React 19 + Tailwind CSS |
| Base de datos | PostgreSQL vía Supabase self-hosted |
| Autenticación + multi-tenant | Supabase Auth + RLS |
| Colas / workers | BullMQ + Redis |
| IA conversacional | LangChain multi-LLM |
| Voz | Retell + Ultravox |
| CRMs | HubSpot + Zoho CRM |

---

## Quick Start

```bash
# 1. Clonar
git clone <repo-url> linkstation
cd linkstation

# 2. Variables de entorno
cp .env.example .env.local
# Configurar con credenciales de producción

# 3. Instalar y arrancar
npm install
npm run dev
```

> Requisitos: Node.js 22.x LTS · npm 10.x

---

## Releases

| Sprint | Versión | Estado | Release date |
|--------|---------|--------|-------------|
| SP-1 | v0.1.0 | 🟡 En Desarrollo (25/26 dev a 🔵 · 2 diferidas pre-deploy · … _ver nota↓_ | — |
| SP-2 | v0.2.0 | 🟢 Completada (merged a developer vía PR #5, commit 94c035a) | Vie 22-05-2026 23:41 (merge PR #5) |
| SP-3 | v0.2.7 (final con hotfix BUG-2-01 — bumpeada desde v0.2.5) | 🟢 COMPLETADA (mergeado a developer 24-05-2026 19:55) | 24-05-2026 19:55 |
| SP-4 | v0.3.0 (MVP completo, post-hardening) | 🔘 Pendiente | — |
| SP-5 | v0.5.0 | 🟡 SPIKE En Desarrollo (28-05-2026 — 5/6 subtareas dev cubiertas, Sub 8 pendiente) | — |
| SP-5Z (Zoho; SP-5 es legacy de Sprint 4 Sheets) | v0.5.0 | 🟡 **Mergeado a developer** (PR #25, 3a9dee5) · deploy a staging/main diferido · sin tag v0.5.0 | Desarrollo: 08-06-2026 (merge developer PR #25) · cierre formal pendiente |
| SP-6 (Llamadas de Voz) | v0.6.0 | 🔘 Pendiente | — |
| SP-7 (Refinamiento) | v0.7.0 | 🔘 Pendiente | — |
| SP-8 | v0.8.0 | 🔵 Subida rama pendiente (implementación completada 13-06-2026) | 13-06-2026 (rama subida, PR sin merge) |
| SP-9 | v0.9.0 | 🔘 Pendiente | — |
| SP-10 | v0.10.0 | 🔘 Pendiente | — |
| SP-11 | v0.11.0 | 🔘 Pendiente | — |
| SP-12 | v0.12.0 | 🔘 Pendiente (bloqueado hasta SP-9..SP-11 completos) | — |
| SP-13 | v0.13.x+ (incremental por CRM) | 🔘 Backlog (on-demand) | — |
| SP-14 | v0.14.0 | 🔘 Pendiente | — |

> "Release date" se rellena cuando el sprint pasa a 🟢 COMPLETADA (`Fin Real` del RoadMap).

---

## Versión actual

**v0.8.0**

---

## Licencia

MIT
