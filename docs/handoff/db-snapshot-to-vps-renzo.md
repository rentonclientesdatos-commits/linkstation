---
title: "Snapshot de BD local → VPS dev.linkstation.ai (Dokploy)"
audience: Renzo (dev VPS)
status: handoff document
date: 2026-05-22
updated: 2026-05-22 (adaptado a Dokploy, no Easypanel)
---

# Snapshot de BD local → VPS `dev.linkstation.ai`

> Instrucciones para **Renzo** sobre cómo restaurar el snapshot de BD local de Javi en el VPS de desarrollo gestionado con **Dokploy**.
>
> **Contexto**: Javi tiene una Supabase self-hosted (Docker local) con datos de prueba. Te lo pasa cifrado para que lo cargues en el Postgres del VPS apuntado por `dev.linkstation.ai` (rama `developer`).

---

## 1. Qué vas a recibir

Un único archivo ZIP cifrado vía WhatsApp:

| Item | Tamaño | Cómo se abre |
|---|---|---|
| `linkstation-bd-handoff-YYYYMMDD-HHmm.zip` | ~100 KB | Cualquier descompresor (Windows nativo, 7-Zip, WinRAR, `unzip`) con la password que te dará Javi por canal aparte |

**Password del ZIP**: Javi te la da por canal aparte (Signal / llamada / mensaje aparte).

Contenido del ZIP:

```
linkstation-bd-handoff-YYYYMMDD-HHmm.zip
├── linkstation-snapshot-YYYYMMDD-HHmm.dump.gz    ← El dump de BD comprimido
├── linkstation-snapshot-YYYYMMDD-HHmm.sha256     ← Hash SHA256 para verificar integridad
├── INSTRUCCIONES-RENZO.md                          ← Esta guía en markdown
├── INSTRUCCIONES-RENZO.html                        ← Misma guía en HTML autocontenido
└── README.txt                                      ← Léeme primero
```

---

## 2. Requisitos previos en el VPS

Acceso SSH al VPS donde corre Dokploy + Docker disponible (Dokploy ya lo usa).

```bash
# Postgres client tools (pg_restore) - opcional, solo si quieres restaurar desde el host
# La guía usa docker exec, así que NO es estrictamente necesario instalarlo
sudo apt update && sudo apt install -y postgresql-client

# Verificar versiones
docker --version
pg_restore --version    # opcional, >= 14
unzip -v | head -1      # para extraer el ZIP
```

---

## 3. Pasos de restauración

### 3.1. Descargar el ZIP de WhatsApp y extraerlo

Desde tu máquina local (no el VPS):

```bash
# Descomprime el ZIP — te pedirá la password que te dio Javi
unzip linkstation-bd-handoff-YYYYMMDD-HHmm.zip -d ./linkstation-handoff/
# Password: <la que te dio Javi por canal aparte>

cd linkstation-handoff/
ls
# Verás: .dump.gz, .sha256, INSTRUCCIONES-RENZO.md, INSTRUCCIONES-RENZO.html, README.txt
```

En Windows puedes hacer doble click al ZIP, te pide password, y arrastras los archivos a una carpeta.

### 3.2. Subir el `.dump.gz` al VPS

```bash
# Usando scp (ajusta usuario/host de tu VPS Dokploy)
scp linkstation-snapshot-YYYYMMDD-HHmm.dump.gz user@vps-host:/tmp/
scp linkstation-snapshot-YYYYMMDD-HHmm.sha256   user@vps-host:/tmp/
```

### 3.3. Verificar integridad en el VPS

```bash
ssh user@vps-host
cd /tmp
sha256sum -c linkstation-snapshot-YYYYMMDD-HHmm.sha256
# Debe imprimir:  linkstation-snapshot-...dump.gz: OK
```

Si dice `FAILED`, avisa a Javi y NO restaures — el archivo se corrompió en tránsito (vuelve a 3.2).

### 3.4. Identificar el container Postgres en Dokploy

Dokploy nombra sus containers como `<project>-<service>-<id>` o similar. Identifica el del Postgres del proyecto `linkstation`:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | grep -iE "postgres|supabase"
```

Anota el nombre exacto del container Postgres. Lo llamaremos `$PG_CONTAINER` en los siguientes pasos.

Si Dokploy gestiona el Postgres como **Database resource** (no como parte de un Compose):

```bash
# Dokploy a veces nombra DBs como: <project-name>-postgres-<random>
docker ps | grep -i "linkstation"
```

### 3.5. Preparar la BD destino (limpieza si procede)

Antes de restaurar, decide si la BD destino tiene datos que conservar:

```bash
# Listar bases dentro del Postgres del container
docker exec -it $PG_CONTAINER psql -U postgres -c "\l"

# Si la BD `postgres` está vacía o solo tiene datos de pruebas previos que NO quieres conservar:
# (el restore con --clean ya los borrará, pero por seguridad puedes hacer backup)
docker exec -it $PG_CONTAINER pg_dump -U postgres -d postgres -Fc -f /tmp/pre-restore-backup.dump
docker cp $PG_CONTAINER:/tmp/pre-restore-backup.dump /tmp/
```

> ⚠️ **Este flujo es para `dev.linkstation.ai`** (entorno de DESARROLLO). Si por error apuntas a una BD de producción, AVISA A JAVI ANTES DE EJECUTAR EL RESTORE.

### 3.6. Ejecutar el `pg_restore` vía docker exec

Este es el comando clave. Pipea el `.dump.gz` directamente al `pg_restore` dentro del container, sin necesidad de copiar el archivo al container ni descomprimir en disco:

```bash
gunzip -c /tmp/linkstation-snapshot-YYYYMMDD-HHmm.dump.gz | \
  docker exec -i $PG_CONTAINER pg_restore \
    -U postgres \
    -d postgres \
    --no-owner \
    --no-privileges \
    --clean --if-exists \
    --verbose
```

Flags explicados:

- `--no-owner --no-privileges`: ignora ownership del dump original (Javi usa otros usuarios locales). Postgres del VPS asignará al usuario que ejecuta el restore.
- `--clean --if-exists`: dropea objetos antes de recrearlos. Reemplazo total.
- `--verbose`: log detallado para ver qué tablas se están restaurando.

**Errores esperados que puedes IGNORAR** (Supabase los pone por defecto):

- `role "supabase_admin" does not exist` → ignora si el VPS no tiene esos roles auxiliares
- `extension "pg_stat_statements" already exists` → ignora
- `permission denied for schema auth` → solo si NO eres superuser. Con postgres user del container debería estar OK.

**Errores que SÍ son problema**:

- `out of memory` → más RAM al container Postgres (Dokploy → Database → Resources)
- `connection refused` → container no está corriendo o el nombre es incorrecto
- `relation "X" already exists` (sin `--clean`) → la BD no estaba limpia. Borra y reintenta.

### 3.7. Verificación post-restore

```bash
# Contar filas en tablas principales
docker exec $PG_CONTAINER psql -U postgres -d postgres -c "
  SELECT 
    schemaname, 
    relname AS tablename, 
    n_live_tup AS rows
  FROM pg_stat_user_tables 
  ORDER BY n_live_tup DESC 
  LIMIT 20;
"

# Verificar que RLS está activo en tablas multi-tenant
docker exec $PG_CONTAINER psql -U postgres -d postgres -c "
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' AND rowsecurity = true;
"
```

Debe listar al menos `tenants`, `knowledge_base`, `users` con `rowsecurity = true` (las migraciones Sprint 0 lo activan).

---

## 4. Configurar `dev.linkstation.ai` en Dokploy

Dentro del dashboard Dokploy (`https://<tu-dokploy-host>`):

### 4.1. Crear/editar el Application del Next.js

1. **Project**: `linkstation` (créalo si no existe)
2. **Application** (servicio Next.js) → tab **General**:
   - **Source**: Git repository
   - **Repository**: el remote del equipo (NO `LinkStation/linkstation-dashboard`, ver memoria/CLAUDE.md)
   - **Branch**: `developer` ← MUY IMPORTANTE, no `main` ni `staging`
   - **Build Path**: `/`
   - **Build Type**: Dockerfile / Nixpacks (lo que tengas configurado)

### 4.2. Variables de entorno

Tab **Environment** del Application:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<supabase-vps-host-o-internal>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-del-supabase-vps>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-del-supabase-vps>
DATABASE_URL=postgresql://postgres:<password>@<postgres-host-interno>:5432/postgres
NEXT_PUBLIC_APP_URL=https://dev.linkstation.ai
NODE_ENV=production
```

> **Cómo obtener las keys de Supabase**: en Dokploy, si tienes Supabase desplegado como Compose, las keys están en su `docker-compose.yml` o en el Environment del servicio `auth`/`rest`. Si tu Postgres NO está dentro de un stack Supabase completo (solo Postgres pelado), avisa — el plan original asume Supabase completo (no solo Postgres).

> **Hostname interno**: en Dokploy los servicios se ven entre sí por su nombre de container. Si tu Postgres se llama `linkstation-postgres-xyz`, en el DATABASE_URL del Next.js usas ese hostname (sin puerto externo, puerto interno 5432).

### 4.3. Dominio

Tab **Domains** del Application:

- **Host**: `dev.linkstation.ai`
- **Path**: `/`
- **Port**: `3000` (o el que exponga tu Next.js)
- **HTTPS**: ON (Dokploy usa Traefik + Let's Encrypt automático)
- **Certificate Provider**: Let's Encrypt
- **HTTP → HTTPS redirect**: ON

DNS previo: en tu proveedor de DNS, crea un registro `A` o `CNAME`:

```
dev.linkstation.ai    A    <IP-pública-del-VPS-Dokploy>
```

Espera 1–5 min a la propagación + emisión del cert.

### 4.4. Deploy

Tab **Deployments** → click **Deploy**. Mira los logs:

- Build OK → ✓
- Container starts → ✓
- Healthcheck pasa → ✓

### 4.5. Smoke test

```bash
# Desde tu máquina local
curl -I https://dev.linkstation.ai
# Debe responder: HTTP/2 200  o  HTTP/2 307 (redirect a /login)

# Si responde 502/503 → el container del Next.js no está arriba todavía. Espera 30s y reintenta.
# Si responde 404 → revisa Domains config (Host correcto, Port correcto).
```

Abre en navegador `https://dev.linkstation.ai` y comprueba:

- Carga la home / login.
- Login con un usuario demo (Javi te dirá cuál tras el restore).
- Selector de tenant aparece poblado (los tenants del dump están).

---

## 5. Limpieza tras restaurar OK

```bash
# En el VPS
rm /tmp/linkstation-snapshot-*.dump.gz
rm /tmp/linkstation-snapshot-*.sha256
# (Mantén /tmp/pre-restore-backup.dump si lo hiciste, por si acaso 1-2 días)

# Avisa a Javi: "Restore OK en VPS, BD operativa en dev.linkstation.ai.
#                 Borra tu copia local del .zip"
```

---

## 6. Si algo falla

1. **Captura el error completo** del `pg_restore` (stdout + stderr).
2. Comparte con Javi por el canal habitual de equipo.
3. **No reintentes restore parcial** sobre BD a medias — borra y empieza limpio (paso 3.5).

Para debugging detallado:

```bash
# Listar contenido del dump sin restaurar
gunzip -c /tmp/linkstation-snapshot-*.dump.gz | docker exec -i $PG_CONTAINER pg_restore --list | head -50

# Restaurar SOLO una tabla concreta (útil para diagnosticar tabla problemática)
gunzip -c /tmp/linkstation-snapshot-*.dump.gz | \
  docker exec -i $PG_CONTAINER pg_restore \
    -U postgres -d postgres \
    --no-owner --no-privileges \
    --table=tenants \
    --data-only
```

---

## 7. Próximos pasos (post-Sprint 0)

Este flujo (snapshot manual) es **temporal**. En Sprint 1 (capa de datos) formalizaremos:

- `supabase/migrations/` versionadas → reproducible desde git en cualquier deploy
- `supabase/seed.sql` con datos demo no sensibles → reproducible desde git
- Pipeline Dokploy que aplique migrations automáticamente en cada deploy a `developer`

Ver `plans/260520-1342-sprint-1-capa-datos/` para detalles.
