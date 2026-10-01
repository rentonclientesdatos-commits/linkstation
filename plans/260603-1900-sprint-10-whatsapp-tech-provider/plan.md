---
title: "Sprint 10 — WhatsApp Tech Provider Migration (Meta Embedded Signup)"
description: "Migración del modelo WhatsApp Cloud API de 'cliente directo replicado' (3 credenciales manuales por tenant) al modelo Tech Provider de Meta: Embedded Signup, System User token central, suscripción de WABAs por app, migración de tenants vivos sin downtime + gestión del proceso de aprobación de Meta (app dedicada, App Review con vídeos, Access Verification)."
status: pending
priority: P2
effort: 48-72h
branch: feature/sprint-10-whatsapp-tech-provider
sprint_id: SP-11
version_target: v0.11.0
tags:
  [
    whatsapp,
    meta,
    tech-provider,
    embedded-signup,
    oauth,
    system-user-token,
    app-review,
    post-mvp,
    migration,
  ]
created: 2026-06-03
---

# Sprint 10 — Plan Operativo

| Campo                 | Valor                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprint ID             | `SP-11` (offset +1 sobre el número de sprint, como el resto del RoadMap)                                                                           |
| Versión objetivo      | `v0.11.0`                                                                                                                                          |
| Estado                | Pendiente                                                                                                                                          |
| Estimación total      | ~48-72h                                                                                                                                            |
| Rama sugerida         | `feature/sprint-10-whatsapp-tech-provider`                                                                                                         |
| ADR de decisión       | [`docs/adr/ADR-025-whatsapp-tech-provider-meta.md`](../../docs/adr/ADR-025-whatsapp-tech-provider-meta.md)                                         |
| Informe origen        | [`docs/entregables/Informe-Tech-Provider-Meta-LinkStation.pdf`](../../docs/entregables/Informe-Tech-Provider-Meta-LinkStation.pdf) |
| Reporte HTML editable | [`docs/entregables/informe-tech-provider-meta.html`](../../docs/entregables/informe-tech-provider-meta.html)                                       |

## Contexto

El proyecto ya integra WhatsApp Cloud API de Meta ([whatsapp.ts](../../src/lib/integrations/whatsapp.ts) `WhatsAppBridge`, webhook [whatsapp/route.ts](../../src/app/api/webhooks/whatsapp/route.ts), procesadores `WhatsAppWebhookProcessor`/`WhatsAppAIProcessor`, recordatorios cron y `RescueWorker`). El modelo actual es **"cliente directo replicado"**: cada tenant pega a mano sus 3 credenciales en Ajustes → Integraciones ([IntegrationsManager.tsx:39-71](../../src/app/dashboard/settings/IntegrationsManager.tsx)):

```
accessToken   ·   phoneNumberId   ·   wabaId
```

La clienta (LinkStation) va a darse de alta como **Tech Provider** en Meta. Este sprint migra el dashboard a ese modelo: el tenant deja de pegar tokens y conecta WhatsApp con **Embedded Signup** (1 clic + login Meta); la plataforma opera con un **Business Integration System User token** central, persiste solo `waba_id` + `phone_number_id` por tenant y suscribe cada WABA nueva al webhook de la app.

Es análogo a lo que ya hicimos con HubSpot ([ADR-021](../../docs/adr/ADR-021-hubspot-public-app-multi-tenant.md)): una sola app de Meta multi-tenant vía OAuth, en vez de credenciales manuales por cliente.

## Posicionamiento en el RoadMap

- **NO toca el MVP** (v0.3.0 — HubSpot + Zoho). Es post-MVP.
- Sprint NUEVO dedicado, creado tras Sprint 9 (Tier 2 on-demand). No es CRM, es WhatsApp → independiente de la serie de adapters.
- Versión `v0.11.0` (sprint nuevo posterior a la serie 0.5–0.10 de CRMs).
- Decisión 03-06-2026 (Javi HP): crear Sprint 10 dedicado, alcance migración + gestión App Review, con ADR.

## Dependencias críticas

| Dependencia                                                                                          | Tipo                    | Responsable                   | Bloquea                        |
| ---------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------- | ------------------------------ |
| Business Portfolio de la clienta en Meta Business Suite                                              | Externa                 | **Clienta**                   | Embedded Signup config         |
| Business Verification de la empresa aprobada por Meta                                                | Externa                 | **Clienta**                   | Sube límite 10→200 clientes/7d |
| App de Meta NUEVA dedicada (no reutilizar la actual)                                                 | Mixta                   | Dev + Clienta                 | App Review                     |
| App Review aprobado (`whatsapp_business_messaging` + `whatsapp_business_management` Advanced Access) | Externa (revisión Meta) | **Dev prepara, Meta aprueba** | Producción multi-tenant        |
| Access Verification (declarar Tech Provider)                                                         | Mixta                   | Dev + Clienta                 | Producción                     |
| ADR-025 aprobado (proceso `af-agents:adr`) ANTES de tocar credenciales                               | Interna                 | Javi HP                       | Fase 2                         |

> ⚠️ **App Review con vídeos es el cuello de botella** (revisión de Meta puede tardar días/semanas). Las fases 1 y 6 lo arrancan pronto para que corra en paralelo al desarrollo.

## Fases

| #   | Fase                                                             | Estimación  | Estado    | Archivo                                                     |
| --- | ---------------------------------------------------------------- | ----------- | --------- | ----------------------------------------------------------- |
| 1   | App Meta dedicada + ADR-025 + acompañamiento a clienta (Meta)    | 4-6h        | Pendiente | [phase-01](phase-01-app-meta-dedicada-adr.md)               |
| 2   | Refactor gestión de credenciales (System User token central)     | 8-12h       | Pendiente | [phase-02](phase-02-refactor-credenciales-token-central.md) |
| 3   | Embedded Signup (SDK JS + config_id + callback + intercambio)    | 10-14h      | Pendiente | [phase-03](phase-03-embedded-signup-flow.md)                |
| 4   | UI de conexión "Conectar WhatsApp" + suscripción WABA al webhook | 6-10h       | Pendiente | [phase-04](phase-04-ui-conexion-y-suscripcion-waba.md)      |
| 5   | Migración de tenants vivos sin downtime (estrategia dual-mode)   | 6-10h       | Pendiente | [phase-05](phase-05-migracion-tenants-sin-downtime.md)      |
| 6   | App Review: preparar 2 vídeos + Access Verification              | 4-6h        | Pendiente | [phase-06](phase-06-app-review-y-access-verification.md)    |
| 7   | Tests (unit + integración con WABA de prueba) + docs guía tenant | 6-10h       | Pendiente | [phase-07](phase-07-tests-y-docs.md)                        |
| 8   | Cierre Sprint 10 (CLOSE-1..5 + protocolo estándar)               | 4-8h + bugs | Pendiente | [phase-08](phase-08-cierre-sprint.md)                       |

**Total**: ~48-72h.

## Diagrama de dependencias

```
Día 1 (arrancar YA — corre en paralelo)
  10.1 App Meta dedicada + ADR + acompañamiento clienta ──┐
  10.6 App Review (vídeos + Access Verification) ─────────┤  (revisión Meta async, días/semanas)
                                                          │
Día 1+ (requiere 10.1 + ADR aprobado)                     │
  10.2 Refactor credenciales (token central) ─────────────┤
                                                          │
Día 3+ (requiere 10.2)                                    │
  10.3 Embedded Signup flow ──────────────────────────────┤
                                                          │
Día 5+ (requiere 10.3)                                    │
  10.4 UI conexión + suscripción WABA ────────────────────┤
                                                          │
Día 6+ (requiere 10.2 + 10.4)                             │
  10.5 Migración tenants vivos dual-mode ─────────────────┤
                                                          │
Final (requiere 10.3+10.4+10.5; 10.6 aprobado por Meta)   │
  10.7 Tests + docs ──────────────────────────────────────┘
  10.8 Cierre sprint
```

## Criterios de éxito globales (SP-11-CLOSE)

- [ ] App de Meta dedicada creada (NO se reutiliza la app de producción actual)
- [ ] App Review aprobado por Meta (Advanced Access a las 2 permissions)
- [ ] Access Verification completada (Tech Provider declarado)
- [ ] Tenant nuevo conecta WhatsApp vía Embedded Signup (1 clic, sin pegar tokens)
- [ ] `waba_id` + `phone_number_id` persistidos por tenant; **token central**, no por tenant
- [ ] WABA nueva queda suscrita al webhook de la app automáticamente
- [ ] Tenants existentes (modelo manual) siguen funcionando durante y tras la migración (dual-mode) — **cero downtime**
- [ ] Envío de mensaje y plantilla funciona con el token central
- [ ] `crm_write_audit` / log equivalente registra la conexión
- [ ] RLS multi-tenant respetado en `integrations`/`config`
- [ ] `npm run typecheck` + `lint` + `build` + tests sin errores

## Riesgos top-5

| Riesgo                                                | Prob  | Impacto | Mitigación                                                                             |
| ----------------------------------------------------- | ----- | ------- | -------------------------------------------------------------------------------------- |
| App Review rechazado por vídeos insuficientes         | Media | Alto    | Seguir sample submission de Meta al pie de la letra; 2 vídeos claros (msg + plantilla) |
| Romper WhatsApp de tenants vivos durante la migración | Media | Crítico | Dual-mode: lectura por `connection_mode` (manual/tech_provider); migrar uno a uno      |
| App nueva confunde a tenants ya conectados            | Baja  | Medio   | App nueva aislada; los tenants manuales no se tocan hasta migrarlos explícitamente     |
| Límite 10 clientes/7d antes de Business Verification  | Media | Medio   | Clienta arranca Business Verification ya; migrar tenants escalonado                    |
| System User token caduca / permisos insuficientes     | Baja  | Alto    | Business Integration System User token (largo) + monitor de validez + alerta           |

## Decisiones de diseño clave (detalle en ADR-025)

1. **App dedicada, no reutilizar la actual** — el nombre de app + business portfolio son visibles al tenant en el registro; y evita riesgo sobre la integración viva (recomendación oficial de Meta).
2. **Token central (System User), no por tenant** — resuelve el dolor actual de tokens que caducan. Por tenant se guarda solo `waba_id` + `phone_number_id`.
3. **Dual-mode durante la transición** — campo `connection_mode` (`manual` | `tech_provider`) en la config del tenant; el `WhatsAppBridge` resuelve el token según el modo. Permite migrar sin big-bang.
4. **Sin facturación** — Tech Provider (no Solution Partner): el tenant paga su WhatsApp a Meta directo; nosotros no asumimos línea de crédito.

## Acciones de la clienta (fuera del código, en paralelo)

- [ ] Crear / confirmar Business Portfolio en business.facebook.com
- [ ] Iniciar **Business Verification** (documentación legal de la sociedad) — cuanto antes (sube límite 10→200)
- [ ] Autorizar la creación de la app de Meta dedicada dentro de su portfolio
- [ ] Validar el nombre público de la app (visible a los tenants al conectar)

## Referencias

- ADR de decisión: [`docs/adr/ADR-025-whatsapp-tech-provider-meta.md`](../../docs/adr/ADR-025-whatsapp-tech-provider-meta.md)
- Informe a clienta: [`docs/entregables/Informe-Tech-Provider-Meta-LinkStation.pdf`](../../docs/entregables/Informe-Tech-Provider-Meta-LinkStation.pdf)
- ADR análogo (Public App multi-tenant): [`docs/adr/ADR-021-hubspot-public-app-multi-tenant.md`](../../docs/adr/ADR-021-hubspot-public-app-multi-tenant.md)
- ADR cifrado tokens: [`docs/adr/ADR-017-cifrado-tokens-oauth-aes-256-gcm.md`](../../docs/adr/ADR-017-cifrado-tokens-oauth-aes-256-gcm.md)
- Meta docs: Become a Tech Provider · Permissions · App Review · System User access token (ver §7 del informe)
