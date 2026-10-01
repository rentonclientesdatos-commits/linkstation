# Incidente 2026-05-27 — PAT GitHub leak + Sheets en sesión paralela

**Detectado:** 2026-05-27 ~20:36 UTC durante inspección Dokploy para diagnosticar deploy pendiente.
**Severidad:** CRÍTICO (PAT) + INFORMATIVO (sheets paralelo).
**Estado:** PAT leak contenido en local (no llegó a git). Acción rotación pendiente usuario.

---

## §1 — 🚨 CRÍTICO: GitHub PAT expuesto en panel Dokploy

### Token comprometido

```text
ghp_<REDACTED-22-CHARS>  [prefijo: ghp_ZYmQ — registrado en vault privado de Javi HP para verificar revocación]
```

> El valor completo se compartió por chat directo durante la sesión incidente. NO se incluye en este documento commiteable porque eso sería re-publicar el secreto en git history permanente.

### Dónde estaba expuesto

1. **Panel Dokploy** — `panel.linkstation.ai` → Project "dev LinkStation" → Service `dev.dash` → tab General → sección Provider → campo "Repository URL".
   - URL formato: `https://<PAT>@github.com/LinkStation/linkstation-dashboard.git`
   - **Cualquier user con acceso al panel Dokploy ve el PAT en plano**.
2. **Snapshot local Playwright MCP** — `.playwright-mcp/page-2026-05-27T20-36-29-852Z.yml` (en disco local, gitignored).
3. **Screenshot local** — `plans/260527-2056-e2ctotal-local-run/screenshots/dokploy-05-devdash-service.png` (en disco local, iba a commitear).
4. **Contexto sesión Claude actual** — visible en transcript Anthropic + memoria IDE.

### Lo que un atacante puede hacer con este PAT

- **Clone privado completo** del repo `LinkStation/linkstation-dashboard`.
- **Push a cualquier rama** (incluyendo `main`, `developer`, `staging`).
- **Acceso a secretos commited históricamente** (revisar git log buscando `.env`, keys, etc.).
- **Crear releases, tags, eliminar ramas**.
- Acceso a issues, PRs, settings del repo (según scope del PAT).

### Remediación aplicada in-session (LOCAL)

- ✅ Borrado `plans/260527-2056-e2ctotal-local-run/screenshots/dokploy-{01..05}-*.png` (5 archivos).
- ✅ Borrado `.playwright-mcp/page-2026-05-27T20-36-{05,29}*.yml` (2 archivos).
- ✅ Verificado `grep -rn "ghp_ZYmQ6cE..."` en todo el filesystem (excl. node_modules + .git) → 0 resultados.
- ✅ Verificado git history: `git log --all -S "ghp_ZYmQ6cE"` → vacío. **El PAT NUNCA llegó a git.**
- ✅ Verificado `.playwright-mcp/` está en `.gitignore` línea 56 → snapshots Playwright nunca trackean.

### Remediación pendiente — ACCIÓN USUARIO INMEDIATA

1. **GitHub → Settings → Developer settings → Personal access tokens** → buscar token con prefijo `ghp_ZYmQ6cE` → **Revoke** (debe estar registrado al usuario que creó el deploy Dokploy).
2. **Generar PAT nuevo** con scope mínimo:
   - ✅ `repo` (full control of private repos) — necesario para Dokploy clone/pull.
   - ❌ NO `admin:repo_hook` salvo que se necesite.
   - ❌ NO `delete_repo`.
   - ⏰ Expiration: 90 días (forzar rotación periódica).
3. **Panel Dokploy → dev.dash → Provider → Repository URL**: reemplazar PAT viejo por nuevo.
4. (Recomendado) Cambiar Provider de "Git" genérico a **"Github"** integrado de Dokploy (usa OAuth de GitHub App, no PAT en URL). Mucho más seguro: el token nunca se ve en panel, está cifrado backend Dokploy + tiene revocación granular.

### Por qué pasó

El servicio Dokploy `dev.dash` fue configurado con Provider "Git" + URL con PAT embebido en lugar del Provider "Github" que usa OAuth GitHub App. Patrón antiguo / shortcut de setup que deja credenciales en plano. Documentar política para futuros servicios.

### Lección para política del proyecto

**Política nueva a añadir a `docs/security/hardening-policy.md` cuando se aplique la rotación**:

- Prohibido configurar servicios Dokploy/CI/CD con PATs embebidos en URLs de git. Usar siempre Provider GitHub OAuth (Dokploy "Github" tab) o SSH keys con deploy keys read-only del repo.
- Todo PAT en producción debe tener expiration ≤ 90 días.
- Auditoría periódica (mensual) de panels Dokploy/CI con captura screenshots saneados verificando que NO se ven secretos en plano.

---

## §2 — Sheets en sesión paralela (otro chat)

### Hallazgo

Detectado en `git log feature/sprint-04-google-sheets`:

```text
f752b74 feat(sprint-4): sheets adapter + queue + worker + webhook + writeback + actions
d639971 feat(sprint-4): sheets foundation - SQL migrations + types + credentials + OAuth refactor
```

Estos 2 commits **NO son míos** (esta sesión Claude). El usuario confirma: **"Google Sheets lo está trabajando otro chat"**.

### Archivos involucrados en la rama paralela

- `src/app/api/integrations/google/auth/route.ts` (modificado)
- `src/app/api/integrations/google/callback/route.ts` (modificado)
- `src/lib/integrations/sheets/credentials.ts` (nuevo)
- `src/lib/integrations/sheets/row-mapper.ts` (nuevo)
- `src/lib/integrations/sheets/session.ts` (nuevo)
- `src/lib/integrations/sheets/types.ts` (nuevo)
- `supabase/migrations/20260527000000_sheet_connections.sql` (nuevo)
- `supabase/migrations/20260527000001_integrations_tenant_oauth_app.sql` (nuevo)
- Probablemente más en commit `f752b74` (adapter + queue + worker + webhook + writeback + actions).

### Reglas para esta sesión (sprint-03-hardening)

**NO TOCAR `feature/sprint-04-google-sheets` desde aquí.** Cualquier intervención puede crear conflictos con la sesión paralela.

- ✅ Permitido: trabajar en `feature/sprint-03-hardening` sin tocar archivos sheets.
- ❌ NO permitido: checkout a sprint-04, editar archivos sheets, abrir PRs cross-branch.
- ❌ NO permitido: merge sprint-03 → developer mientras sprint-04 esté en curso si conflictúan en RoadMap o archivos comunes.

### Coordinación recomendada

Cuando ambas sesiones terminen:

1. Cada sesión cierra su propio sprint (sprint-03 testing rate-limit, sprint-04 sheets).
2. Las PRs a `developer` se ordenan secuencialmente (la que termine antes mergea primero, la segunda hace rebase + resuelve conflictos si los hay).
3. Cualquier cambio en RoadMap.md o e2e-runs-history.md debe coordinarse manualmente entre ambos chats.

### Por qué la confusión durante esta sesión

El IDE / proceso de Claude Code parece haber hecho checkout silencioso a `feature/sprint-04-google-sheets` al menos 2 veces:

- HEAD@{4}: `checkout: moving from feature/sprint-03-hardening to feature/sprint-04-google-sheets`
- HEAD@{8}: `checkout: moving from developer to feature/sprint-04-google-sheets`

Probable causa: hooks del IDE / extension de VS Code "auto-sync" con rama activa de la otra sesión. **Mitigación esta sesión:** verificar `git branch --show-current` antes de cada operación crítica.

---

## §3 — Estado final del incidente

| Item                                         | Estado                          |
| -------------------------------------------- | ------------------------------- |
| PAT borrado de filesystem local              | ✅ DONE                         |
| PAT verificado ausente de git history        | ✅ DONE                         |
| PAT verificado ausente de docs commiteados   | ✅ DONE                         |
| Rotación PAT en GitHub                       | ⏳ ACCIÓN USUARIO               |
| Panel Dokploy actualizar URL con PAT nuevo   | ⏳ ACCIÓN USUARIO               |
| Política `hardening-policy.md` actualizada   | ⏳ TODO (incluir post-rotación) |
| Documentar sheets sesión paralela            | ✅ DONE (este documento §2)     |
| Vuelta a rama sprint-03-hardening verificada | ✅ DONE                         |

---

**Status final:** PAT contenido en local. Rotación urgente pendiente acción usuario en GitHub + panel Dokploy. Sheets paralelo documentado, NO se toca desde esta sesión.
