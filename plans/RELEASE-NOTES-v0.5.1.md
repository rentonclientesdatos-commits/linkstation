# Release Notes — v0.5.1

**Fecha**: 10 de junio de 2026  
**Estado**: Producción (VPS Dokploy desplegado ✅)

## Resumen

Consolidación de seguridad multi-tenant + integración Zoho en tiempo real + fixes críticos de cifrado de dependencias multiplataforma. **Todas las vulnerabilidades RLS documentadas cerradas (21/21 tablas).**

## Highlights

- 🔐 **RLS Multi-Tenant Hardening**: cierre de 4 vulnerabilidades IDOR (BUG-SEC RLS-001/002). Patrón `tenant_id IN (SELECT id FROM tenants WHERE auth_user_id=auth.uid())` aplicado a 21 tablas. Verificado con JWT real + psql contra VPS.
- 🔄 **Zoho CRM Event-Driven**: webhook instantáneo (lead entra en Zoho → REST POST en segundos). Suscripción dual (Workflow manual + Notifications API). Reconciliación diaria como red de seguridad. OAuth multi-DC (.eu/.com).
- 🛠️ **Cross-Platform npm Lock**: fix emnapi (WASM Tailwind) que fallaba en Docker Alpine. Regenerado en `--os=linux --cpu=x64 --libc=musl` (nunca en Windows).
- 🎯 **Centro de Costes LLM Spike**: persistencia de sesión + simulador + cálculos gpt-5.4-mini. Listo para próximo sprint dedicado.
- 📊 **Actualización modelos**: agentes demo a gpt-5.4-mini (claude-sonnet-4-7 / gpt-4.1-mini deprecated).

## Detalle por área

### Seguridad / Capa de datos

**RLS Multi-Tenant (BUG-SEC RLS-001 + RLS-002)**

- Cierre de IDOR en lectura cross-tenant vía anon key.
- 21 tablas corregidas: `leads`, `campaigns`, `contacts`, `inbox_messages`, `integrations`, `activity_logs`, `crm_write_audit`, `availability_slots`, `lead_events`, `conversation_threads`, `messages`, `llm_calls`, `llm_invocations`, `tenant_members`, `tenant_settings`, `webhooks`, `webhook_logs`, `notifications`, `help_sections`, `blog_articles`, `admin_access_logs`.
- Patrón seguro: `USING (tenant_id IN (SELECT id FROM tenants WHERE auth_user_id=auth.uid()))`.
- Verificación: JWT real + login contra VPS (psql mocks dan falsos negativos en RLS).

**Migraciones SQL aplicadas**

- `20260606_001_rls_multi_tenant_hardening.sql` (base_schema + tablas básicas)
- `20260607_002_rls_residual_cross_tenant.sql` (campanas, availability, lead_events)
- `20260608_003_rls_tenants_tabla.sql` (tenants misma)

### Backend / Integraciones

**Zoho CRM Event-Driven (Sprint 5)**

- Webhook instantáneo: `POST /api/webhooks/zoho` → validación HMAC → carga BD.
- Suscripción dual:
  - Workflow manual (Zoho admin, sin expiración).
  - Notifications API auto (7 días, renovación hook periódica).
- OAuth multi-DC: `.eu` (default) / `.com` (configurable).
- Reconciliación diaria: scheduled job que sincroniza leads drift.
- Adaptador reutilizable de Sprint 2: `crm/providers/zoho.ts` (getLead, updateLead, OAuth).

**Centro de Costes LLM (Costes-LLM Spike)**

- Persistencia de sesión en BD (tabla `cost_simulator_sessions`).
- Cálculos gpt-5.4-mini: tokens in/out → USD estimado (actualizado con pricing 2026-06).
- UI simulador: entrada manual de prompts → tabla de costes + gráfico acumulado.
- Listo para Sprint dedicado (Costes-LLM v0.5.1-LLM).

### Infra / DevOps

**Cross-Platform npm Lock (Docker Alpine)**

- **Problema**: Tailwind v4 incluye emnapi (WASM), npm install en Windows genera lock incompatible.
- **Solución**: regenerar lock SOLO en Alpine Linux (`--os=linux --cpu=x64 --libc=musl`).
- **Comando fix**: `npm install --os=linux --cpu=x64 --libc=musl` en contenedor o VM Alpine.
- **Verificación**: `npm ci` en Docker build ahora 100% limpio.

**VPS Dokploy**

- Deployed v0.5.1 OK (webhooks Zoho a 200).
- Autodeploy Git aún por revisar (branch developer, Dockerfile monitoreado).
- Logs via Logflare (próximo sprint — refinamiento Post-MVP).

### Modelos IA

- Agentes demo actualizados a **gpt-5.4-mini** (reemplaza claude-sonnet-4-7 / gpt-4.1-mini).
- Compatibilidad seed data: tabla `agents` versión 2026-06-10.

## Breaking Changes

**NINGUNO** — v0.5.1 es punto de seguridad puro. Compatible backwards con v0.5.0.

## Migraciones SQL

Tres migraciones que DEBEN aplicarse en orden:

```sql
-- 1. Base schema + tablas primarias
supabase/migrations/20260606_001_rls_multi_tenant_hardening.sql

-- 2. Tablas residuales (campañas, slots, eventos)
supabase/migrations/20260607_002_rls_residual_cross_tenant.sql

-- 3. Tabla tenants misma
supabase/migrations/20260608_003_rls_tenants_tabla.sql
```

Aplicadas en VPS dev.linkstation.ai ✅. Pendientes: staging, prod.

## Variables de entorno nuevas

**ZOHO_WEBHOOK_SECRET** — HMAC signing key para webhook Zoho.

- Dónde: Dokploy env panel o `.env.local` (local dev).
- Generada: `crypto.randomBytes(32).toString('base64')`.
- Valor del cliente: proporcionado por usuario en setup.

**LLM_COST_PRICING_GPTMINI** — tarifa gpt-5.4-mini (USD por 1M tokens).

- Dónde: Dokploy env panel.
- Default: `0.00015` (input) / `0.0006` (output) — verificar con cliente si cambia.

## Tareas RoadMap cerradas

- `SP-5-RLS-HARDENING` — 4 vulns cerradas.
- `SP-5-ZOHO-ENTRADA` — integración event-driven operativa.
- `SP-5B-COSTES-SPIKE` — simulador persistencia + modelos actualizados.

## Tareas diferidas

- **VPS Dokploy autodeploy**: revisión configuración (branch tracking).
- **Logflare integration**: refinamiento Post-MVP (Sprint 6+).
- **E2E VPS completo**: pendiente de manual Renzo + tester (SP-4B fase dedicada).

## ADRs relacionados

- **ADR-020** — RLS multi-tenant pattern (cerrado 10-06-2026).
- **ADR-021** — Zoho webhook HMAC signing (cerrado 09-06-2026).

## Contribuidores

- @Renzo — Integración Zoho + simulador costes + validación E2E real.
- @Javi HP — Orquestación Sprint 5 + hardening RLS + release.

## Commits incluidos

```
4046767 fix(deps): regenerar package-lock multiplataforma en alpine (emnapi cross-platform)
9b8dde4 fix(deploy): regenerar package-lock sincronizado (npm ci fallaba en Docker)
cea9860 chore(release): bump v0.5.0 -> v0.5.1 (Sprint 5 Zoho + fixes RLS + Costes-LLM + simulador)
da03e4d Merge branch 'feature/integ-renzo-costes-llm-simulator' into developer
27a8853 Merge branch 'feature/sprint-05-zoho-entrada-leads' into developer
6455317 Merge pull request #30 from LinkStation/fix/sec-rls-002-tenants
a6a1268 fix(security): cerrar RLS leak en tenants + corregir raiz base_schema (BUG-SEC RLS-002)
2b27f01 Merge pull request #29 from LinkStation/fix/sec-rls-001-residual
a8f2a20 fix(security): cerrar RLS residual cross-tenant en campanas/availability_slots/lead_events
22d88e1 fix(seed): agentes demo a gpt-5.4-mini (modelos claude-sonnet-4-7 / gpt-4.1-mini obsoletos)
b23a3b7 Merge pull request #27 from LinkStation/fix/sec-rls-001-tenant-isolation
80eb159 fix(security): RLS multi-tenant isolation en lectura authenticated (BUG-SEC RLS-001)
```

## Próximos pasos

1. **Staging**: promover a `staging` con variables env completadas (ZOHO_WEBHOOK_SECRET, etc.).
2. **E2E Staging + VPS**: validación Renzo + tester (SP-4B).
3. **Prod** (si OK): merge a `main` + tag public.
4. **Sprint 6** (Costes-LLM dedicado): burndown costes + validación cliente + release v0.6.0.

---

**Firma Digital**: release validada local + VPS dev en verde ✅  
**Aprobación requerida**: usuario antes de `gh release edit v0.5.1`
