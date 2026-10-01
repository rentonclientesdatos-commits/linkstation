# Security Agent Protocol — linkstation

> Política operativa del subagente `af-agents:security` activado proactivamente en cada cierre de fase/sprint desde 27-05-2026 (SP-4-SEC-PROACTIVE).

## TL;DR

- **Quién lo invoca:** `af-agents:manager` automáticamente en CLOSE-1.5 de cada Phase/Sprint Completion Protocol. Cualquier dev puede invocarlo manualmente: `@security audit delta` o `@security audit full`.
- **Modo default:** `delta` — solo audita archivos modificados en la sprint (`git diff developer..HEAD`).
- **Modo full-scan:** activado automáticamente en releases (`v0.X.0` con X cambia, `rc.*`, promoción `staging → main`) o por petición explícita.
- **Bloqueo de cierre:** findings críticos BLOQUEAN cierre del sprint hasta arreglar. Altos abren BUG para próximo sprint. Medios/bajos al backlog.
- **No modifica código** — solo audita y reporta. El manager delega remediación a `af-agents:code`.

## Cuándo se ejecuta

| Trigger                                                      | Modo      | Bloqueo                                |
| ------------------------------------------------------------ | --------- | -------------------------------------- |
| Cierre de fase/sprint (CLOSE-1.5, automático)                | delta     | Críticos bloquean cierre               |
| PR review (al abrir PR a `developer`)                        | delta     | Críticos requieren fix antes de merge  |
| Bump `v0.X.0` con X distinto al último tag                   | full-scan | Críticos+Altos bloquean release        |
| Release candidate `rc.*` o `beta.*`                          | full-scan | Críticos bloquean release              |
| Promoción `staging → main`                                   | full-scan | Críticos+Altos bloquean promoción      |
| MVP GA (`v1.0.0` o equivalente)                              | full-scan | Críticos+Altos+Medios bloquean release |
| Petición manual: `@security audit delta`                     | delta     | Informativo                            |
| Petición manual: `@security audit full`                      | full-scan | Informativo                            |
| Petición manual: `@security audit targeted src/path/file.ts` | targeted  | Informativo                            |

## Severidades y criterios

### CRÍTICO (bloquea cierre/release)

- RLS missing en tabla con `tenant_id` (cross-tenant data leak).
- Secret hardcoded en código (`SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, API keys).
- Token OAuth en claro en BD (sin AES-256-GCM).
- Webhook sin firma HMAC validada.
- SQL injection (concatenación de strings con input usuario).
- XSS via `dangerouslySetInnerHTML` sin sanitización.
- Privilege escalation (lectura `is_admin` de `user_metadata` en vez de `app_metadata`).
- SSRF en endpoint público.
- Endpoint admin sin `requireApiAdmin`.

### ALTO (BUG-X próximo sprint, no bloquea cierre actual)

- Server Action LLM sin `withRateLimit` wrap.
- Logger Pino imprime email/phone en claro (PII leak).
- CSP `connect-src` falta dominio que se usa en código → romperá en prod.
- Cookie sin `Secure` en producción.
- Dependencia con CVE High (`npm audit --audit-level=high` falla).
- Endpoint POST sin Origin check (CSRF parcial).

### MEDIO (backlog)

- `unsafe-inline` styles fuera de Tailwind v4 contextos justificados.
- Falta replay protection en webhook (riesgo bajo si HMAC bien hecho).
- Rate-limit configurado pero `perMinute` demasiado generoso para el riesgo.
- Documentación de seguridad desactualizada.

### BAJO (informativo)

- Comentario `// TODO: harden` sin asignar fecha.
- Header de seguridad faltante pero redundante (ej. `X-XSS-Protection` ya cubierto por CSP).

## Output

Path: `plans/reports/security-{mode}-{sprint or version}-{YYYYMMDD}.md`

Ejemplos:

- `plans/reports/security-delta-sprint-3-20260527.md`
- `plans/reports/security-full-v0.3.0-20260527.md`
- `plans/reports/security-full-v0.4.0-mvp-ga-20260801.md`

Estructura: ver plantilla en `.claude/agents/security.md` sección "Formato del report".

## Falsos positivos conocidos (no reportar)

| Caso                                                                                        | Razón                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `style-src 'unsafe-inline'` en CSP                                                          | Tailwind v4 lo requiere para MVP. Plan Sprint 4 migra a `strict-dynamic`. Documentado.                                                                          |
| `script-src 'unsafe-eval'` en CSP cuando `NODE_ENV !== 'production'`                        | React dev tools eval(). En build producción CSP queda estricta sin `unsafe-eval`.                                                                               |
| `frame-ancestors *` en `/widget/*`                                                          | Widget público debe poder embeberse en sitios cliente. Justificado.                                                                                             |
| Cookie `esden-tenant-url` sin `HttpOnly`                                                    | Cliente lee la URL del tenant para mostrarla en UI admin. Documentado en ADR-014.                                                                               |
| `@aws-sdk/client-s3` y `s3-request-presigner` presentes                                     | Usadas con MinIO S3-compatible (NO AWS). AWS Bedrock removido 26-05-2026 — solo queda S3.                                                                       |
| `console.log("[AUTH] Intentando login para ${email}")` en `auth.ts`                         | Email es input usuario para debug login. NO es leak (Pino redact NO aplica en console.log). Mover a logger Pino estructurado pendiente — registrado como MEDIO. |
| `service_role` key usada en workers BullMQ                                                  | Workers bypassan RLS deliberadamente para procesar jobs cross-tenant. Comentado en código.                                                                      |
| Test files `*.test.ts` con secrets hardcoded (`"test-anon-key"`, `"test-service-role-key"`) | Test fixtures, nunca tocan red real. NO son secretos reales.                                                                                                    |

## Cómo invocar manualmente

```bash
# Modo delta (default)
@security audit delta

# Full-scan
@security audit full

# Targeted a un archivo específico
@security audit targeted src/lib/actions/new-feature.ts
```

O delegando vía manager:

```ts
Task(
  (subagent_type = "af-agents:security"),
  (prompt =
    "Audit delta sobre cambios del sprint 3. Reports path: plans/reports/. Work context: e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard")
);
```

## Cross-refs

- Agent definition: [.claude/agents/security.md](../../.claude/agents/security.md)
- Manager orquestador: [.claude/agents/manager.md](../../.claude/agents/manager.md) — sección "Fin de fase"
- CLAUDE.md proyecto: sección "Phase/Sprint Completion Protocol (automático)" — paso 2 CLOSE-1.5
- Hardening policy: [docs/security/hardening-policy.md](hardening-policy.md)
- OWASP quick-check: [docs/security/owasp-quick-check.md](owasp-quick-check.md)
- CSRF protection: [docs/security/csrf-protection.md](csrf-protection.md)
- Plan tarea SP-4-SEC-PROACTIVE: [plans/260520-1342-sprint-3-hardening/phase-09-auth-ratelimit-y-security-proactivo.md](../../plans/260520-1342-sprint-3-hardening/phase-09-auth-ratelimit-y-security-proactivo.md)

## Changelog

- **27-05-2026** — Documento creado. Agent `af-agents:security` activado proactivamente en CLOSE-1.5 (SP-4-SEC-PROACTIVE Sprint 3 phase-09).
