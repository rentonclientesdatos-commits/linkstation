---
title: "Audit Structure — Findings"
date: 2026-05-18
agent: Audit-Structure (Sonnet)
phase: 1
---

# Audit Structure

## Perímetro auditado

- `src/app/` — rutas, layouts, Server Components, API routes
- `src/components/` — componentes UI y organización
- `src/lib/` capa top-level — naming, organización de capas, imports cruzados
  - `src/lib/actions/`, `src/lib/constants/`, `src/lib/integrations/` (interfaces), `src/lib/utils/`, `src/lib/validations/`
  - Excluido en profundidad: `src/lib/core/`, `src/lib/supabase/`, `src/lib/services/ai-*`, `src/lib/cache/`
- `src/scratch/`, `src/scripts/`, `src/store/`, `src/types/`
- Ficheros raíz: `tsconfig.json`, `next.config.ts`, `package.json`, `worker.js`
- `src/lib/auth-config.ts`
- `src/lib/fix-photos.js`, `src/lib/normalize-leads.js`

---

## Resumen ejecutivo

El proyecto es un Next.js 16 App Router con React 19 y Supabase. La estructura de rutas es coherente y el sidebar implementa correctamente la mayoría del menú especificado por la cliente. Las capas principales (app → components → lib/actions → lib/core) son razonablemente identificables.

Los problemas estructurales más graves son: (1) credenciales hardcodeadas en `auth-config.ts` y un token de verificación de WhatsApp embebido en código, ambos violaciones de seguridad inmediatas; (2) la nomenclatura del campo `qualified` en el motor de cualificación usa `"si"/"no"` en lugar de `"apto"/"no apto"` según la spec oficial, lo que rompe la integración con el CRM; (3) la Regla B del árbol de decisión de cualificación implementa `>= 3 años` para FP/técnicos pero la spec dice `>= 2 años`, afectando directamente al negocio; (4) ausencia total de tests; (5) 426 instancias de `as any`/`as unknown` que indican tipado débil generalizado. Hay también 6 ficheros de datos/scripts de desarrollo en lugares inapropiados dentro de `src/`.

---

## Findings

### F-01-001: Credenciales Supabase hardcodeadas en auth-config.ts
- **Archivo**: `src/lib/auth-config.ts:14,19`
- **Severidad**: Critical
- **Esfuerzo**: S
- **Descripción**: `AUTH_SUPABASE_ANON_KEY` y `AUTH_SUPABASE_SERVICE_ROLE_KEY` tienen JWTs hardcodeados como fallback. Si las variables de entorno no están configuradas, se usan tokens reales del servidor de producción (`api-db.linkstation.ai`). Cualquier desarrollador con acceso al repo tiene la `SERVICE_ROLE_KEY`, que otorga acceso administrativo completo a la base de datos.
- **Spec relacionada**: 3-002 (riesgo de seguridad multi-tenancy); 3-003 (seguridad en datos)
- **Fix sugerido**: Eliminar los valores de fallback hardcodeados. Lanzar excepción si las env vars no existen. En desarrollo, usar un archivo `.env.local` local nunca commiteado. Rotar inmediatamente las credenciales expuestas.

---

### F-01-002: Token de verificación WhatsApp hardcodeado en código fuente
- **Archivo**: `src/app/api/webhooks/whatsapp/route.ts:11`
- **Severidad**: Critical
- **Esfuerzo**: S
- **Descripción**: `const VERIFY_TOKEN = "automatiza_for_2025"` está embebido directamente en el código fuente. Este token también aparece como placeholder en la UI de settings (`src/app/dashboard/settings/IntegrationsManager.tsx:375`), lo que lo convierte en una credencial pública conocida. Cualquiera que lo conozca puede hacer llamadas falsas al webhook de WhatsApp.
- **Spec relacionada**: 3-002 (seguridad)
- **Fix sugerido**: Mover a variable de entorno `WHATSAPP_VERIFY_TOKEN`. Cambiar el valor actual en Meta Developers Dashboard inmediatamente. Eliminar el placeholder de la UI (que debe obtener el valor desde el servidor o mostrar un campo de configuración guardado por el tenant).

---

### F-01-003: Campo `qualified` usa valores "si"/"no" en lugar de "apto"/"no apto"
- **Archivo**: `src/lib/services/ai-analysis.ts:51`, `src/lib/services/post-analysis.ts:53,74`
- **Severidad**: Critical
- **Esfuerzo**: M
- **Descripción**: La spec oficial (spec §3, variable `{qualified}`) define los valores como `"apto"` / `"no apto"`. El código usa `"si"` / `"no"` / `"anulado"`. Esta discrepancia hace que los datos de cualificación escritos en Supabase sean incompatibles con la nomenclatura oficial del CRM del cliente y con el prompt de Virginia (que usa `"apto"`/`"no apto"` si sigue la spec A/B).
- **Spec relacionada**: §3 spec cliente — variable `{qualified}`: `"apto"` / `"no apto"` / `""`
- **Fix sugerido**: Cambiar el tipo `"si" | "no" | "anulado"` a `"apto" | "no apto" | ""` en toda la cadena: `ai-analysis.ts`, `post-analysis.ts`, `fact-extractor.ts`. Actualizar la columna `cualificacion` en Supabase si es un enum.

---

### F-01-004: Regla B de cualificación usa `>= 3 años` en lugar de `>= 2 años`
- **Archivo**: `src/lib/core/intelligence/qualifier.ts:80`
- **Severidad**: Critical
- **Esfuerzo**: S
- **Descripción**: La spec oficial (spec §3.5, Regla B) dice: estudios técnico/FP requieren `years_experience >= 2` para ser `"apto"`. El código implementa `expYears >= 3`. Esto rechaza incorrectamente leads con 2 años de experiencia que deberían ser `"apto"` según la spec del negocio.
- **Spec relacionada**: `00-client-spec-extraction.md` §3.5 Regla B: `years_experience >= 2`
- **Fix sugerido**: Cambiar línea 80 de `if (expYears >= 3)` a `if (expYears >= 2)`.

---

### F-01-005: Regla C de cualificación usa `>= 5 años` — no documentada en spec
- **Archivo**: `src/lib/core/intelligence/qualifier.ts:97`
- **Severidad**: Critical
- **Esfuerzo**: S
- **Descripción**: El qualifier implementa una "Regla C" para perfiles sin estudios con `>= 5 años`. La spec solo define Regla A y Regla B. La spec explícita dice que perfiles básicos/sin estudios son `"no apto"` si no tienen experiencia relevante, pero el código los cualifica con solo 5 años de experiencia sin verificar si la experiencia es relevante (negocios/gestión). Además, la spec indica que perfiles manuales (fontanero, camarero, albañil) son exclusión absoluta — esta lógica no existe en el código.
- **Spec relacionada**: `00-client-spec-extraction.md` §3.5 — Árbol de decisión completo, criterios de exclusión
- **Fix sugerido**: Revisar con la cliente si la Regla C existe o debe existir. Si no, eliminarla. Añadir lógica de exclusión de perfiles manuales (exclusión keywords). Verificar si la "experiencia relevante" debe validarse.

---

### F-01-006: Campo `estado` del lead usa `tipo_lead` en BD (nomenclatura divergente)
- **Archivo**: `src/types/database.ts:15,468`, `src/lib/core/orchestrator.ts:1321`
- **Severidad**: High
- **Esfuerzo**: M
- **Descripción**: La spec define una variable `{estado}` con valores `"cualificado"`, `"agendado"`, `"informado"`, `"matriculado"`, `"descartado"`, `"ilocalizable"`. El código usa el campo `tipo_lead` (en tabla `lead`) para almacenar estados como `"ilocalizable"`, `"nuevo"`, `"localizable"`. Existe además un campo `estado` en otras tablas (conversaciones, llamadas) con significado diferente. La variable de spec `{estado}` no tiene un campo BD unívoco claro — `tipo_lead` actúa como estado de ciclo de vida pero con nombre semánticamente erróneo.
- **Spec relacionada**: `00-client-spec-extraction.md` §3, variable `{estado}`; 3-012 (variables inventadas)
- **Fix sugerido**: Clarificar con la cliente si `tipo_lead` es equivalente a `{estado}`. Si sí, renombrar la columna en BD de `tipo_lead` a `estado`. Definir el enum exhaustivo de valores válidos como constraint en Supabase.

---

### F-01-007: Variable `curse_name` del spec no aparece — el código usa `course_name`
- **Archivo**: `src/components/agents/AIAgentInbox.tsx:515`, `src/lib/core/orchestrator.ts:476,814,1127`
- **Severidad**: High
- **Esfuerzo**: S
- **Descripción**: La spec oficial usa `{curse_name}` (typo intencional de la cliente, confirmado en los 3 documentos A/B/C). El código corrige silenciosamente el typo y usa `course_name`. Si el agente Virginia envía `curse_name` como variable y el código espera `course_name`, hay un mismatch que resulta en pérdida del nombre del curso. Adicionalmente, no hay mapeo explícito documentado entre ambas denominaciones.
- **Spec relacionada**: `00-client-spec-extraction.md` §3, 2-004: `{curse_name}` es nomenclatura oficial de la cliente
- **Fix sugerido**: Decisión a tomar con la cliente (preguntar #5 de spec). Si se mantiene el typo oficial: añadir alias en el código `course_name = payload.curse_name || payload.course_name`. Si se corrige: actualizar el prompt de Virginia.

---

### F-01-008: Ausencia total de tests automatizados
- **Archivo**: N/A (todo el proyecto)
- **Severidad**: High
- **Esfuerzo**: L
- **Descripción**: No existe ningún archivo de test (`.test.ts`, `.spec.ts`, `__tests__`), ningún framework de testing en `package.json` (no jest, no vitest, no playwright, no cypress), y ningún script de test en `package.json`. Esto significa que cambios en reglas de negocio críticas (árbol de decisión de cualificación, lógica del orquestador) no tienen ninguna red de seguridad. El proyecto tiene lógica de negocio compleja que debería estar cubierta por tests unitarios.
- **Spec relacionada**: 3-011 (desarrollo sin estructura/estabilidad)
- **Fix sugerido**: Instalar vitest (compatible con Next.js/ESM). Priorizar tests para: `qualifier.ts` (árbol de decisión), `fact-extractor.ts` (parsing de variables del agente), `orchestrator.ts` (flujo de lead). Al menos 80% de cobertura en los módulos de negocio críticos.

---

### F-01-009: 6 ficheros de datos/scripts colocados en `src/lib/` en lugar de `scripts/` o `src/scratch/`
- **Archivo**: `src/lib/fix-photos.js`, `src/lib/normalize-leads.js`, `src/scratch/check_appts_tables.ts`; también 18 scripts en `src/scripts/`
- **Severidad**: Medium
- **Esfuerzo**: S
- **Descripción**: `fix-photos.js` y `normalize-leads.js` son scripts de mantenimiento puntual, no módulos de la aplicación. Están en `src/lib/` mezclados con módulos de producción, lo que contamina la capa de librería. `src/scratch/` contiene un fichero de verificación que parece haber quedado de un debugging. Los 18 scripts en `src/scripts/` están ubicados dentro del directorio `src/` cuando deberían estar en el directorio raíz `scripts/` (que ya existe).
- **Fix sugerido**: Mover `fix-photos.js` y `normalize-leads.js` a `scripts/` en la raíz. Eliminar o archivar `src/scratch/check_appts_tables.ts`. Mover el contenido de `src/scripts/` a `scripts/` en la raíz.

---

### F-01-010: Import cruzado de `lib/actions` hacia `components/` — violación de capas
- **Archivo**: `src/lib/actions/lead-events.ts:4`
- **Severidad**: Medium
- **Esfuerzo**: S
- **Descripción**: `lead-events.ts` importa `TraceabilityEvent` desde `@/components/historial/LeadTraceability`. Las acciones de servidor no deben importar tipos de componentes UI — la dependencia debe ser inversa (componentes importan de lib/actions). Esto crea un acoplamiento circular potencial y dificulta el testing de las acciones sin renderizar componentes.
- **Fix sugerido**: Extraer el tipo `TraceabilityEvent` a `src/types/` (ej: `src/types/events.ts`) para que tanto `lib/actions/lead-events.ts` como `components/historial/LeadTraceability.tsx` puedan importarlo desde un lugar compartido.

---

### F-01-011: Ruta rewrite `/dashboardadmin` → ambigüedad de propósito
- **Archivo**: `next.config.ts:10-15`, `src/components/layout/TenantSetupBanner.tsx:12`
- **Severidad**: Medium
- **Esfuerzo**: S
- **Descripción**: `next.config.ts` define un rewrite que mapea `/dashboardadmin/:path*` → `/dashboard/:path*`. `TenantSetupBanner` tiene lógica condicional basada en si el pathname empieza por `/dashboardadmin`. No está documentado para qué sirve esta ruta alternativa, si es para multi-tenant con subdominio, para white-labeling, o es un vestigio. La ausencia de documentación y el naming confuso son deuda técnica.
- **Fix sugerido**: Documentar el propósito. Si no se usa, eliminar el rewrite y la lógica condicional en `TenantSetupBanner`. Si se usa, agregar comentario explicativo en `next.config.ts`.

---

### F-01-012: Tipado débil masivo — 426 instancias de `as any` / `as unknown`
- **Archivo**: Todo el proyecto (mayor concentración en `src/app/api/webhooks/retell/route.ts`, `src/lib/actions/analytics.ts`, `src/lib/services/post-analysis.ts`)
- **Severidad**: Medium
- **Esfuerzo**: L
- **Descripción**: 426 castings `as any`/`as unknown` en el código indican que el sistema de tipos TypeScript no está siendo utilizado como safety net. Esto es especialmente problemático en las rutas API y en los servicios que procesan datos del agente IA, donde un campo con tipo incorrecto puede causar bugs silenciosos (ej: `years_experience` como string en lugar de número puede romper la lógica de cualificación).
- **Fix sugerido**: Comenzar por los módulos críticos: `fact-extractor.ts`, `post-analysis.ts`, `qualifier.ts`. Definir tipos estrictos para el payload del agente IA y los campos de `lead_cualificacion`. Configurar `"noImplicitAny": true` en tsconfig si no está ya.

---

### F-01-013: Menú de sidebar no coincide exactamente con spec de la cliente
- **Archivo**: `src/components/layout/Sidebar.tsx:26-174`
- **Severidad**: Medium
- **Esfuerzo**: S
- **Descripción**: La spec del menú lateral (`00-client-spec-extraction.md` §5) define una estructura específica. Divergencias encontradas:
  - Spec: "Campañas" está dentro de "Leads". Código: "Campañas" es una sección independiente al mismo nivel que "Leads".
  - Spec: "Métricas" incluye "Llamadas", "WhatsApp", "Campañas", "Historial". Código: "Métricas" incluye "Llamadas", "Whatsapp", "Historial" (falta "Campañas" como subitem).
  - Spec: "Pruebas y Logs" incluye "Simulador Playground" y "Auditoría Logs". Código: tiene "Simulador", "Playground" (separados) y "Auditoría Logs".
  - Spec: "Admin Panel" está dentro de "Negocio". Código: "Admin Panel" está dentro de "Negocio" — correcto.
  - Spec: "Docs" está dentro de "Admin Panel". Código: "Docs" es ítem de primer nivel.
- **Spec relacionada**: `00-client-spec-extraction.md` §5 — Menú lateral app
- **Fix sugerido**: Reorganizar `NAV_ITEMS` para coincidir con la jerarquía de la spec: Campañas como subitem de Leads, Docs como subitem de Admin Panel dentro de Negocio.

---

### F-01-014: Página de dashboard (`/dashboard`) es la raíz de "Métricas" — confusión de routing
- **Archivo**: `src/app/dashboard/page.tsx`, `src/components/layout/Sidebar.tsx:100`
- **Severidad**: Low
- **Esfuerzo**: S
- **Descripción**: En el sidebar, "Métricas" apunta a `/dashboard` (la raíz del dashboard). Las subpáginas de métricas (`/dashboard/minutos`, `/dashboard/whatsapp`, `/dashboard/historial`) son correctas. Sin embargo, la página raíz `/dashboard` sirve como "Métricas generales", mientras que la spec define el menú de "Métricas" con subitems específicos. No hay una página de aterrizaje de "Métricas" que sirva como índice.
- **Fix sugerido**: Renombrar conceptualmente `/dashboard` como "Dashboard Principal" en el código, separar la ruta de "Métricas" si la spec lo requiere.

---

### F-01-015: Scripts de oneshot en `src/scripts/` sin mecanismo de ejecución documentado
- **Archivo**: `src/scripts/` (18 ficheros: `migrate-agents.ts`, `check_tenant_47e8.ts`, `print_all_tenants.ts`, etc.)
- **Severidad**: Low
- **Esfuerzo**: S
- **Descripción**: Hay 18 scripts de mantenimiento/debug en `src/scripts/`. Varios usan `postgres` directamente (3-003 relacionado). No hay un `package.json` script o Makefile que documente cómo ejecutarlos. Algunos tienen nombres con IDs de tenant específicos (`check_tenant_47e8.ts`) que revelan información de datos internos en el repo.
- **Spec relacionada**: 3-003 (SQL directo sin ORM), 3-012 (documentación deficiente)
- **Fix sugerido**: Mover a `scripts/` raíz. Añadir comentario de cabecera en cada script con propósito y cómo ejecutar. Eliminar archivos con IDs de tenant hardcodeados o reemplazarlos con parámetro de entrada.

---

## Naming de variables vs spec cliente

| Variable spec (A/B) | En código | Ubicación | Estado |
|---|---|---|---|
| `{qualified}` = `"apto"/"no apto"` | `qualified: "si"/"no"/"anulado"` | `ai-analysis.ts:51`, `post-analysis.ts:53` | **DIVERGENCIA CRÍTICA** |
| `{years_experience}` / `{year_experience}` | `years_experience` | `qualifier.ts:10`, `fact-extractor.ts:327` | Coincide con prompt C (plural) |
| `{nivel_estudios}` | `nivel_estudios` | `qualifier.ts:9`, `schema.ts:17`, `types/database.ts:132` | Coincide con spec A/B |
| `{anios_experiencia}` (BD) | `anios_experiencia` | `schema.ts:17`, `types/database.ts:131` | Correcta en BD |
| `{curse_name}` | `course_name` (corregido) | `orchestrator.ts:476`, `AIAgentInbox.tsx:515` | Typo corregido sin consenso |
| `{user_profession}` | No encontrado | — | No implementado en BD visible |
| `{user_profesion}` | No encontrado | — | No implementado en BD visible |
| `{estado}` | `tipo_lead` (en tabla lead) | `orchestrator.ts:1321`, `types/database.ts:468` | Nombre divergente |
| `{estado}` valores: `"agendado"`, `"descartado"`, `"ilocalizable"` | `tipo_lead`: `"ilocalizable"` (encontrado), otros no verificados | varios | Parcialmente implementado |
| `{fecha_agenda}` | `fecha_agendada_cliente` (en BD), `scheduled_at` (en `appointments`) | `schema.ts:16`, `calls.ts:210` | Duplicación de campo / naming BD difiere de spec |
| `{scheduled_call_confirmed}` | `scheduled_call_confirmed` | `ai-analysis.ts:52` | Coincide |
| `{conversation_status}` | `conversation_status` | `fact-extractor.ts:188` | Coincide |
| `book_appointment` (tool) | `book_appointment` (handler) | `retell/tools/route.ts:33` | Coincide con spec A/B |
| `book_appointmen` (typo C) | No encontrado | — | Typo del prompt no replicado en código |
| `"prematriculado"` (estado en prompt C) | No encontrado en enums | — | No implementado — posible dato perdido |

---

## ¿Hay tests?

**No**. El proyecto no tiene ningún framework de testing instalado ni ningún archivo de test. No existe configuración de jest, vitest, playwright ni cypress. El único script en `package.json` es `dev`, `build`, `start` y `lint`. Los 18 archivos en `src/scripts/` son scripts de diagnóstico/migración manuales, no tests automatizados.

---

**Status:** DONE_WITH_CONCERNS
**Summary:** 15 findings identificados (4 Critical, 5 High, 4 Medium, 2 Low). Los más graves son credenciales hardcodeadas en producción (F-01-001), token de webhook hardcodeado (F-01-002), y divergencias en la lógica de negocio de cualificación (F-01-003, F-01-004, F-01-005) que producen datos incorrectos o rechazos indebidos de leads.
**Concerns/Blockers:**
- La nomenclatura `tipo_lead` vs `{estado}` requiere consulta directa con la cliente para decidir si renombrar la columna en BD.
- La "Regla C" del qualifier (sin estudios + 5 años de exp) no está en la spec — puede ser un requisito no documentado o puede ser incorrecto. Requiere confirmación de la cliente.
- La discrepancia `qualified: "si"/"no"` vs `"apto"/"no apto"` requiere verificar qué espera exactamente el CRM del cliente al recibir datos de sincronización.
