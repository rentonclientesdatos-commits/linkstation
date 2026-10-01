# linkstation

> **Versión:** {{PROJECT_VERSION}} &nbsp;·&nbsp; **Actualizado:** {{LAST_UPDATED}}

AI CRM + Workflow Orchestrator multi-tenant para academias y centros de formación. Automatiza la captación, cualificación y conversión de leads mediante agentes de IA (voz + chat), integración con HubSpot y Zoho CRM, y paneles de gestión por tenant.

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

{{ROADMAP_BY_SPRINT}}

---

## Versión actual

**{{PROJECT_VERSION}}**

---

## Licencia

MIT
