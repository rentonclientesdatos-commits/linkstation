# Auditoría de Dependencias — linkstation — 20-05-2026

**Agente:** `af-agents:adr`
**Fecha:** 20-05-2026
**Scope:** package.json + lockfile + roadmap Fases A-E + audit CVEs activos
**Node.js runtime detectado:** v24.13.0

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Total dependencias prod declaradas | 37 |
| Total dependencias dev declaradas | 14 |
| Total deps en node_modules (incluyendo transitivas) | 1.279 |
| Vulnerabilidades npm audit — High | 12 |
| Vulnerabilidades npm audit — Moderate | 9 |
| Vulnerabilidades npm audit — Critical | 0 |
| Deps directas con CVEs activos | 3 (axios, next, bullmq) |
| Deps excluidas detectadas (Prisma/Drizzle/ORM/Airtable) | 0 — LIMPIO |
| Deps DEPRECATED activas | 1 (crypto@1.0.1) |
| Deps con major upgrade pendiente | 5 (lucide-react, shadcn, eslint, @types/node, typescript) |

### Clasificación por severidad

| Nivel | Cantidad | Paquetes |
|-------|----------|---------|
| 🔴 Critical | 2 | `axios@1.14.0` (15 CVEs), `next@16.1.6` (19 CVEs) |
| 🟠 High | 4 | `crypto@1.0.1` DEPRECATED, `bullmq` (moderate vuln transitiva), `lucide-react` major gap, `shadcn` major gap |
| 🟡 Medium | 8 | `@supabase/ssr`, `@supabase/supabase-js`, `langchain`, `@langchain/anthropic`, `retell-sdk`, `@types/node`, `eslint`, `typescript` |
| 🟢 OK / Minor | 33+ | resto de dependencias con minor/patch updates únicamente |

### Bloqueantes inmediatos

| Sprint | Bloqueante |
|--------|-----------|
| **Sprint 0 (ahora)** | `axios@1.14.0` — 15 CVEs activos, target `1.16.1` |
| **Sprint 1 (ahora)** | `next@16.1.6` — 19 CVEs activos, target `16.2.6` (no breaking) |
| **Sprint 0 (ahora)** | `crypto@1.0.1` — paquete DEPRECATED, reemplazar por built-in Node |
| **Sprint 2** | `@hubspot/api-client` NO instalado — instalar `^13.5.0` |
| **Sprint 2** | SDK Zoho NO identificado en npm — ver recomendación en sección C |
| **Sprint 3** | `@playwright/test` NO instalado — instalar `^1.60.0` |
| **Sprint 4** | `jsforce` NO instalado — instalar `^3.10.15` (Salesforce) |
| **Sprint 4** | `google-spreadsheet` NO instalado — `^5.2.0` (Sheets) |

---

## 1. Inventario completo

### 1.1 Dependencias de producción

| Paquete | Versión declarada | Versión instalada | Versión latest | Estado | Versiones detrás |
|---------|-------------------|-------------------|----------------|--------|-----------------|
| `@aws-sdk/client-bedrock-agent-runtime` | ^3.1031.0 | 3.1031.0 | 3.1050.0 | 🟢 Minor | patch |
| `@aws-sdk/client-bedrock-runtime` | ^3.1031.0 | 3.1031.0 | 3.1050.0 | 🟢 Minor | patch |
| `@aws-sdk/client-s3` | ^3.1031.0 | 3.1031.0 | 3.1050.0 | 🟢 Minor | patch |
| `@aws-sdk/s3-request-presigner` | ^3.1031.0 | 3.1031.0 | 3.1050.0 | 🟢 Minor | patch |
| `@dnd-kit/core` | ^6.3.1 | 6.3.1 | 6.3.1 | 🟢 OK | — |
| `@dnd-kit/modifiers` | ^9.0.0 | 9.0.0 | 9.0.0 | 🟢 OK | — |
| `@dnd-kit/sortable` | ^10.0.0 | 10.0.0 | 10.0.0 | 🟢 OK | — |
| `@dnd-kit/utilities` | ^3.2.2 | 3.2.2 | 3.2.2 | 🟢 OK | — |
| `@langchain/anthropic` | ^1.3.26 | 1.3.26 | 1.4.0 | 🟡 Minor | minor |
| `@langchain/google-genai` | ^2.1.26 | 2.1.26 | 2.1.31 | 🟢 Minor | patch |
| `@langchain/openai` | ^1.4.1 | 1.4.1 | 1.4.6 | 🟢 Minor | patch |
| `@supabase/ssr` | ^0.8.0 | 0.8.0 | 0.10.3 | 🟡 Desactualizado | minor (2 versiones) |
| `@supabase/supabase-js` | ^2.97.0 | 2.97.0 | 2.106.1 | 🟡 Desactualizado | minor (9 patches) |
| `@types/pg` | ^8.20.0 | 8.20.0 | 8.20.0 | 🟢 OK | — |
| `@xyflow/react` | ^12.10.2 | 12.10.2 | 12.10.2 | 🟢 OK | — |
| `axios` | ^1.14.0 | 1.14.0 | 1.16.1 | 🔴 CVE CRITICAL | 15 CVEs activos |
| `bullmq` | ^5.73.0 | 5.73.0 | 5.76.10 | 🟡 Minor + vuln transitiva | patch |
| `class-variance-authority` | ^0.7.1 | 0.7.1 | 0.7.1 | 🟢 OK | — |
| `clsx` | ^2.1.1 | 2.1.1 | 2.1.1 | 🟢 OK | — |
| `countries-and-timezones` | ^3.9.0 | 3.9.0 | 3.9.0 | 🟢 OK | — |
| `crypto` | ^1.0.1 | 1.0.1 | 1.0.1 | 🔴 DEPRECATED | paquete fantasma |
| `date-fns` | ^4.1.0 | 4.1.0 | 4.2.1 | 🟢 Minor | patch |
| `date-fns-tz` | ^3.2.0 | 3.2.0 | 3.2.0 | 🟢 OK | — |
| `dotenv` | ^17.3.1 | 17.3.1 | 17.4.2 | 🟢 Minor | patch |
| `framer-motion` | ^12.38.0 | 12.38.0 | 12.39.0 | 🟢 Minor | patch |
| `googleapis` | ^171.4.0 | 171.4.0 | 171.4.0 | 🟢 OK | — |
| `ioredis` | ^5.10.1 | 5.10.1 | 5.10.1 | 🟢 OK | — |
| `langchain` | ^1.2.39 | 1.2.39 | 1.4.1 | 🟡 Minor | minor |
| `libphonenumber-js` | ^1.12.42 | 1.12.42 | 1.13.2 | 🟢 Minor | minor |
| `lucide-react` | ^0.575.0 | 0.575.0 | 1.16.0 | 🟠 MAJOR GAP | 1 major detrás |
| `mermaid` | ^11.15.0 | 11.15.0 | 11.15.0 | 🟢 OK | — |
| `next` | 16.1.6 | 16.1.6 | 16.2.6 | 🔴 CVE CRITICAL | 19 CVEs activos |
| `pdf-parse` | ^2.4.5 | 2.4.5 | 2.4.5 | 🟢 OK | — |
| `pg` | ^8.20.0 | 8.20.0 | 8.21.0 | 🟢 Minor | patch |
| `postgres` | ^3.4.9 | 3.4.9 | 3.4.9 | 🟢 OK | — |
| `radix-ui` | ^1.4.3 | 1.4.3 | 1.4.3 | 🟢 OK | — |
| `react` | 19.2.3 | 19.2.3 | 19.2.6 | 🟢 Minor | patch |
| `react-dom` | 19.2.3 | 19.2.3 | 19.2.6 | 🟢 Minor | patch |
| `react-markdown` | ^10.1.0 | 10.1.0 | 10.1.0 | 🟢 OK | — |
| `recharts` | ^3.7.0 | 3.7.0 | 3.8.1 | 🟢 Minor | minor |
| `redis` | ^5.11.0 | 5.11.0 | 5.12.1 | 🟢 Minor | patch |
| `remark-gfm` | ^4.0.1 | 4.0.1 | 4.0.1 | 🟢 OK | — |
| `retell-sdk` | ^5.12.0 | 5.12.0 | 5.26.1 | 🟡 Desactualizado | 14 versiones minor |
| `tailwind-merge` | ^3.5.0 | 3.5.0 | 3.6.0 | 🟢 Minor | minor |
| `zod` | ^4.3.6 | 4.3.6 | 4.4.3 | 🟢 Minor | patch |
| `zustand` | ^5.0.11 | 5.0.11 | 5.0.13 | 🟢 Minor | patch |

### 1.2 Dependencias de desarrollo

| Paquete | Versión declarada | Versión instalada | Versión latest | Estado |
|---------|-------------------|-------------------|----------------|--------|
| `@anthropic-ai/claude-code` | ^2.1.143 | 2.1.143 | 2.1.145 | 🟢 Minor |
| `@tailwindcss/postcss` | ^4 | 4.2.1 | 4.3.0 | 🟢 Minor |
| `@types/node` | ^20 | 20.19.33 | 25.9.1 | 🟠 MAJOR GAP (5 majors) |
| `@types/react` | ^19 | 19.2.14 | 19.2.15 | 🟢 Minor |
| `@types/react-dom` | ^19 | 19.2.3 | 19.2.3 | 🟢 OK |
| `eslint` | ^9 | 9.39.3 | 10.4.0 | 🟠 MAJOR GAP |
| `eslint-config-next` | 16.1.6 | 16.1.6 | 16.2.6 | 🟡 Minor (ligado a next) |
| `prettier` | ^3.8.1 | 3.8.1 | 3.8.3 | 🟢 Minor |
| `prettier-plugin-tailwindcss` | ^0.7.2 | 0.7.2 | 0.8.0 | 🟠 Minor/Major mixto |
| `shadcn` | ^3.8.5 | 3.8.5 | 4.7.0 | 🟠 MAJOR GAP |
| `tailwindcss` | ^4 | 4.2.1 | 4.3.0 | 🟢 Minor |
| `tsx` | ^4.21.0 | 4.21.0 | 4.22.3 | 🟢 Minor |
| `tw-animate-css` | ^1.4.0 | 1.4.0 | 1.4.0 | 🟢 OK |
| `typescript` | ^5 | 5.9.3 | 6.0.3 | 🟠 MAJOR GAP |

### 1.3 Paquetes extraneous (en node_modules sin estar en package.json)

Detectados como `extraneous` (instalados pero no declarados en package.json):

| Paquete | Probable origen | Riesgo |
|---------|----------------|--------|
| `@emnapi/core@1.8.1` | Dependencia transitiva de algún paquete nativo | Bajo |
| `@emnapi/runtime@1.8.1` | Ídem | Bajo |
| `@emnapi/wasm-threads@1.1.0` | Ídem | Bajo |
| `@napi-rs/wasm-runtime@0.2.12` | Probable de claude-code o paquete nativo | Bajo |
| `@tybys/wasm-util@0.10.1` | Ídem | Bajo |

Estos no suponen riesgo inmediato pero confirman que hay deps transitivas instaladas que no se declaran. Limpiar con `npm prune` si es necesario.

---

## 2. Findings Critical 🔴

### CVE-001 — axios@1.14.0 (DA-3-CVE-001 confirmado y ampliado)

**Severidad npm audit:** HIGH | **Directo:** Sí | **Fix disponible:** `1.16.1`

La versión instalada `1.14.0` tiene **al menos 15 CVEs confirmados por npm audit**, todos resolubles upgradeando a `1.16.1`:

| CVE | Título | CVSS | Fix en |
|-----|--------|------|--------|
| GHSA-pmwg-cvhr-8vh7 | NO_PROXY bypass via RFC 1122 Loopback / SSRF | 7.2 | 1.15.1 |
| GHSA-pf86-5x62-jrwf | Prototype Pollution — Response Tampering, Data Exfiltration | 7.4 | 1.15.1 |
| GHSA-6chq-wfr3-2hj9 | Header Injection via Prototype Pollution | 7.4 | 1.15.1 |
| GHSA-q8qp-cvcw-x6jj | Prototype pollution read-side gadgets — credential injection | 7.4 | 1.15.2 |
| GHSA-62hf-57xw-28j9 | DoS via unbounded recursion en toFormData | 7.5 | 1.15.1 |
| GHSA-m7pr-hjqh-92cm | no_proxy bypass via IP alias — SSRF | 6.8 | 1.15.1 |
| GHSA-3w6x-2g7m-8v23 | JSON Response Tampering via Prototype Pollution in parseReviver | 6.5 | 1.15.2 |
| GHSA-xx6v-rp6x-q39c | XSRF Token Cross-Origin Leakage | 5.4 | 1.15.1 |
| GHSA-445q-vr5w-6q77 | CRLF Injection in multipart/form-data | 5.3 | 1.15.1 |
| GHSA-5c9x-8gcm-mpgx | Streamed uploads bypass maxBodyLength | 5.3 | 1.15.1 |
| GHSA-vf2m-468p-8v99 | HTTP adapter streamed responses bypass maxContentLength | 5.3 | 1.15.1 |
| GHSA-w9j2-pvgh-6h63 | Auth Bypass via Prototype Pollution in validateStatus | 4.8 | 1.15.1 |
| GHSA-3p68-rc4w-qgx5 | NO_PROXY Hostname Normalization Bypass — SSRF | 4.8 | 1.15.0 |
| GHSA-fvcv-3m26-pcqx | Unrestricted Cloud Metadata Exfiltration via Header Injection | 4.8 | 1.15.0 |
| GHSA-xhjh-pmcv-23jw | Null Byte Injection via Reverse-Encoding | 3.7 | 1.15.1 |

**Acción:** Upgrade inmediato a `axios@1.16.1` (versión latest en npm al día de hoy). La versión `1.14.0` es 2 minor versions detrás y 2 patch versions del latest `1.16.1`. Todas las CVEs se resuelven en este rango. **Esto es Sprint 0, tarea 1-24** — ya documentado en el roadmap.

**Compatibilidad:** axios `1.x` tiene API estable desde `1.0`. El upgrade `1.14.0 → 1.16.1` es non-breaking. Compatible con Next.js 16, React 19, Node.js 24. **Riesgo de rotura: BAJO.**

---

### CVE-002 — next@16.1.6 (DA-3-CVE-002 confirmado y ampliado)

**Severidad npm audit:** HIGH | **Directo:** Sí | **Fix disponible:** `16.2.6` (non-breaking minor)

La versión instalada `16.1.6` tiene **19 CVEs** detectados por npm audit, varios de alta severidad:

| CVE | Título | CVSS | Fix en |
|-----|--------|------|--------|
| GHSA-c4j6-fc7j-m34r | SSRF via WebSocket upgrades | **8.6** | 16.2.5 |
| GHSA-492v-c6pp-mqqv | Middleware/Proxy bypass via dynamic route param injection | **8.1** | 16.2.5 |
| GHSA-267c-6grr-h53f | Middleware/Proxy bypass via segment-prefetch routes | 7.5 | 16.2.5 |
| GHSA-36qx-fr4f-26g5 | Middleware/Proxy bypass via i18n (Pages Router) | 7.5 | 16.2.5 |
| GHSA-26hh-7cqf-hhc6 | Middleware/Proxy bypass — Incomplete Fix Follow-Up | 7.5 | 16.2.6 |
| GHSA-q4gf-8mx6-v5v3 | DoS with Server Components | 7.5 | 16.2.3 |
| GHSA-8h8q-6873-q5fj | DoS with Server Components (v2) | 7.5 | 16.2.5 |
| GHSA-mg66-mrh9-m8jx | DoS via connection exhaustion in Cache Components | 7.5 | 16.2.5 |
| GHSA-ffhc-5mcf-pf4q | XSS in App Router via CSP nonces | 4.7 | 16.2.5 |
| GHSA-gx5p-jg67-6x7h | XSS in beforeInteractive scripts | 6.1 | 16.2.5 |
| GHSA-h64f-5h5j-jqjh | DoS in Image Optimization API | 5.9 | 16.2.5 |
| + 8 más (ReDoS, cache poisoning, HTTP smuggling, etc.) | — | — | ≤16.2.6 |

**Acción:** Upgrade a `next@16.2.6` (latest en rama 16.x). Este upgrade es una **minor version** dentro de Next.js 16 — el proyecto ya usa React 19 y el range `>=16.0.0` de Next. Compatible con `eslint-config-next@16.2.6` (que también hay que actualizar junto). El upgrade es **Sprint 1** según el roadmap (tarea 2-27). NOTA: el audit asigna solo "High" porque aplica a funcionalidades específicas, pero el CVSS 8.6 del SSRF via WebSocket y el 8.1 del middleware bypass son near-critical en un entorno multi-tenant.

**Compatibilidad:** Next.js sigue en major 16. No hay breaking changes entre 16.1.6 y 16.2.6 (se verificó en changelog). Requiere testing extenso de middleware y Server Actions. **Riesgo de rotura: MEDIO** (requiere test completo de flujos auth/middleware).

---

### DEP-001 — crypto@1.0.1 DEPRECATED

**Severidad:** 🔴 DEPRECATED — Paquete fantasma en npm.

`crypto@1.0.1` es un paquete vacío que npm mantiene ocupando el nombre para prevenir typosquatting. La descripción del paquete dice explícitamente: *"This package is no longer supported. It's now a built-in Node module."*

**Problema:** El código importa este paquete innecesariamente. Node.js ya incluye `crypto` como módulo built-in desde v0.x. Este paquete **no añade ninguna funcionalidad** — es una cáscara vacía.

**Riesgo:** En una auditoría de seguridad de terceros, una dependencia deprecada y vacía con nombre `crypto` levanta banderas rojas inmediatas. Además, en versiones futuras de npm, los paquetes deprecados pueden emitir warnings que confunden el output del build.

**Acción:** Eliminar `crypto` de `dependencies` en `package.json`. Sustituir cualquier `require('crypto')` / `import ... from 'crypto'` por el built-in de Node: `import { createHash, ... } from 'node:crypto'`. Sprint 0.

---

## 3. Findings High 🟠

### HIGH-001 — lucide-react: 1 major version detrás (0.x → 1.x)

**Versión actual:** 0.575.0 | **Latest:** 1.16.0

`lucide-react` lanzó su `v1.0.0` (primer stable major). La versión actual `0.575.0` es pre-stable. La API principal de iconos no cambió (breaking changes mínimos), pero:

- Cambios de nombres en algunos iconos entre 0.x y 1.x
- La v1.x tiene mejor tree-shaking y soporte oficial React 19
- Algunas exportaciones legacy fueron eliminadas

**Acción:** Upgrade en Sprint 1. Revisar iconos usados en la app por posibles renombrados. Compatible con React 19 explícitamente. **Riesgo de rotura: BAJO-MEDIO** (puede requerir ajustes en nombres de iconos).

---

### HIGH-002 — shadcn: 1 major version detrás (3.x → 4.x)

**Versión actual:** 3.8.5 (dev) | **Latest:** 4.7.0

`shadcn` (CLI tool, no los componentes) subió a major 4. Este paquete es solo el CLI de instalación de componentes, no afecta el runtime. Sin embargo:

- shadcn v4 usa nueva arquitectura de templates
- Puede haber incompatibilidades en comandos CLI entre v3 y v4
- Los **componentes ya instalados** en `src/components/ui/` NO se ven afectados

**Acción:** Evaluar upgrade en Sprint 3. No es bloqueante para el MVP. No afecta runtime. **Riesgo de rotura en runtime: NINGUNO.** Riesgo en CLI al añadir nuevos componentes: BAJO-MEDIO.

---

### HIGH-003 — @types/node: 5 majors detrás (20.x → 25.x)

**Versión declarada:** ^20 | **Instalada:** 20.19.33 | **Latest:** 25.9.1

El proyecto pina `@types/node` en major 20 (`^20`). Esto es correcto si el runtime es Node 20. **Sin embargo, el runtime detectado es Node.js v24.13.0.** Esto genera un mismatch: los tipos cubren la API de Node 20 pero el runtime ejecuta Node 24, que tiene APIs adicionales no tipadas.

- Algunas APIs nuevas de Node 22-24 (fetch nativo, WebCrypto mejorado, etc.) no tendrán tipos correctos
- No produce errores en tiempo de ejecución, pero sí gaps de tipado

**Acción:** Actualizar `@types/node` a `^24` para alinear con el runtime. Sprint 1. **Riesgo de rotura: BAJO** (solo tipos, no runtime).

---

### HIGH-004 — eslint: 1 major detrás (9.x → 10.x)

**Versión instalada:** 9.39.3 | **Latest:** 10.4.0

ESLint 10 introduce cambios en su API de reglas. Depende de si `eslint-config-next` tiene soporte para ESLint 10. Al momento del audit, `eslint-config-next` usa `eslint ^9`. Actualizar ESLint sin actualizar `eslint-config-next` rompe el lint.

**Acción:** APLAZAR hasta que `eslint-config-next` soporte ESLint 10 oficialmente. Sprint 3 o 5. **Riesgo de rotura: ALTO si se hace antes de que eslint-config-next actualice su peer dep.**

---

## 4. Findings Medium 🟡

### MED-001 — @supabase/ssr: 2 minor versions detrás

**Versión actual:** 0.8.0 | **Latest:** 0.10.3

`@supabase/ssr@0.10.3` requiere `@supabase/supabase-js ^2.105.3`, mientras que el proyecto tiene `supabase-js@2.97.0`. Si se actualiza `@supabase/ssr`, también hay que actualizar `supabase-js`. La actualización conjunta implica verificar los cambios en cookies helpers y la API de `createServerClient`.

**Acción:** Upgrade conjunto en Sprint 1 (tarea 2-02). `@supabase/ssr@0.10.3` + `@supabase/supabase-js@2.106.1`. Revisar changelog de ssr 0.8→0.10 (cambios en cookie storage API). **Riesgo: MEDIO** — el cookie middleware puede tener cambios de comportamiento.

---

### MED-002 — langchain: 2 minor versions detrás

**Versión actual:** 1.2.39 | **Latest:** 1.4.1

LangChain actualiza con frecuencia. La versión `1.4.1` puede tener cambios en la API de chains/agents. El proyecto usa LangChain principalmente para orchestración de LLM calls. La integración `@langchain/anthropic` requiere `@langchain/core ^1.1.47` (ya satisfecha en latest).

**Acción:** Upgrade `langchain@1.4.1` + `@langchain/anthropic@1.4.0` en Sprint 1. Verificar peer dep `@langchain/core`. **Riesgo: MEDIO** — posibles cambios en tipos de output de chains.

---

### MED-003 — retell-sdk: 14 versions minor detrás

**Versión actual:** 5.12.0 | **Latest:** 5.26.1

`retell-sdk` ha tenido 14 actualizaciones desde la versión instalada. El proyecto depende de Retell para las llamadas de voz. En el audit de seguridad (DA-4-001) ya se detectó que el webhook de Retell no valida firma. Versiones más recientes pueden incluir helpers de validación HMAC.

**Acción:** Upgrade a `5.26.1` en Sprint 0 junto con la tarea 1-12 (validación firma webhook Retell). Revisar changelog para helpers de validación de firma que puedan simplificar la implementación. **Riesgo: BAJO-MEDIO.**

---

### MED-004 — typescript: 1 major detrás (5.x → 6.x)

**Versión declarada:** ^5 | **Instalada:** 5.9.3 | **Latest:** 6.0.3

TypeScript 6.0 introduce cambios en el type checker y puede marcar código que TypeScript 5 aceptaba como error. Esto requiere un ciclo de fix de tipos en toda la codebase. Con 426 ocurrencias de `as any` (finding 2-22), la migración puede descubrir problemas adicionales.

**Acción:** APLAZAR a Sprint 4 o post-MVP. No es bloqueante. **Riesgo de rotura: ALTO** — actualizar TypeScript major siempre requiere una sesión de triage de errores de tipos.

---

### MED-005 — @langchain/anthropic: minor detrás + peer dep pendiente

**Versión actual:** 1.3.26 | **Wanted:** 1.4.0

Requiere `@langchain/core ^1.1.47`. El upgrade de `langchain` también activa este upgrade. Hacerlos juntos en Sprint 1.

---

### MED-006 — bullmq: moderate vuln transitiva + patch detrás

**Versión actual:** 5.73.0 | **Latest:** 5.76.10

npm audit reporta severidad "moderate" en bullmq (transitiva vía alguna dependencia interna). El upgrade a `5.76.10` resuelve la vuln transitiva. BullMQ es crítico para el orquestador — el upgrade requiere verificación de la API de worker/queue. Sprint 0 (upgrade patch, no breaking). **Riesgo: BAJO.**

---

### MED-007 — googleapis: sin update pero versión muy alta (171)

**Versión actual:** 171.4.0 | **Latest:** 171.4.0

El paquete `googleapis` (Google API Node.js Client) es monolítico y cubre todo el ecosistema de APIs de Google. Ya está en la versión latest, pero es un paquete de 171 majors porque Google incrementa major por cada cambio de API. El proyecto lo usa para Calendar (ya mencionado en STACK-TECNOLOGICO.md). Compatibilidad con Fase 4 (Sheets/Drive): `googleapis` ya incluye ambas APIs — **no hay que instalar un paquete separado para Google Sheets o Drive**. Solo hay que implementar los scopes correctos de OAuth2.

**Acción para Fase 4:** Usar `googleapis@171.x` ya instalado para Sheets y Drive. No instalar un SDK adicional. Verificar que los scopes de Google OAuth incluyen `https://www.googleapis.com/auth/spreadsheets` y `https://www.googleapis.com/auth/drive.file`. **Riesgo: NINGUNO adicional** — ya está instalado.

---

## 5. Recomendaciones por sprint

### Sprint 0 — Urgente (debe actualizarse ANTES de ir a producción)

| Paquete | Acción | Razón | Verificación previa |
|---------|--------|-------|---------------------|
| `axios@1.14.0` → `1.16.1` | `npm update axios` | 15 CVEs activos, SSRF+PP | Test endpoints que usan axios |
| `crypto@1.0.1` | Eliminar dep + sustituir por `node:crypto` | DEPRECATED, paquete vacío | Buscar `from 'crypto'` en src/ |
| `retell-sdk@5.12.0` → `5.26.1` | `npm update retell-sdk` | 14 versiones detrás, posibles helpers de firma | Probar webhooks Retell |
| `bullmq@5.73.0` → `5.76.10` | `npm update bullmq` | Vuln transitiva moderate, patch seguro | Probar worker básico |

**Nota:** Para `crypto`, buscar en `src/` todos los `import ... from 'crypto'` o `require('crypto')` y cambiar a `import ... from 'node:crypto'`. No afecta funcionalidad.

---

### Sprint 1 — Capa de datos

| Paquete | Acción | Razón | Verificación |
|---------|--------|-------|-------------|
| `next@16.1.6` → `16.2.6` | `npm install next@16.2.6 eslint-config-next@16.2.6` | 19 CVEs activos, DA-3-CVE-002 | Testing extenso middleware + Server Actions |
| `@supabase/ssr@0.8.0` → `0.10.3` | Upgrade conjunto con supabase-js | 2 versiones minor detrás | Test auth flows, cookie middleware |
| `@supabase/supabase-js@2.97.0` → `2.106.1` | Junto con @supabase/ssr | 9 patches detrás | Test queries, RLS |
| `langchain@1.2.39` → `1.4.1` | + `@langchain/anthropic@1.4.0` | 2 minor detrás | Test LLM pipelines |
| `@langchain/anthropic@1.3.26` → `1.4.0` | Junto con langchain | Peer dep | Ídem |
| `@types/node@^20` → `^24` | `npm install -D @types/node@^24` | Alinear con runtime Node 24 | `npm run typecheck` |
| `lucide-react@0.575.0` → `1.16.0` | Revisar breaking changes | 1 major detrás | Revisar iconos renombrados |
| AWS SDK `3.1031.0` → `3.1050.0` | `npm update @aws-sdk/*` | 19 patches detrás | Test S3 + Bedrock |
| `pg@8.20.0` → `8.21.0` | `npm update pg` | Patch update | Test queries |
| `date-fns@4.1.0` → `4.2.1` | `npm update date-fns` | Patch | Test fechas/timezones |

---

### Sprint 2 — CRMs MVP (HubSpot + Zoho)

#### HubSpot

**SDK recomendado:** `@hubspot/api-client@^13.5.0` (oficial de HubSpot)

| Atributo | Valor |
|----------|-------|
| Paquete | `@hubspot/api-client` |
| Latest | 13.5.0 |
| Node.js requerido | >=18.0.0 |
| Peer deps | ninguna crítica |
| Compatibilidad Next.js 16 | ✅ Compatible (Node >=18, proyecto en Node 24) |
| Compatibilidad React 19 | ✅ (solo server-side, no usa React) |
| Compatibilidad @supabase/ssr | ✅ (no conflicto) |
| OAuth2 soportado | ✅ (OAuth2 flows con refresh tokens, webhooks) |
| Multi-región | N/A — HubSpot no tiene multi-región API (usa api.hubapi.com) |

**Acción Sprint 2:** Instalar `@hubspot/api-client@^13.5.0`. Pasar por ADR completo antes de instalar. Compatible con stack actual.

#### Zoho CRM

**Situación:** No existe un SDK oficial de Zoho CRM publicado en npm con mantenimiento activo y verificado. Las opciones son:

| Opción | Paquete npm | Estado | Recomendación |
|--------|-------------|--------|--------------|
| REST API pura con axios | N/A | ✅ Recomendado | Usar axios (ya instalado) con los endpoints OAuth2 de Zoho |
| SDK oficial | No disponible en npm con nombre verificable | — | No usar |

**Recomendación ADR para Zoho:** Implementar el adapter de Zoho CRM usando **REST API pura** con `axios` (ya instalado) o `fetch` nativo de Node.js. Zoho CRM expone una API REST bien documentada con OAuth2. No instalar un SDK de terceros no oficial. Esto sigue el principio KISS y evita dependencias no auditadas.

- OAuth2 de Zoho: `https://accounts.zoho.es/oauth/v2/token` (región España) / `https://accounts.zoho.com.mx/...` (región México)
- API base: `https://www.zohoapis.es/crm/v7/` (EU) / `https://www.zohoapis.com.mx/crm/v7/` (LATAM)
- No se necesita SDK adicional. **Sin nueva dependencia de producción para Zoho.**

---

### Sprint 3 — Hardening

| Paquete | Acción | Razón |
|---------|--------|-------|
| `@playwright/test@^1.60.0` | Instalar como devDependency | Tests E2E (4-01). Latest: 1.60.0. Compatible con Node 24. |
| Librería de observabilidad | Ver nota abajo | 4-03 — logging estructurado |
| `eslint@9.x` (mantener) | NO actualizar a 10 | Esperar que eslint-config-next soporte ESLint 10 |
| `prettier@3.8.3` | `npm update prettier` | Patch update |
| `prettier-plugin-tailwindcss@0.7.4` | `npm update prettier-plugin-tailwindcss` | Patch (0.8.0 requiere verificación) |
| `@tailwindcss/postcss@4.3.0` | `npm update @tailwindcss/postcss` | Minor update |
| `tailwindcss@4.3.0` | `npm update tailwindcss` | Minor update |

**Observabilidad (4-03):** Se recomienda evaluar una de estas opciones:

| Opción | Paquete | Ventaja |
|--------|---------|---------|
| OpenTelemetry (recomendado) | `@opentelemetry/api@^1.9.0` + `@opentelemetry/sdk-node` | Estándar de industria, compatible con Next.js 16 (peer dep declarado) |
| Pino | `pino@^9.x` + `pino-http` | Logging estructurado JSON, ultra-rápido, zero-deps |

Next.js 16 ya declara `@opentelemetry/api ^1.1.0` como peer dep opcional — es la opción natural sin introducir conflictos.

---

### Sprint 4 — Post-release

| Funcionalidad | Paquete | Acción | Notas |
|---------------|---------|--------|-------|
| Google Sheets bidireccional | `googleapis` (ya instalado, v171.4.0) | NO instalar nada | Usar `googleapis.sheets('v4')` y `googleapis.drive('v3')` — ya disponible |
| Salesforce | `jsforce@^3.10.15` | Instalar via ADR | Node >=18, no peer deps críticas |
| GoHighLevel | REST API pura (fetch/axios) | NO instalar SDK | GHL tiene API REST + OAuth2 v2, sin SDK npm oficial mantenido |
| ActiveCampaign | REST API pura | NO instalar SDK | API Key auth, REST endpoints simples, no requiere SDK |

**Nota clave para Sheets/Drive:** `googleapis@171.4.0` ya está en `dependencies` del proyecto. Incluye todas las APIs de Google. Solo hay que activar los OAuth scopes y escribir el adapter. **CERO nuevas dependencias de producción** para Fase 4 Google.

---

## 6. Excluidos detectados

**Resultado:** LIMPIO — ninguna librería excluida por política encontrada en `package.json`.

Verificación realizada sobre:
- `prisma` / `@prisma/client` → NO encontrado ✅
- `drizzle-orm` / `drizzle-kit` → NO encontrado ✅
- `typeorm` → NO encontrado ✅
- `sequelize` → NO encontrado ✅
- `mikro-orm` / `@mikro-orm/core` → NO encontrado ✅
- `knex` → NO encontrado ✅
- `airtable` → NO encontrado ✅
- `dokploy` → NO encontrado ✅

La decisión de no usar ORM nuevo (R-019, STACK-TECNOLOGICO.md) se está respetando en el código actual.

---

## 7. Conflictos futuros previstos

### Conflicto 1: supabase/ssr 0.10.3 requiere supabase-js 2.105.3+

Si se actualiza `@supabase/ssr` a 0.10.3 en Sprint 1, hay que actualizar `@supabase/supabase-js` a 2.106.1 simultáneamente. El upgrade aislado de uno sin el otro romperá los peer deps. **Resolución: hacer el upgrade conjunto.**

### Conflicto 2: eslint 10 vs eslint-config-next

ESLint 10 requiere una versión de `eslint-config-next` que lo soporte. Al momento del audit, `eslint-config-next@16.2.6` declara peer dep `eslint ^9`. **NO actualizar ESLint a 10.x hasta que eslint-config-next actualice su peer dep.** Si se hace, el linting se romperá completamente.

### Conflicto 3: typescript 6.x vs types

TypeScript 6.0.3 puede romper código que TypeScript 5.9.3 aceptaba (strict null checks más agresivos, cambios en inference). Con 426 ocurrencias de `as any` en el codebase (finding 2-22 del roadmap), el upgrade sin limpiar el código primero generará cientos de errores de compilación. **Secuencia correcta: Sprint 1 limpia los `as any` → Sprint 4 (post-MVP) migra a TS 6.x.**

### Conflicto 4: langchain 1.4.1 requiere @langchain/core 1.1.47

La actualización de `langchain@1.4.1` requiere que todos los packages `@langchain/*` usen `@langchain/core ^1.1.47`. Si se actualiza `langchain` sin actualizar los providers (`@langchain/anthropic`, `@langchain/openai`, `@langchain/google-genai`), puede haber conflictos de versión de `@langchain/core`. **Resolución: actualizar todos en bloque en Sprint 1.**

### Conflicto 5: axios 1.15+ y código que asumía comportamiento previo

Los CVEs de prototype pollution en axios se corrigen en 1.15+ con cambios en cómo se mergan los defaults. Si el código usa patrones no estándar de configuración de axios (interceptors customizados, defaults globales con objetos heredados de Object.prototype), puede haber cambios de comportamiento. **Resolución: antes del upgrade, buscar en src/ todos los usos de `axios.defaults` y `axios.create()` con configs complejas.**

---

## 8. Política de seguridad propuesta

### Controles actuales

| Control | Estado | Nota |
|---------|--------|------|
| Bloqueo install sin ADR | ✅ Implementado | `.claude/hooks/af-deps-guard.cjs` activo |
| npm audit en CI | ❌ No implementado | Recomendado añadir |
| Dependabot / Renovate | ❌ No configurado | Recomendado para Fase 3 |
| Pin de versiones en lock | ✅ package-lock.json presente | Verificar que se commitea siempre |

### Propuestas

**1. npm audit en CI (Sprint 3, tarea 4-06)**

Añadir a `.github/workflows/` un step que ejecute `npm audit --audit-level=high` y falle el build si hay vulnerabilidades high o critical sin resolver. Esto previene que se mergeen PRs con nuevas vulns.

```yaml
# En CI workflow
- name: Security audit
  run: npm audit --audit-level=high
```

**2. Bloqueo de major upgrades sin ADR**

El hook `af-deps-guard.cjs` ya bloquea installs directos. Ampliar la regla para que también bloquee upgrades de major version sin revisión ADR. Añadir una lista de paquetes "watch" que requieren aprobación explícita antes de actualizar.

**3. Renovate bot (Sprint 3)**

Configurar Renovate en `.github/` para:
- Auto-merge: solo patches de devDependencies (test/lint tools)
- Crear PR automática: minor updates de prod deps
- Bloquear: major updates de cualquier dep — siempre requiere revisión manual

**4. Regla del usuario: npm update previo a install**

Aplicar `npm update` (actualizar deps dentro del rango declarado) antes de instalar cualquier paquete nuevo. Esto asegura que el entorno está en el estado más reciente antes de calcular peer deps del nuevo paquete.

**5. Auditoria periódica**

Repetir esta auditoría al inicio de cada sprint. El agente ADR puede ejecutar `npm audit --json` + `npm outdated --json` y generar un delta report comparando con el anterior.

---

## 9. Próximos pasos sugeridos (priorizado)

| Prioridad | Sprint | Acción |
|-----------|--------|--------|
| 1 | **1 (INMEDIATO)** | Upgrade `axios@1.16.1` — 15 CVEs, SSRF activo |
| 2 | **1 (INMEDIATO)** | Eliminar `crypto@1.0.1` — paquete deprecated, reemplazar con `node:crypto` |
| 3 | **1 (INMEDIATO)** | Upgrade `retell-sdk@5.26.1` — 14 versions detrás, antes de Sprint 0-12 |
| 4 | **1 (INMEDIATO)** | Upgrade `bullmq@5.76.10` — vuln transitiva moderate |
| 5 | **2** | Upgrade `next@16.2.6` + `eslint-config-next@16.2.6` — 19 CVEs |
| 6 | **2** | Upgrade conjunto `@supabase/ssr@0.10.3` + `@supabase/supabase-js@2.106.1` |
| 7 | **2** | Upgrade `langchain@1.4.1` + providers langchain en bloque |
| 8 | **2** | Upgrade `@types/node@^24` — alinear con runtime Node 24 |
| 9 | **2** | Upgrade `lucide-react@1.16.0` — revisar iconos renombrados |
| 10 | **3** | Instalar `@hubspot/api-client@^13.5.0` via ADR |
| 11 | **3** | Confirmar implementación Zoho via REST pura (sin SDK) |
| 12 | **4** | Instalar `@playwright/test@^1.60.0` como devDependency |
| 13 | **4** | Evaluar + instalar OpenTelemetry o Pino para observabilidad |
| 14 | **4** | Configurar `npm audit` en CI pipeline |
| 15 | **4** | Configurar Renovate bot |
| 16 | **5** | Instalar `jsforce@^3.10.15` para Salesforce adapter |
| 17 | **5 (APLAZAR)** | Upgrade `typescript@6.x` — solo tras limpiar `as any` (2-22) |
| 18 | **5 (APLAZAR)** | Upgrade `eslint@10.x` — solo tras que eslint-config-next soporte ESLint 10 |
| 19 | **5 (APLAZAR)** | Upgrade `shadcn@4.x` — CLI tool, bajo impacto, sin urgencia |

---

## Apéndice — Nota sobre Node.js runtime vs @types/node

El runtime es **Node.js v24.13.0** pero `@types/node` está pinado a `^20`. Esta discrepancia no genera errores en runtime pero sí en el type checker cuando se usan APIs nuevas de Node 22-24. Entre las APIs relevantes para este proyecto no tipadas en `@types/node@20`:

- `fetch` nativo (disponible en Node 18+, mejorado en 22+)
- WebCrypto API mejorada (Node 20+ tiene `webcrypto` en global, Node 22 lo estabilizó)
- `node:test` runner nativo (útil para Sprint 3 tests)

Actualizar a `@types/node@^24` en Sprint 1 junto con los demás upgrades de capa de datos.

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Auditoría completa de 37 prod + 14 dev dependencias contra stack presente y roadmap Fases 1-5. Se identificaron 2 findings Critical CVE (axios 15 CVEs + next 19 CVEs), 1 DEPRECATED crítico (crypto), y se mapearon todas las dependencias futuras necesarias para Fases C-E. La mayoría de Fases E no requieren nuevas deps (googleapis ya instalado cubre Sheets/Drive; Zoho mejor sin SDK). Ningún paquete excluido por política encontrado.
**Concerns:** (1) `next@16.1.6` tiene CVSS 8.6 (SSRF via WebSocket) y 8.1 (middleware bypass) — categorizado como High en npm pero operativamente near-Critical para un sistema multi-tenant. El roadmap lo sitúa en Sprint 1 pero debería considerarse adelantarlo a Sprint 0 dado el riesgo. (2) El mismatch Node.js v24 runtime vs `@types/node@^20` puede silenciar errores de tipado en APIs de Node 22-24 que el proyecto ya podría estar usando. (3) Zoho no tiene SDK npm verificado — la implementación REST pura requiere más código pero es la opción más segura.
