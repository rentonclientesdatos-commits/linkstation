# 📸 Integración de Instagram (DMs + Lead Ads) — LinkStation

Este documento registra en detalle todo lo implementado, la arquitectura y los pasos para configurar la integración con Meta / Instagram.

---

## 1. 🏗️ Arquitectura de la Solución

La integración sigue el mismo estándar empresarial y modular que WhatsApp en LinkStation:

```
Usuario en Instagram (DM o Lead Ad en Anuncio)
                   │
                   ▼ (Meta Graph API / Webhook)
      /api/webhooks/instagram (POST)
                   │
         [Verificación HMAC SHA256]
                   │
         InstagramWebhookProcessor
        ┌──────────┴──────────┐
        ▼                     ▼
 (object: "instagram")  (object: "page" -> leadgen)
   Instagram DM           Instagram Lead Ad
        │                     │
 InstagramAIProcessor   Extracción de campos (nombre, email, fono)
 (GPT-4o-mini + Contexto)     │
        │               Inserción en tabla `leads`
        ▼               (canal_origen: "instagram_lead_ad")
 Envío de respuesta           │
 vía InstagramClient    Notificación / Actividad registrada
        │
 Guardado en
 `conversaciones_instagram`
```

---

## 2. 📁 Archivos Implementados

| Archivo                                                      | Responsabilidad                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `supabase/migrations/create_instagram_tables.sql`            | Tablas `instagram_configurations` y `conversaciones_instagram` con RLS e índices.             |
| `src/lib/integrations/instagram/types.ts`                    | Definiciones de tipos TypeScript para Graph API v21.0, webhooks y Lead Ads.                   |
| `src/lib/integrations/instagram/client.ts`                   | Cliente HTTP oficial de Meta Graph API (mensajería, obtención de datos de leads, validación). |
| `src/lib/integrations/instagram/index.ts`                    | Exportador de la librería Instagram.                                                          |
| `src/lib/core/processors/InstagramAIProcessor.ts`            | Orquestador conversacional con OpenAI adaptado a mensajería directa (respuestas concisas).    |
| `src/lib/core/processors/InstagramWebhookProcessor.ts`       | Router de eventos entrantes de Meta (separa DMs de Lead Ads).                                 |
| `src/app/api/webhooks/instagram/route.ts`                    | Endpoint público para handshake (GET) y recepción de eventos (POST).                          |
| `src/app/api/tenant/instagram-config/route.ts`               | Endpoint REST para leer y guardar configuración por tenant (con fallback en JSON).            |
| `src/app/api/tenant/instagram-config/test/route.ts`          | Endpoint para verificar en tiempo real el Page Access Token contra Meta.                      |
| `src/app/dashboard/settings/integrations/instagram/page.tsx` | UI completa en el panel del cliente (tokens, switches, guía interactiva).                     |
| `src/components/layout/Sidebar.tsx`                          | Entrada de navegación en el menú lateral bajo _Ajustes_.                                      |
| `src/lib/core/logger.ts`                                     | Añadido `INSTAGRAM` al tipo unión `LogSource`.                                                |
| `.env.example`                                               | Documentadas variables opcionales para Instagram.                                             |

---

## 3. 🚀 Pasos para Activar en Producción

### Paso 1: Ejecutar la migración SQL

En el editor SQL de Supabase, ejecutar el contenido de:
`supabase/migrations/create_instagram_tables.sql`

_(Nota: Si no se ejecuta, el sistema cuenta con fallback automático en el JSON de `tenants.config`)._

### Paso 2: Crear App en Meta for Developers

1. Ir a [developers.facebook.com](https://developers.facebook.com) y crear una app de tipo **Negocios** (Business).
2. Añadir los productos:
   - **Instagram Graph API** / **Messenger API for Instagram**
   - **Webhooks**

### Paso 3: Configurar el Webhook en Meta

- **URL de devolución de llamada:** `https://tudominio.com/api/webhooks/instagram`
- **Token de verificación:** `linkstation_ig_webhook_2026` (o el valor fijado en `INSTAGRAM_VERIFY_TOKEN`).
- **Suscripciones del Webhook:**
  - En objeto **Instagram**: marcar `messages` y `messaging_postbacks`.
  - En objeto **Page**: marcar `leadgen` (para anuncios de clientes potenciales).

### Paso 4: Configurar en LinkStation Dashboard

1. Ingresar al dashboard con el tenant correspondiente.
2. Navegar a **Ajustes > Instagram**.
3. Pegar el **Page Access Token** y el **Instagram Business Account ID**.
4. Hacer clic en **"Probar Conexión"** para validar.
5. Activar los interruptores:
   - ✅ _Automatización de Mensajes Directos (DM)_
   - ✅ _Captura Automática de Lead Ads_
6. Guardar la configuración.

---

## 4. 🔒 Seguridad y Privacidad

- Validación criptográfica de firmas HMAC SHA-256 en cada webhook entrante.
- Row Level Security (RLS) aplicado por `tenant_id` en las tablas de base de datos.
- Aislamiento multi-inquilino estricto en el procesador.
