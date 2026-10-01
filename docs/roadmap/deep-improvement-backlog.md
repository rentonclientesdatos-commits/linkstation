---
title: "Deep Improvement Backlog — Backlog ampliado con findings de Deep Audit"
date: 2026-05-19
status: final
agent: Consolidator Deep
sources:
  - docs/roadmap/improvement-backlog.md
  - docs/audit/deep/DEEP-FINDINGS-SUMMARY.md
  - docs/audit/deep/DA-1-concurrency-orchestrator.md
  - docs/audit/deep/DA-2-auth-rls-deep.md
  - docs/audit/deep/DA-3-security-deep.md
  - docs/audit/deep/DA-4-llm-voice-deep.md
  - docs/audit/deep/DA-5-accessibility.md
---

# Deep Improvement Backlog — linkstation

Backlog ampliado incorporando los ~67 findings nuevos del deep audit (DA-1 a DA-5).
El backlog original tenía 75 items (B-001 a B-075). Este documento añade los items DB-XXX
y reorganiza las prioridades según el análisis profundo.

S = días, M = 1-2 semanas, L = sprint completo o más.
Los items del backlog original que el deep audit amplía mantienen su ID original (B-XXX).

---

## Sprint 0 — Hotfixes de Seguridad (URGENTE — antes de cualquier otra cosa)

**Ampliado por deep audit.** El sprint 0 original tenía 12 items. El deep audit añade 8 más críticos.

### Items originales confirmados por deep audit (prioridad sin cambios)

| ID | Titulo | Esfuerzo | Findings |
|----|--------|----------|---------|
| B-001 | Rotar JWT service_role de Supabase — token comprometido desde acceso al repo | S | F-05-SEC-001, F-04-002 |
| B-002 | Eliminar los 9 fallbacks hardcodeados de JWT/URL de producción (auth-config.ts, supabase/client.ts, supabase/server.ts, actions/tenant.ts) | S | DA-2 profundiza — 9 puntos, incluyendo anti-patrón de rotación en tenant.ts:52 |
| B-003 | Mover WhatsApp verify token a WHATSAPP_VERIFY_TOKEN env var | S | F-05-SEC-004 |
| B-004 | Actualizar next a versión estable actual (19 CVEs incluyendo SSRF CVSS 8.6 y middleware bypass CVSS 8.1) | M | DA-3-CVE-002 |
| B-005 | Actualizar axios a versión actual (15 CVEs, SSRF CVSS 7.2, Prototype Pollution CVSS 7.4) | S | DA-3-CVE-001 |
| B-006 | Implementar validación HMAC de firma en webhook Retell (ambos endpoints: /retell y /retell/tools) | M | DA-4-001, DA-3-005, F-05-SEC-005 |
| B-007 | Añadir auth Redis en docker-compose (--requirepass) y eliminar binding de puerto 6379 al host | S | F-05-OWASP-005 |
| B-008 | Eliminar/mover scripts con postgres directo y contraseñas hardcodeadas a IP de producción | S | F-04-003 |
| B-010 | Fix fetchCalls — añadir getActiveTenantId() + .eq("tenant_id") en query principal y 3 funciones hermanas | S | F-04-001, DA-2 profundiza |
| B-011 | Fix getPrograms — añadir filtro tenant_id | S | F-04-008 |
| B-012 | Fix AppointmentWatchdog — añadir filtro tenant_id en query de appointments | S | F-02-004 |

### Items nuevos del deep audit en Sprint 0 (críticos añadidos)

| ID | Titulo | Esfuerzo | Findings | Dependencias |
|----|--------|----------|---------|--------------|
| DB-001 | Añadir auth de sesión a los 7 endpoints de orquestación sin autenticación (`/api/orchestration/deploy`, `graph`, `publish`, `sweep`, `workflows`, `/api/calls/manual`, `/api/cron/appointments/reminders`) | M | DA-2-001, DA-3-001 | B-001 |
| DB-002 | Bloquear/eliminar endpoint de test abierto en producción: `/api/test/orchestrator` | S (30min) | DA-3-003 | Ninguna |
| DB-003 | Fix privilege escalation: cambiar check de admin en middleware.ts para usar SOLO `app_metadata.is_admin` (eliminar referencias a `user_metadata`) | S | DA-2-005 | B-001 |
| DB-004 | Fix IDOR en 9 funciones de inbox.ts — añadir verificación de ownership (tenant check) antes de operar sobre leads | M | DA-2 IDOR sweep: `deleteLead`, `toggleLeadAI`, `assignAgentToLead`, `updateLeadInfo`, `updateLeadSegment`, `deleteChatHistory`, `deleteLeadFacts`, `saveAgentVariant`, `deleteWebWidget` | DB-005 |
| DB-005 | Implementar `getActiveTenantIdFromSession()` — derivar tenant_id desde JWT verificado de Supabase en lugar de cookie plain | M | DA-2 análisis cookie, F-05-OWASP-001 | B-001 |
| DB-006 | Fix server actions de gestión de tenants — añadir `requireAdmin()` interno en `createTenant`, `updateTenant`, `updateTenantConfig`, `deleteTenant` | S | DA-2-004 | DB-003 |
| DB-007 | Añadir CRON_SECRET env var y proteger cron endpoints: `/api/orchestration/sweep`, `/api/cron/appointments/reminders` | S | DA-3-001, DA-3-007 | DB-001 |
| DB-008 | Fix enqueueLeadStep — propagar error en lugar de retornar ID ficticio; loguear en orchestration_logs si Redis falla | S | DA-1-005 | Ninguna |

Dependencias Sprint 0: DB-005 antes de DB-004 (DB-004 necesita la función segura de tenant ID). DB-003 antes de DB-006 (primero asegurar la detección de admin). DB-007 puede ejecutarse en paralelo con DB-001.

---

## Sprint 1 — Alineación con Spec Cliente

*Sin cambios estructurales respecto al backlog original. El deep audit confirma los findings pero no añade items nuevos de negocio. Se mantienen B-013 a B-025 con sus dependencias originales.*

| ID | Titulo | Esfuerzo | Findings |
|----|--------|----------|---------|
| B-013 | Fix worker.js firma executeSequenceStep — recuperar lead completo de BD antes de llamar | S | F-02-001 (DA-1 profundiza con callstack completo) |
| B-014 | Crear llm-factory.ts con createLLM() usando AgentFactory existente; pasar api_key del variant | S | F-02-005, F-03-001, DA-1-003 |
| B-015 | Corregir umbral Regla B: qualifier.ts línea 80 de expYears >= 3 a expYears >= 2 | S | F-01-004, F-02-006, DA-4 confirma |
| B-016 | Revisar Regla C con cliente (sin estudios >= 5 años) | S | F-01-005 |
| B-017 | Implementar exclusión de perfiles manuales (fontanero, camarero, albañil) en qualifier.ts | S | F-01-005, DA-4 confirma faltante |
| B-018 | Unificar schema qualified — adoptar "apto"/"no apto" end-to-end en ai-analysis, fact-extractor, qualifier | M | F-01-003, F-03-002, DA-4 traza flujo completo |
| B-019 | Eliminar variantes YEARS_EXPERIENCIE y YEARS_ EXPERIENCIE | S | F-03-006 |
| B-020 | Alinear user_profesion vs user_profession con cliente | S | F-03-005 |
| B-021 | Alinear curse_name vs course_name | S | F-01-007 |
| B-022 | Renombrar tipo_lead a estado o clarificar mapeo | M | F-01-006 |
| B-023 | Añadir manejo de estado prematriculado | S | F-03-010, DA-4 confirma |
| B-024 | Corregir typo book_appointmen en Promt-Virginia.md y verificar en BD | S | F-03-004, DA-4 clarifica mecanismo de fallo |
| B-025 | Actualizar menú sidebar para coincidir con spec | S | F-01-013 |

### Items nuevos del deep audit en Sprint 1

| ID | Titulo | Esfuerzo | Findings | Dependencias |
|----|--------|----------|---------|--------------|
| DB-009 | Añadir validación Zod de tool call arguments en WhatsAppAIProcessor y Retell tools webhook | S | DA-4-003 | Ninguna |
| DB-010 | Implementar A/B split determinista — persistir ab_variant en BD al primer paso y leer de allí en retries | S | F-02-016, DA-3-008 | B-013 |

---

## Sprint 2 — Multi-tenancy y RLS Efectivo

*El deep audit amplía varios items del Sprint 2 original y añade nuevos.*

| ID | Titulo | Esfuerzo | Findings |
|----|--------|----------|---------|
| B-026 | Corregir RLS knowledge_base: eliminar `current_setting(app.current_tenant)`, adoptar JWT claim | S | F-04-004, DA-2 confirma dead letter |
| B-027 | Corregir RLS ai_agents: política tautológica | S | F-04-005, DA-2 confirma |
| B-028 | Corregir RLS ai_agent_variants: añadir join filtrado por tenant | S | F-04-005 |
| B-029 | Corregir RLS web_widgets: cambiar a auth.jwt() ->> tenant_id | S | F-04-006 |
| B-030 | Corregir RLS tenant_orchestrator_config: añadir TO service_role | S | F-04-012 |
| B-031 | Corregir RLS chat_messages: añadir TO service_role; migrar tenant_id de TEXT a UUID FK | M | F-04-013 |
| B-032 | Implementar `getActiveTenantIdFromSession()` en todas las server actions (ya en DB-005, consolidar aquí) | M | F-05-OWASP-001, DA-2 |
| B-033 | Mover Zoho owner IDs a tenant_orchestrator_config | S | F-02-003 |
| B-034 | Implementar JWT claim tenant_id en Auth Hook de Supabase | M | DA-2 análisis RLS — desbloquea 6 políticas JWT-based |
| B-035 | Sanitizar parámetro `id` en widget embed script — validar UUID regex antes de interpolar | S | F-05-OWASP-003, DA-3-004 |
| B-036 | Añadir allowlist de dominios para tenantUrl en `/api/tenant/migrate` (mitigar SSRF) | S | DA-3-002, F-05-OWASP-011 |
| B-037 | Autenticar endpoint `/api/tenant/migrate` GET y POST; eliminar GET o proteger con auth admin | S | DA-2-003, DA-3-002 |
| B-038 | Implementar deduplicación de secuencia en handleNewLead | M | F-02-010 |

### Items nuevos del deep audit en Sprint 2

| ID | Titulo | Esfuerzo | Findings | Dependencias |
|----|--------|----------|---------|--------------|
| DB-011 | Reemplazar RLS de tabla `tenants` — eliminar policies `USING(true)` para todos los roles; usar `TO service_role USING (true)` + policy `authenticated_own_tenant` que filtra por auth_user_id | M | DA-2-010 | B-034 |
| DB-012 | Validar firma HMAC en webhook CRM — implementar shared secret por tenant en lugar de confiar en `x-tenant-id` header | S | DA-2-009 | B-001 |
| DB-013 | Añadir verificación HMAC a webhook WhatsApp (hacer obligatoria, no condicional) — fail si WHATSAPP_APP_SECRET no existe en env | S | DA-2-006 | B-003 |
| DB-014 | Autenticar endpoint `/api/admin/tenants/[id]/client-sql` con check de sesión + rol admin | S | DA-2-002 | DB-003 |
| DB-015 | Cifrar service_key de tenants externos — usar AES-256-GCM antes de persistir en `tenants.config` | M | DA-2-008, DA-3-006 (Google tokens) | B-001 |
| DB-016 | Añadir security headers HTTP completos en next.config.ts (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | S | F-05-OWASP-006, DA-3 security headers audit | Ninguna |
| DB-017 | Autenticar endpoint `/api/docs/content` (MASTER_DOSSIER.md accesible sin auth) | S (15min) | DA-3-010 | B-001 |

Dependencias: DB-011 requiere B-034 (JWT claim) para que la política `authenticated_own_tenant` funcione. DB-016 es independiente y puede ejecutarse en cualquier orden.

---

## Sprint 3 — Observabilidad y Costes LLM

*El deep audit añade items de prompt security y memoria.*

| ID | Titulo | Esfuerzo | Findings |
|----|--------|----------|---------|
| B-039 | Persistir completion.usage en chat_messages — incluir token_usage en metadata | S | F-03-007, DA-4 confirma ausencia también en tool calls y rescue |
| B-040 | Actualizar precios hardcodeados en dashboard de costes (gpt-4o-mini actual vs GPT-4 de 2023) | S | DA-4-005 |
| B-041 | Implementar dead-letter queue en BullMQ — persistir jobs fallidos permanentemente en BD | M | F-02-002 |
| B-042 | Persistir current_step_index en tabla lead — no inferir desde orchestration_logs | M | F-02-008, DA-1 profundiza problemas del proxy por logs |
| B-043 | Instrumentar latencia real en WhatsAppAIProcessor | S | F-03-011, DA-4 estima P50 >1100ms |
| B-044 | Implementar retry con backoff exponencial para errores 429 de OpenAI | M | F-03-008 |
| B-045 | Centralizar instanciación de cliente OpenAI — singleton lazy por apiKey | S | DA-1-006, F-03-008, DA-4-008 |
| B-046 | Security headers HTTP — ya en DB-016, Sprint 2 | — | Adelantado a Sprint 2 |
| B-047 | Implementar alertas de umbral de coste por tenant | M | F-03-007 |
| B-048 | Integrar Sentry o equivalente para error tracking | M | F-05-OWASP-010 |
| B-049 | Fix race condition retry sequence — lock optimista en BD | M | F-02-007 |
| B-050 | Integrar RescueWorker en cron BullMQ del worker.js | S | F-02-017 |

### Items nuevos del deep audit en Sprint 3

| ID | Titulo | Esfuerzo | Findings | Dependencias |
|----|--------|----------|---------|--------------|
| DB-018 | Mover historial de conversación del system prompt al array `messages` (elimina duplicado + riesgo de prompt injection indirecto) | M | DA-4-002, DA-4-008 | Ninguna |
| DB-019 | Implementar compactación del chat summary — truncar a N líneas cuando supera umbral, reemplazar con resumen LLM | M | DA-4-004 | B-039 |
| DB-020 | Añadir validación Zod del output de `analyzeConversation` en ai-analysis.ts | S | DA-4-009, DA-4-011 | B-018 |
| DB-021 | Paginación en RescueWorker — añadir `.limit(100)` y cursor pagination | S | DA-4-007 | B-050 |
| DB-022 | Eliminar doble verificación de circuit breaker (worker.js + orchestrator.ts) — mover a función compartida | S | DA-1-004 | B-013 |
| DB-023 | Fix isFeatureEnabled fail-closed — distinción entre "flag desactivado" y "error de BD" | S | DA-1-008 | Ninguna |
| DB-024 | Implementar timeout de compliance para sábado en isWithinLegalWindow — respetar working_days config | S | DA-1-007 | Ninguna |

---

## Sprint 4 — Deuda Técnica y Tests

*El deep audit añade items de calidad de código LLM y manejo de API keys.*

| ID | Titulo | Esfuerzo | Findings |
|----|--------|----------|---------|
| B-051 | Instalar vitest — configurar para Next.js/ESM | S | F-01-008 |
| B-052 | Tests unitarios para qualifier.ts (árbol de decisión Reglas A/B) — cobertura >= 80% | M | F-01-008 |
| B-053 | Tests unitarios para fact-extractor.ts (parsing de variables del agente) | M | F-01-008 |
| B-054 | Tests de integración para flujo completo de cualificación WhatsApp | L | F-01-008 |
| B-055 | Resolver 426 instancias de as any/as unknown — comenzar por módulos críticos | L | F-01-012 |
| B-056 | Extraer tipo TraceabilityEvent a src/types/ | S | F-01-010 |
| B-057 | Mover scripts oneshot a scripts/ raíz | S | F-01-009, F-01-015 |
| B-058 | Consolidar tablas duplicadas: appointments vs agendamientos | M | docs/audit/04-data-findings.md |
| B-059 | Eliminar SweepQueue o conectar al worker BullMQ — DA-1-001 confirma conexión Redis extra | S | F-02-009, DA-1-001 |
| B-060 | Implementar QualifyAgent.processConversation con cadena LangChain real | L | F-02-011, DA-4-006 |
| B-061 | Cifrar campo api_key en ai_agent_variants — Supabase Vault o cifrado a nivel aplicación | M | F-03-009, DA-4-010 |
| B-062 | Actualizar supabase-js y supabase/ssr | M | docs/dependencies/outdated.md |
| B-063 | Actualizar langchain (CVE langsmith transitiva) y aws-sdk | S | docs/dependencies/risk-matrix.md |
| B-064 | Implementar webhook post-llamada para Ultravox | M | DA-4 confirma ausencia total |
| B-065 | Implementar fallback automático Retell -> Ultravox | L | docs/architecture/llm-stack.md |

### Items nuevos del deep audit en Sprint 4

| ID | Titulo | Esfuerzo | Findings | Dependencias |
|----|--------|----------|---------|--------------|
| DB-025 | Enmascarar api_key en UI dashboard (mostrar `sk-...xxxx`, nunca el valor completo en queries de lectura) | M | DA-4-010 | Ninguna |
| DB-026 | Implementar fallback multi-provider en WhatsAppAIProcessor — si OpenAI 429/error → Anthropic/Gemini | L | DA-4 análisis failover | B-014, B-060 |
| DB-027 | Usar crypto.randomUUID() para generar IDs de variante A/B y persistir en BD en lugar de Math.random() | S | DA-3-008, F-02-016 | DB-010 |
| DB-028 | Fix QualificationProcessor: pasar api_key del variant a createLLM — replicar patrón de WhatsAppAIProcessor | S | DA-1-003 | B-014 |
| DB-029 | Implementar DLQ en Redis con persistencia en BD — job fallido escribe en orchestration_logs con estado PERMANENTLY_FAILED | M | F-02-002, DA-1 profundiza fix | B-041 |
| DB-030 | Usar `timingSafeEqual` de node:crypto para comparar tokens en webhook WhatsApp verify | S (15min) | DA-3-011 | Ninguna |
| DB-031 | Eliminar `@anthropic-ai/claude-code` de devDependencies — arrastra hono CVEs High al build | S | DA-3-CVE-002 nota sobre transitivos | B-063 |
| DB-032 | Añadir RETRY_SEQUENCE action handler en worker.js — actualmente el action cae al final sin ejecutarse | S | DA-1 área gris #6 | B-013 |

---

## Sprint WCAG — Accesibilidad 2.1 AA (Sprint nuevo)

**Sprint completamente nuevo basado en DA-5.** La app es NON-COMPLIANT con WCAG 2.1 AA. Este sprint cubre los 24 findings del audit de accesibilidad.

La infraestructura de shadcn/ui ya está instalada. El primer paso (DA-A-001) resuelve la mayoría de issues críticos con cambios de componente, no de lógica.

### Fase A1 — Quick wins y migración a primitivos accesibles (1 semana)

| ID | Titulo | Esfuerzo | Findings DA-5 | Resolución |
|----|--------|----------|---------------|------------|
| DA-A-001 | Instalar `sonner` y configurar Toaster en layout raíz con aria-live="polite"; reemplazar todos los `alert()` por toast.success/error | M | DA-5-024, DA-5-021 (parcial) | Elimina alert() bloqueante, añade feedback accesible |
| DA-A-002 | Migrar los 4 modales manuales a `Dialog` de shadcn/ui (`npx shadcn@latest add dialog`) — resuelve automáticamente focus trap, role=dialog, aria-modal, cierre con Escape | M | DA-5-013, DA-5-014, DA-5-023 | Migrar: CreateLeadDialog, HistorialTable modal, AIAgentInbox modales x3 |
| DA-A-003 | Añadir skip-to-main-content al inicio de DashboardShell + id="main-content" en el elemento main | S (30min) | DA-5-017 | Una línea de markup |
| DA-A-004 | Añadir `role="dialog"`, `aria-modal="true"`, `aria-labelledby` a modales residuales no migrados a shadcn Dialog | S (1h) | DA-5-023 | Cobertura de cualquier modal que quede fuera de DA-A-002 |
| DA-A-005 | Añadir `htmlFor` + `id` únicos a todos los inputs del CreateLeadDialog (9 campos) | S (45min) | DA-5-003 | Cambio de markup puro |
| DA-A-006 | Añadir `autoComplete="email"` y `autoComplete="current-password"` en login/page.tsx y reset-password | S (15min) | DA-5-007 | Una atributo por input |
| DA-A-007 | Exportar metadata con `title` descriptivo en cada page.tsx del dashboard (~15 páginas) | M | DA-5-018 | Mejora navegación y SEO |

### Fase A2 — Semántica de interacción y teclado (1 semana)

| ID | Titulo | Esfuerzo | Findings DA-5 | Resolución |
|----|--------|----------|---------------|------------|
| DA-A-008 | Fix filas `<tr onClick>` en HistorialTable — añadir `tabIndex={0}`, `role="row"` + botón interior focusable o cambiar a `<button>` como fila | M | DA-5-004, DA-5-015 | Filas navegables por teclado |
| DA-A-009 | Cambiar `<div onClick>` del selector de agentes a `<button type="button">` | S | DA-5-006 | Cambio de elemento |
| DA-A-010 | Añadir `aria-label` descriptivo a todos los icon-only buttons en tablas (calendar, settings, inbox) | S | DA-5-019 | Atributo por botón |
| DA-A-011 | Añadir `aria-hidden="true"` a SVGs decorativos del Sidebar; añadir `aria-label` al botón de colapsar | S | DA-5-002 | Dos atributos |
| DA-A-012 | Añadir `aria-invalid="true"` + `aria-describedby` a inputs con error; mensaje de error con `role="alert"` en login y reset-password | M | DA-5-021 | Feedback de error programáticamente asociado al campo |
| DA-A-013 | Reemplazar `window.confirm()` por modal de confirmación usando shadcn Dialog (hook `useConfirmDialog` centralizado) | M | DA-5-022 | 9+ ubicaciones: calendar, knowledge, workflow sidebar |
| DA-A-014 | Establecer jerarquía de headings: un solo `<h1>` en Topbar, `<h2>` en secciones de contenido, `<h3>` en subsecciones | M | DA-5-005 | Refactor markup en agents/page, calendar/page |

### Fase A3 — Contraste, responsive y pulido (1 semana)

| ID | Titulo | Esfuerzo | Findings DA-5 | Resolución |
|----|--------|----------|---------------|------------|
| DA-A-015 | Eliminar patrón `text-*-foreground/XX` para texto de contenido informativo — definir variable `--secondary-text` con contraste fijo > 4.5:1 | M | DA-5-010 | 25+ ubicaciones, principalmente AIAgentInbox |
| DA-A-016 | Reemplazar clases `text-[8px]` y `text-[9px]` por mínimo `text-[11px]` o `text-xs` (12px) | M | DA-5-011 | Legibilidad mínima |
| DA-A-017 | Añadir `role="img"` + `aria-label` al indicador de WhatsApp Activo (punto verde) | S | DA-5-009 | Un atributo |
| DA-A-018 | Añadir icono semántico + texto en español a badges de estado de llamada en HistorialTable | M | DA-5-008 | Daltonismo y comprensibilidad |
| DA-A-019 | Añadir `alt` descriptivo a imágenes de perfil de lead en AIAgentInbox (3 instancias) | S | DA-5-001 | Un atributo por imagen |
| DA-A-020 | Envolver bloques en inglés con `<span lang="en">` en IntegrationsManager | S | DA-5-020 | Screen readers pronuncian correctamente |
| DA-A-021 | Implementar layout responsive en AIAgentInbox — mobile: vista single column con transición lista→chat→detalles | L | DA-5-012 | Requiere refactor de layout |
| DA-A-022 | Reemplazar `focus:ring-primary/10` por `focus:ring-primary/60` en inputs nativos; añadir ring a input del widget | M | DA-5-016 | 187 instancias de outline-none |

### Estimación Sprint WCAG

| Fase | Semana | Effort total | Findings resueltos |
|------|--------|-------------|-------------------|
| A1 — Quick wins | Semana 1 | ~2.5 dev-days | DA-5-003, 007, 013, 014, 017, 018, 021, 023, 024 (9 findings) |
| A2 — Semántica | Semana 2 | ~3 dev-days | DA-5-002, 004, 005, 006, 015, 019, 021, 022 (8 findings) |
| A3 — Contraste/Responsive | Semana 3 | ~4 dev-days | DA-5-001, 008, 009, 010, 011, 012, 016, 020 (8 findings) |
| **Total** | **3 semanas** | **~9-10 dev-days** | **24/24 findings** |

Dependencias: DA-A-001 y DA-A-002 primero (establecen los primitivos accesibles que usan las fases siguientes). DA-A-021 (responsive) es independiente y puede ejecutarse en paralelo.

---

## Sprint 5 — Mejoras Opcionales

*Sin cambios respecto al backlog original. Se mantienen B-066 a B-075.*

| ID | Titulo | Esfuerzo | Notas |
|----|--------|----------|-------|
| B-066 | A/B split determinista — ya cubierto por DB-010, DB-027 | S | Adelantado |
| B-067 | Documentar /dashboardadmin rewrite | S | — |
| B-068 | Migrar TypeScript a v6.x | L | Breaking changes |
| B-069 | Actualizar lucide-react a 1.x | L | Renombrado de iconos |
| B-070 | Cookie af-tenant-id a httpOnly — cubierto por DB-005 | S | Adelantado |
| B-071 | Splittear componentes grandes (>1400 líneas) | L | AIAgentInbox es prioritario por DA-5 |
| B-072 | Eliminar @anthropic-ai/claude-code de devDependencies | S | DB-031 ya lo cubre |
| B-073 | Eliminar npm crypto@1.0.1 stub deprecated | S | — |
| B-074 | Documentar variables de agenda y RAG con la cliente | M | — |
| B-075 | npm prune para eliminar paquetes extraneous | S | — |

---

## Tabla resumen de todos los sprints

| Sprint | Items originales | Items nuevos deep | Total | Dev-days estimados |
|--------|-----------------|-------------------|-------|-------------------|
| Sprint 0 | 12 | 8 (DB-001 a DB-008) | 20 | 10-15 |
| Sprint 1 | 13 | 2 (DB-009, DB-010) | 15 | 8-10 |
| Sprint 2 | 13 | 7 (DB-011 a DB-017) | 20 | 12-15 |
| Sprint 3 | 12 | 7 (DB-018 a DB-024) | 19 | 10-12 |
| Sprint 4 | 15 | 8 (DB-025 a DB-032) | 23 | 15-20 |
| Sprint WCAG | 0 | 22 (DA-A-001 a DA-A-022) | 22 | 9-10 |
| Sprint 5 | 10 | 0 | 10 | 5-8 |
| **Total** | **75** | **54** | **129** | **69-90 dev-days** |

---

## Dependencias entre Sprints (actualizado)

Sprint 0 → Sprint 1: Sprint 0 es prerequisito de seguridad. B-001 (rotar JWT) y DB-003 (fix admin check) deben completarse antes de Sprint 1.

Sprint 0 → Sprint 2: DB-005 (tenant ID desde sesión) es prerequisito de DB-004 (IDOR fix) y de B-034 (JWT claim en Supabase).

Sprint 1 → Sprint 3: B-013 (fix worker) debe estar antes de DB-022 (eliminar doble circuit breaker).

Sprint 2 → Sprint 3: El aislamiento de datos (Sprint 2) debe estar antes de la observabilidad (Sprint 3).

Sprint WCAG: Puede ejecutarse en paralelo con Sprint 2 y Sprint 3. No tiene dependencias de infraestructura con otros sprints excepto que DA-A-001/DA-A-002 deben completarse antes de las fases A2 y A3.

Sprint 4 → Sprint 5: Sin dependencias críticas.

---

**Status:** DONE
**Summary:** Backlog ampliado de 75 a 129 items incorporando los findings del deep audit. Sprint WCAG (Accesibilidad) es completamente nuevo y puede ejecutarse en paralelo. Los 8 items nuevos del Sprint 0 deben incorporarse a la ejecución urgente junto a los 12 originales.

---

## Fase 4 — Post-release (futuro, post-MVP)

Items añadidos tras decisión R-020-refinement-v2 (2026-05-19, sesión 3) — todo lo que se aplaza fuera del MVP.

### E-001 — Google Sheets bidireccional ⭐

- **Origen**: era parte del MVP en sesión 2 (R-020-refinement); aplazado en sesión 3 a Fase 4.
- **Esfuerzo**: M (10-15 días/dev, ~2-3 semanas).
- **Diseño técnico**: ya documentado en sesión 2 del DECISIONES — sigue siendo válido. Plantilla Sheets estandarizada + OAuth2 Google + Drive API push notifications + rate limit handling + UI admin.
- **Reutiliza**: código OAuth Google del commit `63e1e6e` (sprint S-04). Mantener congelado hasta esta fase.
- **Decisión pendiente**: MCP server custom vs skill custom vs librería `googleapis`. Evaluar al arrancar Fase 4.

### E-002 — Salesforce adapter

- **Esfuerzo**: M (2-3 semanas).
- OAuth2, Connected Apps. Tener en cuenta coste extra por API edition (Enterprise+).
- Imprescindible para captar clientes enterprise (escuelas de negocio, universidades).

### E-003 — GoHighLevel (GHL) adapter

- **Esfuerzo**: M.
- OAuth2 v2 (API moderna). Crecimiento Latam EduTech. Documentación calidad media.

### E-004 — ActiveCampaign adapter

- **Esfuerzo**: S-M.
- API Key. Vertical education-specific. Marketing automation + CRM.

### E-005 — Generalización del Adapter pattern

- **Esfuerzo**: S.
- Tras añadir 3-4 conectores más sobre los 2 del MVP, revisar si el `IntegrationAdapter` interface necesita refactor para soportar mejor casos no contemplados (webhooks bidireccionales en CRMs que no son HubSpot/Zoho).

### E-006 — Tier 2 on-demand (Clientify, Bitrix24, Pipedrive, Monday, Holded)

- **Esfuerzo**: S por adapter (1 semana cada uno).
- Sólo se implementan cuando un cliente concreto lo pida explícitamente. No en plan base.
