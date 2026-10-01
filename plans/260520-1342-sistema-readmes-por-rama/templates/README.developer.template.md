# linkstation

> **Versión:** {{PROJECT_VERSION}} &nbsp;·&nbsp; **Actualizado:** {{LAST_UPDATED}}

AI CRM + Workflow Orchestrator multi-tenant para academias formativas. Sistema que orquesta flujos de captación, cualificación y conversión de leads mediante agentes de IA conversacional (voz + chat), sincronización bidireccional con CRMs (HubSpot, Zoho) y paneles de gestión por tenant.

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

## Quick Start (desarrollo local)

```bash
# 1. Clonar y entrar al proyecto
git clone <repo-url> linkstation
cd linkstation
git checkout developer

# 2. Variables de entorno
cp .env.example .env.local
# Edita .env.local con valores reales (pedir al lead por canal seguro)

# 3. Instalar dependencias
npm install

# 4. Arrancar servidor de desarrollo
npm run dev
```

> Requisitos: Node.js 22.x LTS · npm 10.x · Git 2.40+ · Docker Desktop (PostgreSQL local)
>
> Lee [`docs/dev-onboarding.md`](docs/dev-onboarding.md) para setup completo, acceso a secretos y flujo de ramas.

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
├── scripts/                # Scripts de utilidad (promote, generate-readmes)
│   └── readme-templates/   # Plantillas para los 3 README.md por rama
├── public/                 # Assets estáticos
├── .env.example            # Template de variables de entorno
└── package.json
```

---

## RoadMap

{{ROADMAP_FULL}}

---

## Versión actual

**{{PROJECT_VERSION}}** — En desarrollo. Ver RoadMap para estado de cada sprint.

---

## Contribuir

Lee [`docs/dev-onboarding.md`](docs/dev-onboarding.md) antes de empezar.

Flujo de trabajo:

1. Crea rama `feature/<descripcion>` desde `developer`
2. Trabaja localmente, mantén el RoadMap actualizado (`plans/RoadMap.md`)
3. Abre PR a `developer` (nunca directamente a `staging` o `main`)
4. Después del merge, el agente `roadmap-keeper` actualiza estados y READMEs automáticamente

Convenciones: commits en formato convencional (`feat:`, `fix:`, `chore:`). Sin referencias a IA en mensajes de commit.

---

## Licencia

MIT
