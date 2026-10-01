# Informe de Seguridad y Hardening — VPS Hetzner (46.62.193.169)

**Fecha**: 10-06-2026 | **Alcance**: ayer (09-06) + hoy (10-06, 2 sesiones) | **Autor**: equipo AF
**Servidor**: Ubuntu 24.04.4 LTS, kernel 6.8.0-124, Dokploy + Docker Swarm 29.5.2

---

## 1. Resumen ejecutivo

Tras dos caídas consecutivas del VPS (09-06 y 10-06), el servidor queda **recuperado, endurecido y con persistencia verificada mediante reboot real**. Se identificó la causa raíz de ambas caídas, se cerró la superficie de ataque expuesta (panel de administración y puertos de cluster accesibles desde internet), se endureció SSH/kernel/Docker, y se validó con un checklist de 13 puntos post-reboot.

**Estado final**: 0 findings críticos abiertos. Stack 100% healthy. Hardening persistente.

---

## 2. Cronología y causas raíz de las 2 caídas

### Caída 1 — 09-06-2026 (resuelta ayer)

- **Causa raíz**: Docker se auto-actualizó a 29.5.2 (API mínima 1.44). El Traefik antiguo usaba API client 1.24 → no podía leer los providers → no enrutaba → todos los dominios `ERR_CONNECTION_REFUSED`.
- **Fix**: recrear `dokploy-traefik` con **traefik:v3.6.1** (auto-negocia versión de API). Runbook en `docs/handoff/recuperacion-traefik-vps-caido.md`.
- **Prevención aplicada ayer**: `apt-mark hold` de los 6 paquetes Docker + blacklist en unattended-upgrades.

### Caída 2 — 10-06-2026 (hoy)

- El usuario restauró el **snapshot de Hetzner del 09-06 ~13:29** (el journal del boot anterior termina exactamente a las 13:29:58 del 09-06).
- **Consecuencia 1**: los holds de Docker y la blacklist se aplicaron ayer DESPUÉS de la hora del snapshot → **la restauración los borró**. El servidor volvió a quedar expuesto a una re-actualización automática de Docker.
- **Consecuencia 2**: toda la evidencia forense de la caída de hoy (logs entre 09-06 13:30 y 10-06 15:34) **quedó destruida por la restauración del disco**. La causa exacta de la caída 2 es indeterminable desde el servidor.
- **Lección**: restaurar snapshot completo ante un fallo de servicio pierde fixes recientes Y evidencia. Preferir reparación dirigida (runbook) y dejar el snapshot como último recurso.

---

## 3. Trabajo realizado — 10-06 Sesión 1 (hardening base)

| ID  | Severidad  | Finding                                                                                                            | Fix aplicado                                                                                                                            | Persistencia                              |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| F1  | 🔴 Crítica | Holds Docker perdidos por restore (riesgo recaída Traefik)                                                         | Re-`apt-mark hold` 6 paquetes + re-blacklist unattended-upgrades                                                                        | apt (disco) ✅                            |
| F2  | 🔴 Crítica | Panel Dokploy `:3000` (sin TLS) y puertos Swarm 2377/7946/4789 **expuestos a internet** (Docker/Swarm bypassa UFW) | Bloqueo en `iptables -t raw PREROUTING` desde eth0 + acceso panel SOLO vía `panel.linkstation.ai` (HTTPS/Traefik)              | systemd `af-docker-user-rules.service` ✅ |
| F3  | 🟠 Alta    | SSH con password auth + ataque activo (95 intentos fallidos, 14 baneos)                                            | `PermitRootLogin prohibit-password`, `MaxAuthTries 3`, X11 off, ClientAlive. Password auth se mantiene como fallback (decisión usuario) | drop-in sshd_config.d ✅                  |
| F4  | 🟡 Media   | Docker daemon sin hardening                                                                                        | `daemon.json`: `no-new-privileges: true` + log rotation 10m×3                                                                           | fichero ✅                                |
| F5  | 🟡 Media   | sshd laxa (maxauthtries 6, X11 on)                                                                                 | incluido en F3                                                                                                                          | ✅                                        |
| F6  | 🟢 Baja    | 9 paquetes desactualizados                                                                                         | `apt upgrade` (openssl/libssl, apparmor, vim, snapd, cloud-init). Docker excluido por hold                                              | ✅                                        |

**Incidencias durante la sesión 1 (resueltas)**:

- `live-restore: true` en daemon.json **rompió el arranque de Docker** tras el primer reboot (es incompatible con Swarm; el `reload` lo había aceptado pero el arranque en frío no). Retirado → Docker arranca limpio. _Lección: nunca live-restore en hosts Swarm._
- Las primeras reglas de firewall en chain `DOCKER-USER` **no filtraban nada** (0 hits): Swarm publica puertos vía ingress/IPVS que se salta esa chain. Migradas a `raw PREROUTING` y **verificadas con curl externo real** (no loopback). _Lección: verificar bloqueos desde fuera._

## 4. Trabajo realizado — 10-06 Sesión 1 (servicios degradados)

| Servicio           | Problema                              | Causa raíz                                                                                                                                                                                 | Fix                                                                                                          |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `realtime-dev`     | Bucle Restarting desde hace días      | Schema `_realtime` inexistente (`DB_AFTER_CONNECT_QUERY=SET search_path TO _realtime` → error 3F000 al migrar)                                                                             | `CREATE SCHEMA _realtime` como `supabase_admin` (con `-U postgres` falla por SET ROLE). Persistente en BD ✅ |
| `supabase-storage` | Unhealthy permanente (falso positivo) | Healthcheck `wget localhost:5000` resolvía a `::1` (IPv6); storage solo escucha IPv4                                                                                                       | Healthcheck → `127.0.0.1:5000`. Aplicado en repo (`infra/supabase-vps/docker-compose.yml`) y en VPS          |
| `supabase-vector`  | Unhealthy permanente                  | Bind-mount de fichero único: los `git pull` de Dokploy reemplazan `vector.yml` con **inode nuevo** → el contenedor (creado 09-06) seguía leyendo el config viejo de demo, sin API en :9001 | Contenedor recreado → monta el `vector.yml` actual con `api.enabled: 0.0.0.0:9001`                           |

**Incidencia detectada y resuelta**: a las 17:08 un redeploy de Dokploy (push de otra sesión a `developer`) hizo `git pull` y revirtió temporalmente el fix de storage en el VPS. Se re-aplicó en el momento y se resolvió de forma definitiva llevando los fixes al repositorio (commit `67346e8`, PR #28 — ver §7 Cierre de la intervención).

## 5. Trabajo realizado — 10-06 Sesión 2 (auditoría exhaustiva + hardening fino)

### 5.1 Auditoría de riesgo por auto-updates (petición expresa)

| Componente                                   | ¿Puede auto-actualizarse y tumbar el server?                                                                                                                                                        | Estado                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docker Engine (apt)**                      | ERA el riesgo nº1 (causó la caída 1)                                                                                                                                                                | 🟢 Mitigado: hold + blacklist. Verificado post-reboot                                                                                                |
| **unattended-upgrades**                      | Solo security de Ubuntu; Docker blacklisted; `Automatic-Reboot` **desactivado** (no se reinicia solo)                                                                                               | 🟢 Seguro                                                                                                                                            |
| **snapd**                                    | Auto-refresh agresivo por diseño, PERO **0 snaps instalados**                                                                                                                                       | 🟢 **DESINSTALADO 10-06-2026** (`apt purge snapd lxd-installer` + hold). ~130 MB liberados. Docker y 15 contenedores verificados intactos post-purga |
| **Watchtower/auto-updaters de contenedores** | No instalados                                                                                                                                                                                       | 🟢 N/A                                                                                                                                               |
| **Imágenes Docker**                          | Todas pinneadas a versión exacta (supabase v2.188.1, traefik v3.6.1, dokploy v0.29.8…). Excepciones: `redis:7`, `redis:8`, `postgres:16` (tag de major — solo driftan en redeploy manual, no solas) | 🟢 Bajo                                                                                                                                              |
| **Dokploy**                                  | No se auto-actualiza (update manual desde panel)                                                                                                                                                    | 🟢 Bajo                                                                                                                                              |
| **⚠️ Traefik vía Dokploy**                   | Si desde el panel Dokploy se "recrea/resetea" Traefik, podría recrearlo con SU versión vieja en vez de v3.6.1                                                                                       | 🟡 Riesgo residual: NO usar el botón de reset de Traefik del panel; si Traefik cae, usar el runbook (docker run con v3.6.1)                          |
| **Kernel Ubuntu**                            | Security updates instalan kernel nuevo pero NO se aplica hasta reboot manual (Automatic-Reboot off, livepatch no instalado)                                                                         | 🟢 Controlado                                                                                                                                        |

### 5.2 Hardening fino aplicado

- **sysctl** (`/etc/sysctl.d/99-af-hardening.conf` + `/etc/ufw/sysctl.conf`): ICMP redirects off (send/accept, v4/v6), `log_martians=1` (UFW lo pisaba a 0 — corregido en la capa UFW), `tcp_rfc1337=1`, `icmp_ignore_bogus=1`, `fs.suid_dumpable=0`. **Sin tocar** `ip_forward`/`rp_filter`/bridge-nf (los necesita Docker/Swarm).
- **apport deshabilitado** (crash-reporter de escritorio; reseteaba `suid_dumpable=2` en cada boot).
- **fail2ban**: jail `sshd` endurecida (maxretry 4, findtime 10m, bantime 1h) + **jail `recidive`** nueva: reincidentes → ban de 1 semana vía UFW.
- **Auto-recuperación ante cuelgue** (añadido sesión 2 final): `kernel.panic=10` + `kernel.panic_on_oops=1` — si el kernel entra en pánico (posible causa del crash indeterminado de hoy), el servidor **se reinicia solo a los 10 s** en vez de quedarse muerto hasta inspección manual.
- **Journal persistente** (añadido sesión 2 final): `Storage=persistent` con tope 500M — los logs **sobreviven reinicios**: la próxima caída dejará evidencia forense aunque haya reboot.
- Verificado ya existente y correcto: AppArmor enforce, NTP sync, permisos de `/etc/shadow`/host keys/authorized_keys, 0 contenedores privilegiados, 0 capabilities extra, Kong admin (:8001) NO publicado al host, UFW default-deny.

### 5.3 Validación de persistencia — reboot real + checklist 13 puntos

Reboot ejecutado 17:21 UTC. Servidor arriba en ~47s. Resultado:

| #   | Check                                                                  | Resultado                                                                                                 |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 01  | SSH por key (BatchMode)                                                | ✅                                                                                                        |
| 02  | Docker activo                                                          | ✅                                                                                                        |
| 03  | Holds Docker 6/6                                                       | ✅                                                                                                        |
| 04  | Blacklist unattended-upgrades                                          | ✅                                                                                                        |
| 05  | Firewall raw 5/5 + servicio systemd activo                             | ✅                                                                                                        |
| 06  | UFW activo                                                             | ✅                                                                                                        |
| 07  | sshd endurecido efectivo                                               | ✅                                                                                                        |
| 08  | daemon.json (no-new-privileges, log limits)                            | ✅                                                                                                        |
| 09  | sysctl                                                                 | ✅ tras fix UFW/apport (2 valores los pisaban servicios post-boot; corregido y re-verificado en caliente) |
| 10  | fail2ban 2 jails (sshd + recidive)                                     | ✅                                                                                                        |
| 11  | Schema `_realtime` en BD                                               | ✅                                                                                                        |
| 12  | Stack contenedores                                                     | ✅ todos Up; storage/vector recreados → healthy                                                           |
| 13  | Endpoints (dev.dash 307, panel 200, supabase, :3000 bloqueado externo) | ✅                                                                                                        |

---

## 6. Estado ACTUAL de las correcciones (snapshot vivo 10-06-2026 ~20:00 UTC, uptime 27 min)

Verificación en tiempo real contra el servidor, corrección por corrección:

| Corrección                           | Estado vivo verificado                                                                                                        | Dónde vive                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Holds Docker (anti caída-1)          | ✅ **6/6 paquetes holdeados** (`docker-ce`, cli, containerd, rootless, buildx, compose-plugin)                                | apt en disco                                                  |
| Blacklist unattended-upgrades        | ✅ 6 entradas docker activas                                                                                                  | `/etc/apt/apt.conf.d/50unattended-upgrades`                   |
| Bloqueo :3000 + Swarm al exterior    | ✅ **5/5 reglas raw activas**, servicio `enabled/active`, verificado bloqueado con curl externo                               | `/usr/local/sbin/af-docker-user-rules.sh` + systemd           |
| SSH endurecido                       | ✅ `permitrootlogin without-password`, `maxauthtries 3`, `x11forwarding no` (password auth fallback activo, decisión usuario) | `/etc/ssh/sshd_config.d/99-af-hardening.conf`                 |
| fail2ban                             | ✅ 2 jails (`sshd` + `recidive`), **11 IPs baneadas ahora mismo** — los ataques continúan y se bloquean solos                 | `/etc/fail2ban/jail.d/af-hardening.conf`                      |
| Docker daemon hardening              | ✅ `no-new-privileges=true`, log rotation 10m×3 (sin live-restore — incompatible Swarm)                                       | `/etc/docker/daemon.json`                                     |
| sysctl red/kernel                    | ✅ `send_redirects=0`, `log_martians=1`, `suid_dumpable=0`, `tcp_rfc1337=1`                                                   | `/etc/sysctl.d/99-af-hardening.conf` + `/etc/ufw/sysctl.conf` |
| Auto-recuperación ante cuelgue       | ✅ `kernel.panic=10`, `panic_on_oops=1` — reboot automático en 10 s si el kernel se cuelga                                    | sysctl drop-in                                                |
| Journal persistente (forense)        | ✅ `Storage=persistent` (tope 500M) — logs sobreviven reinicios                                                               | `/etc/systemd/journald.conf.d/af-persistent.conf`             |
| apport deshabilitado                 | ✅ `disabled` (ya no pisa suid_dumpable en cada boot)                                                                         | systemd                                                       |
| Schema `_realtime`                   | ✅ presente en BD (persistente) — realtime healthy                                                                            | Postgres                                                      |
| Healthcheck storage (127.0.0.1)      | ✅ aplicado en repo local + compose VPS — storage **healthy**                                                                 | `infra/supabase-vps/docker-compose.yml`                       |
| Vector `--config` + healthcheck IPv4 | ✅ aplicado en repo local + compose VPS — vector **healthy por primera vez**                                                  | `infra/supabase-vps/docker-compose.yml`                       |
| Stack completo                       | ✅ **16/16 contenedores Up, 0 unhealthy/restarting**                                                                          | —                                                             |
| Updates SO (openssl, apparmor…)      | ✅ instalados, reboot de consolidación ya ejecutado                                                                           | —                                                             |

---

## 7. Cierre de la intervención

**Todas las correcciones de seguridad y estabilidad están aplicadas, activas y verificadas en el servidor** (tabla anterior, comprobada en vivo). No queda ningún problema de seguridad abierto.

Como parte del cierre, los fixes del fichero `infra/supabase-vps/docker-compose.yml` se han llevado también al repositorio para que queden consolidados en la rama `developer`:

- ✅ Commit `67346e8` creado en rama `fix/supabase-compose-healthchecks-vector`
- ✅ PR **#28** abierto y listo: <https://github.com/LinkStation/linkstation-dashboard/pull/28>
- 🔘 Merge del PR — paso administrativo final, reservado a aprobación humana por política del proyecto (las ramas se mergean solo con confirmación manual). Los fixes **ya están funcionando en el VPS**; el merge únicamente consolida que cualquier redeploy futuro despliegue el fichero ya corregido.

---

## 8. Guía operativa para mantener el servidor blindado

Reglas de oro derivadas de esta intervención (no son tareas pendientes — son la forma correcta de operar a partir de ahora):

| Regla                                                                                                                                       | Por qué                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Ante una futura caída: **runbook primero** (`docs/handoff/recuperacion-traefik-vps-caido.md`), snapshot de Hetzner solo como último recurso | El restore del 10-06 borró las protecciones aplicadas el día anterior y la evidencia forense de la caída              |
| **No usar el botón reset/recreate de Traefik** del panel Dokploy                                                                            | Recrearía Traefik con una versión antigua incompatible con Docker 29; si Traefik cae, el runbook lo recrea con v3.6.1 |
| Si algún día hay que **actualizar Docker a propósito**: `apt-mark unhold`, actualizar, y recrear Traefik v3.6.1+ después                    | El hold es la protección anti caída-1; quitarlo sin recrear Traefik repetiría el incidente                            |
| Tras restaurar cualquier snapshot: verificar `apt-mark showhold` (6 paquetes docker)                                                        | Un snapshot anterior a las protecciones las elimina silenciosamente                                                   |

### Mejoras futuras opcionales (el servidor NO las necesita para estar seguro hoy)

- **Monitorización externa de uptime** (UptimeRobot / alertas Hetzner → email): para enterarse de una caída en minutos en vez de descubrirla manualmente.
- **`auditd` + alertas de log**: trazabilidad forense ampliada — encaja con el plan Logflare ya asignado a Sprint 7 Refinamiento.
- ~~**Desinstalar `snapd`** (0 snaps en uso): reducción de superficie marginal.~~ ✅ **HECHO 10-06-2026** — purgado `snapd` + `lxd-installer`, hold aplicado, ~130 MB liberados, Docker/15 contenedores verificados intactos.

---

## 9. Postura de seguridad final

- **Superficie de red expuesta**: solo 22 (SSH con fail2ban+recidive), 80/443 (Traefik con TLS Let's Encrypt válido hasta 20-08-2026). Panel de administración y puertos de cluster cerrados al exterior.
- **Acceso**: key-based root (password solo como fallback consciente), usuario `deploy` secundario con su propia key.
- **Anti-recaída**: Docker congelado en 29.5.2 + Traefik v3.6.1 auto-negociador + reboot automático de apt desactivado + 0 auto-updaters.
- **Contenedores**: 0 privilegiados, imágenes pinneadas, logs rotados, no-new-privileges.
- **Kernel/red**: sysctl endurecido sin romper Swarm, AppArmor enforce, martians logueados.
- **Resiliencia validada**: reboot completo → todo vuelve solo en <3 min, hardening intacto.
