# 🔴 Instrucciones Zoho — TUS tareas manuales (Sprint 5)

> **Para ti, Javi HP.** Mientras Claude implementa el código del Sprint 5, ve haciendo esto en tu cuenta Zoho de test. Marca cada `[ ]` como `[x]` cuando lo termines.
> Lo que está en 🔴 **PENDIENTE** es lo que falta. Lo ✅ ya está confirmado.

**Fuente:** [phase-00-setup-zoho-test.md](phase-00-setup-zoho-test.md) · **Plan:** [plan.md](plan.md)

---

## Tu cuenta Zoho de test (ya confirmada)

| Dato                | Valor                                                               |
| ------------------- | ------------------------------------------------------------------- |
| **Data Center**     | ✅`.eu` (coincide con el default del repo, no hay que cambiar nada) |
| **Organization ID** | ✅`20115313796`                                                     |
| **Panel CRM**       | <https://crm.zoho.eu/crm/org20115313796>                            |
| **Consola OAuth**   | <https://api-console.zoho.com> (entra con la cuenta del DC `.eu`)   |

---

## Vía A — Workflow Webhook (rápido, NO caduca) → empieza por esta

> Es la más simple. No necesita OAuth ni registrar nada. Sirve para validar el flujo end-to-end en cuanto Claude tenga el endpoint listo.

- [x] 🔴 **A1.** Asegúrate de tener al menos **1 lead de prueba** en el módulo **Leads** (o créalo cuando vayas a probar).
- [x] 🔴 **A2.** Ve a **Setup (⚙️ arriba a la derecha) → Automation → Workflow Rules → Create Rule**.
  - **Módulo:** `Leads`
  - **Trigger:** _On a record action_ → marca **Create** (y opcional también **Edit**).
- [x] 🔴 **A3.** En la acción de la regla: **Instant Actions → Webhook → New Webhook**.
  - **URL:** ⏳ **te la dará Claude** cuando el endpoint esté implementado. Tendrá el formato:
    `https://<url-pública-ngrok>/api/webhooks/zoho?token=<token-del-tenant>`
  - **Método:** `POST`
  - **Module:** `Leads`. Marca que envíe el **ID del registro** en el body.
- [x] 🔴 **A4.** Guarda y asocia la regla.
- [x] 🔴 **A5.** **Prueba:** crea un lead nuevo en Zoho → debería dispararse el webhook y aparecer en el dashboard en segundos.

> **Lo único que necesita Claude de ti para la Vía A:** nada por adelantado. Solo **pegar la URL** que te dé en el paso A3 (porque en local usamos un túnel ngrok para que Zoho pueda alcanzar tu `localhost:8500` desde internet).

---

## Vía B — OAuth + Notifications API (1 clic desde nuestra UI) → después de la A

> Es la experiencia "de producto" (activar con 1 clic). Requiere registrar la app OAuth desde cero porque el Sprint 2 solo usó mocks.

- [ ] 🔴 **B1.** Entra en **<https://api-console.zoho.com>** (con la cuenta del DC `.eu`) → **Add Client → Server-based Applications**.
- [ ] 🔴 **B2.** Rellena:
  - **Client Name:** `linkstation`
  - **Homepage URL:** la de nuestro dashboard
  - **Authorized Redirect URIs:** `http://localhost:8500/api/integrations/zoho/callback` (local).
    Añade también la del VPS cuando se despliegue.
- [ ] 🔴 **B3.** Tras crear la app → copia **Client ID** + **Client Secret**.
- [ ] 🔴 **B4.** **Pásamelos por canal seguro** (vault / `.env.local`). ⚠️ **NUNCA por chat ni en un commit.** Claude los meterá en `.env.local` (gitignored).
- [ ] 🔴 **B5.** En el consent OAuth, autoriza estos **scopes**:
  - `ZohoCRM.modules.leads.READ`
  - `ZohoCRM.modules.leads.WRITE`
  - `ZohoCRM.settings.fields.READ`
  - **`ZohoCRM.notifications.ALL`** ← NUEVO, imprescindible para la auto-suscripción. (Claude lo añade en código.)

> **Lo que necesita Claude de ti para la Vía B:** Client ID + Client Secret (canal seguro). El Data Center ya está confirmado (`.eu`).

---

## Sobre la caducidad de la suscripción (tu pregunta)

| Vía                           | ¿Caduca?                                   | Detalle                                                                                                                               |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Notifications API** (Vía B) | ⚠️ Sí, máx**7 días** (límite duro de Zoho) | Claude implementa**renovación automática vía cron** (Fase 05b). Transparente — los leads no dejan de llegar, el cliente no se entera. |
| **Workflow Webhook** (Vía A)  | ✅**NO caduca nunca**                      | Creas la regla una vez en tu Zoho y te olvidas.                                                                                       |

---

## Checklist resumido

- [x] Confirmar Data Center (`.eu`) ✅
- [x] Confirmar Org ID (`20115313796`) ✅
- [x] 🔴 **(Vía A)** Crear la regla de Workflow Webhook (con la URL que dé Claude).
- [ ] 🔴 **(Vía B)** Registrar app Server-based en api-console.zoho.com.
- [ ] 🔴 **(Vía B)** Pasar Client ID + Secret por canal seguro.
- [ ] 🔴 Tener leads de prueba en el módulo Leads.

---

**Avísame cuando hayas hecho la Vía A** (o cuando quieras la URL del webhook) y validamos el flujo en cuanto Claude tenga el endpoint listo.
