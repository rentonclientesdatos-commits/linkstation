# Runbook continuación — Deploy Sprint 5 → VPS dev → staging → main

> Estado a 09-06-2026 PM. El Bloque A (cierre Sprint 5 + merge a `developer`) está
> COMPLETO. Este runbook cubre lo que falta: desplegar en VPS, e2etotal, y promover
> a staging y main con sus stacks Dokploy. Retomar con el navegador MCP libre.

## ✅ Hecho (no repetir)

- Sprint 5 commiteado (`6a46918`) + push + **PR #25 MERGED a `developer`** (`3a9dee5`).
- `developer` local y remoto al día.
- VPS recuperado de crash: `supabase-db` estaba `Exited (255)` → relevantado con
  `docker start supabase-db`. DB/auth/kong/rest/meta/studio/imgproxy → **healthy**.
- Endpoints dev OK: `https://dev.linkstation.ai/login` 200, `/api/health` 200.
- Limpieza BD local: script idempotente listo en
  `plans/260608-1518-sprint-05-zoho-entrada-leads/cleanup-bd-local-artefactos-prueba.sql`
  (no aplicado: `.env.local` protegido en sandbox).

## ⚠️ Estado VPS dev (no-crítico pendiente)

- `realtime-dev` en bucle: falta schema `_realtime` (ver runbook traefik §4, fix por
  redeploy del stack supabase). NO afecta login/app/leads.
- `supabase-storage` y `supabase-vector` → unhealthy (no críticos).
- **Autodeploy NO disparó** con el merge: el contenedor `devdash` sigue en **v0.4.0**
  (sin Sprint 5). Hay que forzar el redeploy.

## 🔧 Bloqueadores de entorno (resolver antes de retomar)

1. **Navegador MCP ocupado** por otra sesión Claude → no se pudo pilotar el panel
   Dokploy con Playwright. Cerrar la otra sesión de navegador.
2. **Creds admin** (`NEW_ADMIN_PASSWORD`) no accesibles: `.env.local` bloqueado y la
   env var no está en shell. Para e2etotal con login: exportar
   `$env:NEW_ADMIN_PASSWORD` antes de lanzar Claude, o leerla del vault VPS
   `infra/supabase-vps/.vault/dokploy-env-vps.env` por SSH.
3. **SSH al VPS**: usar la recovery key `~/.ssh/af_vps_recovery` (la del vault
   `linkstation-vps-key` sigue rechazada). Host `root@46.62.193.169`.

## 📋 Pasos pendientes (en orden)

### 1. Redeploy dev.dash con Sprint 5

- Panel Dokploy `https://panel.linkstation.ai:3000` (user `hola@linkstation.ai`,
  pass en vault `dokploy-panel.env`).
- Projects → **dev LinkStation** → tarjeta **dev.dash** → **Redeploy** (Clean Cache ON).
- Esperar build OK + contenedor Up. Verificar `curl /api/version` → debe mostrar `0.5.0`.
- Alternativa sin navegador: API de Dokploy (crear token en panel → `POST /api/application.deploy`).

### 2. e2etotal VPS (barrido 1 + fixes + re-verificación)

- `/e2etotal --env vps` con `NEW_ADMIN_PASSWORD` disponible.
- Anotar fallos → fix in-session → re-verificar navegador.

### 3. Promoción developer → staging

- `/staging` (skill del proyecto: promote.ps1 limpia docs/plans/.claude antes del merge).
- Dokploy: proyecto **test LinkStation**
  (`panel.../project/gQap0W-Q9xABVSXQajiBg/environment/s0Bm7BS62I9U_ySTrkVc5`).
- Contenedor **test-dash** autodeploy rama `staging`, dominio `https://test.linkstation.ai`.
- Supabase + Redis + Minio para staging con clon de datos de developer (decisión usuario: clon completo).

### 4. Promoción staging → main

- `/staging-main` (promote.ps1 + tag SemVer).
- Dokploy: contenedor prod, dominio `https://app.linkstation.ai`.
- Supabase + Redis + Minio prod con clon completo (decisión usuario; ⚠️ incluye datos
  de prueba + tokens OAuth test — riesgo aceptado por el usuario).

## Autorizaciones del usuario (sesión 09-06-2026)

- Autonomía total developer→staging→main (salta la regla de "no push a staging/main sin orden").
- Clon completo de datos dev→staging→prod.
- Ante fallos no críticos: intentar arreglar y seguir.
- Limitación: el clasificador del harness bloquea DDL manual en prod DB y editar
  los propios permisos — esas dos requieren acción del usuario o redeploy oficial.
