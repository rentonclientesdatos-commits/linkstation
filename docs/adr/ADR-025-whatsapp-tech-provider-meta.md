# ADR-025 — WhatsApp Tech Provider (Meta) + Embedded Signup multi-tenant

- **Status:** Proposed
- **Date:** 2026-06-03
- **Sprint:** SP-11 (Sprint 10 — WhatsApp Tech Provider Migration)
- **Deciders:** Bea (clienta) + Javi HP (arquitecto)

## Contexto

El dashboard ya integra WhatsApp Cloud API de Meta (`WhatsAppBridge` en `src/lib/integrations/whatsapp.ts`, webhook en `src/app/api/webhooks/whatsapp/route.ts`, procesadores `WhatsAppWebhookProcessor`/`WhatsAppAIProcessor`, recordatorios cron y `RescueWorker`).

El modelo actual es **"cliente directo replicado"**: cada tenant (academia) crea su propia app de Meta, genera su token y lo pega a mano en Ajustes → Integraciones, junto con `phoneNumberId` y `wabaId` (`IntegrationsManager.tsx:39-71`). Problemas: tokens que caducan y rompen la mensajería, onboarding manual frágil y propenso a error, y carga de soporte por academia.

La clienta (LinkStation) va a darse de alta como **Tech Provider** en Meta. Esto habilita el modelo gestionado: el tenant conecta WhatsApp con Embedded Signup (1 clic + login) y la plataforma opera con un token de sistema central.

## Decisión

Adoptar el modelo **Tech Provider** de Meta (NO Solution Partner — sin línea de crédito ni facturación; cada tenant paga su uso de WhatsApp directamente a Meta).

Concretamente:

1. **App de Meta NUEVA y dedicada** dentro del business portfolio de la clienta, con nombre público profesional. NO se reutiliza la app que hoy sirve la integración en producción (recomendación oficial de Meta: el nombre de la app y del portfolio son visibles al tenant durante el registro, y reusar la app viva arriesga romperla).

2. **Embedded Signup** (Facebook JS SDK + `config_id`) sustituye al formulario de 3 credenciales manuales. El callback server-side intercambia el `code` y extrae `waba_id` + `phone_number_id`.

3. **Token de sistema central** (Business Integration System User token), no por tenant. Por tenant solo se persiste `waba_id` + `phone_number_id` + `connection_mode`. Esto elimina el dolor de los tokens que caducan.

4. **Dual-mode con `connection_mode`** (`manual` | `tech_provider`) en la config del tenant. Un resolver (`resolveWhatsAppConfig`) decide de dónde sale el `accessToken` en cada envío. Permite migrar tenant a tenant, sin big-bang y de forma reversible.

5. **Suscripción de cada WABA al webhook de la app** vía Graph API (`POST /{waba_id}/subscribed_apps`). El webhook ya rutea por `phone_number_id`.

Es el mismo patrón conceptual que ya aplicamos a HubSpot en [ADR-021](ADR-021-hubspot-public-app-multi-tenant.md): una app única multi-tenant vía OAuth en lugar de credenciales manuales por cliente.

## Alternativas rechazadas

| Alternativa                                           | Razón rechazo                                                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mantener el modelo manual (cliente directo replicado) | Tokens caducan y rompen mensajería; onboarding frágil; carga de soporte por academia.                                                                    |
| Solution Partner (BSP)                                | Asume línea de crédito y facturación del uso de WhatsApp — riesgo y complejidad que la clienta no quiere. Tech Provider cubre la necesidad sin facturar. |
| Reutilizar la app de Meta actual                      | Meta lo desaconseja: nombre de app/portfolio visible al tenant + riesgo de romper la integración viva durante App Review / paso a producción.            |
| Token por tenant también en tech_provider             | Reintroduce el problema de caducidad. El token de sistema central es largo y centralizado.                                                               |

## Consecuencias

**Positivas:**

- Onboarding self-service de WhatsApp (1 clic), sin pegar tokens.
- Tokens estables (System User token largo) — desaparece el fallo por caducidad.
- Migración sin downtime gracias al dual-mode; reversible por tenant.
- Modelo profesional alineado con proveedores de referencia (Twilio/Infobip ISV).

**Negativas / costes operacionales:**

- Requiere **App Review de Meta** (Advanced Access a `whatsapp_business_messaging` + `whatsapp_business_management`) con 2 vídeos — proceso asíncrono, puede tardar días/semanas.
- Requiere **Business Verification** de la clienta (sin ella, límite 10 clientes/7d; con ella, 200/7d).
- El token central es un secreto de alto privilegio: su compromiso afecta a todos los tenants tech_provider → tratamiento reforzado (env, lazy fuera de imagen Docker, masking en logs, monitor de validez).
- CSP del dashboard debe permitir el SDK JS de Facebook (`connect.facebook.net`).

## Implementación

- `src/lib/integrations/whatsapp-credentials.ts` — resolver dual-mode (`resolveWhatsAppConfig`).
- `src/lib/integrations/whatsapp-onboarding.ts` — intercambio Embedded Signup + `subscribeWabaToApp`.
- `src/app/api/integrations/whatsapp/embedded-signup/callback/route.ts` — callback OAuth.
- `src/app/dashboard/settings/integrations/whatsapp/ConnectWhatsAppButton.tsx` — botón SDK.
- `src/app/dashboard/settings/IntegrationsManager.tsx` — render condicional por `connection_mode`.
- `next.config.ts` — CSP para el SDK de Facebook.
- Env vars nuevas: `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID`, `META_SYSTEM_USER_TOKEN` (placeholders en `.env.example`; valores reales por canal seguro / Easypanel).
- Guías: `docs/integrations/whatsapp-tech-provider-setup.md`, `whatsapp-tenant-connect-guide.md`, `whatsapp-tenant-migration-runbook.md`, `whatsapp-app-review-submission.md`.

## Referencias

- Plan de sprint: `plans/260603-1900-sprint-10-whatsapp-tech-provider/plan.md`
- Informe a clienta: `docs/entregables/Informe-Tech-Provider-Meta-LinkStation.pdf`
- ADR análogo (Public App multi-tenant): `docs/adr/ADR-021-hubspot-public-app-multi-tenant.md`
- ADR cifrado tokens OAuth: `docs/adr/ADR-017-cifrado-tokens-oauth-aes-256-gcm.md`
- Meta — Become a Tech Provider: https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers
- Meta — Permissions: https://developers.facebook.com/documentation/business-messaging/whatsapp/permissions/
- Meta — App Review (Solution Providers): https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review/
- Meta — System User access token: https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens/
