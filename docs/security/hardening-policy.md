---
title: Política de Hardening de Seguridad — linkstation
status: ACTIVE
version: 1.0
created: 2026-05-27
created_by: Javi HP (Auditor)
audience: equipo de desarrollo + auditor + administrador de sistemas
review_cadence: tras cada sprint MVP + tras cada incidente + semestral
applies_to: rama developer · staging · main · entornos local + VPS Dokploy
related_adr: ADR-014..023 · R-013..R-025 (DECISIONES-AUDITOR)
---

# Política de Hardening de Seguridad — `linkstation`

> 📌 **Documento autoritario**. Las medidas listadas aquí son **obligatorias** para cualquier release que pase a `staging` o `main`. Si una medida está marcada 🟢 ACTIVA, **no se permite regresión**. Si está 🟡 PARCIAL, hay tarea abierta para cerrarla. Si está 🔘 PENDIENTE, está planificada.

## 1 · Propósito

Esta política consolida las medidas de seguridad **ya aplicadas en código** (Sprints 0-3) y las **pendientes** hasta MVP GA y producción. Sirve como:

- Checklist obligatorio antes de cada deploy a VPS.
- Threat model derivado para `SP-4B` (validación Renzo) y para futuros auditores externos.
- Referencia para el sysadmin (cuando se contrate en Fase 3 de escalado, ver Bloque 4 informe V2).
- Punto único de verdad cuando alguien pregunte "¿qué seguridad tiene el proyecto?".

NO sustituye a la **auditoría completa V1** (`docs/audit/findings-summary.md` + `docs/audit/deep/DEEP-FINDINGS-SUMMARY.md`), que sigue siendo el inventario inicial. Esta política es la **versión "qué hacemos para que no vuelva a pasar"**.

## 2 · Principios rectores

1. **Defensa en profundidad** — toda petición debe pasar por al menos 3 capas independientes antes de tocar datos: middleware auth → handler validation → RLS Postgres.
2. **Fail-closed por defecto** — ante duda, denegar. Nunca usar fallbacks que abran acceso (ej. `if (!user) return ok;` está prohibido).
3. **Least privilege** — RLS multi-tenant en TODA tabla con datos de tenant. Service role solo en migraciones y scripts admin marcados.
4. **Secret hygiene** — cero secretos en código. Todo por env vars o vault. `.env.local` gitignored sin excepciones.
5. **Auditoría** — toda escritura sensible (CRM writes, tenant config changes, role changes) deja registro en `crm_write_audit` o `system_logs`.
6. **Validación en frontera** — Zod schemas para todo input externo (webhooks, API públicas, formularios).
7. **Observabilidad obligatoria** — Sentry + Pino structured logging con PII scrubbing en TODO handler.
8. **Reproducibilidad** — cualquier medida verificable con un comando `grep` o un test Playwright. Si no se puede verificar mecánicamente, no es una medida.

## 3 · Medidas activas (verificar antes de cada deploy)

### 3.1 · Autenticación + Autorización

| ID        | Medida                                                        | Estado    | Verificación                                                    |
| --------- | ------------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| H-AUTH-01 | JWT service_role NUNCA en código (solo env var)               | 🟢 ACTIVA | `grep -rE "eyJhbGci" src/` = 0 resultados                       |
| H-AUTH-02 | JWT anon NUNCA hardcoded                                      | 🟢 ACTIVA | `src/lib/supabase/client.ts` solo `process.env.*`               |
| H-AUTH-03 | `requireApiUser()` en endpoints user-only                     | 🟢 ACTIVA | grep `requireApiUser` en `src/app/api/**/route.ts`              |
| H-AUTH-04 | `requireApiAdmin()` en endpoints admin                        | 🟢 ACTIVA | grep `requireApiAdmin` (createTenant/deleteTenant/admin/\*)     |
| H-AUTH-05 | `requireCronSecret()` en endpoints cron                       | 🟢 ACTIVA | grep `requireCronSecret` (cron/appointments/reminders)          |
| H-AUTH-06 | Admin SOLO desde `app_metadata.is_admin` (no `user_metadata`) | 🟢 ACTIVA | `src/middleware.ts` + `src/lib/auth.ts` + `src/lib/api-auth.ts` |
| H-AUTH-07 | Ownership validation server-side de cookie tenant             | 🟢 ACTIVA | `requireTenantAccess()` en server actions                       |

### 3.2 · RLS multi-tenant en Postgres

| ID       | Medida                                                | Estado       | Verificación                                             |
| -------- | ----------------------------------------------------- | ------------ | -------------------------------------------------------- |
| H-RLS-01 | Patrón `owner_or_admin` en TODA tabla multi-tenant    | 🟢 ACTIVA    | 8 migrations RLS hardening aplicadas                     |
| H-RLS-02 | Prohibido `USING (true)` sin `TO authenticated/admin` | 🟢 ACTIVA    | `grep -rE "USING \(true\)" supabase/migrations/` revisar |
| H-RLS-03 | `tenants` table: SELECT owner/admin, IUD solo admin   | 🟢 ACTIVA    | `20260521000000_rls_tenants_hardening.sql`               |
| H-RLS-04 | `knowledge_base`: ownership-based 4 policies SIUD     | 🟢 ACTIVA    | `20260521000001_rls_knowledge_base_hardening.sql`        |
| H-RLS-05 | `ai_agents` / `ai_agent_variants`: owner_or_admin     | 🟢 ACTIVA    | `20260522220000_rls_ai_agents_hardening.sql`             |
| H-RLS-06 | `web_widgets`, `programas`: owner_or_admin            | 🟢 ACTIVA    | `20260522220001/02_rls_*_hardening.sql`                  |
| H-RLS-07 | Tests RLS con BD real (no mocks)                      | 🟢 ACTIVA    | `tests/integrations/rls/*.test.ts`                       |
| H-RLS-08 | Cross-tenant leak verificado E2E con segundo tenant   | 🔘 PENDIENTE | SP-4B phase-04 Renzo                                     |

### 3.3 · Webhooks firmados (HMAC)

| ID      | Medida                                                                    | Estado     | Verificación                                                            |
| ------- | ------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| H-WH-01 | Retell webhook: `verifyRetellWebhook()` obligatorio antes de parsear JSON | 🟢 ACTIVA  | `src/app/api/webhooks/retell/route.ts`                                  |
| H-WH-02 | Retell tools webhook: `verifyHmacSignature()` antes de cancelar/agendar   | 🟢 ACTIVA  | `src/app/api/webhooks/retell/tools/route.ts`                            |
| H-WH-03 | WhatsApp webhook: HMAC obligatorio (NO condicional con env)               | 🟢 ACTIVA  | `src/app/api/webhooks/whatsapp/route.ts`                                |
| H-WH-04 | CRM webhook: HMAC + sin spoofing `tenant_id`                              | 🟢 ACTIVA  | `src/app/api/webhooks/crm/route.ts`                                     |
| H-WH-05 | Workflow webhook: token de path validado                                  | 🟢 ACTIVA  | `src/app/api/webhooks/workflow/*`                                       |
| H-WH-06 | Validación HMAC ANTES de cualquier I/O o conexión Redis/BD                | 🟡 PARCIAL | Bug E2E-260527-007: handler whatsapp inicializa antes. Fix en Sprint 3. |

### 3.4 · Cifrado de secretos

| ID       | Medida                                                                         | Estado     | Verificación                                            |
| -------- | ------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------- |
| H-CRY-01 | Tokens OAuth (HubSpot/Zoho/Google) cifrados AES-256-GCM en BD                  | 🟢 ACTIVA  | `src/lib/crypto/token-crypto.ts` + ADR-017              |
| H-CRY-02 | API keys LLM (OpenAI/Anthropic) cifradas en `ai_agent_variants.api_key_cipher` | 🟢 ACTIVA  | Migration `20260522220003_integrations_table.sql`       |
| H-CRY-03 | `ENCRYPTION_KEY` env var ≥ 32 bytes (base64)                                   | 🟢 ACTIVA  | `.env.example` documenta requisito                      |
| H-CRY-04 | JWT secrets generados con `crypto.randomBytes(64).toString('base64')`          | 🟢 ACTIVA  | Documentado en CLAUDE.md "Password & Credential Policy" |
| H-CRY-05 | Test token-crypto authTag GCM                                                  | 🟡 PARCIAL | 1 test fallando — bloquea v0.3.0 GA, arreglar antes     |

### 3.5 · Security Headers HTTP (OWASP)

| ID       | Medida                                           | Estado     | Verificación                                                                      |
| -------- | ------------------------------------------------ | ---------- | --------------------------------------------------------------------------------- |
| H-HDR-01 | Content-Security-Policy completo                 | 🟡 PARCIAL | `next.config.ts` configurado pero CSP bloquea Supabase local (bug E2E-260527-003) |
| H-HDR-02 | Strict-Transport-Security con preload            | 🟢 ACTIVA  | HSTS preload activado                                                             |
| H-HDR-03 | X-Frame-Options: DENY                            | 🟢 ACTIVA  | Sprint 3 commit `54d9756`                                                         |
| H-HDR-04 | X-Content-Type-Options: nosniff                  | 🟢 ACTIVA  | Sprint 3                                                                          |
| H-HDR-05 | Referrer-Policy: strict-origin-when-cross-origin | 🟢 ACTIVA  | Sprint 3                                                                          |
| H-HDR-06 | Permissions-Policy restrictiva                   | 🟢 ACTIVA  | Sprint 3                                                                          |

### 3.6 · Validación de entrada (Zod)

| ID       | Medida                                                                    | Estado       | Verificación                                                               |
| -------- | ------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| H-VAL-01 | Zod schemas en TODOS los handlers de webhook                              | 🟢 ACTIVA    | `src/lib/schemas/webhooks/*.ts`                                            |
| H-VAL-02 | Zod schemas en endpoints públicos (leads/ingest, widget)                  | 🟡 PARCIAL   | `leads/ingest` cuelga sin responder (bug E2E-260527-001). Validar primero. |
| H-VAL-03 | Widget embed: UUID regex strict + JSON.stringify para evitar XSS          | 🟢 ACTIVA    | Sprint 0 commit `2c9437c`                                                  |
| H-VAL-04 | SSRF allowlist en `/api/tenant/migrate`                                   | 🟢 ACTIVA    | `isAllowedTenantUrl()`                                                     |
| H-VAL-05 | Argumentos LLM tool-call validados con Zod (no null/undefined al booking) | 🔘 PENDIENTE | DA-4-003 Sprint 3 cierre                                                   |

### 3.7 · Rate limiting + abuse prevention

| ID      | Medida                                                                 | Estado       | Verificación                       |
| ------- | ---------------------------------------------------------------------- | ------------ | ---------------------------------- |
| H-RL-01 | Rate limit sliding-window Redis                                        | 🟢 ACTIVA    | `src/lib/rate-limiter.ts` Sprint 3 |
| H-RL-02 | HOF `withRateLimit` aplicado en endpoints LLM + simulator + embeddings | 🟢 ACTIVA    | `src/lib/api/with-rate-limit.ts`   |
| H-RL-03 | Widget: 5 req/min por (widgetId, IP)                                   | 🟢 ACTIVA    | Migration `20260522000000`         |
| H-RL-04 | Fail-open si Redis cae (no bloquea tráfico legítimo)                   | 🟢 ACTIVA    | Sprint 3                           |
| H-RL-05 | Bump `express-rate-limit` (vuln high CVE)                              | 🔘 PENDIENTE | Sprint 3 task 4-02                 |

### 3.8 · Observabilidad + PII scrubbing

| ID       | Medida                                                                   | Estado     | Verificación                                           |
| -------- | ------------------------------------------------------------------------ | ---------- | ------------------------------------------------------ |
| H-OBS-01 | Pino structured logging en TODO handler                                  | 🟢 ACTIVA  | `src/lib/utils/logger.ts`                              |
| H-OBS-02 | PII scrubbing: redact paths `email`, `token`, `password`, `phone`, `dni` | 🟢 ACTIVA  | `pino redact.paths` configurado                        |
| H-OBS-03 | Sentry server config con `beforeSend` filter PII                         | 🟢 ACTIVA  | `sentry.server.config.ts`                              |
| H-OBS-04 | Sentry DSN en env var, NUNCA hardcoded                                   | 🟢 ACTIVA  | `.env.example`                                         |
| H-OBS-05 | Sentry validado E2E en VPS (evento real recibido)                        | 🟢 ACTIVA  | 26-may-2026 evento `4967d99e`                          |
| H-OBS-06 | Workers BullMQ logs con `tenant_id` + `lead_id` + `duration_ms`          | 🟢 ACTIVA  | Sprint 3                                               |
| H-OBS-07 | Cron endpoints sin info leak (no exponer PII en error responses)         | 🟡 PARCIAL | Bug E2E-260527-002 (cron reminders 503 con info infra) |

### 3.9 · Dependencias + Supply chain

| ID       | Medida                                                 | Estado       | Verificación                               |
| -------- | ------------------------------------------------------ | ------------ | ------------------------------------------ |
| H-DEP-01 | `npm audit` 0 critical, ≤15 high                       | 🟡 PARCIAL   | Actual: 0 critical, 11 high (gestionables) |
| H-DEP-02 | Toda nueva dep prod pasa por subagente `af-agents:adr` | 🟢 ACTIVA    | Hook `af-deps-guard.cjs` bloquea bypass    |
| H-DEP-03 | Husky pre-push: typecheck + lint + build obligatorios  | 🟢 ACTIVA    | `.husky/pre-push`                          |
| H-DEP-04 | Husky pre-commit: lint-staged                          | 🟢 ACTIVA    | `.husky/pre-commit`                        |
| H-DEP-05 | Dependabot configurado en GitHub                       | 🔘 PENDIENTE | Recomendación V2 — Sprint 3 o post-MVP     |
| H-DEP-06 | TypeScript strict + `no-explicit-any` ERROR            | 🟢 ACTIVA    | `eslint.config.mjs` Sprint 3               |
| H-DEP-07 | 0 errores `no-explicit-any` (objetivo SP-4-LINT-ZERO)  | 🟡 PARCIAL   | 95 errores residuales legacy               |

### 3.10 · Acceso a infraestructura (VPS Dokploy + Postgres)

| ID       | Medida                                          | Estado                 | Verificación                                         |
| -------- | ----------------------------------------------- | ---------------------- | ---------------------------------------------------- |
| H-INF-01 | SSH al VPS solo con clave ed25519 (no password) | 🟢 ACTIVA              | `infra/supabase-vps/.vault/` vault gitignored        |
| H-INF-02 | Postgres con `requirepass` fuerte               | 🟢 ACTIVA              | Setup Dokploy                                        |
| H-INF-03 | Redis con `requirepass` en VPS                  | 🟡 PENDIENTE VERIFICAR | Auditor V2 marca verificación obligatoria pre-deploy |
| H-INF-04 | Backup diario automatizado de Postgres VPS      | 🔘 PENDIENTE           | Pre-deploy MVP                                       |
| H-INF-05 | Snapshots semanales del VPS (Hetzner / Contabo) | 🔘 PENDIENTE           | Pre-deploy MVP                                       |
| H-INF-06 | Acceso panel Dokploy con 2FA                    | 🟢 ACTIVA              | Cuenta admin configurada                             |
| H-INF-07 | Firewall: solo 443 + 22 expuestos               | 🟢 ACTIVA              | Dokploy default                                      |

## 4 · Checklist pre-deploy (obligatorio antes de cualquier promoción)

Ejecutar antes de cada `staging-main` o promoción a producción real:

```bash
# 1. Tests verdes
npm run typecheck && npm run lint && npm run build && npm test
# Esperado: 0 errores typecheck, 0 nuevos errores lint, build OK, tests 100% pass

# 2. Test E2C exhaustivo local
/e2ctotal
# Esperado: 0 CRIT, 0 HIGH no planificados

# 3. Test E2E VPS
/e2etotal --env vps
# Esperado: igual que arriba

# 4. npm audit
npm audit --production
# Esperado: 0 critical, ≤ 15 high

# 5. Grep verificable (no debe haber match):
grep -rE "eyJhbGci" src/                    # JWT en código
grep -rE "USING \(true\)" supabase/migrations/  # RLS taut
grep -rE "TODO.*security|FIXME.*security" src/  # TODOs security

# 6. Sentry tracking activo
curl -fsSL https://dev.linkstation.ai/api/version
# Esperado: campos commit, branch, deployedAt con valores reales (no "unknown")

# 7. RLS hardening verificado
psql -c "SELECT tablename FROM pg_policies WHERE qual = 'true';"
# Esperado: 0 filas (nada con USING(true))
```

Si CUALQUIER paso falla → NO promocionar. Abrir ticket, fix, re-correr.

## 5 · Threat model (STRIDE simplificado)

| Threat                     | Vector                                             | Mitigación principal                          |
| -------------------------- | -------------------------------------------------- | --------------------------------------------- |
| **S**poofing               | Webhook spoofing (Retell, WhatsApp, CRM, Workflow) | HMAC obligatorio H-WH-01..05                  |
| **S**poofing               | Cookie tampering (af-tenant-id)                    | Server-side ownership validation H-AUTH-07    |
| **T**ampering              | Privilege escalation user→admin                    | Admin solo de `app_metadata` H-AUTH-06        |
| **T**ampering              | SQL injection vía exec_sql                         | Removido. Endpoint con allowlist H-VAL-04     |
| **R**epudiation            | Cambios CRM sin trazabilidad                       | `crm_write_audit` table + ADR-022             |
| **I**nformation Disclosure | Cross-tenant data leak                             | RLS hardened H-RLS-01..07 + middleware        |
| **I**nformation Disclosure | Tokens OAuth filtrados en BD                       | AES-256-GCM H-CRY-01..02                      |
| **I**nformation Disclosure | Logs con PII                                       | Pino redact H-OBS-02 + Sentry filter H-OBS-03 |
| **D**enial of Service      | Abuse widget público                               | Rate limit 5 req/min H-RL-03                  |
| **D**enial of Service      | Bucle LLM no acotado                               | `withRateLimit` HOF H-RL-02 + Sentry alert    |
| **D**enial of Service      | Webhook 503 sostenido (Meta desactiva)             | Validar HMAC ANTES de I/O H-WH-06             |
| **E**levation of Privilege | XSS widget embed                                   | UUID regex + JSON.stringify H-VAL-03          |
| **E**levation of Privilege | SSRF tenant/migrate                                | Allowlist `isAllowedTenantUrl` H-VAL-04       |

## 6 · Respuesta a incidentes (procedimiento mínimo)

Cuando se detecte un incidente de seguridad (alerta Sentry, reporte usuario, finding de auditoría externa):

1. **Triaje inmediato** (5-15 min): clasificar severidad (Critical/High/Medium/Low) según impacto y exposición.
2. **Contención** (1-4h):
   - Si CRIT: parar deploys, rotar credenciales afectadas, evaluar rollback a versión anterior.
   - Si HIGH: feature flag off, hotfix branch.
   - Si MED/LOW: ticket en RoadMap.
3. **Comunicación** (≤24h):
   - CRIT con datos de cliente afectados → notificar a clienta + cumplir GDPR (≤72h a autoridad).
   - Otros → comunicar en próximo retrospective.
4. **Fix + verificación** (variable): branch hotfix, fix, tests, /e2ctotal, /e2etotal vps, deploy, monitorización 24h.
5. **Post-mortem** (≤1 semana): documento en `docs/security/incidents/INC-YYYYMMDD-slug.md` con: timeline, root cause, fix aplicado, prevención futura, ADR si aplica.

## 7 · Revisiones periódicas

| Frecuencia              | Qué revisar                                                       | Quién                                 |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **Pre-cada-deploy**     | Checklist sección 4                                               | Lead + agente `af-agents:deployment`  |
| **Pre-cada-sprint**     | Tabla sección 3, marcar regresiones, abrir tareas para 🟡 PARCIAL | Lead                                  |
| **Tras cada incidente** | Threat model sección 5 (¿el vector estaba contemplado?)           | Lead + Auditor                        |
| **Semestral**           | Auditoría externa completa (similar a V1)                         | Auditor externo + Javi HP             |
| **Anual**               | Penetration test profesional                                      | Pentester externo (perfil OSCP/CISSP) |

## 8 · Notas de cumplimiento (RGPD / LOPDGDD)

- **Datos personales tratados**: nombre, email, teléfono, profesión, años experiencia, mensajes WhatsApp/voz, grabaciones llamadas.
- **Base legal**: consentimiento + interés legítimo (lead contactado por academia).
- **Periodo de retención**: TBD — pendiente decisión clienta. Auditor propone 24 meses tras última interacción.
- **Encargado de tratamiento**: LinkStation SL. Subencargados: Supabase (Dokploy auto-hosted), Anthropic/OpenAI (LLM), Retell/Ultravox (voz), Meta (WhatsApp), HubSpot/Zoho (CRM destino del tenant).
- **Derechos ARCO+ del lead**: endpoint `/api/gdpr/export` y `/api/gdpr/delete` pendientes — abrir tarea Sprint Costes-LLM o Sprint 4.

## 9 · Documentos relacionados

- [`docs/audit/findings-summary.md`](../audit/findings-summary.md) — V1 quick scan 65 findings.
- [`docs/audit/deep/DEEP-FINDINGS-SUMMARY.md`](../audit/deep/DEEP-FINDINGS-SUMMARY.md) — V1 deep audit +67 findings.
- [`docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md`](../audit/DECISIONES-AUDITOR-JAVIER-HP.md) — R-013..R-025.
- [`docs/audit2/audit-v2.md`](../audit2/audit-v2.md) — Auditoría V2 medio proyecto.
- [`docs/audit2/index.html`](../audit2/index.html) — Informe HTML V2.
- [`docs/adr/ADR-017-cifrado-tokens-oauth-aes-256-gcm.md`](../adr/ADR-017-cifrado-tokens-oauth-aes-256-gcm.md) — Cifrado.
- [`docs/adr/ADR-022-write-policy-semantics.md`](../adr/ADR-022-write-policy-semantics.md) — Audit trail CRM.

---

**Estado:** ACTIVE  
**Próxima revisión:** tras cierre Sprint 3 + tras SP-4B Renzo.  
**Owner:** Javi HP (Auditor).
