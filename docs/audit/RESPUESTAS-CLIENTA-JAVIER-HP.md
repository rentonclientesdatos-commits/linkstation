---
title: Respuestas a preguntas pendientes — Auditor Javier HP
date: 2026-05-19
status: LIVING_DOCUMENT
audience: cliente Esden + equipo técnico
auditor: Javier HP
type: Q&A contrastable
sources: PREGUNTAS-PARA-LA-CLIENTE.md + DECISIONES-AUDITOR-JAVIER-HP.md
---

# Respuestas a preguntas pendientes — Auditor Javier HP

## Propósito

Este documento recoge, en formato **Pregunta → Respuesta**, las decisiones tomadas por **Javier HP (Auditor)** sobre las 25 preguntas pendientes identificadas durante la auditoría del proyecto `linkstation`.

Su objetivo es que la **clienta (Esden)** pueda **contrastar y validar** cada decisión del auditor con su propia visión de negocio, antes de cerrar definitivamente las respuestas y bajarlas al backlog técnico (Sprint 0 → 3).

> **Cómo usar este documento:** revisa cada pregunta. Si estás de acuerdo con la respuesta del auditor, no es necesario hacer nada. Si quieres matizar o corregir, indícalo y la respuesta se actualizará aquí y en el registro de decisiones [DECISIONES-AUDITOR-JAVIER-HP.md](DECISIONES-AUDITOR-JAVIER-HP.md).

---

## 🔴 Bloque 1 — Urgentes (bloquean Sprint 0)

### P-001 — ¿Hay clientes reales usando el sistema en este momento? ✅ Respondida

**Pregunta original:** Cuántos clientes activos, si hay leads reales (no de prueba) y si existe SLA firmado con alguno.

**Respuesta del Auditor Javier HP:** **N — Estamos en desarrollo.** No hay clientes reales en producción todavía. El sistema no tiene leads reales, ni tenants productivos, ni SLA firmado con terceros.

**Implicación técnica:** El Sprint 0 (rotación de credenciales + hotfixes de seguridad) puede ejecutarse con **libertad operativa**: sin avisos a clientes, sin SLA que respetar, sin ventana de bajo riesgo obligatoria.

---

### P-002 — ¿Quién tiene o ha tenido acceso al código fuente del proyecto? ✅ Respondida

**Pregunta original:** Lista de personas con acceso al repo `LinkStation/linkstation-dashboard`, terceros con ZIPs y personas que ya no deberían tener acceso.

**Respuesta del Auditor Javier HP:** **Solo personal interno** ha tenido acceso al código fuente. No ha habido entregas externas a terceros no autorizados.

**Implicación técnica:** La rotación de credenciales en Sprint 0 invalida los secretos antiguos. Al ser círculo cerrado de personal interno, no se requieren acciones forenses. La rotación es **preventiva**, no reactiva.

---

### P-003 — ¿Podemos hacer una ventana de mantenimiento de 30 minutos? ✅ Respondida

**Pregunta original:** Día y hora preferidos para la ventana, y si hay que avisar a clientes con antelación.

**Respuesta del Auditor Javier HP:** **Sí, por supuesto.** Se autoriza. Al estar en desarrollo (ver P-001), no se requiere aviso previo a clientes.

**Implicación técnica:** El equipo puede planificar la ventana **en cualquier momento** dentro de la franja laboral pactada, sin restricción de día/hora.

---

## 🟠 Bloque 2 — Reglas de negocio (cualificación de leads)

### P-004 — Regla B: ¿2 o 3 años de experiencia? ✅ Respondida

**Pregunta original:** Documento dice "2 años o más", código hace "3 años o más". ¿Cuál es el umbral correcto?

**Respuesta del Auditor Javier HP:** **Depende de la formación que se quiera vender al cliente final.** El umbral de experiencia no es global — debe ser **configurable por curso/máster**.

**Implicación técnica:** Refactor: las reglas de cualificación deben vivir en una tabla `qualification_rules_per_course` por `course_id` + `tenant_id`. Editable desde panel admin sin tocar código.

---

### P-005 — Regla C: ¿existe la regla "sin estudios + 5 años de experiencia"? ✅ Respondida

**Pregunta original:** El código aplica una Regla C (sin estudios + 5 años → apto) que no está en la documentación. ¿Es legítima o invento del programador?

**Respuesta del Auditor Javier HP:** **Sí, es correcto. La Regla C es legítima.** Una persona sin estudios requeridos puede ser admitida por **equivalencia: 5 años de experiencia profesional relevante**.

**Implicación técnica:** La Regla C **se mantiene** pero se documenta oficialmente en el prompt de Virginia y en `VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx`. Umbral configurable por formación.

---

### P-006 — Exclusiones de profesiones manuales (fontaneros, albañiles, etc.) ✅ Respondida

**Pregunta original:** El documento exige excluir profesiones manuales. El código no lo aplica. ¿Se aplica? ¿Lista completa? ¿Lista de inclusión en su lugar?

**Respuesta del Auditor Javier HP:** **Depende de la formación que se le pueda vender al cliente final.** La exclusión/inclusión de profesiones **no es global** — depende del curso o máster.

**Implicación técnica:** Modelo dual: campo `profession_policy` ∈ {`include_list`, `exclude_list`, `open`} + campo `professions[]`. Editable por curso desde panel admin.

---

### P-007 — Estado "prematriculado" — ¿válido o vestigio? ✅ Respondida

**Pregunta original:** Aparece en línea 73 del prompt Virginia pero el código no lo gestiona. ¿Válido o borrador olvidado?

**Respuesta del Auditor Javier HP:** **Es un estado válido que debe disparar una acción** (y el estado del lead debe quedar reflejado en la BD para seguimiento).

**Implicación técnica:** Implementar `prematriculado` en el orquestador como nodo válido del statemachine con su trigger. Acción concreta a aclarar junto con P-015.

---

## 🟡 Bloque 3 — Nomenclatura (afecta sync con CRM)

### P-008 a P-011 — Nomenclatura de variables ✅ Respondida (en bloque)

**Preguntas originales:**

- **P-008:** `user_profession` (doble s) o `user_profesion` (sin doble s)
- **P-009:** `year_experience` (singular) o `years_experience` (plural)
- **P-010:** `curse_name` o `course_name`
- **P-011:** Valores de `qualified`: ¿`apto`/`no apto`/`""` u otro de los 3 sistemas que coexisten?

**Respuesta del Auditor Javier HP (aplica a las 4):**

**Prevalecen los nombres de variable facilitados por la clienta** en `docs/Docs-entrega-clienta/VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx`. Ese documento es la **fuente única de verdad** para la nomenclatura del flujo de captación y cualificación.

**No obstante** — internamente nuestros datos serán fijos, así como su nomenclatura. Para resolver la integración con CRM externos (cada uno con sus convenciones), **se construirá un router de variables**: capa de mapeo entre la nomenclatura interna fija y la del CRM elegido por cada cliente.

**Adicionalmente** — el administrador dispondrá de una **sección en el panel** para:

- Visualizar el catálogo completo de variables internas y su mapeo al CRM activo.
- Editar la configuración del router de variables sin tocar código.

**Implicación técnica:**

1. Extraer del `.docx` el listado canónico → `docs/variables-catalog.md` versionado.
2. Refactor: usar grafía canónica internamente. Eliminar variantes con typo.
3. Implementar router (`crm-mapper`): tabla `crm_field_mapping` editable desde panel admin.
4. Vista admin **"Variables & CRM Mapping"** con validación contra catálogo canónico.
5. Tests de integración por CRM (HubSpot, Zoho — MVP Fase 2). Google Sheets bidireccional se prueba en Fase 4 (post-release).

Cruza con [R-020](DECISIONES-AUDITOR-JAVIER-HP.md#r-020).

---

### P-012 — Columna `nivel_estudios` en la base de datos ✅ Respondida

**Pregunta original:** La columna existe en BD pero la IA no la rellena. ¿Se usa, o se elimina?

**Respuesta del Auditor Javier HP:** **Se mantiene y se utilizará.** Si al final del proyecto no se utiliza, se revisará en la **fase de optimización y hardening previa a la release**.

**Implicación técnica:** No se elimina ahora. Se añade a la lista de revisiones obligatorias en hardening final. Documentado como follow-up task.

---

## 🔵 Bloque 4 — Seguimiento operativo de leads

### P-013 — Protocolo multi-día: cadencia + franjas horarias + timezone ✅ Respondida

**Pregunta original:** El día 1 funciona. Días 2, 3… están técnicamente rotos (bug F-02-001 del worker). ¿Cuántos contactos en total, en qué orden, con qué intervalos?

**Fuentes documentales consultadas:**

- `docs/Docs-entrega-clienta/Fujos de Trabajo/reunion-inicial-flujo.pdf` — resumen Fathom reunión Bea & Javi (18-may-2026, 132 min).
- `docs/Docs-entrega-clienta/Fujos de Trabajo/Flujo-agent-ia-voz-whatsapp.png` — diagrama oficial entregado por la clienta.
- `docs/Docs-entrega-clienta/Fujos de Trabajo/Agente voz y whatsapp que cualifica.pdf` — versión PDF del mismo diagrama.

**Respuesta del Auditor Javier HP (consolidada):**

**1) Bifurcación inicial por franja horaria (hora local del lead, NO del centro):**

- **L–V de 09:00 a 21:00 hora lead** → el agente llama (outbound).
- **L–V de 21:00 a 09:00 + fines de semana completos hora lead** → WhatsApp con plantilla oficial → espera 30 min → si no responde, segundo WhatsApp sin plantilla.

**2) Cadencia de reintentos — regla 24 h + 3 h (= 27 h) durante 3 días:**

- **Llamadas:** cada nueva llamada se realiza **27 horas (24 h + 3 h)** después de la anterior, durante **3 días**.
- **WhatsApp en paralelo:** plantilla **cada 24 h** durante esos mismos 3 días, combinando llamada + WhatsApp.
- Al expirar los 3 días sin respuesta del lead → `End attempt` → resultado al CRM + dashboard.

**3) Conteo de los 3 días — naturales con salto por festivo:**

- Los 3 días son **naturales** (no laborables).
- **Si un intento cae en día festivo, se salta al siguiente día lectivo**. La cadencia no consume el día festivo.
- Fines de semana: WhatsApp sí, llamadas no — se reprograma al siguiente día hábil.

**4) Festivos — referencia "país del lead":**

- Calendario de **festivos nacionales/autonómicos del país del lead**, no del centro.
- Razón: respeto al receptor + cumplimiento normativa local.

**5) Interrupción de la cadencia si el lead responde:**

- Si el lead responde en día 2 o día 3, la cadencia se **interrumpe inmediatamente** y arranca `Qualify lead`.

**6) Agendamiento de cita tras cualificación positiva — conversión horaria:**

- La cita se materializa en **horario español** (horario del centro de formación).
- El agente realiza la **conversión horaria país-lead → hora España** antes de proponer slots.

**7) Recordatorios automáticos de cita agendada (agente de seguimiento):**

- **24 h** antes · **4 h** antes · **1 h** antes.
- Cada recordatorio con **opción de cancelar o reagendar**.

**Implicación técnica:**

1. Fix bug worker (`worker.js:58`) — obligatorio antes de cualquier trabajo de cadencia.
2. Timezone-aware scheduling: detección automática del huso por país/teléfono (E.164).
3. Servicio de calendarios festivos: **Nager.Date** o **Calendarific** + cache en `holidays_per_country`.
4. Constantes **configurables desde panel admin** (no hardcoded): `retry_offset_hours = 27`, `max_days = 3`, etc.
5. State machine con interrupción inmediata ante respuesta entrante.
6. Cron job recordatorios 24h/4h/1h con deep-link reagendar/cancelar.

**Cumplimiento normativo bonus:** la restricción 09-21h + festivos del país lead encaja con la **normativa española y europea de telemarketing** (LOPD/GDPR).

---

### P-014 — Sincronización con CRM externo: ¿añadir o sobrescribir? ✅ Respondida

**Pregunta original:** Opción A (añadir como campos adicionales) / Opción B (sobrescribir) / Opción C (depende del campo).

**Respuesta del Auditor Javier HP:**

**Regla por defecto: SIEMPRE AÑADIR (Opción A).**

Cualquier sobrescritura debe estar:

1. **Protocolarizada** — definida por escrito qué campo concreto admite sobrescritura y bajo qué condiciones.
2. **Autorizada** — cada campo del CRM tiene política explícita (`append_only` / `overwrite_allowed` / `overwrite_with_audit`).
3. **Comunicada al cliente** (centro de formación) — la lista de campos sobrescribibles forma parte del onboarding y queda visible en el panel admin.

Este criterio coincide con la documentación oficial de la clienta: *"Los datos nuevos del agente de IA se agregan al CRM, no se sobrescriben"* (resumen Fathom 18-may).

**Implicación técnica:**

1. Tabla `crm_field_mapping` + columna `write_policy` ∈ {`append_only`, `overwrite`, `overwrite_with_audit`}.
2. Capa `crm-writer`: validar política antes de cada `UPDATE`.
3. Tabla `crm_write_audit` para `overwrite_with_audit` (valor anterior, fuente, timestamp, agente).
4. Panel admin "Política de escritura CRM" para autorizar explícitamente por campo.
5. Tests de integración: validar que `append_only` NUNCA sobrescribe.

---

### P-015 — Estados "informado" y "matriculado": ¿auto o manual? ⏳ Pendiente

**Pregunta original:** ¿Los rellena un asesor humano desde el panel, o el sistema los detecta automáticamente (por ejemplo "matriculado" al confirmarse pago)?

**Respuesta del Auditor Javier HP:** Pendiente — saltada en rondas previas. Cruza con P-007 (estado "prematriculado" ya confirmado como válido + disparador). Se cumplimentará junto con Bloque 5.

---

### P-016 — Ultravox: ¿analizamos la transcripción al final? ✅ Respondida

**Pregunta original:** Retell analiza transcripción al colgar y actualiza el estado del lead. Ultravox no lo hace. ¿Replicar comportamiento de Retell o tiene propósito diferente?

**Respuesta del Auditor Javier HP:** **Sí, quiero tener la posibilidad de analizar las transcripciones de Ultravox** al finalizar la llamada, equivalente al comportamiento que hoy ya tiene Retell.

**Implicación técnica:**

1. Webhook `onCallEnded` para Ultravox (hoy inexistente).
2. Reutilizar pipeline de post-procesado de Retell.
3. Abstracción: interfaz común `VoiceProvider` con `fetchTranscript(callId)` + `analyzeTranscript(transcript)`, implementada por ambos proveedores.
4. Flag `tenant.voice_provider` para que cada centro elija proveedor (Retell, Ultravox, A/B).
5. Tests de integración + métricas comparativas (calidad cualificación, coste, latencia, WER).

---

## 🟢 Bloque 5 — Agente Virginia (IA) — Pendientes

### P-017 — Typo `book_appointmen` (sin 't' final) en doc fuente Virginia ⏳ Pendiente

### P-018 — ¿El prompt actual (945 líneas) es definitivo o se acorta? ⏳ Pendiente

### P-019 — ¿Pruebas controladas con 20-50 leads reales antes de escalar? ⏳ Pendiente

---

## 🟣 Bloque 6 + ⚙️ Bloque 7 — Integraciones e infraestructura

Las preguntas **P-020 a P-025** fueron **respondidas en sesión previa**. Sus respuestas se mantienen en el registro de decisiones formal:

| ID | Pregunta corta | Decisión | Ref. |
|---|---|---|---|
| P-020 | ¿Qué CRM externo es el destino? | Multi-CRM top 5 · **MVP Fase 2 = HubSpot + Zoho** (Sheets bidireccional aplazado a Fase 4 post-release) | [R-020](DECISIONES-AUDITOR-JAVIER-HP.md#r-020) + [v2](DECISIONES-AUDITOR-JAVIER-HP.md#r-020-refinement-v2) |
| P-021 | Datos antiguos en Airtable | Migrar a Supabase | [R-021](DECISIONES-AUDITOR-JAVIER-HP.md#r-021) |
| P-022 | Mantenedor del Knowledge Base | Equipo dev (con UI admin) | [R-022](DECISIONES-AUDITOR-JAVIER-HP.md#r-022) |
| P-023 | Acceso superuser BD Postgres | Supabase self-hosted en Easypanel | [R-023](DECISIONES-AUDITOR-JAVIER-HP.md#r-023) |
| P-024 | ¿Mismo equipo de desarrollo? | Sí, con 3 condiciones de método | [R-024](DECISIONES-AUDITOR-JAVIER-HP.md#r-024) |
| P-025 | ¿Pausa de ventas 6-8 semanas? | Pausa completa | [R-025](DECISIONES-AUDITOR-JAVIER-HP.md#r-025) |

---

## 📋 Estado actual del documento

| Bloque | Preguntas | Respondidas | Pendientes |
|---|---|---|---|
| 🔴 1 — Urgentes | P-001 a P-003 | 3 / 3 | 0 |
| 🟠 2 — Reglas de negocio | P-004 a P-007 | 4 / 4 | 0 |
| 🟡 3 — Nomenclatura | P-008 a P-012 | 5 / 5 | 0 |
| 🔵 4 — Seguimiento operativo | P-013 a P-016 | 3 / 4 | 1 (P-015) |
| 🟢 5 — Agente Virginia | P-017 a P-019 | 0 / 3 | 3 |
| 🟣 6 + ⚙️ 7 — Integraciones e infra | P-020 a P-025 | 6 / 6 | 0 |
| **TOTAL** | **25** | **21 / 25** | **4** |

---

## Firma y trazabilidad

**Auditor:** Javier HP (admin@2you.ai)
**Fecha respuestas Bloques 1–3:** 2026-05-19
**Fecha respuestas Bloque 4 (P-013, P-014, P-016):** 2026-05-19
**Fecha respuestas Bloques 6–7 (sesión previa):** 2026-05-19
**Pendiente:** P-015 + Bloque 5 (P-017 a P-019) — siguiente ronda.

**Documentos relacionados:**

- [PREGUNTAS-PARA-LA-CLIENTE.md](PREGUNTAS-PARA-LA-CLIENTE.md) — fuente original de las 25 preguntas.
- [DECISIONES-AUDITOR-JAVIER-HP.md](DECISIONES-AUDITOR-JAVIER-HP.md) — registro formal de decisiones (análisis extendido).
- [STACK-TECNOLOGICO.md](STACK-TECNOLOGICO.md) — stack actual vs objetivo.
- [deep/EXECUTIVE-SUMMARY-FOR-CLIENT.md](deep/EXECUTIVE-SUMMARY-FOR-CLIENT.md) — resumen ejecutivo de la auditoría.

**Status:** LIVING_DOCUMENT — se actualiza conforme el auditor confirme respuestas restantes.
**Última actualización:** 2026-05-19.
