# HubSpot Public App — guía de registro

> Sprint 2 Phase 03. Esta guía instruye al equipo de operaciones (Renzo / Bea) sobre cómo registrar la Public App de HubSpot multi-tenant.

## 1. Crear la Public App

1. Acceder a https://developers.hubspot.com/ con una cuenta HubSpot Developer (no la cuenta del cliente; crear una si no existe).
2. Ir a **Manage Apps** → **Create app**.
3. Rellenar:
   - **App name:** `LinkStation CRM Connector`.
   - **Description:** `Conecta LinkStation con HubSpot para sincronizar leads, tasks y meetings.`
   - **Public visibility:** ON.

## 2. Configurar Auth tab

- **Redirect URLs:**
  - `http://localhost:8500/api/integrations/hubspot/auth/callback` (desarrollo local).
  - `https://dev.linkstation.ai/api/integrations/hubspot/auth/callback` (VPS, añadir cuando se despliegue).
  - (Futuro) `https://app.linkstation.ai/api/integrations/hubspot/auth/callback`.
- **Scopes mínimos:**
  ```
  crm.objects.contacts.read
  crm.objects.contacts.write
  crm.schemas.contacts.read
  crm.schemas.contacts.write
  crm.objects.deals.read
  crm.objects.tasks.write
  crm.lists.read
  crm.lists.write
  ```
- Anotar **Client ID** y **Client Secret**.

## 3. Variables de entorno

En `.env.local`:

```bash
HUBSPOT_CLIENT_ID=<copy from HubSpot Developer Portal>
HUBSPOT_CLIENT_SECRET=<copy>
HUBSPOT_REDIRECT_URI=http://localhost:8500/api/integrations/hubspot/auth/callback
```

En Easypanel (VPS), añadir las mismas con `HUBSPOT_REDIRECT_URI=https://dev.linkstation.ai/api/integrations/hubspot/auth/callback`.

## 4. Generar OAUTH_STATE_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Pegar el resultado en `.env.local`:

```bash
OAUTH_STATE_SECRET=<output>
```

Mismo valor a Easypanel.

## 5. Verificación

Tras configurar las env vars:

```bash
npm run dev
```

Abrir `http://localhost:8500/dashboard/settings` → sección **Integraciones CRM** → click **Conectar HubSpot** → debería redirigir a `app.hubspot.com/oauth/authorize?...`.

## 6. Smoke test del flujo

1. Aprobar la app desde la cuenta sandbox HubSpot.
2. Verificar que el callback redirige a `/dashboard/settings?section=integrations&success=hubspot`.
3. Verificar en DB:
   ```sql
   SELECT id, crm_type, is_active, portal_id, healthcheck_status, last_healthcheck_at
   FROM integrations
   WHERE tenant_id = '<test_tenant>' AND crm_type = 'hubspot';
   ```
4. Click **Test connection** → `healthcheck_status='ok'` + `last_healthcheck_at` actualizado.

## 7. Limitaciones conocidas

- **Disconnect no revoca remoto**: HubSpot no expone endpoint público de revoke OAuth. El botón "Desconectar" limpia la DB local; el usuario debe ir a HubSpot UI → Settings → Integrations para revocar la app completamente.
- **Token TTL 30 min**: refresh automático vía TokenManager 5 min antes de expirar.
- **Search rate limit: 4 req/s**: cubierto por backoff 429 — Sprint 3 considerará rate-limiter in-process.

## 8. Custom properties auto-provisionadas

Al primer connect, el provider invoca `init()` que crea:

- `af_origen` (text) — canal de adquisición del lead.
- `af_metadata_extra` (textarea, 65k chars max) — JSON con metadata extra.

Idempotente: ejecuciones posteriores no duplican properties.
