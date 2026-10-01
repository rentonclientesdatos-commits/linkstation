# Fase 00 — Setup del Zoho de test (acciones del usuario)

**Contexto:** [plan.md](plan.md). Prerequisitos manuales que Javi HP debe hacer en su cuenta Zoho de test para poder validar el sprint E2E. Decisión 08-06-2026: **probar las dos vías** (Workflow Webhook primero, OAuth + Notifications API después).

## Cuenta Zoho de test (confirmada por Javi HP 08-06-2026)

- **Data Center:** `.eu` → coincide con el default del repo (`ZOHO_API_DOMAIN=https://www.zohoapis.eu`). NO hay que cambiar DC.
- **Organization ID:** `20115313796`
- **Panel CRM:** https://crm.zoho.eu/crm/org20115313796
- **Consola OAuth:** https://api-console.zoho.com (acceder con la cuenta del DC eu)

## Estado de partida (verificado 08-06-2026)

- ⚠️ **La app OAuth Zoho real NO está registrada.** El Sprint 2 implementó el adapter Zoho con **tests MSW (mocks)**, no con cuenta real. El registro de Public App real solo se hizo para HubSpot (phase-03). Las vars `ZOHO_CLIENT_ID/SECRET` en `.env.example` siguen como `REPLACE_ME`.
- ✅ El **código** del adapter Zoho (OAuth multi-DC, `getLead`, `updateLead`, refresh) está completo y testeado con mocks — funciona, solo le faltan credenciales reales.

## Sobre la caducidad de la suscripción (respuesta a la pregunta del usuario)

- **Notifications API:** caduca, máximo **7 días** (límite duro de Zoho). NO se puede hacer infinita. Mitigado con **renovación automática** vía cron (Fase 05b) — transparente, el cliente no se entera, los leads no dejan de llegar. Mismo patrón que el canal Drive de Sheets (también 7 días).
- **Workflow Webhook:** **NO caduca nunca.** El tenant crea la regla una vez en su Zoho y olvida. Sin renovación.

---

## VÍA A — Workflow Webhook (rápido, no caduca) — para empezar a probar

> Se puede configurar YA, no necesita OAuth ni el scope de notificaciones. Es lo más simple para validar el flujo end-to-end.

1. **Cuenta Zoho CRM de test** (el plan gratuito sirve). Anotar el **Data Center** donde se creó la cuenta (`.com`, `.eu`, `.in`, `.au`...). El nuestro por defecto apunta a `.eu` (`ZOHO_API_DOMAIN=https://www.zohoapis.eu`).
2. En Zoho: **Setup (⚙️) → Automation → Workflow Rules → Create Rule**.
   - Módulo: **Leads**
   - Trigger: **On a record action → Create** (y opcional también **Edit**).
3. Acción de la regla: **Instant Actions → Webhook → New Webhook**.
   - URL: la te dará Claude cuando esté implementado el endpoint (formato `https://<url-pública>/api/webhooks/zoho?token=<token-del-tenant>`). En local se usa un túnel (ngrok) porque Zoho debe alcanzar nuestra URL desde internet.
   - Método: **POST**.
   - Module: Leads. Marcar que envíe el **ID del registro** en el body.
4. Guardar y asociar la regla. **Al crear un lead → dispara el webhook.**
5. Tener algún **lead de prueba** o crear uno para validar.

**Lo que Claude necesita de ti para esta vía:** solo el **Data Center** de tu cuenta. La URL + token los genera nuestro sistema; tú pegas la URL en el paso 3 cuando Claude te la dé.

---

## VÍA B — OAuth + Notifications API (1 clic, la del producto) — después

> Necesario para el flujo "activar con 1 clic desde nuestra UI". Requiere registrar la app OAuth desde cero.

1. Ir a **https://api-console.zoho.com** (con la cuenta del DC correcto) → **Add Client → Server-based Applications**.
2. Rellenar:
   - **Client Name:** p.ej. `linkstation`
   - **Homepage URL:** la de nuestro dashboard
   - **Authorized Redirect URIs:** `http://localhost:8500/api/integrations/zoho/callback` (local) — y la del VPS cuando se despliegue.
3. Tras crear → copiar **Client ID** + **Client Secret** y pasármelos **por canal seguro** (vault / `.env.local`, NUNCA por chat ni commit).
4. **Scopes** a autorizar en el consent (los actuales **+ el nuevo de notificaciones**):
   - `ZohoCRM.modules.leads.READ`, `ZohoCRM.modules.leads.WRITE`
   - `ZohoCRM.settings.fields.READ`
   - **`ZohoCRM.notifications.ALL`** ← NUEVO, imprescindible para auto-suscribir. Claude lo añadirá a `REQUIRED_SCOPES` en código (Fase 02).
5. Tener al menos **1 lead de prueba** en el módulo Leads.

**Lo que Claude necesita de ti para esta vía:** Client ID + Client Secret (canal seguro) + confirmar el Data Center.

---

## Checklist resumido para el usuario

- [ ] **(Vía A)** Confirmar Data Center de la cuenta Zoho de test.
- [ ] **(Vía A)** Crear la regla de Workflow Webhook (con la URL que dé Claude).
- [ ] **(Vía B, después)** Registrar app Server-based en api-console.zoho.com.
- [ ] **(Vía B)** Pasar Client ID + Secret por canal seguro.
- [ ] Tener leads de prueba en el módulo Leads.

## Nota para Claude (implementación)

- Añadir `ZOHO_CLIENT_ID/SECRET` reales a `.env.local` (gitignored) cuando el usuario los pase.
- Añadir `ZohoCRM.notifications.ALL` a `REQUIRED_SCOPES` en `src/lib/integrations/crm/providers/zoho.ts` (Fase 02).
- Para pruebas locales del webhook entrante: túnel ngrok (igual que el SPIKE de Sheets) para que Zoho alcance `localhost:8500`.
