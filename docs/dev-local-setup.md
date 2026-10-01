---
title: "Setup Local — linkstation"
audience: dev team
status: vigente
date: 2026-05-21
---

# Setup Local con Supabase self-hosted

Levanta el dashboard en local con Supabase self-hosted (Docker) + Redis + datos demo. Sin tocar el Supabase del cliente.

## 1. Requisitos previos

- **Node.js** v22.x o superior
- **npm** 10.x
- **Docker Desktop** corriendo
- ~3 GB libres en disco (imagenes Supabase)
- Puertos libres del rango **8050-8500** (todo el proyecto vive en ese rango):
  - `8100` Supabase API + Storage S3
  - `8200` Supabase Postgres
  - `8290` shadow DB
  - `8295` DB pooler
  - `8300` Supabase Studio
  - `8350` Analytics (logflare)
  - `8400` Mailpit (inbucket / mail server local)
  - `8500` Next.js dev server (puerto fijo del proyecto)
  - `6379` Redis (BullMQ)

## 2. Primer arranque

```powershell
# 1. Instalar dependencias
npm install

# 2. Levantar Supabase self-hosted (descarga ~1.5 GB la primera vez, ~5 min)
npm run db:up

# 3. Levantar Redis (BullMQ)
npm run redis:up

# 4. Ver los keys generados para .env.local
npm run db:status
```

`db:status` imprime algo como:

```
API URL:        http://localhost:54321
DB URL:         postgresql://postgres:postgres@localhost:54322/postgres
Studio URL:     http://localhost:54323
anon key:       eyJ... (copialo)
service_role key: eyJ... (copialo)
```

### Crear `.env.local`

```powershell
cp .env.example .env.local
```

Edita `.env.local` y rellena estos campos con los valores de `db:status`:

- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del status>`
- `SUPABASE_SERVICE_ROLE_KEY=<service_role key del status>`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres`
- `NEXTAUTH_SECRET=<genera con: openssl rand -base64 32>`
- `NEXTAUTH_URL=http://localhost:8500`
- `REDIS_URL=redis://localhost:6379`

Las claves LLM (ANTHROPIC_API_KEY, OPENAI_API_KEY) y de proveedores (Retell, Ultravox, HubSpot, Zoho) se rellenan cuando vayas a usar esas features. No son necesarias para arranque inicial.

### Seed de datos demo

```powershell
npm run db:seed-demo
```

Crea:

- 1 tenant `Academia AF Demo`
- 1 admin user `demo@af.local` / `DemoPassword123!`
- 3 programas formativos
- 15 leads ficticios
- 8 llamadas demo
- 2 campañas

**Importante**: los SQL legacy `supabase/MASTER_RESTORE.sql`, `restore_all_data.sql`, `tenants.sql` contienen datos reales del cliente Esden. **NO los uses para desarrollo local** — el script `seed-demo.ts` genera datos ficticios desde cero.

## 3. Arranque del día a día

```powershell
npm run local:setup    # db:up + redis:up + seed (idempotente)
npm run dev            # Next.js dev server en :8500 (puerto fijo)
```

En otra terminal, si necesitas el worker BullMQ:

```powershell
node worker.js
```

Visita http://localhost:8500 y login con `demo@af.local` / `DemoPassword123!`.

## 4. Apagar / limpiar

```powershell
npm run local:teardown     # db:down + redis:down
```

Para reset completo de la BD (BORRA TODO Y REAPLICA MIGRACIONES):

```powershell
npm run db:reset
npm run db:seed-demo
```

## 5. Acceder al Studio

http://localhost:54323 — interfaz web de Supabase para inspeccionar tablas, ejecutar SQL, gestionar usuarios.

## 6. Troubleshooting

### Puerto ocupado al arrancar

Si `db:up` falla por puerto ocupado, verifica qué tienes corriendo:

```powershell
docker ps
```

Apaga lo que use 54321-54324 y reintenta.

### Falla una migracion

Las migraciones del proyecto tienen RLS y FK entre tablas que requieren orden estricto. Si una falla:

```powershell
npm run db:reset    # borra todo y reaplica desde cero
```

### Reset cookie / sesion perdida

Borra cookies del browser para `localhost:8500` y vuelve a login.

## 7. Lo que NO funciona en local sin keys reales

- **Voice (Retell/Ultravox)**: necesitan API keys + webhooks publicos (ngrok o similar)
- **CRMs (HubSpot/Zoho)**: requieren OAuth apps creadas + redirect URI publica
- **Email transactional**: no hay provider configurado por defecto

Estas features fallan al usarse pero la app arranca y deja navegar el dashboard, ver leads demo, etc.

## 8. Referencias

- `package.json` -> scripts `db:*`, `redis:*`, `local:*`
- `supabase/config.toml` -> config Supabase CLI
- `supabase/migrations/` -> esquema BD (32 migraciones)
- `scripts/seed-demo.ts` -> generador de datos ficticios
- `docker-compose.dev.yml` -> Redis para BullMQ
- `plans/reports/todo-rebrand-runtime-cookies-headers.md` -> rebrand pendiente de cookies/headers
