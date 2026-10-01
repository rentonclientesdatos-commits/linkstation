---
adr_id: ADR-002
title: Upgrade next@16.1.6 → 16.2.6 (cierre CVE middleware bypass + SSRF WebSocket)
status: Accepted
date: 2026-05-21
authors:
  [ai-2you-ai-agents/adr (pre-aprobado en auditoría 20-05-2026), Renzo (validación 21-05-2026)]
related_task: Sprint 0 · 1-26 (Phase 06)
related_audit: plans/reports/adr-auditoria-dependencias-20260520.md §CVE-002
supersedes: ninguno
superseded_by: ninguno
---

# ADR-002 — Upgrade `next` 16.1.6 → 16.2.6

## Contexto

Auditoría de seguridad detectó **19 CVEs activos** en `next@16.1.6` (instalado en producción). Los dos más graves son `near-critical` para una aplicación multi-tenant:

| GHSA                | Vector                                                    | CVSS    | Fix en     |
| ------------------- | --------------------------------------------------------- | ------- | ---------- |
| GHSA-c4j6-fc7j-m34r | SSRF via WebSocket upgrades                               | **8.6** | 16.2.5     |
| GHSA-492v-c6pp-mqqv | Middleware/Proxy bypass via dynamic route param injection | **8.1** | 16.2.5     |
| GHSA-267c-6grr-h53f | Middleware bypass via segment-prefetch routes             | 7.5     | 16.2.5     |
| GHSA-36qx-fr4f-26g5 | Middleware bypass via i18n (Pages Router)                 | 7.5     | 16.2.5     |
| GHSA-26hh-7cqf-hhc6 | Middleware bypass — Incomplete Fix Follow-Up              | 7.5     | **16.2.6** |
| GHSA-q4gf-8mx6-v5v3 | DoS with Server Components                                | 7.5     | 16.2.3     |
| GHSA-8h8q-6873-q5fj | DoS with Server Components (v2)                           | 7.5     | 16.2.5     |
| GHSA-mg66-mrh9-m8jx | DoS via connection exhaustion en Cache Components         | 7.5     | 16.2.5     |

**Impacto crítico para linkstation:** el middleware bypass anula directamente las protecciones de auth de las tareas Sprint 0 `1-07`, `1-08`, `1-16`, `1-17`. Sin este fix, esas tareas son inefectivas en producción.

## Decisión

**Actualizar `next` y `eslint-config-next` de 16.1.6 a 16.2.6** (versión mínima que incluye GHSA-26hh fix completo).

## Alternativas consideradas

1. **Esperar a Next 17 (major).** Descartado — sin fecha de release pública y deja CVEs abiertos varias semanas más.
2. **Quedarnos en 16.1.6 con un WAF que bloquee patrones de bypass.** Descartado — la complejidad de mantener firmas de bypass es alta y un solo gap deja el sistema expuesto. El fix oficial es la única solución completa.
3. **Bump solo a 16.2.5.** Descartado — no incluye GHSA-26hh-7cqf-hhc6 (incomplete fix follow-up del bypass). 16.2.6 lo cierra completo.

## Análisis de breaking changes

Tipo de upgrade: **minor** (16.1 → 16.2). Por SemVer no debería haber breaking changes en API pública. Verificado en changelog oficial Vercel:

- Sin cambios de API en App Router / Server Actions / Middleware.
- Sin cambios en runtime (Edge / Node).
- Cambios internos en validación de routing → fix de los CVEs.
- Compatibilidad: React 18.2+ ó 19.x (tenemos 19.2.3 ✅).

**Riesgo residual:** middleware o Server Actions con patrones poco comunes podrían comportarse distinto. Mitigación: smoke test en SP-1-CLOSE-2 antes de promover a staging.

## Compatibilidad con stack actual

| Dependencia           | Versión actual | Compatible con next 16.2.6            |
| --------------------- | -------------- | ------------------------------------- |
| react                 | 19.2.3         | ✅ peer `^19.0.0`                     |
| react-dom             | 19.2.3         | ✅ peer `^19.0.0`                     |
| @supabase/ssr         | 0.8.0          | ✅ (sin cambios en cookies handling)  |
| @supabase/supabase-js | 2.97.0         | ✅                                    |
| @playwright/test      | 1.60.0         | ✅ peer `^1.51.1`                     |
| typescript            | 5.x            | ✅                                    |
| eslint                | ^9             | ✅ ligado a eslint-config-next 16.2.6 |
| tailwindcss           | 4              | ✅ sin cambios                        |

## Implementación

```powershell
npm install next@16.2.6 eslint-config-next@16.2.6
npm run typecheck   # debe pasar a 0 errores
npm run build       # build limpio
```

Resultado verificado el 21-05-2026:

- `npm list next` → `next@16.2.6` ✅
- `npm list eslint-config-next` → `eslint-config-next@16.2.6` ✅
- `npm run typecheck` → 0 errores ✅
- `npm run build` → `Compiled successfully in 25.0s` + `Generating static pages (41/41)` ✅

## Smoke test pendiente

Diferido a **SP-1-CLOSE-2** (cierre de Sprint 0) según política del proyecto (tests de browser se ejecutan al cierre, no en cada tarea). Cobertura mínima:

- Ruta pública `/` y `/login` → 200.
- Ruta protegida `/dashboard` sin sesión → redirect a login (no bypass).
- Ruta protegida con sesión válida → 200.
- `/api/auth/*` → respuestas esperadas.
- `/api/orchestration/deploy` sin auth → 401 (verifica middleware no bypasseable post-1-07 y post-1-26).

Si cualquier smoke test falla → rollback inmediato: `npm install next@16.1.6 eslint-config-next@16.1.6`, abrir issue.

## Consecuencias

### Positivas

- Cierra 19 CVEs activos.
- Desbloquea Phases 3 y 5 del Sprint 0 (`1-07`, `1-08`, `1-16`, `1-17`) — sus protecciones de auth ahora son efectivas.
- Sin trabajo adicional de refactor (minor, no breaking).
- Reduce superficie de auditoría externa para el cliente.

### Negativas

- Si el smoke test detecta regresión, hay que invertir tiempo en rollback + reportar a Vercel.
- `npm audit` aún muestra 21 vulnerabilidades restantes — son de `axios` (1-24) y deps transitivas (tareas posteriores).

## Tareas asociadas

- ✅ Sprint 0 · 1-26 (esta tarea) — install + verify typecheck/build.
- ⏳ Sprint 0 · SP-1-CLOSE-2 — smoke test browser de las 5 rutas listadas arriba.
- 📋 Sprint 1 · 2-27 — **CANCELADA / movida** a 1-26 (Sprint 0). Notado en `plans/260520-1342-sprint-1-capa-datos/phase-06-rls-hardening-complementario.md`.

## Referencias

- Auditoría completa: `plans/reports/adr-auditoria-dependencias-20260520.md` §CVE-002.
- Findings deep audit: `docs/audit/deep/DA-3-security-deep.md` §DA-3-CVE-002.
- Plan Sprint 0 Phase 6: `plans/260520-1342-sprint-0-hotfixes-seguridad/phase-06-otros-criticos.md` §1-26.
- Next.js security advisories: https://github.com/vercel/next.js/security/advisories
