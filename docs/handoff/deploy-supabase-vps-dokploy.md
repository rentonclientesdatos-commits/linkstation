---
title: "Deploy Supabase self-hosted en VPS Dokploy"
audience: Javi HP (ejecución)
status: handoff document
date: 2026-05-23
target_env: VPS Hetzner + Dokploy panel.linkstation.ai
related: docs/handoff/deploy-vps-v0.2.0.md
---

# Deploy Supabase self-hosted en VPS Dokploy

> **Contexto**: el Project "dev LinkStation" del panel Dokploy tiene `dev.dash` (Next.js) + `minio` + `Rediscola`, pero **no tiene Supabase**. Esta guía despliega Supabase completo (Postgres + Auth + REST + Realtime + Storage + Studio + Kong) en el mismo Project, con las mismas versiones que tu local.
>
> **Tiempo estimado**: 25-40 min (depende de pulls de imágenes Docker).

---

## 0. Pre-requisitos

- [ ] Vault con los **secretos generados** (mensaje previo del chat — JWT_SECRET, POSTGRES_PASSWORD, ANON_KEY, SERVICE_ROLE_KEY, DASHBOARD_PASSWORD, VAULT_ENC_KEY, SECRET_KEY_BASE, LOGFLARE_API_KEY, NEXTAUTH_SECRET, CRON_SECRET, ENCRYPTION_KEY)
- [ ] DNS apuntando al VPS Hetzner `46.62.193.169`:
  - `dev.linkstation.ai` (ya configurado para dev.dash)
  - `supabase.linkstation.ai` (NUEVO — para Kong API gateway)
  - `studio.linkstation.ai` (NUEVO — para Supabase Studio UI)
- [ ] Acceso panel Dokploy `https://panel.linkstation.ai`

---

## 1. Configurar DNS (antes de empezar)

En tu proveedor DNS (Hetzner DNS / Cloudflare / lo que uses), crea 2 registros nuevos:

```
Tipo:  A
Nombre: supabase.linkstation.ai
Valor:  46.62.193.169
TTL:    300

Tipo:  A
Nombre: studio.linkstation.ai
Valor:  46.62.193.169
TTL:    300
```

Verifica propagación (5 min):

```bash
dig supabase.linkstation.ai +short
dig studio.linkstation.ai +short
# Ambos deben devolver: 46.62.193.169
```

---

## 2. Crear el service Supabase en Dokploy

### 2.1. Crear Compose service

En el panel Dokploy → Project **"dev LinkStation"** → environment **production**:

1. Click **Create Service** (botón arriba derecha)
2. Tipo: **Compose**
3. Nombre: `supabase` (o `supabase-stack`)
4. Click Create

### 2.2. Configurar el Compose

Dentro del nuevo service `supabase`:

#### Tab **General** → **Provider** = `Git`:

- **Repository URL**: el mismo repo (`linkstation-DashBoard`)
- **Branch**: `developer`
- **Build Path** o **Compose Path**: `infra/supabase-vps/docker-compose.yml`

> Si Dokploy no acepta path al compose y exige raíz, alternativa: usa **Provider = Raw** y pega el contenido entero de `infra/supabase-vps/docker-compose.yml` directamente en el campo. El compose ya tiene los `kong.yml` y `vector.yml` referenciados — esos tendrás que pegarlos por separado (ver §2.4).

#### Tab **Environment** → pega todo este bloque:

> 🔴 Reemplaza cada `<DEL_VAULT>` con el valor real generado.

```env
# Postgres
POSTGRES_HOST=supabase-db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
POSTGRES_PASSWORD=<DEL_VAULT — POSTGRES_PASSWORD>

# JWT (firma de tokens)
JWT_SECRET=<DEL_VAULT — JWT_SECRET>
ANON_KEY=<DEL_VAULT — ANON_KEY>
SERVICE_ROLE_KEY=<DEL_VAULT — SERVICE_ROLE_KEY>

# URLs públicas (después de configurar dominios en §3)
SITE_URL=https://dev.linkstation.ai
API_EXTERNAL_URL=https://supabase.linkstation.ai
STUDIO_URL=https://studio.linkstation.ai

# Studio admin login
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<DEL_VAULT — DASHBOARD_PASSWORD>

# Secretos auxiliares
VAULT_ENC_KEY=<DEL_VAULT — VAULT_ENC_KEY>
SECRET_KEY_BASE=<DEL_VAULT — SECRET_KEY_BASE>
LOGFLARE_API_KEY=<DEL_VAULT — LOGFLARE_API_KEY>
```

### 2.3. (Opcional) Si Dokploy NO acepta path al compose en git

Si fallasen los pasos anteriores porque Dokploy no permite paths fuera de raíz:

1. Cambia **Provider** a **Raw**
2. Copia el contenido entero de `infra/supabase-vps/docker-compose.yml` y pégalo en el campo
3. Te tocará también pegar los archivos auxiliares:
   - `kong.yml` → en Dokploy a veces hay "Additional files" o "Mount files" → añade con nombre `kong.yml` y contenido del archivo del repo
   - `vector.yml` → idem

### 2.4. Deploy del Compose

En el service `supabase` → tab **Deployments** → botón **Deploy**.

Logs esperados (~5-10 min en el primer deploy por pulls):

- `Pulling postgres:17.6.1.106` ✓
- `Pulling kong:2.8.1` ✓
- ... (otros pulls)
- `Creating supabase-db ... done` ✓
- `Creating supabase-vector ... done` ✓
- `Creating supabase-auth ... done` ✓
- ... (otros containers)
- Todos los healthchecks en verde

Si algún container queda en restart loop, captura el log y pásamelo.

---

## 3. Configurar acceso público — path-prefix (REVISADO 23-05-2026)

**Decisión arquitectónica**: en lugar de subdominios dedicados, Supabase se publica bajo path-prefix del dominio existente `dev.linkstation.ai`. Ver memoria persistente `project-supabase-vps-deploy-state.md` para historial completo.

Razones clave:

- **Same-origin con dev.dash** → cero CORS, cookies Supabase compartidas SSR↔client.
- **Reusa cert + DNS** ya emitidos para `dev.linkstation.ai`.
- **Arregla bug** "Swarm overlay no resuelve supabase-kong por DNS interno": pasa por traefik, que SÍ es resolvable desde Swarm services (dev.dash).

### 3.1. Kong → `dev.linkstation.ai/supabase/*`

El `docker-compose.yml` ya incluye las **labels traefik** necesarias (sección `supabase-kong.labels`). Al redeploy del service `supabase`, traefik debería recoger la ruta automáticamente.

**Si las labels no funcionan** (Dokploy puede usar nombres distintos de entrypoint/certresolver), añadir manualmente en Dokploy → service `supabase` → tab **Domains** → **Add Domain**:

| Campo                | Valor                                 |
| -------------------- | ------------------------------------- |
| Host                 | `dev.linkstation.ai`         |
| Path                 | `/supabase`                           |
| Strip Path           | ON                                    |
| Container            | `supabase-kong`                       |
| Container Port       | `8000`                                |
| HTTPS                | ON                                    |
| Certificate Provider | Let's Encrypt (reusa cert existente)  |
| Priority             | 100 (mayor que el catch-all dev.dash) |

### 3.2. Studio — NO se expone públicamente (acceso vía SSH tunnel)

Studio es "god mode" (SQL editor + RLS bypass). Acceso recomendado:

```bash
# Desde tu máquina local:
bash infra/supabase-vps/scripts/ssh-vps.sh "sudo socat TCP-LISTEN:3010,fork TCP:supabase-studio:3000 &"
# O usar SSH tunnel directo:
ssh -L 3010:supabase-studio:3000 -i infra/supabase-vps/.vault/linkstation-vps-key root@46.62.193.169
# Abrir en navegador: http://localhost:3010
```

Si en el futuro se necesita acceso público a Studio, exponerlo con HTTP Basic Auth + IP allowlist, NUNCA sin auth.

### 3.3. Verificar publicación (tras Redeploy)

```bash
# Health endpoint de GoTrue a través del path-prefix:
curl -sS "https://dev.linkstation.ai/supabase/auth/v1/health" -m 10
# Esperado: {"version":"v2.188.1","name":"GoTrue","description":"GoTrue is a user registration..."}

# Headers para confirmar que traefik está stripping correctamente:
curl -sI "https://dev.linkstation.ai/supabase/auth/v1/health" -m 10 | head -5
# Esperado: HTTP/2 200, x-kong-*, server: kong/...
```

---

## 4. Verificar que Supabase funciona

### 4.1. Login en Studio

Abre `https://studio.linkstation.ai` en navegador:

- Aparece prompt de Basic Auth → usuario `admin` / password `<DASHBOARD_PASSWORD>`
- Tras login, ves la UI de Supabase Studio
- En sidebar: Table editor / SQL editor / Auth / Storage / etc.

### 4.2. Verificar Postgres desde SSH

```bash
# En el VPS
ssh root@46.62.193.169
docker exec -it supabase-db psql -U postgres -d postgres -c "\dt"
# Esperado: lista de tablas (vacía o solo de Supabase Auth)

docker exec -it supabase-db psql -U postgres -c "\l"
# Esperado: postgres, _supabase, template_0, template_1
```

### 4.3. Test ANON_KEY contra Kong

```bash
curl -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  https://supabase.linkstation.ai/rest/v1/

# Esperado: HTTP/2 200 con un JSON descripción del schema
```

---

## 5. Aplicar migrations Sprint 0+1

### 5.1. Subir migrations al VPS

Desde tu máquina local:

```powershell
# Windows / PowerShell
scp -r supabase\migrations root@46.62.193.169:/tmp/af-migrations/
```

O alternativa con PuTTY pscp:

```powershell
& "C:\Program Files\PuTTY\pscp.exe" -r -pw <SSH_PASS> supabase\migrations root@46.62.193.169:/tmp/af-migrations/
```

### 5.2. Aplicar en orden

En el VPS (SSH):

```bash
cd /tmp/af-migrations
ls *.sql | sort

# Aplicar cada una en orden
for f in $(ls *.sql | sort); do
  echo "=== $f ==="
  cat "$f" | docker exec -i supabase-db psql -U postgres -d postgres
  echo ""
done
```

**Errores a ignorar**: `already exists` (las tablas Supabase Auth ya las creó el container al arrancar).

**Errores a investigar**: `permission denied`, `syntax error`, `relation does not exist`.

### 5.3. Verificar RLS activo

```bash
docker exec supabase-db psql -U postgres -d postgres -c "
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname='public' AND rowsecurity=true ORDER BY tablename;
"
```

Debe listar al menos: `tenants`, `knowledge_base`, `web_widgets`.

---

## 6. Cargar snapshot de BD local (datos demo)

Tienes en local el ZIP cifrado: `backups/local-db/linkstation-bd-handoff-20260522-1445.zip` (password `AF*2026!`).

### 6.1. Regenerar snapshot fresco (recomendado)

El ZIP de hace ~24h puede estar desactualizado. Genera uno nuevo desde tu local:

```powershell
# En tu máquina local
bash scripts/db-export-snapshot.sh --no-encrypt
# Genera backups/local-db/linkstation-snapshot-YYYYMMDD-HHmm.dump.gz (sin cifrar)
```

### 6.2. Subir al VPS

```powershell
& "C:\Program Files\PuTTY\pscp.exe" -pw <SSH_PASS> `
  backups\local-db\linkstation-snapshot-YYYYMMDD-HHmm.dump.gz `
  root@46.62.193.169:/tmp/
```

### 6.3. Restaurar en el Postgres del VPS

```bash
# En el VPS
gunzip -c /tmp/linkstation-snapshot-*.dump.gz | \
  docker exec -i supabase-db pg_restore \
    -U postgres -d postgres \
    --clean --if-exists \
    --no-owner --no-privileges \
    --verbose
```

### 6.4. Limpiar

```bash
rm /tmp/linkstation-snapshot-*.dump.gz
rm -rf /tmp/af-migrations
```

---

## 7. Configurar dev.dash con URLs del Supabase nuevo

Ahora que Supabase funciona, configura el `dev.dash` Application para apuntar a él.

### 7.1. Tab Environment del dev.dash → pega/actualiza:

```env
# === APP BASE ===
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://dev.linkstation.ai
NEXTAUTH_URL=https://dev.linkstation.ai
NEXTAUTH_SECRET=<DEL_VAULT — NEXTAUTH_SECRET>
LOG_LEVEL=info

# === SUPABASE (path-prefix vía traefik — same-origin con dev.dash) ===
NEXT_PUBLIC_SUPABASE_URL=https://dev.linkstation.ai/supabase
SUPABASE_URL=https://dev.linkstation.ai/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=<DEL_VAULT — ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<DEL_VAULT — SERVICE_ROLE_KEY>
DATABASE_URL=postgresql://postgres:<DEL_VAULT_POSTGRES_PASSWORD>@supabase-db:5432/postgres

# === SECRETS APP ===
CRON_SECRET=<DEL_VAULT — CRON_SECRET>
ENCRYPTION_KEY=<DEL_VAULT — ENCRYPTION_KEY>

# === REDIS (usar Rediscola del Project) ===
# Verifica el hostname EXACTO del container Rediscola en Dokploy
REDIS_URL=redis://rediscola-copy-<ID>:6379
WORKER_CONCURRENCY=5

# === LLM (las MISMAS que tu .env.local — copialas directo, no por chat) ===
OPENAI_API_KEY=<copiar de tu .env.local>
ANTHROPIC_API_KEY=<copiar de tu .env.local>
GOOGLE_GENAI_API_KEY=<copiar de tu .env.local>
# AWS Bedrock descartado 26-05-2026 — sin vars AWS_*

# === VOICE (mismas que .env.local) ===
RETELL_API_KEY=<copiar>
RETELL_WEBHOOK_SECRET=<copiar>
ULTRAVOX_API_KEY=<copiar>
ULTRAVOX_WEBHOOK_SECRET=<copiar>

# === WHATSAPP (mismas que .env.local) ===
WHATSAPP_APP_SECRET=<copiar>
WHATSAPP_VERIFY_TOKEN=<copiar>

# === CRM Sprint 2 (déjalas vacías por ahora) ===
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
HUBSPOT_REDIRECT_URI=https://dev.linkstation.ai/api/integrations/hubspot/callback
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REDIRECT_URI=https://dev.linkstation.ai/api/integrations/zoho/callback
ZOHO_API_DOMAIN=https://www.zohoapis.eu

# === Feature flags ===
FEATURE_VOICE_PROVIDER_AB=false
```

### 7.2. Conectar dev.dash a la red de Supabase

Para que `dev.dash` pueda resolver `supabase-db` y `rediscola-copy-xxx` como hostnames, deben estar en la **misma red Docker**.

En Dokploy → service `dev.dash` → tab **Advanced** (o Settings) → **Network**:

- Añadir networks:
  - `supabase-net` (la creada por el compose Supabase)
  - `dokploy-network` (red de Dokploy donde está Rediscola)

Si Dokploy no permite networks múltiples desde UI, fallback: usar **DNS externo** vía la URL pública:

```env
REDIS_URL=redis://rediscola-copy-xxx.linkstation.ai:6379   # si lo expones
DATABASE_URL=postgresql://postgres:PASS@supabase.linkstation.ai:5432/postgres   # NO recomendado (expone Postgres)
```

Lo limpio es **misma red interna**. Avísame si Dokploy no lo permite en su UI.

---

## 8. Deploy dev.dash

### 8.1. Trigger deploy

En el service `dev.dash` → tab **Deployments** → botón **Deploy** (o "Redeploy").

Logs esperados (~3-5 min):

- `Cloning repository...`
- `Building Docker image...` (multi-stage node:20-alpine + next build)
- `Pushing image...`
- `Creating container...`
- `Container started`

### 8.2. Si build falla

Posibles causas:

- **`Error: Missing env var X`** → falta env. Añade en tab Environment.
- **`ECONNREFUSED supabase-db:5432`** → dev.dash no está en `supabase-net`. Ver §7.2.
- **`Cannot pull image`** → token GitHub inválido. Revisa el repository URL del tab General.

Pega los logs y los interpreto.

---

## 9. Smoke test final

```bash
# HTTP
curl -I https://dev.linkstation.ai
# Esperado: HTTP/2 200 OR 307 (redirect login)

curl -I https://supabase.linkstation.ai
# Esperado: HTTP/2 200 OR 401

curl -I https://studio.linkstation.ai
# Esperado: HTTP/2 401 (basic auth)
```

Browser:

- `https://dev.linkstation.ai` → login page carga
- Login con un usuario que tengas en el snapshot restaurado
- Dashboard carga con datos
- Logout funciona

---

## 10. Limpieza

```bash
# En el VPS
rm /tmp/*.dump.gz 2>/dev/null
rm -rf /tmp/af-migrations 2>/dev/null
```

Tras 24h sin problemas, puedes borrar el snapshot ZIP cifrado de tu local.

---

## 11. Troubleshooting

| Síntoma                                                   | Causa probable                                  | Fix                                                      |
| --------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Studio responde 502                                       | Container Studio crash                          | `docker logs supabase-studio`                            |
| Kong responde 401 a todo                                  | ANON_KEY mal en envs                            | Verifica que el del Compose coincide con el del dev.dash |
| Realtime websocket falla                                  | `SECRET_KEY_BASE` o `JWT_SECRET` mismatched     | Re-pegar envs del Compose                                |
| dev.dash no conecta a Postgres                            | Networks Docker no compartidas                  | §7.2                                                     |
| Login Supabase Studio falla                               | `DASHBOARD_PASSWORD` mal escrito                | Verifica espacio inicial/final al copiar                 |
| `ERROR: relation "tenants" does not exist`                | Migrations no aplicadas                         | §5                                                       |
| LetsEncrypt SSL error en supabase.linkstation.ai | DNS no propagado o domain no añadido en Dokploy | §1 + §3                                                  |

---

## 12. Decisiones operativas pendientes

- **Backup automático Postgres**: configurar Dokploy Schedule (tab Schedules del service Supabase) que ejecute `pg_dump` diario a Minio (que ya tienes desplegado).
- **Email/SMTP**: por defecto Supabase Auth usa `inbucket` que NO está en este compose. Si quieres signup con email confirmation real, hay que añadir SMTP env vars o un container mailpit.
- **Edge Functions**: no incluidas. Si quieres usarlas, añadir container `supabase/edge-runtime` al compose.
- **Logging/Analytics**: Logflare está como `profile: analytics` (no arranca). Para activar, deploy con flag `--profile analytics` y configurar `LOGFLARE_API_KEY` real.
- **Monitoring**: Uptime Kuma o Better Stack para alertas.

---

**Final del doc**. Tras §9 todos verdes, Supabase + dev.dash operativos en `dev.linkstation.ai`.
