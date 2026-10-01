# Runbook — Recuperación VPS Dokploy cuando los dominios dan `ERR_CONNECTION_REFUSED`

> **Cuándo usar este runbook:** ningún dominio (`dev.linkstation.ai`, `/supabase`, `test.*`)
> responde por HTTPS, pero el panel SÍ carga en `http://panel.linkstation.ai:3000`.
> Síntoma raíz: **Traefik (reverse proxy) caído** y/o stack Supabase parado.
>
> Origen: incidente 09-06-2026. Tras un crash masivo de contenedores, solo sobrevivían la app
> `dev.dash` y Redis; Traefik y Supabase estaban caídos. Ver memoria
> `project-deploy-vps-dokploy-090626`.

---

## 0. Diagnóstico rápido (¿es este el problema?)

| Comprobación                                          | Si...                       | Entonces                                     |
| ----------------------------------------------------- | --------------------------- | -------------------------------------------- |
| `http://panel.linkstation.ai:3000` carga     | ✅                          | El servidor vive, el panel vive (Dokploy OK) |
| `https://dev.linkstation.ai/`                | ❌ `ERR_CONNECTION_REFUSED` | Traefik no sirve 443                         |
| `https://dev.linkstation.ai/supabase/`       | ❌ `ERR_CONNECTION_REFUSED` | NO es la app, es Traefik (afecta a TODO)     |
| Panel → Docker → no aparece `traefik` ni `supabase-*` | ❌                          | Contenedores caídos                          |

Si encaja → seguir este runbook.

---

## 1. Acceso al servidor

El SSH directo está **denegado por el servidor** (publickey, desde 25-05-2026).
**Usar la consola web KVM de Hetzner** (Hetzner Cloud Console → servidor → `>_ Console`).
Login como `root`. Credenciales en `infra/supabase-vps/.vault/ssh-vps.env` (gitignored).

VPS: Hetzner `46.62.193.169`.

---

## 2. PRIMERO: descartar disco/RAM llenos (causa del crash masivo)

⚠️ **No reinicies Traefik antes de esto.** Si el disco o la RAM están al 100%,
los contenedores se volverán a caer en cuanto arranquen.

```bash
df -h          # ¿algún volumen al 100%? (/ o /var)
free -h        # ¿RAM/swap agotada?
uptime         # ¿se reinició el servidor hace poco? (load alto = aún recuperándose)
docker ps -a --format 'table {{.Names}}\t{{.Status}}' | head -40
```

### Si el disco está lleno (>90%)

```bash
docker system df                       # ver qué ocupa
docker image prune -a -f               # borra imágenes sin usar (seguro)
docker builder prune -a -f             # borra caché de build (seguro)
docker container prune -f              # borra contenedores Exited (seguro)
df -h                                  # re-verificar espacio liberado
```

### Si la RAM está agotada

- Revisar si hay procesos zombie o un contenedor consumiendo todo.
- Considerar `docker restart <contenedor-pesado>`.
- Si es crónico → el VPS necesita más RAM (decisión de infra, avisar a Javi HP).

---

## 3. Levantar Traefik (reverse proxy)

```bash
# Ver estado de Traefik
docker ps -a | grep traefik
```

| Resultado                                       | Acción                                                   |
| ----------------------------------------------- | -------------------------------------------------------- |
| `dokploy-traefik` existe, `Exited`              | `docker start dokploy-traefik`                           |
| `dokploy-traefik` existe, `Up` pero no funciona | `docker restart dokploy-traefik`                         |
| NO existe ningún `traefik`                      | `docker restart dokploy` (Dokploy lo recrea al arrancar) |

Verificar que escucha en los puertos correctos:

```bash
docker ps | grep traefik
# DEBE mostrar:  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp
```

Si Traefik arranca pero **no publica 80/443**, el problema es el firewall del VPS
(ver paso 5) o la config de puertos de Dokploy.

---

## 4. Levantar Supabase (si está caído)

Forma recomendada — **desde el panel Dokploy** (más seguro que tocar compose a mano):

1. `panel.linkstation.ai:3000` → Projects → proyecto **dev LinkStation**.
2. Tarjeta **supabase** → entrar → **Deploy** (o Redeploy).
3. Esperar a que los contenedores `supabase-*` pasen a **Running (Healthy)**.
   - `supabase-db` y `supabase-kong` Healthy son los críticos.
   - `storage`/`vector`/`realtime` pueden tardar o quedar Unhealthy un rato al arrancar.

Equivalente por terminal (si el panel no responde):

```bash
cd /etc/dokploy/compose/dev-linkstation-supabase-*/code
docker compose -f infra/supabase-vps/docker-compose.yml up -d
```

> ⚠️ **NO ejecutes `docker compose up` sin `-f infra/supabase-vps/docker-compose.yml`.**
> El `docker-compose.yml` en la RAÍZ de ese `code/` define `dashboard`+`worker`+`redis`
> (la app, con `build: Dockerfile`), NO el stack Supabase. Un `up` a secas en ese
> directorio dispara `npm run build` y falla (`exit code 1`). El stack Supabase real
> vive SIEMPRE en `infra/supabase-vps/docker-compose.yml` (verificado 09-06-2026:
> `supabase-db` tiene label `config_files=.../code/infra/supabase-vps/docker-compose.yml`).

### Caso `supabase-db` Exited → auth/storage/realtime en bucle (incidente 09-06-2026 PM)

Síntoma: `supabase-auth`/`storage`/`realtime` en **Restarting** con log
`hostname resolving error (lookup supabase-db ...: server misbehaving)`. Causa:
**`supabase-db` quedó `Exited (255)`** tras el crash y nadie lo relevantó →
los demás no resuelven su hostname (no está en la red). Fix rápido sin redeploy:

```bash
docker start supabase-db          # arranca en ~12s → "Up (healthy)"
sleep 25                          # auth/storage reintentan solos y se recuperan
docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -E 'supabase|realtime'
```

Verás `supabase-db`, `supabase-auth` y `supabase-storage` → **healthy**.
`realtime-dev` puede seguir en bucle por un fallo propio de migraciones
(`invalid_schema_name: no schema has been selected`) y `supabase-vector` quedar
`unhealthy` (logging) — **ninguno de los dos es crítico** para login/app/leads.

**Fix de `realtime-dev`** (causa confirmada 09-06-2026): el contenedor arranca con
`DB_AFTER_CONNECT_QUERY=SET search_path TO _realtime`, pero en la DB solo existe el
schema `realtime` (sin guion bajo), no `_realtime`. La forma correcta de arreglarlo es
**redeploy del stack supabase** (re-ejecuta los init scripts oficiales que crean
`_realtime`):

```bash
cd /etc/dokploy/compose/dev-linkstation-supabase-*/code
docker compose -f infra/supabase-vps/docker-compose.yml up -d --force-recreate realtime-dev.supabase-realtime
```

(Evitar crear el schema a mano en la DB de prod salvo emergencia — preferir el init
script oficial.)

---

## 5. Si Traefik corre pero los puertos siguen sin responder → firewall Hetzner

```bash
# ¿El SO escucha en 80/443?
ss -tlnp | grep -E ':80|:443'
```

- Si NADA escucha en 80/443 → Traefik no publicó los puertos (volver al paso 3).
- Si SÍ escuchan pero desde fuera no se llega → **firewall de Hetzner** bloquea 80/443.
  Abrir en: Hetzner Cloud Console → Firewalls → reglas inbound TCP 80 y 443.

---

## 6. Verificación final (en orden)

```bash
# 1. Traefik vivo y con puertos
docker ps | grep traefik

# 2. Supabase Kong vivo
docker ps | grep supabase-kong

# 3. App dev.dash viva
docker ps | grep devdash
```

En el navegador:

1. `https://dev.linkstation.ai/supabase/` → debe responder (Kong), NO connection refused.
2. `https://dev.linkstation.ai/api/health` → JSON 200.
3. `https://dev.linkstation.ai/` → login de la app.

Si los 3 responden → **recuperado.** ✅

---

## 7. App dev.dash en bucle `Exited (143)`

Si tras todo lo anterior la app `app-linkstation-devdash-*` sigue reiniciándose:

```bash
docker ps -a | grep devdash               # ver cuántos Exited hay
docker logs <container-id-del-Exited> --tail 50   # ver POR QUÉ murió
```

Causas típicas del 143 (SIGTERM):

- No alcanzaba `supabase-db` (si la BD estaba caída). → Debería resolverse con Supabase arriba.
- Falta una env var crítica → revisar pestaña Environment (ver `dokploy-env-vps.env`).
- OOM (sin RAM) → ver paso 2.

Redeploy limpio de la app: panel → dev.dash → **Redeploy** (Clean Cache ON).

---

## 8. Prevención (para que no vuelva a pasar)

- Verificar que los servicios tienen **restart policy** `unless-stopped` o `always`
  (así sobreviven a un reinicio del servidor).
- Monitorizar disco: alerta cuando `/` supere el 80%.
- El stack Supabase es docker-compose manual — confirmar que Dokploy lo relanza tras reboot,
  o añadirlo a un arranque automático.

---

## Referencias

- Memoria: `project-deploy-vps-dokploy-090626` (estado del deploy + diagnóstico).
- Vault envs VPS: `infra/supabase-vps/.vault/dokploy-env-vps.env` (gitignored).
- Compose Supabase: `infra/supabase-vps/docker-compose.yml`.
- Acceso SSH/KVM: `infra/supabase-vps/.vault/ssh-vps.env` (gitignored).
- Config Traefik dinámica en el VPS: `/etc/dokploy/traefik/` (⚠️ NO editar a ciegas).
