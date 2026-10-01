---
title: Stack tecnológico — Actual vs Objetivo
date: 2026-05-19
status: LIVING_DOCUMENT
audience: cliente Esden + equipo técnico
auditor: Javier HP
sources: package.json v0.1.0 + DECISIONES-AUDITOR-JAVIER-HP.md (9 R-### tomadas)
type: stack-overview
---

# Stack tecnológico — `linkstation`

> **Documento de doble lectura.** Las tablas marcadas como **ACTUAL** reflejan lo que existe hoy en el repositorio (extraído de `package.json` y código). Las marcadas como **OBJETIVO** reflejan decisiones cerradas del Auditor que el equipo de desarrollo debe implementar en Sprint 0 → Sprint 3.
>
> 📄 **Versión PDF descargable:** [STACK-TECNOLOGICO.pdf](STACK-TECNOLOGICO.pdf) (regenerada automáticamente en cada build).

---

## 1. Stack ACTUAL

### 1.1 — Frontend

| Capa               | Tecnología                                        | Versión       |
| ------------------ | ------------------------------------------------- | ------------- |
| Framework          | **Next.js** (App Router)                          | 16.1.6        |
| Runtime UI         | **React**                                         | 19.2.3        |
| Lenguaje           | **TypeScript**                                    | ^5            |
| Estilos            | **Tailwind CSS** (v4 nuevo motor) + PostCSS       | 4.x           |
| Componentes        | **shadcn/ui** + **Radix UI**                      | 3.8.5 / 1.4.3 |
| Estado cliente     | **Zustand**                                       | 5.0.11        |
| Animación          | **Framer Motion**                                 | 12.38.0       |
| Drag & drop        | **@dnd-kit** (core + sortable + modifiers)        | 6 / 9 / 10    |
| Flow editor        | **@xyflow/react** (workflow builder)              | 12.10.2       |
| Forms / Validación | **Zod**                                           | 4.3.6         |
| Charts             | **Recharts**                                      | 3.7.0         |
| Markdown           | **react-markdown** + remark-gfm                   | 10 / 4        |
| Iconos             | **lucide-react**                                  | 0.575.0       |
| Diagrams           | **Mermaid**                                       | 11.15         |
| Linting / Format   | **ESLint 9** + **Prettier 3.8** + plugin Tailwind | —             |

### 1.2 — Backend / Data

| Capa                | Tecnología                                      | Versión      |
| ------------------- | ----------------------------------------------- | ------------ |
| Runtime             | **Node.js** + Next.js API routes                | —            |
| BaaS                | **Supabase** (SSR + JS SDK) — **managed cloud** | 0.8 / 2.97   |
| Postgres driver     | `pg` + `postgres` — **raw SQL, sin ORM**        | 8.20 / 3.4.9 |
| Cola de trabajos    | **BullMQ**                                      | 5.73         |
| Cache / Queue store | **ioredis** + **redis**                         | 5.10 / 5.11  |
| Object storage      | **AWS S3** (presigned URLs)                     | 3.1031       |
| Auth                | Supabase Auth (GoTrue)                          | —            |

### 1.3 — IA y voz

| Capa                       | Tecnología                                              | Versión                   |
| -------------------------- | ------------------------------------------------------- | ------------------------- |
| Orquestación LLM           | **LangChain** (v1)                                      | 1.2.39                    |
| Provider — OpenAI          | `@langchain/openai`                                     | 1.4                       |
| Provider — Anthropic       | `@langchain/anthropic`                                  | 1.3                       |
| Provider — Google          | `@langchain/google-genai`                               | 2.1                       |
| ~~Provider — AWS Bedrock~~ | ~~`@aws-sdk/client-bedrock-runtime` + `agent-runtime`~~ | ~~Descartado 26-05-2026~~ |
| Voz outbound               | **Retell SDK**                                          | 5.12                      |
| Voz outbound (alt)         | **Ultravox** _(implementación parcial)_                 | —                         |

### 1.4 — Utilidades de dominio

| Capa                   | Tecnología                                    | Versión   |
| ---------------------- | --------------------------------------------- | --------- |
| Teléfonos E.164        | **libphonenumber-js**                         | 1.12      |
| Timezones              | **date-fns-tz** + **countries-and-timezones** | 3.2 / 3.9 |
| Fechas                 | **date-fns**                                  | 4.1       |
| Google APIs (Calendar) | **googleapis**                                | 171       |
| PDF parsing            | **pdf-parse**                                 | 2.4       |

### 1.5 — Despliegue actual

- **Repositorio:** GitHub `LinkStation/linkstation-dashboard` · branch `auditoria`
- **Hosting Supabase:** managed cloud · pila detrás con **Kong 2.8.1 EOL** + GoTrue/Postgres con 2-3 años de retraso (ver [R-023.c](DECISIONES-AUDITOR-JAVIER-HP.md#r-023c-versiones-de-supabase-postgres-gotrue-respondida-investigacion-del-auditor))
- **Frontend hosting:** Vercel-ready (Dockerfile + docker-compose presentes)

---

## 2. Stack OBJETIVO

### 2.1 — Cambios estructurales

| #   | Cambio                        | Decisión                                                                                                                             | Estado                                                                                                                                                                                                                                                  |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Capa de datos (SIN ORM nuevo) | Mantener `@supabase/ssr` + `@supabase/supabase-js` + **Zod** (validaciones runtime + tipos) + **Repository pattern** + RLS hardening | ✅ Decidido (anula la propuesta inicial de Drizzle — ver [STACK-DECISION-DRIZZLE-MIGRATION.md SUPERSEDED](STACK-DECISION-DRIZZLE-MIGRATION.md) + decisión vigente en `plans/20260519-1200-rls-multitenant-hardening/research/stack-decision-no-orm.md`) |
| 2   | Hosting Supabase              | Cloud managed → **Supabase self-hosted en Easypanel** (control total, ahorro coste, versiones actualizadas)                          | ✅ R-023                                                                                                                                                                                                                                                |
| 3   | Upgrade pila Supabase         | Kong 2.8.1 EOL + GoTrue/Postgres antiguos → versiones actuales                                                                       | ✅ R-023.c                                                                                                                                                                                                                                              |

### 2.2 — Capas nuevas a construir

| Capa                                                   | Propósito                                                                                                                                                                                                              | Origen                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Router de variables `crm-mapper`                       | Mapping nomenclatura interna fija ↔ nomenclatura de cada CRM externo. Tabla `crm_field_mapping`.                                                                                                                       | P-008/9/10/11 + R-020          |
| 5 conectores CRM + Sheets (post-release) — MVP: 2 CRMs | **HubSpot** (OAuth2), **Zoho CRM**, **Salesforce** (OAuth2), **GoHighLevel** (OAuth2 v2), **ActiveCampaign**. **MVP Fase 2**: HubSpot + Zoho. **Fase 4 (post-release)**: Google Sheets bidireccional + resto del top 5 | ✅ R-020 + R-020-refinement-v2 |
| CRM write-policy engine                                | Política por campo: `append_only` / `overwrite` / `overwrite_with_audit` + tabla `crm_write_audit`                                                                                                                     | ✅ R-014                       |
| Voice provider abstraction                             | Interfaz común `VoiceProvider` (Retell + **Ultravox equiparado**) + flag por tenant                                                                                                                                    | ✅ R-016                       |
| Timezone-aware scheduler                               | Detección huso por país/teléfono (E.164) + reglas 09-21h hora lead + cadencia 24h+3h × 3 días                                                                                                                          | ✅ R-013                       |
| Holiday service                                        | **Nager.Date** (gratis) o **Calendarific** (premium autonómicos) + cache local en `holidays_per_country`                                                                                                               | ✅ R-013                       |
| Qualification rules engine                             | Tabla `qualification_rules_per_course` (Reglas A/B/C + umbrales + `profession_policy` include/exclude/open) editable desde panel admin                                                                                 | ✅ R-004/5/6                   |
| State machine de lead                                  | Estados oficializados: `prematriculado`, `informado`, `matriculado` (+ resto) con triggers definidos                                                                                                                   | R-007 (P-015 pend.)            |
| Migración Airtable → Supabase                          | Importar histórico de leads de Airtable al nuevo sistema                                                                                                                                                               | ✅ R-021                       |
| Panel admin "Variables & CRM Mapping"                  | UI para visualizar/editar mapeo + write-policy + reglas de cualificación                                                                                                                                               | ✅ R-014 + P-008/11            |
| Cron recordatorios cita                                | 24h / 4h / 1h con plantillas configurables + deep-link reagendar/cancelar                                                                                                                                              | ✅ R-013                       |

### 2.3 — Hardening obligatorio Sprint 0

| Acción                            | Origen                                             |
| --------------------------------- | -------------------------------------------------- |
| Rotación credenciales hardcoded   | JWT service_role + anon en 9 puntos · F-05-SEC-001 |
| Fix bug Worker                    | `worker.js:58` · cadencia día 2-3 rota · F-02-001  |
| Auth en 7 API routes orquestación | DA-2-001                                           |
| Verificación rol admin            | `createTenant` / `deleteTenant` · DA-2-004         |
| Pausa captación nuevos clientes   | 6-8 semanas · ✅ R-025                             |

### 2.4 — Equipo y método

| Acción                                       | Decisión                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Continuidad equipo + 3 condiciones de método | Tests obligatorios por finding · revisión externa pre-merge · comandos `grep` verificables · ✅ R-024 |

---

## 3. Preguntas pendientes que afectan al stack

| ID        | Pregunta                                                                     | Bloque   |
| --------- | ---------------------------------------------------------------------------- | -------- |
| **P-015** | Estados "informado" y "matriculado": ¿auto detectados o manuales por asesor? | Bloque 4 |
| **P-017** | Typo `book_appointmen` en doc fuente Virginia: ¿corregir y notificar?        | Bloque 5 |
| **P-018** | Prompt Virginia 945 líneas: ¿propuesta de optimización (-40 a -60% tokens)?  | Bloque 5 |
| **P-019** | Fase de pruebas con 20-50 leads reales antes de escalar a volumen            | Bloque 5 |

---

**Status:** LIVING_DOCUMENT — se actualiza en cada decisión nueva del Auditor.
**Última actualización:** 2026-05-19.
**Documentos relacionados:** [RESPUESTAS-CLIENTA-JAVIER-HP.md](RESPUESTAS-CLIENTA-JAVIER-HP.md) · [DECISIONES-AUDITOR-JAVIER-HP.md](DECISIONES-AUDITOR-JAVIER-HP.md) · [PREGUNTAS-PARA-LA-CLIENTE.md](PREGUNTAS-PARA-LA-CLIENTE.md)
