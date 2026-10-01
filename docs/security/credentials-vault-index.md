---
title: "Credentials Vault Index — linkstation"
date: 2026-05-26
maintainer: Javi HP
purpose: "Índice de DÓNDE vive cada credencial del proyecto. NUNCA contiene valores reales."
policy: "CLAUDE.md global → Password & Credential Policy, regla 5"
---

# Credentials Vault Index — linkstation

> **REGLA INVIOLABLE**: este fichero **NUNCA** contiene valores reales de credenciales.
> Solo indica **dónde están guardadas** (ruta del vault, env var en panel del proveedor, KMS).
> Si alguna vez encuentras un valor real aquí → es un incidente de seguridad: rotar credencial + borrar el valor de este fichero + investigar cómo llegó.

## Inventario de credenciales del proyecto

| Credencial                                          | Tipo                                              | Dónde vive el valor real                                                                     | Dónde se consume                                                                                   | Última rotación                                                                                   |
| --------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Sentry DSN (`linkstation`)**                     | Public DSN (no es secreto crítico, va al browser) | `.env.local` (gitignored)                                                                    | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`                      | 26-05-2026 (creación)                                                                             |
| **Sentry Auth Token (source maps)**                 | Secret token                                      | PENDIENTE de generar — futuro `infra/supabase-vps/.vault/sentry-auth-token.env` (gitignored) | Dokploy build args (`SENTRY_AUTH_TOKEN`)                                                           | —                                                                                                 |
| **Supabase service_role JWT (DEV VPS)**             | JWT bypass RLS                                    | `infra/supabase-vps/.vault/dev-dash-envs.env` (gitignored)                                   | `.env.local` o Dokploy env vars panel                                                              | Tras hotfix Sprint 0 (F-05-SEC-001)                                                               |
| **Supabase service_role JWT (PROD cliente)**        | JWT bypass RLS                                    | `.env.production-readonly` (gitignored, prefijo `PROD_*` evita carga accidental)             | NO se carga en local; consulta puntual con cliente SQL externo                                     | Gestionado por cliente LinkStation                                                       |
| **Supabase JWT secret (firma sesiones)**            | HMAC secret                                       | `infra/supabase-vps/.vault/dev-dash-envs.env`                                                | Supabase auth server (interno VPS)                                                                 | Tras Sprint 0                                                                                     |
| **SSH key VPS Hetzner**                             | OpenSSH ed25519 keypair                           | `infra/supabase-vps/.vault/linkstation-vps-key` (privada) + `.pub`                          | `infra/supabase-vps/scripts/ssh-vps.sh`                                                            | Generada 22-05-2026; key denegada por servidor desde 25-05-2026 (usar pg-meta REST como fallback) |
| **VPS root password Hetzner**                       | Server credential                                 | Vault personal del propietario (1Password / Bitwarden de Renzo, dueño VPS)                   | Login emergencia panel Hetzner                                                                     | Gestionado por Renzo                                                                              |
| **Dokploy panel (`panel.linkstation.ai`)** | User+password admin del panel deploy              | **VAULT PERSONAL del propietario (1Password / Bitwarden de Javi HP)** — NUNCA en repo        | Login manual humano supervisado (CLAUDE.md prohíbe que Claude se autentique en paneles de cliente) | **DEBE ROTARSE — expuesta en chat 26-05-2026 ~17:00**                                             |
| **HubSpot Client ID + Secret (OAuth Public App)**   | OAuth credentials multi-tenant                    | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | `src/lib/integrations/hubspot/*`                                                                   | Pendiente registrar app en developers.hubspot.com (Sprint 2)                                      |
| **Zoho Client ID + Secret**                         | OAuth credentials multi-DC                        | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | `src/lib/integrations/zoho/*`                                                                      | Pendiente registrar (Sprint 2)                                                                    |
| **`OAUTH_STATE_SECRET`**                            | HMAC-SHA256 secret (32 bytes base64url)           | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | `src/lib/oauth/state.ts` para firmar cookie `state` anti-CSRF                                      | Generado Sprint 2                                                                                 |
| **`ENCRYPTION_KEY`**                                | AES-256-GCM key (32 bytes hex)                    | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | `src/lib/crypto/token-crypto.ts` — cifra tokens OAuth en `public.integrations.credentials_cipher`  | Sprint 1 tarea 2-26                                                                               |
| **`NEXTAUTH_SECRET`**                               | Random 32+ bytes                                  | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | Sesiones Next.js                                                                                   | Audit Sprint 0                                                                                    |
| **`CRON_SECRET`**                                   | Random 48 bytes base64                            | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | Header `x-cron-secret` en endpoints `/api/cron/*`                                                  | Sprint 0 tarea 1-08                                                                               |
| **WhatsApp App Secret + Verify Token**              | Meta webhook signing                              | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | `src/app/api/webhooks/whatsapp/route.ts`                                                           | Sprint 0 (F-05-SEC-004/006)                                                                       |
| **Retell Webhook Secret**                           | HMAC signing                                      | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | `src/app/api/webhooks/retell/route.ts`                                                             | Sprint 0 (F-05-SEC-005)                                                                           |
| **Anthropic / OpenAI / Google Genai API keys**      | LLM provider API keys                             | `.env.local` (dev) + Dokploy env vars (VPS)                                                  | LangChain multi-LLM                                                                                | Pendiente Sprint 4 post-MVP                                                                       |
| **GitHub PAT (Antigravity / push remoto)**          | OAuth token                                       | Vault personal Javi HP — ver memoria `reference-github-token.md`                             | git push manual                                                                                    | Sin rotación reciente                                                                             |

## Convenciones por tipo de canal

### `.env.local` (dev local — gitignored)

- Único archivo donde van **secretos en runtime local**.
- Cubierto por `.gitignore` línea 39 (`.env.*`).
- NUNCA editar desde Claude (deny rule en `settings.local.json`).
- Editar manualmente desde el IDE o terminal.

### `infra/supabase-vps/.vault/*` (vault gitignored agresivo)

- Regla del `.gitignore` interno: `*` + `!.gitignore` → solo el propio `.gitignore` se commitea.
- Lugar correcto para: SSH keys, bundles de migrations sensibles, env files compartidos entre dev+VPS, snapshots de credenciales VPS.
- NO meter aquí credenciales personales de paneles SaaS (Dokploy, Sentry, GitHub) — esas van al **vault personal** del propietario humano.

### Vault personal del propietario humano (1Password, Bitwarden, KeePass)

- Único sitio correcto para: passwords de paneles SaaS (Dokploy, Sentry, Hetzner, GitHub), claves de email recovery, 2FA backup codes.
- **NUNCA documentar en repo, ni siquiera "gitignored"**: backups del SO, sync cloud, índices de búsqueda pueden filtrar.

### Dokploy env vars panel (runtime VPS)

- Único sitio correcto para que la app VPS lea secretos en runtime.
- Configurar manualmente desde `panel.linkstation.ai → servicio → Environment`.
- NO usar Build Args para secretos runtime (los Build Args quedan embebidos en la imagen Docker).
- Para Build Args reservar SOLO: `GIT_COMMIT_SHA`, `GIT_BRANCH`, `BUILD_TIMESTAMP`, `SENTRY_AUTH_TOKEN` (este último es excepción aceptada porque solo se usa durante build para subir source maps, no en runtime).

## Incidentes documentados

### 2026-05-26 17:00 — Password Dokploy expuesta en chat Claude

- **Qué pasó**: usuario pegó password de `hola@linkstation.ai` del panel `panel.linkstation.ai` en un chat con Claude para pedirle login automatizado.
- **Respuesta**: Claude rechazó usar la credencial y recomendó rotación inmediata según policy.
- **Acción pendiente**: rotar password en Dokploy → Settings → Account → Change Password. Generar con `node -e "console.log(require('crypto').randomBytes(24).toString('base64url').slice(0,24) + '-Aa1!')"`. Guardar en vault personal del propietario.
- **Lección**: añadir en CLAUDE.md sección "qué NO pasarle a Claude" → credenciales de paneles del cliente, aunque sea para "que me ayude" con configuración. Claude debe seguir guiando por captura/instrucciones, no autenticándose.

## Cómo añadir una credencial nueva al inventario

1. Genera el valor con un generador apropiado (ver tabla "Generadores recomendados" en CLAUDE.md global).
2. Guarda el valor en el canal correcto (ver "Convenciones por tipo de canal" arriba).
3. Añade una fila a la tabla "Inventario" con: nombre, tipo, dónde vive, dónde se consume, fecha de rotación.
4. **Nunca** pegues el valor real en este fichero.
5. Si la credencial estará en `.env.local` o env vars Dokploy, añade además la línea correspondiente comentada en `.env.example` con placeholder.
