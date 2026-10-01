# linkstation · Staging

> **Versión:** {{PROJECT_VERSION}} &nbsp;·&nbsp; **Actualizado:** {{LAST_UPDATED}}

AI CRM + Workflow Orchestrator multi-tenant para academias formativas. Esta rama (`staging`) contiene el código listo para QA y pruebas de aceptación previas al release en producción.

---

## Stack tecnológico

| Capa                         | Tecnología                                      |
| ---------------------------- | ----------------------------------------------- |
| Frontend / SSR               | Next.js 16 + React 19 + Tailwind CSS            |
| Base de datos                | PostgreSQL vía Supabase self-hosted (Easypanel) |
| Autenticación + multi-tenant | `@supabase/ssr` + RLS por tenant                |
| Validaciones                 | Zod + Repository pattern                        |
| Colas / workers              | BullMQ + Redis                                  |
| IA conversacional            | LangChain (Anthropic + OpenAI + Google Genai)   |
| Voz                          | Retell + Ultravox                               |
| CRMs MVP                     | HubSpot + Zoho CRM                              |

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

{{ROADMAP_BY_PHASE_AND_SPRINT}}

---

## Versión actual

**{{PROJECT_VERSION}}** — Staging. Ver tabla de estado para progreso por fase.

---

## Licencia

MIT
