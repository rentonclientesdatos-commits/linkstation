---
title: "Deploy v0.2.0 a VPS Dokploy (dev.linkstation.ai)"
audience: Javi HP + Renzo (ejecución)
status: handoff document — sigue el orden, paso por paso
date: 2026-05-23
target_version: v0.2.0 (commit 94c035a en developer, tag v0.2.0)
target_env: dev.linkstation.ai
last_updated: 2026-05-23
---

# Deploy v0.2.0 → `dev.linkstation.ai`

> ⚠️ **Documento de referencia para ejecución manual** del usuario. No contiene credenciales reales — usa placeholders. Las credenciales reales viajan por canal seguro (1Password / Bitwarden / Vault).
>
> **Cuándo usar este doc**: hoy (23-05-2026) para cerrar las tareas Sprint 0 diferidas (1-03 rotar JWTs VPS, 1-05 password Postgres VPS) + activar la nueva `ENCRYPTION_KEY` de Sprint 1 + desplegar v0.2.0.
>
> **Tiempo estimado**: 30-45 min sin imprevistos.

---

## 0. Datos de acceso (placeholders — sustituye con los tuyos del vault)

```yaml
vps:
  proveedor: Hetzner
  ip: <VPS_IP> # → vault.vps.hetzner_ip
  ssh_user: root
  ssh_auth: password # ROTAR tras este deploy (ver §10)
  ssh_pass: <VPS_ROOT_PASSWORD> # → vault.vps.hetzner_root_pass

dokploy:
  panel_url: https://panel.linkstation.ai
  user: <DOKPLOY_USER> # → vault.dokploy.admin_email
  pass: <DOKPLOY_PASS> # → vault.dokploy.admin_pass

app_target:
  dominio: dev.linkstation.ai
  rama: developer
  commit: 94c035a (tag v0.2.0)
```

**⚠️ Seguridad inmediata** — credenciales que han pasado por chat sin cifrar:

1. Rotar password root SSH **tras el deploy** (§10.1)
2. Configurar SSH key auth + deshabilitar password (§10.2)
3. Rotar password Dokploy admin tras deploy (§10.3)

---

## 1. Inventory inicial del VPS

**Por qué**: saber qué hay desplegado (versión actual, containers, configs) antes de tocar nada.

### 1.1. Conectar por SSH

```bash
ssh root@<VPS_IP>
# Pegar VPS_ROOT_PASSWORD del vault
```

### 1.2. Comandos de inventory (ejecutar en el VPS)

```bash
# Sistema
hostname && uname -r && uptime && df -h / | tail -1 && free -h | head -2

# Docker
docker --version
docker compose version 2>/dev/null

# Containers corriendo
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

# Containers Supabase + app
docker ps --format '{{.Names}}' | grep -iE 'postgres|supabase|next|dashboard|af-|redis|worker'

# Networks Docker
docker network ls | grep -vE 'bridge|host|none'

# Dokploy config (path por defecto)
ls -la /etc/dokploy 2>/dev/null
ls -la /var/lib/dokploy 2>/dev/null

# Domain actualmente respondiendo
curl -s -I https://dev.linkstation.ai -m 5 | head -3
```

### 1.3. Esperado y qué anotar

- Anota nombres exactos de containers:
  - `$PG_CONTAINER` = container del Postgres (Supabase)
  - `$NEXTJS_CONTAINER` = container del Next.js
  - `$WORKER_CONTAINER` = container del BullMQ worker (si separado)
  - `$REDIS_CONTAINER` = container de Redis
  - `$KONG_CONTAINER` = container Kong (si Supabase completo)
- Anota la versión actual desplegada (commit en logs del Next.js, o pregunta a Dokploy panel)
- Anota si el dominio `dev.linkstation.ai` responde 200 / 307 / 502 / 404 / SSL error

### 1.4. Si algún container falta

Si **NO** hay Postgres o **NO** hay Next.js corriendo, este doc NO aplica — usa el doc completo de deploy desde cero (pídelo si hace falta).

---

## 2. Backup defensivo (5 min, OBLIGATORIO antes de tocar nada)

```bash
# En el VPS, sustituye $PG_CONTAINER por el nombre real
mkdir -p /root/backups
TIMESTAMP=$(date +%Y%m%d-%H%M)
docker exec $PG_CONTAINER pg_dump -U postgres -d postgres -Fc \
  -f /tmp/pre-deploy-v0.2.0-${TIMESTAMP}.dump
docker cp $PG_CONTAINER:/tmp/pre-deploy-v0.2.0-${TIMESTAMP}.dump \
  /root/backups/pre-deploy-v0.2.0-${TIMESTAMP}.dump
ls -lh /root/backups/pre-deploy-v0.2.0-*.dump
```

**Verifica que el backup tiene tamaño razonable** (no 0 bytes). Guardar al menos 7 días.

---

## 3. Generar los 6 secretos nuevos

**Por qué**: Sprint 0 tareas 1-03 y 1-05 piden rotar JWTs + password Postgres. Sprint 1 introduce `ENCRYPTION_KEY` para cifrar tokens OAuth.

Ejecuta en el VPS (todos los `openssl` están disponibles):

```bash
echo ""
echo "=== SECRETOS NUEVOS (cópialos a 1Password ya, antes de seguir) ==="
echo ""
echo "JWT_SECRET (40 chars, para firmar tokens Supabase):"
openssl rand -base64 48 | tr -d '=+/' | head -c 48
echo ""
echo ""
echo "POSTGRES_PASSWORD (32 chars):"
openssl rand -base64 32 | tr -d '=+/' | head -c 32
echo ""
echo ""
echo "ENCRYPTION_KEY (32 bytes base64 — Sprint 1 cifrado OAuth tokens):"
openssl rand -base64 32
echo ""
echo "CRON_SECRET (32 chars):"
openssl rand -base64 32 | tr -d '=+/' | head -c 32
echo ""
echo ""
echo "=== Guarda los 4 valores arriba en el vault ANTES de continuar ==="
```

**Las claves `ANON_KEY` y `SERVICE_ROLE_KEY` NO se generan con `openssl rand`** — son JWTs firmados con el `JWT_SECRET` nuevo. Se generan en el paso 4.

---

## 4. Generar `ANON_KEY` y `SERVICE_ROLE_KEY` (JWTs Supabase)

Supabase deriva estas keys del `JWT_SECRET`. Sin recrearlas con el nuevo secret, la app no podrá hablar con Supabase.

### 4.1. Instalar herramienta (una vez, si no está)

```bash
# Si no tienes node en el VPS host, instala vía docker
docker run --rm -it node:20-alpine sh -c "npm i -g jose-cli && jose-cli --help"
# O alternativa: usar Python con PyJWT
pip3 install pyjwt 2>/dev/null || apt install -y python3-pip && pip3 install pyjwt
```

### 4.2. Generar ANON_KEY (rol `anon`)

```bash
JWT_SECRET="<pegar JWT_SECRET generado en §3>"

python3 <<PY
import jwt, time
payload_anon = {
    "role": "anon",
    "iss": "supabase",
    "iat": int(time.time()),
    "exp": int(time.time()) + 60*60*24*365*10  # 10 años
}
print("ANON_KEY:")
print(jwt.encode(payload_anon, "$JWT_SECRET", algorithm="HS256"))
PY
```

### 4.3. Generar SERVICE_ROLE_KEY (rol `service_role`)

```bash
python3 <<PY
import jwt, time
payload_sr = {
    "role": "service_role",
    "iss": "supabase",
    "iat": int(time.time()),
    "exp": int(time.time()) + 60*60*24*365*10  # 10 años
}
print("SERVICE_ROLE_KEY:")
print(jwt.encode(payload_sr, "$JWT_SECRET", algorithm="HS256"))
PY
```

**Guarda ambas keys en el vault** con la fecha y nota "rotación 2026-05-23 v0.2.0".

---

## 5. Aplicar migrations Sprint 0 + Sprint 1 al Postgres del VPS

**Por qué**: el código v0.2.0 espera tablas/columnas que aún no existen en el Postgres del VPS si la versión anterior era anterior al Sprint 0.

### 5.1. Listar migrations a aplicar

```bash
# En tu máquina local (donde está el repo), no en el VPS
cd e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard
ls supabase/migrations/*.sql
```

Esperado (5 archivos):

- `20260101000000_initial_tenants.sql`
- `20260101000001_base_schema.sql`
- `20260521000000_rls_tenants_hardening.sql` (Sprint 0 — 1-18)
- `20260521000001_rls_knowledge_base_hardening.sql` (Sprint 0 — 1-19)
- `20260522000000_widget_hardening_allowed_domains_rate_limit.sql` (Sprint 0 — 1-27)

Sprint 1 puede haber añadido más en `supabase/migrations/` — ejecuta el `ls` y aplica TODAS las que no estén ya aplicadas en el VPS.

### 5.2. Subir migrations al VPS

```bash
# En tu máquina local
scp supabase/migrations/*.sql root@<VPS_IP>:/tmp/migrations/
```

### 5.3. Aplicar migrations en orden alfabético

```bash
# En el VPS
cd /tmp/migrations

# Listar las que ya están aplicadas (Supabase usa tabla migraciones)
docker exec $PG_CONTAINER psql -U postgres -d postgres -c \
  "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;" 2>/dev/null

# Si la tabla no existe, todas son nuevas. Aplicar TODAS:
for f in $(ls *.sql | sort); do
  echo "=== Aplicando $f ==="
  cat "$f" | docker exec -i $PG_CONTAINER psql -U postgres -d postgres
  echo ""
done
```

**Errores a ignorar**: `already exists`, `does not exist` (en DROP IF EXISTS).
**Errores a investigar**: `syntax error`, `permission denied`, `foreign key violation`.

### 5.4. Verificar RLS activo post-migrations

```bash
docker exec $PG_CONTAINER psql -U postgres -d postgres -c "
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname='public' AND rowsecurity=true
  ORDER BY tablename;
"
```

Debe listar al menos: `tenants`, `knowledge_base`, `web_widgets`.

---

## 6. Rotar `POSTGRES_PASSWORD` (tarea 1-05)

**Atención**: este paso cambia la password del usuario `postgres` del Postgres. Hay que actualizar:

- Variable `POSTGRES_PASSWORD` en el container Postgres (env)
- `DATABASE_URL` en Next.js Application
- `DATABASE_URL` en worker Application (si separado)
- Cualquier servicio Supabase que conecte (auth, rest, realtime, storage)

### 6.1. Cambiar password DENTRO de Postgres

```bash
NEW_POSTGRES_PASS="<pegar valor de §3>"
docker exec $PG_CONTAINER psql -U postgres -c \
  "ALTER USER postgres WITH PASSWORD '$NEW_POSTGRES_PASS';"
```

### 6.2. Cambiar env var del container Postgres en Dokploy

En el panel Dokploy (`https://panel.linkstation.ai`):

1. Login con `<DOKPLOY_USER>` / `<DOKPLOY_PASS>`
2. Project `linkstation` (o como se llame)
3. **Database (Postgres) service** → tab **Environment**
4. Buscar `POSTGRES_PASSWORD` → reemplazar con el nuevo valor
5. **NO redeploy aún** — esperar a tener TODOS los servicios actualizados

---

## 7. Rotar JWT_SECRET + ANON_KEY + SERVICE_ROLE_KEY (tarea 1-03)

**Atención**: este paso invalida todas las sesiones activas. Si hay usuarios reales conectados, se desconectan.

En Dokploy panel:

### 7.1. En el servicio Postgres (o Supabase Auth si separado)

Tab **Environment** → actualizar:

```env
JWT_SECRET=<JWT_SECRET nuevo del §3>
GOTRUE_JWT_SECRET=<mismo valor>          # solo si tienes container gotrue separado
```

### 7.2. En el servicio Next.js Application

Tab **Environment** del Application Next.js → actualizar/crear:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<dominio-supabase-publico>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY nuevo del §4.2>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY nuevo del §4.3>
DATABASE_URL=postgresql://postgres:<NEW_POSTGRES_PASS>@<PG_CONTAINER>:5432/postgres

# Nuevos Sprint 1 + Sprint 0 (si no existían ya):
ENCRYPTION_KEY=<ENCRYPTION_KEY nuevo del §3>
CRON_SECRET=<CRON_SECRET nuevo del §3>
NEXT_PUBLIC_APP_URL=https://dev.linkstation.ai
NODE_ENV=production

# Webhooks (solo si están activos — si no, dejar vacíos o eliminar):
RETELL_WEBHOOK_SECRET=<solo si Retell activo>
WHATSAPP_APP_SECRET=<solo si WhatsApp activo>
WHATSAPP_VERIFY_TOKEN=<solo si WhatsApp activo>

# Redis (worker BullMQ):
REDIS_URL=redis://<REDIS_CONTAINER>:6379

# LLM (si no estaban):
ANTHROPIC_API_KEY=<si aplica>
OPENAI_API_KEY=<si aplica>
```

### 7.3. En el servicio Worker (si separado)

Mismas variables que §7.2 — comparten `.env`.

### 7.4. En servicios Supabase secundarios (si existen)

- `supabase-auth` / `gotrue` → `GOTRUE_JWT_SECRET`
- `supabase-rest` / `postgrest` → `PGRST_JWT_SECRET`
- `supabase-storage` → `PGRST_JWT_SECRET` (o equivalente)
- `supabase-realtime` → `JWT_SECRET`
- `kong` → si lleva keys en su config, regenerar

---

## 8. Redeploy en orden

Ahora que TODAS las env vars están actualizadas, redeploy en este orden:

```
1. Postgres        ← reinicia con nuevo POSTGRES_PASSWORD (10-30s downtime)
2. Auth/Rest/...   ← cualquier servicio Supabase secundario
3. Kong            ← gateway (si existe)
4. Worker          ← BullMQ — debe arrancar tras Postgres+Redis
5. Next.js         ← último, depende de todo lo demás
```

En Dokploy: **cada Application** → tab **Deployments** → **Restart** (no Rebuild, salvo que hayas cambiado código).

### 8.1. Para actualizar el código a v0.2.0

Si la versión desplegada es anterior, en el Application del Next.js:

1. Tab **General** → verificar `Branch: developer`
2. Tab **Deployments** → **Deploy** (no Restart) — esto pulla el último commit de developer
3. Esperar logs:
   - `Building...` (npm install + next build) ~3-5 min
   - `Started server on 0.0.0.0:3000`
   - Healthcheck pasa
4. Si build falla → revisar logs, normalmente env vars faltantes

Mismo proceso para el Worker.

---

## 9. Smoke test post-deploy

### 9.1. HTTP check

```bash
# Desde tu máquina local
curl -I https://dev.linkstation.ai
# Esperado: HTTP/2 200  o  HTTP/2 307 (redirect a /login)

# Si 502/503: container Next.js no arriba todavía. Espera 30s.
# Si 404 del Traefik: revisa Domains config en Dokploy.
# Si SSL error: cert renovando (Let's Encrypt). Espera 2 min.
```

### 9.2. Browser check

Abre `https://dev.linkstation.ai` en navegador:

- Login screen carga (¿`/login` sin errors en console?)
- Login con credencial demo (si tienes una creada en VPS):
  - Si NO tienes user demo en VPS Postgres: crear uno
    ```bash
    docker exec $PG_CONTAINER psql -U postgres -d postgres -c "
      -- Crear user demo en auth.users (requiere insert via Supabase Auth API normalmente).
      -- Mejor: usar el script scripts/seed-demo.ts adaptado a VPS, o crearlo desde Supabase Studio.
    "
    ```
- Dashboard carga
- Selector de tenant aparece
- Logout redirige a `/login` (BUG-001 fix)

### 9.3. Verificar RLS activo

```bash
docker exec $PG_CONTAINER psql -U postgres -d postgres -c "
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname='public' AND rowsecurity=true;
"
```

Debe incluir `tenants`, `knowledge_base`, `web_widgets`.

### 9.4. Verificar worker conectado a Redis

```bash
docker logs --tail 50 $WORKER_CONTAINER 2>&1 | grep -iE "ready|connect|error"
```

Debe ver `Worker ready` o similar. **NO** debe haber `ECONNREFUSED redis`.

### 9.5. Test webhook signature (Sprint 0 1-12..1-15)

Solo si Retell/WhatsApp/CRM activos:

```bash
# Endpoint Retell webhook sin signature → debe devolver 401
curl -X POST https://dev.linkstation.ai/api/webhooks/retell \
  -H "Content-Type: application/json" -d '{"test":true}' -i

# Esperado: HTTP/2 401 Unauthorized
```

---

## 10. Rotación de credenciales de acceso (post-deploy)

### 10.1. Rotar password root VPS

```bash
# Vía SSH al VPS
passwd root
# Pegar password nueva 2 veces (32+ chars random recomendado)
# Guardar en vault inmediatamente
```

### 10.2. Configurar SSH key + deshabilitar password auth

En tu máquina local:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/af-vps -C "javi@LinkStation"
ssh-copy-id -i ~/.ssh/af-vps.pub root@<VPS_IP>
ssh -i ~/.ssh/af-vps root@<VPS_IP>   # verificar que funciona
```

En el VPS, editar `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PermitRootLogin prohibit-password
```

```bash
systemctl reload sshd
```

### 10.3. Rotar password Dokploy admin

Panel Dokploy → cuenta admin → Change password → guardar en vault.

### 10.4. Si las credenciales originales pasaron por chat sin cifrar

Considerar también:

- Borrar el historial del chat / sesión donde se pegaron
- Habilitar 2FA en Dokploy si está disponible

---

## 11. Actualizar RoadMap tras deploy OK

En el repo local:

```bash
git checkout developer
git pull --ff-only origin developer
git checkout -b feature/sp-0-vps-deploy-close
```

Editar `plans/RoadMap.md`:

- Tarea **1-03** "Rotar JWTs comprometidos en Supabase": 🟡 DIFERIDA → 🟢 Completada
  ```
  ⏱ Real (final): ~20min · ✅ JWT_SECRET + ANON_KEY + SERVICE_ROLE_KEY rotados en VPS Dokploy
  (panel.linkstation.ai) · Aplicado 2026-05-23 en deploy v0.2.0 a dev.linkstation.ai
  ```
- Tarea **1-05** "Cambio password Postgres default": 🟡 DIFERIDA → 🟢 Completada
  ```
  ⏱ Real (final): ~15min · ✅ POSTGRES_PASSWORD rotado a 32 chars random en VPS Hetzner
  (container $PG_CONTAINER) · Aplicado 2026-05-23 con downtime de ~30s · Cierra tarea 1-05 Sprint 0
  ```

Commit:

```bash
git add plans/RoadMap.md
git commit -m "docs(roadmap): cerrar 1-03 + 1-05 Sprint 0 tras deploy VPS v0.2.0

Deploy v0.2.0 a dev.linkstation.ai aplicado el 2026-05-23.
Rotación JWTs Supabase (1-03) y password Postgres (1-05) ejecutadas
contra el VPS Dokploy. Ambas tareas pasan de DIFERIDA pre-deploy a Completada.

Doc de ejecución: docs/handoff/deploy-vps-v0.2.0.md"

git push -u origin feature/sp-0-vps-deploy-close
gh pr create --base developer --title "docs(roadmap): cierre 1-03 + 1-05 post-deploy v0.2.0" \
  --body "Cierra las 2 tareas Sprint 0 diferidas tras ejecutar el deploy a VPS."
```

---

## 12. Rollback (si algo falla catastróficamente)

### 12.1. Restaurar BD desde backup §2

```bash
# En el VPS
docker exec -i $PG_CONTAINER pg_restore -U postgres -d postgres \
  --clean --if-exists --no-owner --no-privileges \
  < /root/backups/pre-deploy-v0.2.0-${TIMESTAMP}.dump
```

### 12.2. Revertir env vars en Dokploy

Si tenías exportadas las env vars antiguas: pegar otra vez en cada Application + Redeploy.

Si NO las exportaste:

- `JWT_SECRET` antiguo está perdido — necesitarás un nuevo set (no es rollback completo)
- En ese caso: aceptar el deploy y arreglar el bug post-mortem

**Recomendación**: ANTES de empezar §6, exporta las env vars actuales:

```bash
# Por cada Application en Dokploy: panel → Environment → Copy all → guardar en archivo temporal LOCAL
# NO commitear ese archivo
```

### 12.3. Revertir versión de imagen

En Dokploy panel → Application → Deployments → seleccionar deployment anterior → Rollback.

---

## 13. Verificación final / acceptance criteria

Marcar todas:

- [ ] HTTP 200/307 en `https://dev.linkstation.ai`
- [ ] Login admin funciona y carga dashboard con datos
- [ ] Logout redirige a `/login` (BUG-001 fix)
- [ ] RLS activo en `tenants`, `knowledge_base`, `web_widgets` (verificado con SQL)
- [ ] Worker BullMQ conectado a Redis (logs sin `ECONNREFUSED`)
- [ ] Webhook Retell devuelve 401 sin signature (Sprint 0 hardening activo)
- [ ] `JWT_SECRET` rotado (intentar login con ANON_KEY antiguo → debe fallar)
- [ ] Password Postgres rotado (intentar conexión con password viejo → debe fallar)
- [ ] `ENCRYPTION_KEY` configurado (intentar guardar token OAuth → debe cifrarlo)
- [ ] Credenciales SSH root rotadas (§10.1)
- [ ] Password Dokploy admin rotada (§10.3)
- [ ] RoadMap actualizado y PR a developer creado (§11)

---

## 14. Decisiones operativas pendientes (para otra sesión)

- **Promoción a `staging`**: ¿cuándo? Depende de Bea (cliente) validación de Sprint 0+1 en `dev`.
- **Promoción a `main`** (producción cliente): tras feedback Bea + completar Sprint 2 (HubSpot + Zoho).
- **DNS**: si quieres `staging.linkstation.ai` aparte de `dev`, configurar registro DNS adicional cuando sea momento.
- **Backup periódico**: configurar cron en VPS que haga `pg_dump` cada 24h a un blob storage externo (no en el mismo VPS).
- **Monitoring**: Uptime Kuma, Better Stack, o similar — actualmente sin alertas.

---

## 15. Soporte / si algo no encaja

- **Inventory diferente al esperado** (§1): probablemente Supabase NO está completo (solo Postgres pelado, o Supabase desplegado de otra forma). Avisa antes de continuar.
- **Migrations fallan** (§5.3): captura output completo (stdout+stderr), pega en chat / reporte. No fuerces.
- **Build Next.js falla en Dokploy** (§8.1): captura logs completos de Build. Suelen ser env vars faltantes o `node_modules` corruptos.
- **JWT mismatch tras rotación** (§7): asegúrate de que TODOS los containers Supabase recibieron el mismo `JWT_SECRET` nuevo. Discrepancia → 401 en todo.

---

**Final del doc.** Sigue los pasos en orden. Tras §13 todos los checkboxes en verde, deploy v0.2.0 está OK y Sprint 0 queda 100% completado (incluidas 1-03 y 1-05).
