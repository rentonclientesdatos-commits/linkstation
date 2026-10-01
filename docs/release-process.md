---
title: "Release Process — linkstation"
audience: equipo de desarrollo (lead + Auditor)
date: 20-05-2026
status: vigente
---

# Release Process — linkstation

## 1. Modelo de ramas

```
feature/*  → PR → developer → (orden explícita) → staging → (orden explícita) → main
   |                  |                                |                          |
   |                  ↑                                ↑                          ↑
   |       Trabajo activo del equipo       Pruebas con cliente          Producción
   |       Versiona TODO el scaffold       Sólo código                  Sólo código
   |       (.claude/, docs/, plans/...)    + .env.example               + .env.example
```

## 2. Qué llega a cada rama

| Path | `developer` | `staging` | `main` |
| --- | --- | --- | --- |
| `src/`, `app/`, `lib/`, `components/`, `supabase/migrations/` | ✅ | ✅ | ✅ |
| `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.*` | ✅ | ✅ | ✅ |
| `.env.example` (placeholders) | ✅ | ✅ | ✅ |
| `.gitignore`, `.gitattributes` | ✅ | ✅ | ✅ |
| `.github/workflows/` | ✅ | ✅ | ✅ |
| `worker.js`, `Dockerfile`, `docker-compose.yml` | ✅ | ✅ | ✅ |
| `scripts/promote.ps1`, `scripts/promote.sh` | ✅ | ❌ | ❌ |
| `CLAUDE.md` (instrucciones equipo) | ✅ | ❌ | ❌ |
| `.claude/` (agentes, skills, hooks, rules, settings) | ✅ | ❌ | ❌ |
| `.claude-plugin/plugin.json` | ✅ | ❌ | ❌ |
| `docs/` (audit, architecture, dev-onboarding, etc) | ✅ | ❌ | ❌ |
| `plans/` (plans de fases) | ✅ | ❌ | ❌ |
| `.env`, `.env.local`, `.env.production` (secretos) | ❌ | ❌ | ❌ |
| `docs/Docs-entrega-clienta/` (raw PDFs/DOCX cliente) | ❌ | ❌ | ❌ |

## 3. Workflow de promoción

### 3.1 De feature/* → developer

```powershell
# Desde tu rama feature
git push -u origin feature/fase-X-cosa
gh pr create --base developer --title "feat(faseX): ..." --body "..."
# Lead revisa, aprueba, merge en GitHub UI
```

### 3.2 De developer → staging (cuando el cliente quiere probar)

**Requiere orden explícita del usuario** (regla global Co-Authorship). El script limpia automáticamente `.claude/`, `docs/`, `plans/`, etc.

```powershell
# Windows PowerShell
.\scripts\promote.ps1 -From developer -To staging -Version 0.1.0
```

```bash
# WSL / macOS / Linux
./scripts/promote.sh --from developer --to staging --version 0.1.0
```

El script hace:

1. Verifica working tree limpio.
2. `git checkout developer; git pull`.
3. `git checkout staging; git pull`.
4. `git merge --squash developer`.
5. **Elimina** `docs/`, `plans/`, `.claude/`, `.claude-plugin/`, `CLAUDE.md`, `scripts/promote.*` del staging.
6. Commit: `chore(release): promote v0.1.0 from developer to staging`.
7. **NO hace push automático** — verifica con `git log` y `git status` antes.
8. Push manual: `git push origin staging`.

### 3.3 De staging → main (producción)

**Requiere orden explícita del usuario + el cliente debe haber validado staging.**

```powershell
.\scripts\promote.ps1 -From staging -To main -Version 0.1.0
```

El script hace lo mismo + crea un tag `v0.1.0`.

```powershell
# Tras verificar:
git push origin main
git push origin v0.1.0
```

### 3.4 Hotfix urgente directo a main

Excepcional. Sólo Javier (Auditor) puede autorizar. Proceso:

1. Branch `hotfix/X.Y.Z` desde `main`.
2. Aplica el fix.
3. PR a `main` con review obligatoria.
4. Tag SemVer patch.
5. Cherry-pick a `staging` y `developer` para mantener sincronía.

## 4. Versionado SemVer

- `v0.0.0` ahora (inicial).
- **Patch** dentro de un sprint en curso → `v0.0.x`.
- **Sprint cerrado** → bump a `v0.x.0`.
- **MVP completo** (tras Fase 3, antes de Fase 4) → `v1.0.0`.

Los tags los crea el script `promote.ps1` automáticamente al hacer promoción a `main`.

## 5. Branch protection en GitHub (configurar 1 vez)

Settings → Branches → Add rule, para `staging` y `main`:

- ✅ Require pull request before merging
- ✅ Require approvals: 1 (lead)
- ✅ Require status checks to pass: **Staging/Main Purity Check** (definido en `.github/workflows/staging-main-purity-check.yml`)
- ✅ Require branches to be up to date
- ✅ Do not allow bypassing the above (incluye admins)
- ❌ No allow force pushes
- ❌ No allow deletions

Para `developer`:

- ✅ Require pull request
- ✅ Require approvals: 1
- (Sin Purity Check — developer SÍ acepta docs/plans/.claude)

## 6. CI guard automático

El workflow `.github/workflows/staging-main-purity-check.yml` se ejecuta en cada push/PR a `staging` o `main`. **Falla si detecta**:

- `docs/`
- `plans/`
- `.claude/`
- `.claude-plugin/`
- `CLAUDE.md`
- `docs/dev-onboarding.md`

Esto garantiza que aunque alguien intente saltarse el script `promote.ps1` y hacer un merge manual sucio, GitHub bloqueará el merge.

## 7. Qué hace el cliente cuando recibe el código

El cliente (centros de formación que prueban en staging, o producción final) recibe:

- Sólo el código de producto (`src/`, `app/`, `package.json`, etc).
- `.env.example` para que sepa qué variables necesita.
- Sin auditorías, sin planes, sin instrucciones para Claude Code.

Esto es lo que protege la confidencialidad del trabajo interno del equipo de auditoría/desarrollo.

## 8. Casos de error frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| CI falla en `staging` con "Forbidden path 'docs' found" | Alguien hizo merge manual sin script | Revertir commit, usar `promote.ps1` |
| `promote.ps1` falla con "Working tree no limpio" | Hay cambios sin commit | Commit/stash primero |
| Tag duplicado al promocionar a `main` | Ya existías un release con esa versión | Bump version y reintentar |
| Falta `scripts/promote.ps1` al hacer checkout de staging | Es esperado — el script SOLO existe en developer | Volver a developer para promocionar |

---

**Última actualización**: 20-05-2026.
**Mantenedor**: Javier HP (Auditor).
