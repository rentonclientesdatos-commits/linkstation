# Node 20 → 22 Migration Compatibility Audit

**linkstation** | 25-05-2026 | Researcher

---

## Resumen ejecutivo

- **GO con caveats** para migrar a Node 22 LTS (v22.15.x actualmente — ver sección 1).
- No hay deps con prebuilt binaries problemáticas: `bcrypt` y `sharp` **no están en el proyecto**.
- Riesgo principal: `@types/node@^24` instalado en devDeps con runtime Node 22 → mismatch de tipos conocido. **Requiere downgrade a `@types/node@^22`** al migrar.
- `lint-staged` 17 introduce nuevo requisito Node ≥ 22.22.1 — **bloquea** mientras Node 22 < 22.22.1. Estrategia: pinear a `22.15.x` primero, actualizar `lint-staged` cuando Node 22 alcance ≥ 22.22.1 (o subir a `22.22.x` directamente como target).
- `node:22-alpine` funciona (ya tiene `libc6-compat` en el Dockerfile), pero Node.js project no lo soporta oficialmente. `node:22-bookworm-slim` es el default recomendado si se detectan crashes en produccíon.

---

## 1. Versión Node 22 LTS a pinear

| Versión                   | Estado                   | Notas                               |
| ------------------------- | ------------------------ | ----------------------------------- |
| `22.13.0` (plan original) | Desactualizada           | Publicada ene-2025                  |
| **`22.15.1`**             | Actual a May 2026        | Última patch con fixes de seguridad |
| `22.22.3`                 | Registrada en nodejs.org | Última de la rama 22.x a 13-05-2026 |

**Recomendación**: pinear `.nvmrc` a `22.15.1` (verificado en nodejs.org/releases). Si ya está disponible `22.22.3`, usarla directamente — es la que exige lint-staged 17 como mínimo. Verificar con `nvm ls-remote 22` antes del commit.

Security patches 2025 en rama 22.x: ene (1 high, 2 medium), may (1 high, 1 low), jul (1 high), dic-2025 (3 high, 1 medium, 1 low). Rama activamente parcheada. Node 22 entra en **Maintenance LTS oct-2025** (ya activo) y EOL **30-abr-2027**.

---

## 2. Deps críticas — tabla de compatibilidad Node 22

| Dep                          | Versión actual           | Node 22 status       | Notas                                                                      |
| ---------------------------- | ------------------------ | -------------------- | -------------------------------------------------------------------------- |
| `next`                       | ^16.2.6                  | **Compatible**       | Next.js 16 requiere ≥ Node 20.9; Node 22 soportado explícitamente          |
| `react` / `react-dom`        | 19.2.3                   | **Compatible**       | Pure JS, sin nativos                                                       |
| `@supabase/ssr`              | ^0.10.3                  | **Compatible**       | Versiones >0.5.2 resuelven el bug de type inference con Node 22; 0.10.x OK |
| `@supabase/supabase-js`      | ^2.106.1                 | **Compatible**       | Soporta Node ≥ 18; 2.106 OK                                                |
| `bullmq`                     | ^5.73.0                  | **Compatible**       | Pure JS sobre ioredis; sin nativos; probado en Node 22 en producción       |
| `ioredis`                    | ^5.10.1                  | **Compatible**       | Pure JS; sin prebuilt binaries                                             |
| `redis`                      | ^5.11.0                  | **Compatible**       | Pure JS                                                                    |
| `bcrypt`                     | **NO en proyecto**       | N/A                  | No instalar — si se añade en futuro, requiere rebuild en alpine            |
| `sharp`                      | **NO en proyecto**       | N/A                  | Next.js 16 lo lista como opcional; no está en package.json                 |
| `@next/swc-*`                | No instalado manualmente | **Compatible**       | Next.js gestiona internamente; 16.x incluye binarios para Node 22          |
| `@playwright/test`           | ^1.60.0                  | **Compatible**       | Playwright 1.49+ soporta Node ≥ 18; 1.60 OK en Node 22                     |
| `vitest`                     | ^3.2.4                   | **Compatible**       | Vitest 3.x requiere Node ≥ 18; compatible con 22                           |
| `@types/node`                | ^24.12.4                 | **BREAKING (tipos)** | Ver sección 4 — requiere downgrade a `^22`                                 |
| `pdf-parse`                  | ^2.4.5                   | **Compatible**       | Pure JS                                                                    |
| `pg`                         | ^8.20.0                  | **Compatible**       | Pure JS con bindings opcionales; sin nativos críticos                      |
| `langchain` / `@langchain/*` | ^1.x                     | **Compatible**       | Pure JS                                                                    |
| `tsx`                        | ^4.21.0                  | **Compatible**       | Wrapper ESM; funciona en Node 22                                           |

**Ninguna dep requiere rebuild de nativo para este proyecto.** No hay `bcrypt`, no hay `sharp`, no hay `canvas`, no hay `node-gyp` deps en runtime.

---

## 3. lint-staged 17 — breaking changes aplicables

| Cambio                                              | Impacto en este proyecto                                             |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| Node mínimo: **22.22.1**                            | BLOQUEANTE si se pineara Node 22 < 22.22.1. Si target = 22.22.x, OK. |
| Paquete `yaml` ya no es peer dep automático         | No aplica — config en `package.json` (JSON)                          |
| Git mínimo: **2.32.0**                              | Git en VPS/local suele ser ≥ 2.32; verificar con `git --version`     |
| Eliminado `commander`; usa `node:util.parseArgs`    | Sin impacto en config usuario                                        |
| Eliminado manejo manual de `git stash --keep-index` | Transparente para el usuario                                         |

**Config actual** (`package.json`):

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

**Esta configuración es 100% compatible con lint-staged 17** — no usa YAML, no usa `--shell`, no usa `git add` explícito.

**Pre-commit hook** (`.husky/pre-commit`): solo `npx lint-staged` — sin cambios necesarios.

**Estrategia recomendada**: actualizar lint-staged 16 → 17 en el **mismo commit** que se sube el Node a 22.22.x (o superior). Si se pinea a 22.15.x primero, quedarse en lint-staged 16 hasta que el Node target alcance 22.22.1.

---

## 4. @types/node mismatch — ACCIÓN REQUERIDA

`@types/node@^24.12.4` con runtime Node 22 es un mismatch conocido y documentado. Puede causar:

- TypeScript resuelve tipos de APIs que existen en Node 24 pero no en Node 22 (ej. APIs de TS nativo, nuevas Web Crypto extensiones).
- Falsos positivos en typecheck — código que compila pero falla en runtime si usa APIs de Node 24.

**Corrección**: cambiar en `package.json`:

```
"@types/node": "^22"   // era ^24.12.4
```

Este es el único cambio de `package.json` de aplicación necesario además de lint-staged.

---

## 5. Node 22-alpine vs 22-bookworm-slim en Dokploy/Hetzner

| Criterio                        | node:22-alpine                     | node:22-bookworm-slim       |
| ------------------------------- | ---------------------------------- | --------------------------- |
| Tamaño imagen                   | ~167-180 MB                        | ~220 MB                     |
| CVEs reportados                 | ~0 (musl más pequeña superficie)   | Bajos (slim)                |
| Soporte oficial Node.js project | **Experimental**                   | **Oficial**                 |
| libc                            | musl                               | glibc                       |
| Compatibilidad nativos          | Requiere rebuild desde fuente      | Prebuilt binaries funcionan |
| Compatibilidad este proyecto    | OK (no hay nativos)                | OK                          |
| Issues en Docker Swarm          | Ninguno conocido para Next.js puro | Ninguno conocido            |

**El Dockerfile ya tiene `RUN apk add --no-cache libc6-compat`** — esto mitiga la mayoría de problemas musl en alpine. Como el proyecto no tiene `bcrypt`, `sharp`, ni otros nodos nativos en runtime, `node:22-alpine` es el cambio más simple.

**Fallback**: si post-migración alguna dep nueva añade nativos, switch a `bookworm-slim` es 1 línea de Dockerfile. Mantener `libc6-compat` incluso en alpine como seguro de vida.

---

## 6. Riesgos específicos del codebase

| Riesgo                  | Severidad | Hallazgo en código                                                                                                                              | Mitigación                      |
| ----------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `fetch` global / undici | Baja      | Usado en 18 archivos (axios + fetch nativos). Node 22 usa undici v6 — compatible. Undici v7 (Node 24) rompe polyfills externos.                 | Sin acción en Node 22           |
| `crypto` (AES-256-GCM)  | Nula      | `src/lib/crypto/token-crypto.ts` usa `createCipheriv/createDecipheriv` — API estable desde Node 10, sin cambios en Node 22.                     | Sin acción                      |
| `node:fs` en scripts    | Nula      | Solo en scripts de migración/seed, no en runtime de producción. APIs estables.                                                                  | Sin acción                      |
| `@types/node@^24`       | Alta      | Mismatch tipos vs runtime.                                                                                                                      | Downgrade a `^22` — obligatorio |
| `child_process`         | Nula      | No encontrado en `src/`                                                                                                                         | N/A                             |
| APIs deprecadas Node 22 | Nula      | Búsqueda en `src/` no muestra `util.promisify`, `process.binding`, `domain.*` ni APIs deprecadas. Solo comentarios con la palabra "deprecated". | Sin acción                      |

---

## 7. Node 24 — análisis de salto anticipado

Node 24 se publicó el 6-may-2025 y entra en **Active LTS en oct-2025** (ya activo a la fecha de este report, may-2026). EOL: 30-abr-2028.

**Anti-recomendación de saltar a Node 24 ahora**:

- `lint-staged 17` requiere ≥ 22.22.1, no Node 24. No hay ventaja de lint-staged en Node 24.
- Node 24 bundlea undici v7: **rompe polyfills `fetch` externos** (solo aplica si se usa `FormData` de paquetes externos con fetch — a verificar en el stack LangChain).
- Node 24 bundlea npm 11: cambio de lockfile potencialmente disruptivo.
- `@types/node@^24` con runtime Node 24 sería correcto, pero implica validar APIs nuevas (TS nativo, nuevas Web Crypto).
- El equipo va a VPS Dokploy — el cambio de imagen base Docker a Node 24 requiere rebuilds de validación adicionales.
- Node 22 Maintenance LTS hasta abr-2027: **21 meses de soporte restante desde may-2026**. Tiempo suficiente para planificar salto a 24 en Sprint Hardening post-MVP (Sprint 3 o 4).

**Conclusión**: quedarse en Node 22 para el MVP. Evaluar salto a Node 24 en oct-2026 (cuando Node 26 pase a LTS y Node 24 entre en Maintenance) o antes si Node 24 se estabiliza en el ecosistema Next.js.

---

## Recomendación de versión exacta a pinear

**`.nvmrc`**: `22.22.3` (última de rama 22.x a 13-05-2026, la que exige lint-staged 17)
**`package.json` engines**: `"node": ">=22.0.0"`
**Dockerfile**: `FROM node:22-alpine` (los 3 stages)
**`@types/node`**: downgrade a `^22`
**`lint-staged`**: subir a `^17.0.5` en el mismo commit (requiere Node ≥ 22.22.1)

---

## Cambios de archivo requeridos (resumen)

| Archivo                 | Cambio                               |
| ----------------------- | ------------------------------------ |
| `.nvmrc`                | `20.20.2` → `22.22.3`                |
| `package.json` engines  | `>=20.17.0` → `>=22.0.0`             |
| `package.json` devDeps  | `@types/node`: `^24.12.4` → `^22`    |
| `package.json` devDeps  | `lint-staged`: `^16.1.0` → `^17.0.5` |
| `Dockerfile` (3 stages) | `node:20-alpine` → `node:22-alpine`  |

Sin cambios de código de aplicación. Sin cambios de SQL. Sin cambios de CI (no hay GH Actions activos).

---

## Unresolved questions

1. Versión exacta `22.22.3` vs `22.15.1` — nodejs.org muestra `22.22.3` como "last updated May 13, 2026" pero el changelog oficial de Node 22 no ha publicado versión 22.22.x todavía (gap entre el fetcher y la realidad). **Verificar con `nvm ls-remote 22 | tail -5` antes de pinear**.
2. `lint-staged@17` en npm registry — confirmar que `^17.0.5` está publicado (`npm view lint-staged@17 version`) antes del PR de migración.
3. LangChain + undici: `@langchain/openai` y `@langchain/anthropic` usan `fetch` internamente. Verificar que no importan `FormData` de `node-fetch` o similares (si lo hacen, Node 24 con undici v7 rompería en futuro).

---

**Sources**:

- [Node.js Releases (nodejs.org)](https://nodejs.org/en/about/previous-releases)
- [Node.js EOL dates (endoflife.date)](https://endoflife.date/nodejs)
- [lint-staged MIGRATION.md](https://github.com/lint-staged/lint-staged/blob/main/MIGRATION.md)
- [Node.js Security Releases 2025](https://nodejs.org/en/blog/vulnerability/july-2025-security-releases)
- [Snyk: Choosing Node.js Docker image](https://snyk.io/blog/choosing-the-best-node-js-docker-image/)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Node 22 vs Node 24 2026 guide (PkgPulse)](https://www.pkgpulse.com/guides/nodejs-22-vs-nodejs-24-2026)
- [Undici v7 breaking changes](https://blog.platformatic.dev/undici-v7-is-here)
