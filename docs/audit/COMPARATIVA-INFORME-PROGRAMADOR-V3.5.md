---
title: "Comparativa — Informe del Programador v3.5 vs Auditoría Externa"
date: 2026-05-19
audience: Cliente
type: divergence-analysis
sources_compared:
  - "Informe Tecnico_ Auditoria- Optimizacion y Sincronizacion de Variables (v3).pdf" (programador, fechado v3.5)
  - "Auditoría externa Quick Scan + Deep Audit" (este equipo, 129 findings, mayo 2026)
status: PUBLISHED
---

# Comparativa — Informe del Programador (v3.5) vs Auditoría Externa

## Resumen ejecutivo

El programador ha entregado el documento **"Informe Técnico: Auditoría, Optimización y Sincronización de Variables (v3.5)"** que concluye textualmente:

> *"El ecosistema digital actual se encuentra **completamente balanceado, securizado contra errores ortográficos de llamadas a funciones de terceros y optimizado para producción**. No se requieren modificaciones en los esquemas SQL de Supabase, en la API de Next.js ni en las estructuras de configuración de los canales de texto y llamadas."*

La **auditoría externa independiente** del mismo código, ejecutada en 8 fases con verificación adicional en producción mediante Playwright, ha identificado **129 findings priorizados**: 16 Critical, 41 High, 46 Medium, 26 Low.

**Las dos afirmaciones son incompatibles.** Este documento detalla, con evidencia reproducible, las divergencias entre ambos informes para que pueda tomar una decisión informada antes de continuar con el desarrollo.

> ℹ️ **Nota metodológica:** Cada divergencia listada abajo se acompaña de la ruta exacta al archivo y la línea de código que la evidencia, y del comando `grep` para reproducir el hallazgo localmente.

---

## 3-001 — Variable `USER_ESTUDIES` "eliminada del código"

**Afirmación v3.5 (sección 1):**
> *"`{user_studies}` vs `USER_STUDIES`: Se **eliminó el uso histórico** de `USER_ESTUDIES` (híbrido espanglish). Se unificó bajo el estándar internacional `USER_STUDIES`..."*

**Evidencia auditoría:**

`USER_ESTUDIES` sigue presente **en 5 ubicaciones de 3 archivos** del código vigente:

| Archivo | Línea | Contexto |
|---|---|---|
| `src/components/agents/LeadProfileModal.tsx` | 35 | `unifiedKey = "USER_ESTUDIES";` |
| `src/components/agents/LeadProfileModal.tsx` | 65 | `unifiedKey = "USER_ESTUDIES";` |
| `src/lib/services/ai-analysis.ts` | 60 | `USER_ESTUDIES?: string;` (campo del interface activo) |
| `src/lib/services/ai-analysis.ts` | 114 | `* USER_ESTUDIES: Estudios universitarios o técnicos realizados.` (en el prompt LLM) |
| `src/lib/services/fact-extractor.ts` | 321 | `const studies = meta.estudios || meta.nivel_estudios || meta.USER_ESTUDIES;` |

**Comando de verificación:**
```bash
grep -rn "USER_ESTUDIES" src/
```

**Veredicto:** La afirmación es falsa. Coexisten ambos identificadores en producción. La unificación no se ha realizado en el código fuente.

**Severidad de la divergencia:** **ALTA** — afecta a la cualificación de leads y a la sincronización con CRM.

---

## 3-002 — Variable de experiencia "corregida a YEARS_EXPERIENCE"

**Afirmación v3.5 (sección 1):**
> *"`{year_experience}` vs `YEARS_EXPERIENCE`: Se **corrigió** el término del singular al plural técnico en inglés (`YEARS_EXPERIENCE`), alineándolo con el diccionario de variables del sistema."*

**Evidencia auditoría:**

En el código vigente **coexisten 4 variantes distintas** del nombre de la variable de experiencia, incluyendo dos typos:

| Archivo | Variante encontrada | Tipo |
|---|---|---|
| `src/lib/services/ai-analysis.ts` | `"YEARS_EXPERIENCE"` | Correcto |
| `src/lib/services/ai-analysis.ts` | `"YEARS_EXPERIENCIE"` | **Typo (experIence → experIEnce)** |
| `src/lib/services/ai-analysis.ts` | `"YEARS_ EXPERIENCIE"` | **Typo + ESPACIO entre `_` y `E`** |
| `src/lib/services/fact-extractor.ts` | `meta.years_experience \|\| meta.YEARS_EXPERIENCE \|\| meta.YEARS_EXPERIENCIE \|\| meta["YEARS_ EXPERIENCIE"]` | **Las 4 coexisten en una sola línea de fallback** |
| `src/lib/services/post-analysis.ts` | `analysis.extracted_data["YEARS_EXPERIENCE"] \|\| analysis.extracted_data["YEARS_ EXPERIENCIE"] \|\| ...` | **Las 4 en cadena `\|\|`** |

Adicionalmente, la columna en base de datos se llama `anios_experiencia` (en español), añadiendo una **quinta** nomenclatura para el mismo dato.

**Comando de verificación:**
```bash
grep -rE "YEARS_?\s?EXPERIENCI?E?" src/
```

**Veredicto:** La corrección no se ha unificado. El sistema actualmente intenta leer la variable en 4 grafías porque los datos guardados históricamente usan grafías inconsistentes. La presencia de `YEARS_ EXPERIENCIE` (con un espacio en medio del nombre de campo) es un indicador inequívoco de que el problema NO está resuelto: ningún sistema bien diseñado tendría que aceptar una variable con un espacio en su nombre.

**Severidad de la divergencia:** **ALTA** — un solo lead puede tener datos en cualquiera de las 4 nomenclaturas y la lógica `||` enmascara el problema en lugar de resolverlo.

---

## 3-003 — `USER_PROFESION` "mantenido a propósito para no romper consultas"

**Afirmación v3.5 (sección 1):**
> *"`{user_profession}` vs `USER_PROFESION`: La definición externa sugería la doble 's' (`user_profession`). Sin embargo, el entorno de producción y la lógica de los agentes operan de forma correcta sobre `USER_PROFESION` (una sola 's', mapeo en español). **Se mantiene así para evitar la rotura de consultas de inserción existentes**."*

**Evidencia auditoría:**

`USER_PROFESION` (sin doble s) aparece en código:

```
src/lib/services/ai-analysis.ts: 2 ocurrencias
src/lib/services/post-analysis.ts: 1 ocurrencia
```

La **especificación oficial de la cliente** (documento `Promt-Virginia.md` que ella entregó como autoritario) usa `user_profesion` (sin doble s) en el prompt activo, pero la documentación de variables oficiales (`VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx`) usa `user_profession` (con doble s). **Hay tres grafías distintas en juego**, no dos:

| Fuente | Grafía |
|---|---|
| Doc oficial variables cliente | `user_profession` (con doble s) |
| Prompt Virginia (también cliente) | `user_profesion` (sin doble s) |
| Código | `USER_PROFESION` (sin doble s, mayúsculas) |

**Veredicto técnico:** No es una "corrección consciente para evitar romper" — es una **inconsistencia interna en los propios documentos entregados por la cliente** que el código ha resuelto unilateralmente alineándose con uno de ellos sin pedir aclaración formal.

**Acción correcta pendiente:** Preguntar a la cliente cuál es la grafía canónica oficial (pregunta 3-004 en nuestro `00-known-divergences.md`). El argumento "no romper consultas existentes" oculta el problema: el día que se entregue al CRM externo se descubrirá la divergencia.

**Severidad de la divergencia:** **MEDIA** — el riesgo es la sincronización al CRM externo (Zoho).

---

## 3-004 — `book_appointmen` "corregido estrictamente en producción"

**Afirmación v3.5 (sección 1):**
> *"`{{book_appointmen}}` (Error de Sintaxis Crítico): La definición de la herramienta carecía de la letra 't' final. Invocar la función con dicha omisión habría provocado el fallo inmediato del flujo de automatización (tanto en chat como en llamada) al intentar agendar. **En producción se ha corregido estrictamente a `book_appointment`**, garantizando la ejecución perfecta de agendas automáticas..."*

**Evidencia auditoría:**

El typo **sigue presente en el archivo `Promt-Virginia.md` entregado por la cliente**:

```
docs/Docs-entrega-clienta/Promt-Virginia.md:135:  - book_appointmen = herramienta de calendario...
docs/Docs-entrega-clienta/Promt-Virginia.md:645:  -Si el usuario confirma la agenda, llama a book_appointmen y agenda...
```

**Comando de verificación:**
```bash
grep -n "book_appointmen[^t]" docs/Docs-entrega-clienta/Promt-Virginia.md
```

**Análisis técnico:** El código del orquestador efectivamente registra el tool como `book_appointment` (correcto). Pero el prompt que carga Virginia en runtime **se lee desde la tabla `ai_agent_variants.prompt_text` en base de datos**. Si en algún momento ese registro de BD se actualiza copiando el contenido literal del documento de la cliente (que es lo que dicta la spec, y el flujo natural de mantenimiento), el typo entra en producción y **el agente intentará invocar un tool que no existe**, fallando silenciosamente al agendar.

**Conclusión:** La afirmación "corregido estrictamente" es **parcialmente cierta solo en el código del orquestador**, pero **no se ha corregido la fuente** (el doc del cliente). El riesgo no se ha eliminado — solo está actualmente latente porque el prompt activo en BD coincide con el código por casualidad. Cualquier actualización del prompt copiando desde el doc fuente reintroduce el bug.

**Severidad de la divergencia:** **ALTA** — riesgo de regresión en la próxima edición de prompts.

---

## 3-005 — Schema de la variable `QUALIFIED` "valores aceptados: apto/no apto/vacío"

**Afirmación v3.5 (sección 4, Tabla de Correspondencia Final):**

| Variable | BD | Estado | Lógica |
|---|---|---|---|
| `{qualified}` | `QUALIFIED` | **Activo** | **Valores aceptados: "apto", "no apto", ""** |

**Evidencia auditoría:**

El código contiene **TRES schemas distintos del valor `qualified`**, ninguno de los cuales acepta `"apto"/"no apto"`:

| Archivo | Línea | Schema en uso |
|---|---|---|
| `src/lib/services/ai-analysis.ts` | 51 | `qualified: "si" \| "no" \| "anulado";` |
| `src/lib/services/ai-analysis.ts` | (prompt LLM) | `"si" si cumple. "no" si no cumple. "anulado" si hay motivo de exclusión` |
| `src/lib/services/fact-extractor.ts` | 268 | `qualified: "SI", "NO" o "PENDIENTE"` |
| `src/lib/services/qualifier.ts` | (función) | retorna `"cualificado" / "no cualificado"` |
| `src/lib/actions/analysis.ts` | (conversion) | `QUALIFIED: analysis.qualified === "si" ? "SI" : "NO"` |

**Comando de verificación:**
```bash
grep -rE "qualified.*[:=].*(si|no|apto|SI|NO|cualificado)" src/lib
```

**Veredicto:** **NINGUNO** de los 3 schemas en producción coincide con la afirmación del informe v3.5. La cadena `"apto"/"no apto"/""` que el informe presenta como "valores aceptados" **no existe en ninguna parte del código**.

**Spec oficial de la cliente** (`Promt-Virginia.md`): pide `"apto" / "no apto" / ""` — pero el código nunca implementó esto. El informe v3.5 está describiendo lo que la spec dice, no lo que el código hace.

**Severidad de la divergencia:** **CRÍTICA** — la lógica de cualificación produce valores incompatibles entre sus 3 componentes internos (extractor, analyzer, qualifier) y ninguno produce el valor que la cliente espera en el CRM destino.

---

## 3-006 — Regla de cualificación "≥ 2 años de experiencia relevante"

**Afirmación v3.5 (sección Reglas, REGLA 2):**
> *"REGLA 2: Cualificación Exitosa — Gatillo: Evaluación en milisegundos de los criterios de acceso oficiales (ej. titulación universitaria **o $\ge$ 2 años de experiencia relevante**)."*

Y REGLA 4:
> *"REGLA 4: Exclusión por Requisitos — Gatillo: Declaración explícita de no contar con estudios de grado **y poseer menos de 2 años de experiencia laboral**..."*

**Evidencia auditoría:**

El umbral implementado en `src/lib/core/qualifier.ts` es:

```
Regla B (FP/Técnico): years_experience >= 3  ← código
                      years_experience >= 2  ← spec cliente (Promt-Virginia.md)

Regla C (sin estudios): years_experience >= 5  ← código (regla inventada, no en spec)
                        (no existe en spec)
```

**Veredicto:** El propio informe v3.5 cita ≥ 2 años como umbral correcto, pero el código implementa ≥ 3 años. **El informe del programador contradice al código que él mismo describe**. Cualquier lead con 2 años de experiencia técnica (válido según el propio informe v3.5) está siendo rechazado por el código en producción.

**Comando de verificación:** abrir `src/lib/core/qualifier.ts` y buscar `>= 3` y `>= 5`.

**Severidad de la divergencia:** **CRÍTICA** — pérdida directa de leads válidos. Es exactamente el escenario que el informe v3.5 dice que NO ocurre.

---

## 3-007 — "Conclusión del Estado del Sistema: completamente balanceado y securizado"

**Afirmación v3.5 (cierre):**
> *"El ecosistema digital actual se encuentra **completamente balanceado, securizado contra errores ortográficos de llamadas a funciones de terceros y optimizado para producción**. No se requieren modificaciones en los esquemas SQL de Supabase, en la API de Next.js ni en las estructuras de configuración..."*

Esta es la afirmación más amplia del informe v3.5. La auditoría externa la contradice en cuatro frentes simultáneamente. Cada uno de los siguientes hallazgos está documentado con archivo:línea exacta en nuestro informe extenso (`audit/deep/DEEP-FINDINGS-SUMMARY.md`).

### 3-007.A — "Securizado": realidad de la capa de seguridad

| # | Hallazgo | Archivo | Severidad |
|---|---|---|---|
| 1 | JWT `service_role` de Supabase (admin total a la BD) hardcodeado en código fuente | `src/lib/auth-config.ts:19`, `src/lib/supabase/server.ts:7`, `src/lib/actions/tenant.ts:52,76`, `src/scripts/purge-demo.ts:9` (9 ubicaciones, **dos service_roles distintos coexistiendo** — rotación previa mal hecha) | **CRITICAL** |
| 2 | **7 endpoints de orquestación sin autenticación**, accesibles desde internet sin credenciales | `api/orchestration/deploy`, `api/orchestration/sweep`, `api/orchestration/publish`, `api/orchestration/workflows`, `api/calls/manual`, `api/cron/appointments/reminders`, `api/cron/reminders` | **CRITICAL** |
| 3 | **Privilege escalation a admin reproducible con dos líneas de JavaScript** desde la consola del navegador (`supabase.auth.updateUser({data:{is_admin:true}})`) | `src/middleware.ts:62-68` | **CRITICAL** |
| 4 | **Destrucción cross-tenant de datos reproducible** modificando una cookie plain (`af-tenant-id`) + invocando `deleteLead()` que no verifica ownership | `src/lib/actions/inbox.ts:448-501` (9 funciones afectadas) | **CRITICAL** |
| 5 | **SSRF confirmado** en `/api/tenant/migrate` via cookie `af-tenant-url` sin allowlist | `src/app/api/tenant/migrate/route.ts:247-263` | **CRITICAL** |
| 6 | **XSS en widget embed** — `id` interpolado sin sanitizar en JS servido a sitios de terceros | `src/app/api/widget/embed.js/route.ts:16` | **HIGH** |
| 7 | Webhook Retell **sin validación de firma** — cualquier POST altera CRM | `src/app/api/webhooks/retell/route.ts` | **CRITICAL** |
| 8 | Webhook Retell tools **sin firma** — cancela/agenda citas sin auth | `src/app/api/webhooks/retell/tools/route.ts` | **CRITICAL** |
| 9 | Webhook CRM **sin auth** — `tenant_id` spoofing inyecta leads de cualquier tenant | `src/app/api/webhooks/crm/route.ts:13` | **CRITICAL** |
| 10 | `next@16.1.6`: 19 CVEs activos incluyendo SSRF (CVSS 8.6) y bypass de middleware (CVSS 8.1) | `package.json` | **CRITICAL** |
| 11 | `axios@1.14.0`: 15 CVEs activos incluyendo SSRF (CVSS 7.2) y Prototype Pollution (CVSS 7.4) | `package.json` | **CRITICAL** |
| 12 | Scripts `migrate-*.ts` con password `postgres:postgres` (default público) hardcodeado + IP de producción | `src/scripts/migrate-scheduling.ts`, `migrate-agents.ts`, `run-migration.ts` (11 connection strings totales) | **CRITICAL** |
| 13 | `user_metadata.is_admin` editable por el propio usuario via Supabase Auth API (sin restricción a nivel de RLS) | Supabase Auth API | **CRITICAL** |
| 14 | Tabla `tenants` con RLS `USING(true)` — cualquier user autenticado lee/escribe/borra cualquier tenant | `supabase/migrations/.../tenants.sql` | **CRITICAL** |
| 15 | Tabla `ai_agents`, `ai_agent_variants`, `web_widgets` con RLS tautológica equivalente | varias migrations | **HIGH** |
| 16 | RLS de `knowledge_base` usa `app.current_tenant` que **nunca se setea** en backend → política inefectiva | `supabase/migrations/20260424_knowledge_and_billing.sql:28-31` | **HIGH** |

**Veredicto:** afirmar "securizado" en presencia de cualquiera de estos 16 hallazgos es indefendible. Afirmarlo en presencia de los 16 simultáneamente es factualmente incorrecto.

### 3-007.B — "No se requieren modificaciones en los esquemas SQL"

| # | Hallazgo | Impacto |
|---|---|---|
| 1 | Las RLS multi-tenant son **inefectivas** (3-007.A items 14-16) → requieren reescritura completa | Aislamiento entre clientes roto |
| 2 | Tabla `appointments` y `agendamientos` **duplicadas** en producción con esquemas diferentes (`scheduled_at` vs `fecha_agendada_cliente`) | Duplicación no resuelta |
| 3 | `chat_messages.tenant_id` es de tipo `TEXT` cuando debería ser `UUID` con FK → integridad referencial rota | FK rota |
| 4 | Tabla `tracked_variables` que el informe v3.5 cita en su tabla de correspondencia **no existe como tabla** — son metadatos JSONB en `lead.metadata` | El informe v3.5 inventa un nombre de tabla que no está en migrations |

### 3-007.C — "Optimizado para producción"

| # | Hallazgo | Impacto |
|---|---|---|
| 1 | `worker.js:58` llama a `executeSequenceStep(job.data)` con firma incorrecta. La función requiere `(lead, tenantId, sequence, stepIndex, config)` y recibe un objeto `LeadSequenceJob`. **Todos los pasos encolados por BullMQ del flujo multi-día fallan silenciosamente en runtime**. Solo el paso 1 (ejecutado directamente sin pasar por la cola) funciona. | **El flujo multi-día completo (que el informe v3.5 describe en sus 9 reglas FSM) no se ejecuta en producción** |
| 2 | `llm-factory.ts` **no existe** como archivo. `QualificationProcessor.ts` lo importa con `@ts-expect-error` y crashea en runtime con `MODULE_NOT_FOUND` | El análisis post-llamada nunca se ejecuta |
| 3 | `enqueueLeadStep` silencia errores de Redis y devuelve un ID ficticio → jobs perdidos sin ninguna alerta | Pérdida silenciosa de leads |
| 4 | Cero tests automatizados (0% cobertura): sin Vitest, Playwright, Jest, ni ningún framework instalado | Cualquier cambio puede romper la FSM sin detección |
| 5 | Costes de LLM no persistidos — el dashboard `/minutos` muestra **datos ficticios** (fallback fijo $0.002/mensaje) porque `completion.usage` nunca se guarda en BD | Observabilidad ausente |

### 3-007.D — Accesibilidad

| # | Hallazgo | Impacto |
|---|---|---|
| 1 | 24 findings WCAG 2.1 AA (**6 Critical**) | **NON-COMPLIANT** con normativa europea para apps profesionales |
| 2 | Formulario "Crear Lead" inaccesible por screen reader (9 inputs sin `htmlFor`) | Usuario con discapacidad visual no puede crear leads |
| 3 | Modales sin `role="dialog"` ni focus trap | Usuario por teclado puede operar el fondo |
| 4 | Tabla de historial: `<tr onClick>` sin equivalente teclado | Inaccesible por teclado |

---

## 3-008 — "Las 9 Reglas FSM se ejecutan autónomamente en tiempo real"

**Afirmación v3.5 (sección final):**
> *"El AI CRM & Workflow Orchestrator v5.0 utiliza una arquitectura de **Máquina de Estados Finita (FSM)**, imposibilitando la existencia de estados aleatorios o contradictorios... El sistema computa, evalúa y actualiza de forma autónoma cada uno de estos campos en tiempo de ejecución..."*

**Evidencia auditoría:**

La FSM descrita en las 9 reglas REGLA 1–9 está **correctamente diseñada en código**, pero **no se ejecuta** debido a:

1. **F-02-001** (ya descrito en 3-007.C): el bug de firma en `worker.js:58` impide que cualquier transición posterior al paso 1 se ejecute. La FSM "fallback compliance → WhatsApp", "voz → seguimiento día N+1", "no respuesta → reintento", etc. no llegan a invocarse en producción.
2. **F-02-005**: `QualificationProcessor` (responsable de las transiciones de Regla 2/3/4) **crashea en cada invocación** por el módulo `llm-factory.ts` ausente.
3. **DA-1-005**: incluso si los dos anteriores se arreglan, `enqueueLeadStep` silencia errores de Redis y reporta éxito cuando no encoló nada. Las transiciones se pierden sin trazas.
4. **F-04 (varios)**: la FSM se persiste vía `service_role` saltándose RLS. Cualquier usuario autenticado puede inyectar transiciones falsas mediante los webhooks sin firma (3-007.A items 7-9).

**Veredicto:** la afirmación "imposibilitando la existencia de estados aleatorios o contradictorios" es lo opuesto a la realidad. En producción, los estados son frecuentemente inconsistentes porque los jobs encolados no se ejecutan, los webhooks no validan origen, y los schemas de `qualified` no coinciden entre componentes (ver 3-005).

---

## 3-009 — Lo que el informe v3.5 OMITE

Aparte de las divergencias en lo que el informe afirma, conviene listar **lo que el informe v3.5 no menciona** y que la auditoría externa identificó como **bloqueante**:

| Área | Mención en v3.5 | Estado real según auditoría |
|---|---|---|
| Tokens de admin de BD en código | No mencionado | 9 ubicaciones, 2 service_roles válidos hasta 2030 |
| Endpoints sin autenticación | No mencionado | 7 + 3 cron/test endpoints abiertos a internet |
| Privilege escalation | No mencionado | Reproducible con 2 líneas de JS desde DevTools |
| Cross-tenant data destruction | No mencionado | Reproducible con cookie tampering |
| SSRF | No mencionado | Confirmado en `/api/tenant/migrate` |
| XSS en widget embed | No mencionado | Afecta a sitios de terceros que embeben el widget |
| CVEs en dependencias | No mencionado | 19 en `next`, 15 en `axios` (uno CVSS 8.6) |
| Webhooks sin firma | No mencionado | 0/6 webhooks con validación completa |
| Tests automatizados | No mencionado | 0% cobertura, sin framework |
| Accesibilidad WCAG | No mencionado | 24 findings, NON-COMPLIANT |
| Bug crítico worker.js | No mencionado | Flujo multi-día roto al 100% en producción |
| QualificationProcessor crasheado | No mencionado | `llm-factory.ts` faltante |
| Costes LLM ficticios en dashboard | No mencionado | `completion.usage` nunca persistido |

---

## Tabla resumen de divergencias

| # | Afirmación v3.5 | Estado real | Severidad | Reproducible |
|---|---|---|---|---|
| 3-001 | `USER_ESTUDIES` eliminado | 5 ubicaciones activas | ALTA | `grep -r USER_ESTUDIES src/` |
| 3-002 | `YEARS_EXPERIENCE` unificado | 4 variantes coexisten (incluido nombre con espacio) | ALTA | `grep -rE "YEARS_?\s?EXPERIENCI?E?" src/` |
| 3-003 | `USER_PROFESION` mantenido deliberadamente | Inconsistencia interna en docs cliente sin resolver | MEDIA | Comparar `Promt-Virginia.md` vs `VARIABLES DEFINIDAS.docx` |
| 3-004 | `book_appointmen` corregido | Typo aún presente en prompt fuente cliente | ALTA | `grep -n "book_appointmen[^t]" docs/Docs-entrega-clienta/Promt-Virginia.md` |
| 3-005 | `QUALIFIED = apto/no apto` | 3 schemas distintos coexistiendo, ninguno acepta "apto" | **CRÍTICA** | `grep -rE "qualified" src/lib/services/` |
| 3-006 | Regla ≥ 2 años (lo dice el propio v3.5) | Código implementa ≥ 3 años (Regla B) y ≥ 5 años (Regla C, no en spec) | **CRÍTICA** | Abrir `src/lib/core/qualifier.ts` |
| 3-007 | Sistema "completamente balanceado, securizado, optimizado" | 16 Critical + 41 High activos | **CRÍTICA** | Ver `audit/deep/DEEP-FINDINGS-SUMMARY.html` |
| 3-008 | FSM se ejecuta autónomamente | Bug `worker.js:58` impide pasos 2+; QualificationProcessor crashea | **CRÍTICA** | Ver `audit/deep/DA-1-concurrency-orchestrator.html` |
| 3-009 | (omisiones) | 13 áreas críticas no mencionadas | — | Ver tabla 3-009 |

---

## Conclusiones para el cliente

### 1. El informe v3.5 describe un sistema deseable, no el sistema real

Las afirmaciones sobre variables "ya corregidas", schemas "unificados" y FSM "auto-ejecutándose" no se sostienen al ejecutar `grep` sobre el código fuente actual. Los typos que el informe declara resueltos siguen apareciendo en archivos vigentes que cualquiera puede consultar.

### 2. La diferencia entre los dos informes no es cuestión de opinión técnica

Cada divergencia listada arriba es verificable por cualquier persona con acceso al repositorio mediante un comando `grep` reproducible. No depende de interpretaciones arquitectónicas — son hechos sobre cadenas de texto presentes o ausentes en archivos concretos.

### 3. Es probable que el informe v3.5 esté basado en el diseño previsto, no en una verificación del estado actual

Algunas frases del v3.5 (por ejemplo, citar "≥ 2 años" como umbral de Regla 2 cuando el código tiene "≥ 3 años") parecen describir lo que la especificación dice que debería ocurrir, no lo que el código realmente hace. Esto es consistente con una redacción del informe basada en el documento de spec más que en una inspección de código.

### 4. Recomendación de acción

Antes de aceptar la afirmación "no se requieren modificaciones", recomendaríamos:

1. **Pedir al programador que ejecute los comandos `grep` de verificación** listados en este documento y comparta los resultados.
2. **Solicitar pruebas concretas de que el flujo multi-día funciona end-to-end** (ej. log de un lead que reciba contacto en días 1, 2 y 3). La auditoría externa indica que solo el día 1 se ejecuta, por el bug `worker.js:58`.
3. **Aplicar los hotfixes de Sprint 0** del backlog de la auditoría externa (`roadmap/deep-improvement-backlog.html` — 5-8 días/dev) antes de considerar el sistema "en producción". Sprint 0 cubre los 16 Critical de seguridad y los bugs bloqueantes de lógica de negocio.
4. **Una vez aplicados los hotfixes**, **repetir la auditoría externa** sobre la nueva versión para confirmar que las correcciones son efectivas. Esto evitará que la próxima conclusión "ya está corregido" se haga sobre la palabra de quien implementa, sin verificación independiente.

### 5. Reconocimiento de lo que el informe v3.5 sí acierta

Para no presentar una imagen distorsionada: el informe v3.5 contiene elementos correctos que conviene reconocer:

- La descripción arquitectónica de la **FSM con 9 reglas** está bien definida conceptualmente. El problema es de implementación, no de diseño.
- La justificación del **uso de RAG** para precios/temarios en lugar de variables fijas es técnicamente sólida (la auditoría externa también confirma que el RAG está implementado).
- El **manejo de variables de contexto no persistidas** (zonas horarias, origen del lead) es correcto técnicamente.
- El uso de **BullMQ + Redis** como worker engine es una decisión arquitectónica adecuada; el problema es el bug puntual en `worker.js:58`, no la elección del stack.

El sistema tiene una base sólida sobre la que reparar los hallazgos. El desacuerdo entre los dos informes es sobre **qué tan reparado está actualmente**, no sobre **si la arquitectura es adecuada**.

---

## Anexo — Cómo verificar cada divergencia en 5 minutos

Cualquier persona con acceso al repositorio puede reproducir las divergencias 3-001 a 3-006 ejecutando los siguientes comandos desde la raíz del proyecto:

```bash
# 3-001: USER_ESTUDIES sigue presente
grep -rn "USER_ESTUDIES" src/

# 3-002: 4 variantes de YEARS_EXPERIENCE
grep -rE "YEARS_?\s?EXPERIENCI?E?" src/

# 3-003: USER_PROFESION sin doble s
grep -rn "USER_PROFESION\|USER_PROFESSION" src/

# 3-004: typo book_appointmen en doc cliente
grep -n "book_appointmen[^t]" docs/Docs-entrega-clienta/Promt-Virginia.md

# 3-005: 3 schemas de qualified
grep -rE "qualified.*[:=].*(si|no|apto|SI|NO|cualificado)" src/lib

# 3-006: umbral años de experiencia
grep -n ">= 3\|>= 5" src/lib/core/qualifier.ts
```

Las divergencias 3-007 a 3-009 están documentadas con archivo:línea en los reports completos del audit (`audit/deep/`).

---

**Status:** PUBLISHED
**Author:** Equipo de auditoría externa
**Para:** Cliente LinkStation
**Fecha:** 2026-05-19
