# LinkStation · Staging

> **Versión:** v0.8.0 &nbsp;·&nbsp; **Actualizado:** 2026-06-13 14:30 UTC

AI CRM + Workflow Orchestrator SaaS multi-tenant. Esta rama (`staging`) contiene el código listo para QA y pruebas de aceptación previas al release en producción.

---

## Stack tecnológico

| Capa                         | Tecnología                                    |
| ---------------------------- | --------------------------------------------- |
| Frontend / SSR               | Next.js 16 + React 19 + Tailwind CSS          |
| Base de datos                | PostgreSQL vía Supabase self-hosted (Dokploy) |
| Autenticación + multi-tenant | `@supabase/ssr` + RLS por tenant              |
| Validaciones                 | Zod + Repository pattern                      |
| Colas / workers              | BullMQ + Redis                                |
| IA conversacional            | LangChain (Anthropic + OpenAI + Google Genai) |
| Voz                          | Retell + Ultravox                             |
| CRMs MVP                     | HubSpot + Zoho CRM                            |

---

## Quick Start (staging)

```bash
# 1. Clonar y cambiar a staging
git clone <repo-url> linkstation
cd linkstation
git checkout staging

# 2. Variables de entorno (staging)
cp .env.example .env.local
# Usar credenciales de staging (no producción)

# 3. Instalar y arrancar
npm install
npm run dev
```

> Requisitos: Node.js 22.x LTS · npm 10.x

---

## Estructura del proyecto (resumida)

```
linkstation/
├── src/                    # Código fuente (Next.js App Router)
│   ├── app/                # Rutas y API routes
│   ├── lib/                # Lógica de negocio, repositories, schemas Zod
│   └── components/         # Componentes React reutilizables
├── supabase/               # Migraciones SQL y seeds
│   └── migrations/
├── public/                 # Assets estáticos
├── .env.example            # Template de variables de entorno
└── package.json
```

---

## Estado del proyecto

> Actualizado: 2026-06-13 14:30 UTC

| Sprint | Fase | Versión | Estado | % Completado | Est. total | Inicio | Fin Est. |
|--------|------|---------|--------|-------------|-----------|--------|---------|
| SP-1 | Hotfixes de seguridad | v0.1.0 | 🟡 En Desarrollo (25/26 dev a 🔵 · 2 diferidas pre-deploy · … _ver nota↓_ | 0% | ~107h 30min (11 días lab × 10h) | Jue 21-05-2026 09:00 | Jue 04-06-2026 19:00 |
| SP-2 | Capa de datos (sin ORM nuevo) | v0.2.0 | 🟢 Completada (merged a developer vía PR #5, commit 94c035a) | 0% | ~205h estim (con paralelismo 2-3 devs ~3-4 sem) · ⏱ Real: ~12h (orquestación 1 sesión) | Vie 22-05-2026 19:00 (adelantado vs estim Vie 05-06) | Mar 30-06-2026 19:00 |
| SP-3 | Adapter layer + 2 CRMs (MVP) | v0.2.7 (final con hotfix BUG-2-01 — bumpeada desde v0.2.5) | 🟢 COMPLETADA (mergeado a developer 24-05-2026 19:55) | 0% | **74h** secuencial · ~**52h** con paralelismo Phase 02‖03‖04 (refinada tras research) | 24-05-2026 14:00 | 27-05-2026 (5-6 días lab con paralelismo) |
| SP-4 | Hardening | v0.3.0 (MVP completo, post-hardening) | 🔘 Pendiente | 100% | 2-3 sem (80h–120h) | Vie 29-05-2026 09:00 | Vie 12-06-2026 19:00 |
| SP-5 | Google Sheets bidireccional | v0.5.0 | 🟡 SPIKE En Desarrollo (28-05-2026 — 5/6 subtareas dev cubiertas, Sub 8 pendiente) | 0% | 60-100h | Mar 11-08-2026 09:00 | Vie 21-08-2026 19:00 |
| SP-5Z (Zoho; SP-5 es legacy de Sprint 4 Sheets) | Zoho CRM como entrada de leads (bidireccional) | v0.5.0 | 🟡 **Mergeado a developer** (PR #25, 3a9dee5) · deploy a staging/main diferido · sin tag v0.5.0 | 83% | 13-18h realista + 5h 30min cierre | 08-06-2026 | — |
| SP-6 (Llamadas de Voz) | Llamadas de Voz 🆕 (v0.6.0) | v0.6.0 | 🔘 Pendiente | 0% | 8-14h + cierre (realista) | — | — |
| SP-7 (Refinamiento) | Refinamiento Herramientas Internas (Renzo) | v0.7.0 | 🔘 Pendiente | 0% | 18-22h + cierre (sin Fase 03, ya cerrada como SP-7-DEPS) | — | — |
| SP-8 | Centro de costes LLM con LiteLLM + Langfuse | v0.8.0 | 🔵 Subida rama pendiente (implementación completada 13-06-2026) | 0% | 24-36h nominal · 11-19h realista + 3-5h cierre = **14-24h realista** | 13-06-2026 (post-Sprint 7 completado) | 13-06-2026 |
| SP-9 | Salesforce adapter | v0.9.0 | 🔘 Pendiente | 0% | 60-100h | Post-Sprint 8 Costes-LLM (+4 días respecto plan original — des … _ver nota↓_ | — |
| SP-10 | GoHighLevel adapter | v0.10.0 | 🔘 Pendiente | 0% | 40-80h | Post-Sprint 9 Salesforce (+4 días respecto plan orig.) | — |
| SP-11 | ActiveCampaign adapter | v0.11.0 | 🔘 Pendiente | 0% | 20-50h | Post-Sprint 10 GoHighLevel (+4 días respecto plan orig.) | — |
| SP-12 | Adapter pattern generalization | v0.12.0 | 🔘 Pendiente (bloqueado hasta SP-9..SP-11 completos) | 0% | 20-40h | Post-Sprint 11 ActiveCampaign (+4 días respecto orig.) | — |
| SP-13 | Tier 2 on-demand (backlog) | v0.13.x+ (incremental por CRM) | 🔘 Backlog (on-demand) | 0% | ~30-50h por CRM (sólo bajo pedido) | TBD (on-demand) | TBD (on-demand) |
| SP-14 | WhatsApp Tech Provider Migration (Meta) | v0.14.0 | 🔘 Pendiente | 0% | ~48-72h | TBD (post-MVP, tras alta Tech Provider de la clienta en Meta) | TBD |


---

## Versión actual

**v0.8.0** — Staging. Ver tabla de estado para progreso por fase.

---

## Licencia

MIT
