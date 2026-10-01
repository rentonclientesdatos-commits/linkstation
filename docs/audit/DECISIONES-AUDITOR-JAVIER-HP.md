---
title: "Registro de decisiones — Auditor Javier HP"
date: 2026-05-19
audience: cliente y equipo
type: decision-log
status: LIVING_DOCUMENT
auditor: Javier HP
sources:
  - audit/PREGUNTAS-PARA-LA-CLIENTE.md
relates_to:
  - audit/COMPARATIVA-INFORME-PROGRAMADOR-V3.5.md
  - audit/STACK-DECISION-DRIZZLE-MIGRATION.md
  - roadmap/deep-improvement-backlog.md
---

# Registro de decisiones — Auditor Javier HP

## Propósito de este documento

Este documento es el **registro oficial** de las decisiones tomadas en respuesta a las 25 preguntas pendientes del audit. Cada decisión está firmada por su autor (Javier HP en su rol de Auditor, o el cliente final cuando corresponda), fechada, y acompañada de las **implicaciones derivadas** que tiene sobre el plan de remediación.

Sirve como **audit trail**: si en el futuro alguien pregunta "¿quién decidió X y por qué?", aquí está la respuesta.

> 📋 Las preguntas originales (qué se preguntó, por qué importa) están en [`PREGUNTAS-PARA-LA-CLIENTE.md`](PREGUNTAS-PARA-LA-CLIENTE.md). Este documento solo recoge **las respuestas y sus consecuencias**.

---

## Resumen del estado

**6 decisiones originales + 7 derivadas tomadas · 19 originales pendientes**

| Bloque temático | Total | Respondidas | Pendientes | Bloquea Sprint |
|---|---|---|---|---|
| 🔴 Urgentes (P-001 a P-003) | 3 | 0 | 3 | Sprint 0 |
| 🟠 Reglas de negocio (P-004 a P-007) | 4 | 0 | 4 | Sprint 0 |
| 🟡 Nomenclatura (P-008 a P-012) | 5 | 0 | 5 | Sprint 0-3 |
| 🔵 Operativa de seguimiento (P-013 a P-016) | 4 | 0 | 4 | Sprint 0-3 |
| 🟢 Agente Virginia IA (P-017 a P-019) | 3 | 0 | 3 | Sprint 1-3 |
| 🟣 **Integraciones (P-020 a P-022)** | 3 | **3** ✅ | 0 | — |
| ⚙️ **Infraestructura y equipo (P-023 a P-025)** | 3 | **3** ✅ | 0 | — |
| 🧩 **Derivadas (P-020.a a P-023.c)** | 7 | **7** ✅ | 0 | — |
| **TOTAL** | **32** | **13** | **19** | — |

**Decisiones cerradas en esta sesión (2026-05-19):**

- ✅ R-020 (top 5 CRMs validado con research Opus: HubSpot, Zoho, Salesforce, GoHighLevel, ActiveCampaign — Pipedrive a tier 2)
- ✅ R-021 (migrar Airtable → Supabase)
- ✅ R-022 (equipo dev administra KB + modelo asesoría)
- ✅ R-023 (Easypanel — corrige Coolify; control total self-hosted)
- ✅ R-024 (mismo equipo con 3 condiciones de método)
- ✅ R-025 (pausa completa de ventas 6-8 semanas)
- ✅ R-021.a (parcial: "más de una base, número exacto desconocido")
- ✅ R-022.a (estimación con R-020 y R-022 cerrados)
- ✅ R-022.b (modelo asesoría con auto-administración parcial cliente)
- ✅ R-023.a (Auditor administra, control total)
- ✅ R-023.b (backups multi-nivel + 2 modalidades de cliente)
- ✅ R-023.c (Kong 2.8.1 EOL detectado — toda la pila Supabase con 2-3 años de retraso, plan de actualización requerido)
- ✅ **P-020.b** (sesión 3): MVP Fase 2 = **HubSpot + Zoho** (Google Sheets bidireccional aplazado a post-release)

**Pendientes derivadas:**

- ✅ **P-020.a** (confirmación final del top 5): **cerrada implícitamente** por R-020-refinement — el Auditor valida el research pero refina el alcance a 2 CRMs MVP.
- ✅ **P-020.b** (cerrada 2026-05-19, sesión 3): Los 2 CRMs de la primera release son **HubSpot + Zoho**. **Google Sheets bidireccional queda aplazado a post-release** (ver [R-020-refinement-v2](#r-020-refinement-v2)).

**🆕 Refinamiento del alcance (sesión 3, 2026-05-19) — vigente:**

- El MVP de integraciones queda en **2 CRMs (HubSpot + Zoho)**. El conector de Google Sheets bidireccional —que se había propuesto en sesión 2— **se aplaza a post-release**.
- Plan rearmado en 5 fases (0: Sprint 0 hotfix · 1: Capa de datos sin ORM · 2: Adapter+2CRMs · 3: Hardening · 4: Resto del top 5 + Sheets bidireccional).
- Ver [R-020-refinement-v2](#r-020-refinement-v2) para detalle completo. La sesión 2 (que incluía Sheets en MVP) queda en [R-020-refinement](#r-020-refinement) como histórico.

---

## ✅ Decisiones tomadas (9)

### <a id="r-013"></a>R-013 — P-013 — Protocolo multi-día (regla 24h+3h durante 3 días) + franja horaria + timezone

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Cuántos contactos al lead, en qué orden, con qué intervalos? ¿Cómo se gestionan franja horaria, timezone, festivos, interrupción por respuesta y conversión horaria para citas? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta literal** | *"Añadir que en el caso de llamadas se aplica la regla 24h+3h para la rellamada... 1-del país del lead, 2-naturales y si caen en festivo salta al siguiente lectivo, 3-Si correcto [el lead que responde en día 2-3 interrumpe la cadencia]"* |
| **Fuentes documentales validadas** | `docs/Docs-entrega-clienta/Fujos de Trabajo/reunion-inicial-flujo.pdf` (Fathom 18-may, 132 min) · `Flujo-agent-ia-voz-whatsapp.png` (diagrama oficial) · `Agente voz y whatsapp que cualifica.pdf` |
| **Estado** | ✅ **RESPONDIDA** y validada contra fuentes documentales |

#### Lo que significa

El protocolo multi-día está hoy **roto en producción** por el bug F-02-001 del worker — solo se ejecuta el contacto del día 1. La presente decisión documenta el comportamiento esperado (que coincide con la spec original de la clienta) para que el equipo lo implemente en Sprint 0.

#### 1) Cadencia — regla 24h+3h (= 27h) durante 3 días

- **Llamadas:** cada nueva llamada se realiza **27 horas (24 h + 3 h)** después de la anterior, durante **3 días**. Coincide exactamente con el diagrama oficial (*"AGENTE LLAMADA LLAMA DE NUEVO AGREGANDO 27 HORAS ENTRE LLAMADAS DURANTE 3 DÍAS"*).
- **WhatsApp paralelo:** plantilla **cada 24 horas** durante esos mismos 3 días, combinando llamada + WhatsApp.
- **Fin:** al expirar los 3 días sin respuesta → `End attempt` → resultado al CRM + dashboard.

#### 2) Bifurcación por franja horaria (hora local del lead)

- **L–V de 09:00 a 21:00 hora lead** → llamada outbound (Rama A del diagrama).
- **L–V de 21:00 a 09:00 + fines de semana completos hora lead** → WhatsApp plantilla → espera 30 min → si no responde, segundo WhatsApp sin plantilla (Rama B).
- La franja se aplica con la **zona horaria del lead**, no la del centro de formación.

#### 3) Conteo de los 3 días — naturales con salto por festivo (decisión del Auditor)

- Los 3 días son **naturales** (no laborables).
- **Si un intento cae en día festivo del país del lead, se salta al siguiente día lectivo**. La cadencia no consume el día festivo.
- Calendario aplicable: festivos **nacionales y autonómicos del país del lead** (no del centro).
- Fines de semana: WhatsApp sí, llamadas no — se reprograma al siguiente día hábil dentro de 09-21 h.

#### 4) Interrupción de la cadencia (decisión del Auditor)

Si el lead responde en día 2 o día 3 (a llamada o a WhatsApp), la cadencia se **interrumpe inmediatamente** y arranca el flujo `Qualify lead`. No se hacen más reintentos automáticos.

#### 5) Agendamiento de cita — conversión horaria

- La cita se materializa en **horario español** (horario del centro de formación).
- El agente realiza la **conversión horaria país-lead → hora España** antes de proponer slots.

#### 6) Recordatorios automáticos de cita agendada

- **24 h** antes · **4 h** antes · **1 h** antes.
- Cada recordatorio incluye **opción de cancelar o reagendar**.

#### Implicación técnica (Sprint 0, post-fix de F-02-001)

1. Corregir firma del worker (`worker.js:58`) — obligatorio antes de cualquier otro trabajo de cadencia.
2. Implementar **timezone-aware scheduling**: detección automática del huso por país/teléfono (E.164 + tabla `country_timezones`).
3. Servicio de calendarios festivos: [Nager.Date](https://date.nager.at/) (gratis, todos los países) o [Calendarific](https://calendarific.com/) (premium, autonómicos). Cache local en `holidays_per_country`.
4. Constantes **configurables desde panel admin** (no hardcoded): `retry_offset_hours = 27`, `max_days = 3`, `whatsapp_template_interval_hours = 24`, `call_window_local = "09:00-21:00"`, `weekend_calls_allowed = false`.
5. State machine del lead: estado `en_cadencia` con interrupción inmediata ante cualquier respuesta entrante.
6. Recordatorios de cita: cron job a 24h, 4h, 1h con plantillas configurables y deep-link a reagendar/cancelar.

#### Cumplimiento normativo bonus

La restricción 09-21h + exclusión de festivos del país del lead encaja con la **normativa española y europea de telemarketing** (LOPD/GDPR, Ley General de Telecomunicaciones). Reduce riesgo legal y volumen previsible de reclamaciones.

#### Validación con cliente requerida

1. Confirmar que "país del lead" (no "país del centro") es la referencia correcta para festivos.
2. Confirmar que la franja 09:00–21:00 es la oficial del proyecto.
3. Confirmar que los 3 días de cadencia son el máximo definitivo.

---

### <a id="r-014"></a>R-014 — P-014 — Sincronización con CRM: siempre añadir (sobrescritura protocolarizada)

| Campo | Valor |
|---|---|
| **Pregunta** | Si un lead ya existe en el CRM con ciertos datos, y nuestro sistema tiene datos nuevos: ¿añadir como campos adicionales (A) / sobrescribir (B) / depender del campo (C)? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta literal** | *"Siempre será añadir, y si se sobreescribe algo ha de estar protocolarizado y autorizado (dependiendo de qué datos) y comunicado al cliente (Centro de formación)"* |
| **Estado** | ✅ **RESPONDIDA** |

#### Lo que significa

La regla por defecto es **append-only**: los datos generados por el agente de IA se añaden al CRM, nunca sobrescriben datos previos. Esta decisión:

1. Coincide con la documentación oficial de la clienta: *"Los datos nuevos del agente de IA se agregan al CRM, no se sobrescriben"* (resumen Fathom 18-may, sección "Conflictos de datos").
2. Protege la información histórica del CRM del centro de formación.
3. Permite trazar el origen de cada dato (humano vs. IA).

Cualquier excepción a la regla append-only debe cumplir **tres condiciones simultáneas**:

1. **Protocolarizada** — definida por escrito qué campo concreto admite sobrescritura y bajo qué condiciones.
2. **Autorizada** — cada campo del CRM tiene política explícita: `append_only` / `overwrite` / `overwrite_with_audit`.
3. **Comunicada al cliente** (el centro de formación) — la lista de campos sobrescribibles forma parte del onboarding del tenant y es visible/editable en el panel admin.

#### Implicación técnica

1. Extender la tabla `crm_field_mapping` (router de variables de R-008/9/10/11) con columna `write_policy` ∈ {`append_only`, `overwrite`, `overwrite_with_audit`}. Default = `append_only`.
2. Capa `crm-writer`: antes de cada `UPDATE`, comprobar `write_policy`:
   - `append_only` + campo ya tiene valor → crear campo adicional (`profession_ia`, `profession_ia_2`…).
   - `overwrite` → escribe directamente (campos sin valor histórico relevante).
   - `overwrite_with_audit` → escribe + registra en `crm_write_audit` (valor anterior, valor nuevo, fuente, timestamp, agente).
3. Panel admin: vista **"Política de escritura CRM"** donde el administrador autoriza explícitamente la política de cada campo.
4. Onboarding: durante la configuración inicial del tenant, presentar al cliente la matriz de políticas por defecto y pedir confirmación firmada.
5. Tests de integración: validar que `append_only` NUNCA sobrescribe + que `crm_write_audit` se rellena correctamente.

#### Validación con cliente requerida

1. Confirmar que la política por defecto (`append_only`) es aceptable para los CRMs del MVP (HubSpot, Zoho).
2. Definir la **matriz inicial de excepciones**: qué campos arrancan con política distinta a `append_only` (p. ej. `last_call_timestamp`, `last_whatsapp_timestamp`, `last_lead_status`).
3. Acordar el formato del registro de auditoría (¿se expone al cliente desde panel?, ¿se exporta a su BI?).

---

### <a id="r-016"></a>R-016 — P-016 — Ultravox: análisis de transcripción al finalizar llamada

| Campo | Valor |
|---|---|
| **Pregunta** | Retell ya analiza la transcripción al colgar y actualiza el estado del lead. Ultravox no lo hace — la llamada se "olvida" al colgar. ¿Replicar comportamiento de Retell o tiene propósito diferente? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta literal** | *"SI quiero tener la posibilidad de analizar las transcripciones"* |
| **Estado** | ✅ **RESPONDIDA** |

#### Lo que significa

Ultravox debe equiparar funcionalmente a Retell en cuanto a análisis post-llamada. La pipeline de cualificación/actualización de estado del lead debe ser **proveedor-agnóstica**: una llamada exitosa con Ultravox debe producir exactamente los mismos efectos (estado del lead actualizado, transcripción almacenada, sync al CRM) que una llamada con Retell.

#### Implicación técnica

1. Implementar webhook `onCallEnded` para Ultravox (hoy inexistente) que recupere la transcripción al colgar.
2. Reutilizar la pipeline de post-procesado que ya existe para Retell: extracción de campos (`qualified`, `nivel_estudios`, `years_experience`…), update del estado del lead, escritura al CRM (con respeto a las políticas `write_policy` de R-014).
3. Abstracción: crear interfaz común `VoiceProvider` con métodos `fetchTranscript(callId)` + `analyzeTranscript(transcript)` + `handleCallEnded(payload)`. Implementada por `RetellProvider` y `UltravoxProvider`. Evita lógica duplicada y facilita añadir más proveedores en el futuro (ElevenLabs, Vapi, etc.).
4. **Flag de configuración por tenant:** cada centro de formación elige proveedor de voz (Retell, Ultravox, o A/B testing entre ambos). Variable `tenant.voice_provider` en la tabla `tenants`.
5. Tests de integración: simular fin de llamada Ultravox → verificar que se persiste transcripción + se actualiza estado del lead + se sincroniza al CRM igual que Retell.
6. Métricas comparativas: dashboard interno con tasa de cualificación correcta, coste por minuto, tasa de error de transcripción (WER), latencia media — por proveedor.

#### Beneficio estratégico

Equiparar Ultravox a Retell habilita **elección informada de proveedor principal** a futuro. Hoy no se puede comparar porque Ultravox solo está implementado a medias. Tras esta implementación, podremos elegir el mejor proveedor según métricas reales.

#### Validación con cliente requerida

1. Confirmar que el cliente acepta que su pool de llamadas pase eventualmente a Ultravox si las métricas lo justifican.
2. Confirmar política de retención de transcripciones (cuánto tiempo se almacenan, se exponen al cliente desde panel, purga tras X meses por GDPR).

---

### <a id="r-020"></a>R-020 — P-020 — CRM multi-tenant (5 conectores)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Cuál es el CRM destino al que el sistema debe sincronizar los leads? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta literal** | *"Sí, cada cliente tendrá uno, deberíamos estar preparados para los 5 CRMs más comunes de uso."* |
| **Refinamiento del Auditor (2026-05-19)** | *"Yo quitaría Pipedrive y añadiría GHL (GoHighLevel) pero quiero cerciorarme viendo tu estudio y entonces tomar una decisión definitiva."* |
| **Estado del análisis** | ✅ **Research completado** (Opus, 2026-05-19). Top 5 final validado. Ver [`RESEARCH-CRM-SECTOR-FORMACION-ES-LATAM.md`](RESEARCH-CRM-SECTOR-FORMACION-ES-LATAM.md). |
| **🆕 Refinamiento del alcance (2026-05-19, sesión 2)** | El Auditor decide **reducir el MVP de 5 conectores a 2 CRMs + Google Sheets** para acelerar entrega. Ver [R-020-refinement](#r-020-refinement) abajo. **SUPERSEDED por sesión 3**. |
| **🆕 Refinamiento del alcance (2026-05-19, sesión 3) — VIGENTE** | El Auditor confirma los 2 CRMs concretos (**HubSpot + Zoho**) y **aplaza Google Sheets bidireccional a post-release** para acortar aún más el time-to-market del MVP. Ver [R-020-refinement-v2](#r-020-refinement-v2) abajo. |

#### Lo que significa

El sistema **no se conectará a un único CRM**. Cada cliente final del SaaS (cada tenant) elegirá el suyo. Por tanto, hay que diseñar una **capa de adaptadores** que permita conectar a varios CRMs distintos, no un acoplamiento directo a Zoho como se asumía en el plan inicial.

#### Investigación independiente (2026-05-19, Opus)

El research realizado por el agente Opus ([`RESEARCH-CRM-SECTOR-FORMACION-ES-LATAM.md`](RESEARCH-CRM-SECTOR-FORMACION-ES-LATAM.md)) **valida las dos decisiones del Auditor**:

- ✅ **Quitar Pipedrive de tier 1**: fit pobre con flujo lead → nurturing → matrícula propio de formación. Su nicho real es ventas B2B mid-market con pipeline visual, no academias. Pasa a tier 2 por cobertura genérica.
- ✅ **Añadir GoHighLevel (GHL)**: crecimiento real en Latam (~10k usuarios 2025, lidera México/Colombia/Brasil), API v2 con OAuth2, casos documentados en educación online. Avisos: documentación de calidad media, sigue arrastrando el estigma de "tool de agencia".

#### Decisión final — Top 5 definitivo (Sprint 1)

| Prioridad | CRM | Auth | Justificación principal |
|---|---|---|---|
| **1** | **HubSpot** | OAuth2 | Líder global confirmado. Casos verticales formación bien documentados. API muy madura. Free tier permite muchas academias pequeñas. |
| **2** | **Zoho CRM** | OAuth2 / API Key | Vertical Education propio con casos reales (Conpas, etc.). Penetración alta en España y Latam por pricing accesible. |
| **3** | **Salesforce** | OAuth2 | #1 mundial CRM 2025 según IDC. Imprescindible para clientes enterprise (escuelas de negocio, universidades). API más compleja, asumir el coste. |
| **4** | **GoHighLevel (GHL)** | OAuth2 (API v2) | Crecimiento real Latam EduTech 2024-2025. Marketing-first se alinea con el flujo lead/nurturing de academias. |
| **5** | **ActiveCampaign** | API Key | Sector education-specific. Marketing automation + CRM con bias academias online. Buen ajuste con el flujo Virginia. |

**Tier 2 (bajo demanda — implementar si cliente concreto lo pide):**
- **Clientify** — CRM español, fuerte en pymes formación ES.
- **Bitrix24** — popular en Latam por free tier generoso.
- **Pipedrive** — cobertura genérica B2B.
- **Monday CRM** — si lo piden explícitamente.
- **Holded** — gestión integral con CRM, popular en España como ERP/CRM combinado.

#### Implicaciones derivadas (cambio de alcance)

1. **Sprint 1 se amplía con un sub-sprint dedicado a la capa Multi-CRM.** Estimación adicional: **+2-3 semanas** sobre el plan original.

2. **Plan de implementación por fases** (sugerido por el research):

   | Fase | Conectores | Semanas | Cubre qué tipo de cliente |
   |---|---|---|---|
   | **Fase A — MVP** | HubSpot + Zoho | 2-3 sem | Academias pequeñas/medianas ES + Latam (~60-70% del mercado objetivo) |
   | **Fase B — Enterprise + crecimiento** | Salesforce + GoHighLevel | 2-3 sem | Escuelas de negocio + marketing-first agencies/Latam |
   | **Fase C — Marketing-first** | ActiveCampaign | 1-2 sem | Academias online con foco automatización email |
   | **Tier 2 — On demand** | Clientify / Bitrix24 / Pipedrive / Monday / Holded | 1 sem cada | Pago bajo demanda del cliente, no en plan base |

---

#### <a id="r-020-refinement"></a>🆕 R-020 — Refinamiento del alcance (sesión 2, 2026-05-19) — ⚠️ SUPERSEDED

> ⚠️ **Esta sección queda como histórico**. La decisión vigente está en [R-020-refinement-v2](#r-020-refinement-v2) (sesión 3): se mantienen los 2 CRMs (HubSpot + Zoho) pero **Google Sheets bidireccional se aplaza a post-release**. Todo lo que esta sección dice sobre Sheets dentro del MVP queda anulado.

> *"Nos vamos a centrar ahora en conectar con 2 CRM y unas plantillas de Google Sheets para coger, actualizar y volcar la información de los leads."*
> — Auditor Javier HP (sesión 2)

#### Decisión (sesión 2 — histórica)

El Auditor reduce el alcance del MVP de **5 conectores → 2 conectores + Google Sheets**. Esto **no descarta los otros 3 conectores del top 5**; los aplaza a fases B/C cuando los 2 primeros estén estables en producción.

#### Por qué tiene sentido reducir alcance

1. **Acelera time-to-market**: 2 conectores + Sheets son ~3-4 semanas en lugar de 6-7 semanas para los 5.
2. **Reduce riesgo de regresiones**: cada CRM nuevo añade superficie de bug; ir despacio permite QA real.
3. **Permite validar el patrón Adapter** antes de replicarlo masivamente: si el diseño del adapter es malo, lo descubrimos con 2 implementaciones y no con 5.
4. **Google Sheets cubre casos donde el cliente no tiene CRM dedicado** — segmento común en formación de tamaño pequeño/medio. Sustituye o complementa el CRM.

#### Qué 2 CRMs concretos

✅ **CERRADO (2026-05-19, sesión 3)** — Los 2 CRMs de la primera release son:

| # | CRM | Auth | Razón principal |
| --- | --- | --- | --- |
| **1** | **HubSpot** | OAuth2 | Líder global del top 5, API más madura, máxima cobertura ES+Latam en academias online y escuelas de negocio. Free tier amplio → menor fricción para clientes pequeños. |
| **2** | **Zoho CRM** | OAuth2 / API Key | Vertical Education propio con casos reales (Conpas, BiMind). Fuerte penetración Latam por pricing accesible. Complemento natural de HubSpot para cubrir pyme formativa. |

Adicionalmente, **Google Sheets bidireccional** se incluye en la **misma Fase 2** como tercer conector del MVP (no es un CRM, pero cumple el rol de plantilla operativa para coger/actualizar/volcar leads en clientes que no usan CRM aún o que viven en Sheets).

> Combinación final MVP Fase 2: **HubSpot + Zoho + Google Sheets**.
> Salesforce, GoHighLevel y ActiveCampaign quedan en Fase 4 (post-MVP) reutilizando el adapter pattern construido en Fase 2.

**Justificación del Auditor**: HubSpot y Zoho son los dos CRMs con mayor solapamiento real con el target (academias formativas ES + Latam) según el [research Opus](RESEARCH-CRM-SECTOR-FORMACION-ES-LATAM.md). Empezar con ellos maximiza la cobertura de cuenta-cliente con el menor coste de implementación (ambos OAuth2 estándar, ambos con vertical educación documentada). Google Sheets añade un fallback operativo barato para tenants sin CRM.

#### Google Sheets como integración bidireccional ⭐ NUEVA INTEGRACIÓN

> *"Plantillas de Google Sheets para coger, actualizar y volcar la información de los leads."*

**Decisión del Auditor: Sheets actúa como integración bidireccional completa.**

| Operación | Descripción | Frecuencia |
|---|---|---|
| **Coger (read)** | El sistema lee leads nuevos desde una hoja del cliente. La hoja es el origen de captación (formularios, importaciones, captura manual). | Polling cada X minutos o trigger por App Script |
| **Actualizar (write)** | Cada cambio de estado del lead (cualificado, agendado, descartado, etc.) se refleja en la hoja en tiempo real. La hoja es vista viva. | En cada transición de estado |
| **Volcar (write final)** | Resultados finales (lead matriculado, descarte definitivo, motivo, etc.) se persisten en la hoja. La hoja sirve como histórico para el equipo comercial del cliente. | Al cerrar la conversación |

#### Implicaciones técnicas

1. **Nueva integración a diseñar** — al mismo nivel que los conectores CRM. Necesita:
   - Plantilla de Sheets estandarizada (definir columnas obligatorias: `id_lead`, `nombre`, `telefono`, `qualified`, `estado`, `fecha_agenda`, `motivo_descarte`, ...).
   - Autenticación: **OAuth2 con Google** (el cliente da permisos a su Google Drive/Sheets) o **Service Account** (cuenta del Auditor lee la hoja compartida con permisos).
   - Polling / Watch: el cambio detection en Sheets se hace via Google Drive API push notifications o polling cada X minutos.
   - Rate limits: Sheets API tiene 60 read/minute por usuario, 100/100s por proyecto. Atención si hay muchos clientes.

2. **Arquitectura propuesta:**

   ```
   src/lib/integrations/
   ├── crm/                          ← capa CRM (los 2 elegidos)
   │   ├── adapter.interface.ts
   │   ├── factory.ts
   │   └── adapters/
   │       ├── crm-a.adapter.ts
   │       └── crm-b.adapter.ts
   └── google-sheets/                ← NUEVA integración paralela
       ├── sheets.adapter.ts         ← lectura/escritura
       ├── sheets-watcher.ts          ← detección de cambios
       ├── templates/                 ← plantillas oficiales
       │   ├── leads-template.json
       │   └── README.md             ← cómo el cliente clona la plantilla
       └── auth/                      ← OAuth2 + Service Account
           └── google-oauth.ts
   ```

3. **Modelo de datos en BD** — añadir a la tabla `tenants`:
   - `sheets_integration_enabled` boolean
   - `sheets_template_id` text (ID de la plantilla Google del cliente)
   - `sheets_oauth_credentials` JSONB cifrado (refresh tokens)
   - `sheets_sync_interval_seconds` int (default 60)
   - `sheets_field_mapping` JSONB (cómo cada columna del cliente se mapea al schema interno — porque NO todos los clientes usarán exactamente la plantilla por defecto)

4. **Estimación del módulo Google Sheets:**
   - Diseño plantilla + documentación: **1-2 días**.
   - OAuth2 flow + storage credentials: **2-3 días**.
   - Adapter lectura/escritura + tests: **3-4 días**.
   - Watcher / polling + rate limit handling: **2-3 días**.
   - UI admin para conectar Sheets desde panel del cliente: **2-3 días**.
   - **Total: 10-15 días/dev** (2-3 semanas).

5. **MVP actualizado por fases (substituye al anterior plan multi-CRM)**

   | Fase | Contenido | Semanas |
   |---|---|---|
   | **Fase 0 — Sprint 0** | Hotfixes de seguridad (sin cambios) | 1-2 sem |
   | **Fase 1 — Capa de datos** | Consolidación `@supabase/ssr` + Zod + Repository pattern + RLS hardening (SIN ORM nuevo — propuesta Drizzle anulada el 20-05-2026) | 3-4 sem |
   | **Fase 2 — Adapter layer + 2 CRMs + Sheets** | Patrón Adapter + 2 CRMs concretos + integración Sheets bidireccional | 4-5 sem |
   | **Fase 3 — Hardening (opcional)** | Tests E2E, observabilidad, dashboards de costes | 2-3 sem |
   | **Fase 4 — Tier 1 completo (futuro)** | Resto del top 5 (los 3 que faltan) bajo demanda | 4-6 sem |

#### Severidad de la implicación

🟡 **MEDIA** — refinamiento alineado con buenas prácticas (entregar menos pero estable antes que mucho y frágil). El cambio NO rompe el plan; lo reorganiza por fases.

#### Pregunta abierta nueva derivada

##### <a id="p-020b-nueva"></a>P-020.b — ¿Qué 2 CRMs concretos del top 5 vamos a implementar en la Fase 2? ✅ CERRADA

| Campo | Valor |
|---|---|
| **Pregunta** | El Auditor indicó "otra combinación" distinta a HubSpot+Zoho / HubSpot+GHL / Zoho+GHL. ¿Qué 2 CRMs concretos? |
| **Estado** | ✅ **CERRADA (2026-05-19, sesión 3)** |
| **Respuesta** | **HubSpot + Zoho**. Adicionalmente, el Auditor decide aplazar Google Sheets bidireccional a post-release (Fase 4). Ver [R-020-refinement-v2](#r-020-refinement-v2). |
| **Combinación final MVP Fase 2** | HubSpot + Zoho (sin Sheets) |

3. **Arquitectura técnica propuesta:**

   ```
   src/lib/integrations/crm/
   ├── adapter.interface.ts     ← contrato común (CRMAdapter)
   ├── factory.ts                ← devuelve adapter por tenant.crm_type
   ├── adapters/
   │   ├── hubspot.adapter.ts
   │   ├── zoho.adapter.ts
   │   ├── salesforce.adapter.ts
   │   ├── pipedrive.adapter.ts
   │   └── monday.adapter.ts
   ├── mappers/
   │   ├── lead-mapper.ts        ← mapeo de campos genérico → específico de cada CRM
   │   └── ...
   └── webhooks/
       ├── hubspot-webhook.ts
       └── ...
   ```

4. **Modelo de datos en BD** — añadir a la tabla `tenants`:
   - `crm_type` enum: `'hubspot' | 'zoho' | 'salesforce' | 'pipedrive' | 'monday'`
   - `crm_credentials` JSONB (cifrado, no plain) — cada CRM tiene estructura distinta
   - `crm_field_mapping` JSONB — mapeo de campos personalizable por tenant

5. **Trabajo previo necesario:**
   - Crear cuentas de prueba en cada CRM para desarrollo.
   - Documentar diferencias semánticas (ej. lead vs contact vs deal en Salesforce).
   - Definir estrategia de rate limiting unificada (cada API tiene sus límites).
   - Decidir sync: ¿push (we send to CRM) o pull (CRM consulta nuestra API)?

6. **Decisión arquitectónica importante:** la mayoría de CRMs modernos soportan **webhooks bidireccionales**. Recomendamos diseñar el sistema para que sea reactivo (cuando algo cambia en el CRM, nuestro sistema se entera), no solo de envío unidireccional. Esto evita problemas de "ya no es lead, ahora es cliente cerrado, pero nosotros seguimos llamándole".

7. **Coste adicional para el cliente final:**
   - Algunos CRMs cobran por integraciones (Salesforce Connected Apps).
   - Cada cliente final tendrá que crear su propia app en su CRM y proveer las credenciales.

#### Severidad de la implicación

🟠 **ALTA** — amplía el alcance del proyecto en 2-3 semanas y obliga a un rediseño parcial del módulo CRM. NO bloquea Sprint 0 ni Sprint 0, pero hay que iniciarlo en paralelo a Sprint 1 para llegar a tiempo.

#### Pregunta abierta derivada

- ¿Confirmas los 5 CRMs propuestos o quieres priorizar otros? (Recoger en próxima ronda de preguntas.)

---

#### <a id="r-020-refinement-v2"></a>🆕 R-020 — Refinamiento del alcance (sesión 3, 2026-05-19) — ✅ VIGENTE

> *"Los 2 CRMs que vamos a trabajar en la primera versión serán Zoho y HubSpot. La conexión con Google Sheets la dejamos también para después de la release."*
> — Auditor Javier HP (sesión 3)

#### Decisión vigente

| Aspecto | Valor |
|---|---|
| **MVP de integraciones** | **2 CRMs: HubSpot + Zoho** |
| **Google Sheets bidireccional** | **Aplazado a post-release** (Fase 4) |
| **Resto del top 5** (Salesforce, GHL, ActiveCampaign) | Post-release (Fase 4) |
| **Tier 2** (Clientify, Bitrix24, Pipedrive, Monday CRM, Holded) | Bajo demanda, sin compromiso de fecha |

#### Qué cambia respecto a sesión 2

1. **Sheets sale de la Fase 2** → toda la sección "Google Sheets como integración bidireccional" de sesión 2 sigue siendo válida **como diseño**, pero su implementación se ejecuta en Fase 4 (post-release), no en MVP.
2. **Fase 2 queda enfocada en 2 CRMs puros**: Adapter pattern + HubSpot adapter + Zoho adapter + UI admin para conectar el CRM del tenant. Sin Sheets en el alcance.
3. **Se acorta el time-to-market del MVP**: estimación Fase 2 baja de **4-5 semanas → 2-3 semanas** (no hay que diseñar plantilla Sheets, OAuth Google, watcher/polling, ni mapeo de columnas en MVP).

#### Justificación

1. **Sheets es una integración con superficie técnica grande** (OAuth2 Google, Drive API push notifications, rate limits 60/min/usuario, plantilla estandarizada, field mapping por tenant). Meterla en MVP duplica el tamaño de la Fase 2 sin necesidad.
2. **Los 2 CRMs ya cubren la mayoría del segmento target**: el research Opus estima ~60-70% del mercado objetivo cubierto solo con HubSpot + Zoho en ES+Latam.
3. **El diseño del adapter no se desperdicia**: el patrón `IntegrationAdapter` se construye en Fase 2 con 2 implementaciones (HubSpot, Zoho); Sheets se añadirá como tercera implementación en Fase 4 reutilizando exactamente la misma interfaz.
4. **Quitar Sheets del MVP no cierra puertas**: ya hay código OAuth Google previo en el proyecto (commit `63e1e6e`, sprint S-04). Ese código permanece sin tocar, congelado, hasta Fase 4.

#### Los 2 CRMs concretos (cerrando P-020.b)

| # | CRM | Auth | Razón principal |
|---|---|---|---|
| **1** | **HubSpot** | OAuth2 | Líder global del top 5, API más madura, máxima cobertura ES+Latam en academias online y escuelas de negocio. Free tier amplio → menor fricción para clientes pequeños. |
| **2** | **Zoho CRM** | OAuth2 / API Key | Vertical Education propio con casos reales (Conpas, BiMind). Fuerte penetración Latam por pricing accesible. Complemento natural de HubSpot para cubrir pyme formativa. |

> Combinación final MVP Fase 2: **HubSpot + Zoho** (sin Sheets).
> Salesforce, GoHighLevel, ActiveCampaign y Google Sheets bidireccional quedan en **Fase 4** (post-MVP), reutilizando el adapter pattern construido en Fase 2.

#### Plan rearmado por fases — VIGENTE

| Fase | Contenido | Semanas |
|---|---|---|
| **Fase 0 — Sprint 0** | Hotfixes de seguridad (sin cambios respecto a sesión 2) | 1-2 sem |
| **Fase 1 — Capa de datos** | Consolidación `@supabase/ssr` + Zod + Repository pattern + RLS hardening (SIN ORM nuevo) | 3-4 sem |
| **Fase 2 — Adapter layer + 2 CRMs** | Patrón Adapter + HubSpot adapter + Zoho adapter + UI admin de conexión | **2-3 sem** ⬇️ |
| **Fase 3 — Hardening (opcional)** | Tests E2E, observabilidad, dashboards de costes | 2-3 sem |
| **Fase 4 — Post-release** | Google Sheets bidireccional + resto del top 5 (Salesforce, GHL, ActiveCampaign), bajo demanda | 4-7 sem |

#### Severidad de la implicación

🟢 **BAJA** — refinamiento adicional sobre sesión 2, en la misma dirección (entregar menos y antes). Reduce riesgo y time-to-market sin perder ninguna decisión estratégica. El diseño técnico de Sheets ya hecho no se pierde, solo se mueve de fase.

#### Validación con cliente requerida

1. Confirmar que el cliente acepta arrancar el SaaS sólo con HubSpot + Zoho conectables (sin Sheets) durante el MVP.
2. Estimar cuántos prospects/clientes se pierden por no tener Sheets en MVP (probablemente bajo: los que viven 100% en Sheets son segmento pyme muy pequeño; pueden esperar a Fase 4 o usar HubSpot Free Tier como puente).

---

### <a id="r-021"></a>R-021 — P-021 — Migración de datos Airtable → Supabase

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Qué hacemos con los leads históricos que existían en Airtable? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta** | Migrar al sistema actual |

#### Lo que significa

Los datos históricos de leads que vivían en Airtable **deben importarse a Supabase** y estar disponibles desde el nuevo sistema. No quedan solo archivados.

#### Implicaciones derivadas

1. **Sub-proyecto de migración a planificar** en Sprint 1 o 3.

2. **Información que necesitamos antes de planificar la migración:**
   - ¿Cuántas bases de Airtable hay? (1, o varias por cliente)
   - ¿Cuántos leads aprox en cada una?
   - ¿Qué campos tienen las tablas de Airtable? (export a CSV ayuda)
   - ¿Hay relaciones entre tablas en Airtable o son flat?
   - ¿Hay attachments / archivos asociados?
   - ¿Estado de los datos: limpios o con duplicados?

3. **Plan técnico de la migración** (estimación: **3-5 días por base Airtable**):
   - Export desde Airtable (CSV o API).
   - Diseño del mapping de campos Airtable → schema Supabase (especialmente campos JSONB de metadata).
   - Script de import con validación usando repositorios y schemas Zod (la capa de datos consolidada de Fase 1 ya estará en su sitio).
   - Validación de integridad: contar registros, comparar checksums.
   - Plan de rollback si algo va mal.
   - Comunicación al cliente sobre downtime durante la migración (si aplica).

4. **Riesgos a mitigar:**
   - Duplicados: leads que ya están en Supabase y vuelven a llegar desde Airtable.
   - Datos sucios: campos mal formateados (teléfonos sin prefijo, emails inválidos).
   - Pérdida de metadatos importantes si el mapping es incompleto.
   - Encoding (acentos, ñ).

5. **Estrategia recomendada:**
   - Hacer la migración de datos Airtable **después** de cerrar Sprint 0+1+2 (cuando la capa de datos consolidada de Fase 1 esté en su sitio y la lógica de cualificación esté corregida).
   - Importar a tabla `lead` con `tipo_lead = 'HISTORICO_AIRTABLE'` para distinguirlos y no procesarlos automáticamente con el orquestador.
   - Permitir reactivación manual desde el panel si el cliente quiere retomar contacto.

#### Severidad de la implicación

🟡 **MEDIA** — sub-proyecto delimitado, no bloquea otros sprints, pero hay que dimensionar bien con el inventario de bases Airtable.

#### Pregunta abierta derivada

- ¿Cuántas bases de Airtable hay que migrar y cuántos leads aprox en total?

---

### <a id="r-022"></a>R-022 — P-022 — Mantenedor del Knowledge Base (KB)

> 📖 **¿Qué es "KB"?** Knowledge Base = "base de conocimiento". Es el módulo del sistema que la IA (Virginia) consulta para responder al lead preguntas sobre precios, temarios, fechas de inicio, modalidades, etc. Funciona con un sistema RAG (Retrieval-Augmented Generation): el equipo sube PDFs/documentos, el sistema los convierte en vectores para búsqueda semántica, y cuando el lead pregunta algo, la IA encuentra el fragmento relevante y lo cita en su respuesta. Es lo que evita tener que poner "el precio es 1500€" hardcodeado en el prompt.

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Quién mantiene actualizadas las variables del Knowledge Base (precios, fechas de inicio, slots, etc.)? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta** | Equipo dev administra todo el contenido, con excepciones de auto-administración del cliente (ver matiz abajo) |

#### Lo que significa

El equipo técnico (no el cliente final) es responsable de mantener actualizados los datos del Knowledge Base: subir PDFs de temarios, actualizar precios, configurar slots de calendario, gestionar fechas de inicio de cursos.

#### 🔑 Matiz crítico — modelo de negocio (clarificado por el Auditor)

**Este proyecto NO es un SaaS al uso.** El modelo correcto es:

> *"El cliente nos contrata como asesores para ayudarle a conseguir objetivos con los leads."*

Es decir, somos un **servicio gestionado** (managed service), no un SaaS de autoservicio. La consecuencia es que:

- **Para la mayoría de tareas**, el equipo del Auditor (nosotros) somos quienes operamos el sistema en nombre del cliente.
- **Pero hay ciertas funciones donde tendría sentido ceder auto-administración al cliente final** — concretamente:
  - **Alimentación del RAG**: el cliente sube sus propios documentos (temarios actualizados, brochures nuevos).
  - **Información sobre cursos**: nombre, programa, modalidad.
  - **Precios**: cambian con cierta frecuencia y son sensibles para el cliente.
  - **Fechas de inicio**: el cliente las conoce mejor que nosotros.

Esta dualidad operación-gestionada + auto-administración-parcial **cambia el diseño del panel admin**. No es un panel "del SaaS para el cliente final", sino:

| Vista | Para quién | Qué hace |
|---|---|---|
| **Panel del Auditor (admin global)** | Equipo Javier HP | Gestiona todos los clientes + configuraciones avanzadas + integraciones + monitoring |
| **Panel del cliente (admin tenant)** | Cliente final del servicio | Ve sus leads + sube PDFs al RAG + edita precios/fechas/cursos + ve métricas básicas |

#### Implicaciones derivadas

1. **Carga operativa continua para el equipo dev.** No es una tarea puntual de implementación; es responsabilidad recurrente. Hay que reservar dedicación semanal.

2. **Necesita diseñar un panel admin dedicado** que el equipo dev usará:
   - Subida y gestión de PDFs (con preview, versionado, etiquetado por programa).
   - Tabla de precios editable con histórico.
   - Calendario editable de slots disponibles (con sync a Google Calendar / Cal.com).
   - Tabla de fechas de inicio de cursos.
   - Tabla de cursos activos / inactivos.
   - Vista de "estado de actualización": cuándo se actualizó cada cosa por última vez.
   - **Estimación del panel: 5-7 días** (entra en Sprint 2).

3. **Choca con buenas prácticas SaaS** donde el cliente final es autoservicio:
   - Si en el futuro hay 50 clientes, el equipo dev no escala.
   - **Recomendación a medio plazo:** prever migración a auto-servicio del cliente final una vez se estabilice el producto. Pero no incluir en el alcance actual.

4. **Procedimiento operativo a definir:**
   - SLA de actualización: ¿cuánto tiempo tarda el equipo en aplicar un cambio que pide el cliente final?
   - Canal de petición: ¿correo, ticket, formulario?
   - Validación: ¿hay revisión antes de publicar o se aplica directo?
   - Notificación al cliente cuando se aplica el cambio.

5. **Implicación de coste:**
   - Si tienes N clientes, cada uno con M actualizaciones al mes → asumir que el equipo dev gastará X horas/mes en mantenimiento de contenido.
   - Considerar repercutir en el precio del SaaS.

#### Severidad de la implicación

🟡 **MEDIA** — añade 5-7 días al Sprint 2 + carga operativa continua. No bloquea sprints anteriores.

#### Pregunta abierta derivada

- ¿Cuál es el volumen esperado de cambios mensuales? (Para dimensionar la dedicación del equipo.)
- ¿Quieres prever auto-servicio del cliente final en una fase posterior?

---

### <a id="r-023"></a>R-023 — P-023 — Supabase self-hosted en Easypanel

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Cómo tenemos acceso administrativo a Supabase para crear un usuario Postgres con permisos limitados? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta corregida** | Es **Easypanel** (no Coolify como se asumió inicialmente), administrado por el equipo del Auditor con **control total self-hosted**. |

#### Lo que significa

La instancia de Supabase **no es la versión Cloud comercial**, sino una instancia autohospedada en infraestructura propia mediante **Easypanel** (panel de gestión tipo Heroku para servidores propios). Esto explica la IP `46.62.193.169` y el hostname `interno-supabase-a201be-46-62-193-169.traefik.me` encontrados en el audit.

**El equipo del Auditor (Javier HP) tiene control total sobre el servidor y la pila Supabase.** Esto destrabaria el Sprint 0 inmediatamente — no hay que pedir credenciales a terceros para rotar las contraseñas.

#### Implicaciones derivadas

1. **Pregunta urgente derivada (bloquea Sprint 0):** ¿quién administra la instancia de Coolify?
   - **Opción A:** el cliente Esden tiene acceso directo a Coolify → ideal, el cliente puede crear el usuario Postgres sin depender del programador.
   - **Opción B:** el programador actual es el único con acceso → conflicto con P-024 (mismo equipo con condiciones de método). Hay que pedirle credenciales temporales para Sprint 0.
   - **Opción C:** un sysadmin externo administra Coolify → coordinar con él.

   **Hay que aclararlo antes de Sprint 0.**

2. **Ventajas del self-hosted:**
   - Datos en infraestructura propia (puede ser requisito GDPR).
   - Sin coste recurrente de Supabase Cloud.
   - Control total sobre updates y configuración.

3. **Desventajas y riesgos:**
   - **Mantenimiento operativo es del equipo:** updates de seguridad de Postgres, GoTrue (Auth), PostgREST, Realtime. **Si la versión de Supabase corre desactualizada, hereda CVEs.**
   - **Backups son responsabilidad del equipo.** ¿Hay backups automáticos? ¿Probados con restore? Confirmar urgente.
   - **Monitoring debe ser propio.** ¿Se sabe si la BD está al 80% de uso de CPU? ¿Hay alertas?
   - **Escalabilidad manual.** Si llegan muchos clientes, hay que escalar el servidor.

4. **Acciones concretas para Sprint 0:**
   - Obtener acceso al panel Coolify (o SSH al servidor).
   - Verificar versión de Supabase corriendo.
   - Verificar configuración de backups.
   - Crear usuario Postgres `app_user` con permisos limitados (script SQL — se mantiene aunque NO haya ORM nuevo; el principio "menor privilegio" aplica igual sobre `@supabase/ssr`).
   - Cambiar password del usuario `postgres` superuser (que está hardcoded como `postgres:postgres` en código).
   - **Cerrar puerto 5432 a internet** si está expuesto (verificar con `nmap` desde fuera).

5. **Implicación para la capa de datos (Fase 1 — SIN ORM nuevo):**
   - El cliente `@supabase/ssr` apunta al endpoint REST de Supabase, no al puerto 5432 directo.
   - Para scripts admin / SQL migrations: connection string `postgresql://app_user:***@<host>:6543/postgres` apuntando al pooler.
   - Hay que confirmar que el pooler (Supavisor) está activo en la instancia self-hosted; en Cloud viene por defecto, en self-hosted depende de la versión.

6. **Recomendación de seguridad inmediata:**
   - El audit confirmó que el password Postgres es el default público `postgres:postgres`. **Cambiarlo en Sprint 0 es no negociable.**
   - Auditar logs de acceso a Postgres por si hubo accesos no autorizados con ese password durante el tiempo que ha estado expuesto.

#### Severidad de la implicación

🟠 **MEDIA-ALTA** — añade complejidad operativa permanente (mantener Supabase actualizado, backups, monitoring). **El control total ya confirmado destraba el Sprint 0 inmediatamente** — no hay coordinación externa pendiente.

---

#### <a id="r-023a"></a>R-023.a — ¿Quién administra Easypanel? ✅ RESPONDIDA

> *"Lo administramos nosotros, control total self-host."*

**Implicación:** el Auditor y su equipo tienen acceso administrativo completo. Pueden ejecutar Sprint 0 sin dependencia de terceros. Crear el usuario Postgres `app_user` con permisos limitados es trabajo interno del equipo.

---

#### <a id="r-023b"></a>R-023.b — Backups automáticos y manuales ✅ RESPONDIDA (con requisito nuevo)

> *"Sí necesitaremos poder gestionar los backups automáticos y manuales. Hay dos modalidades de cliente: el que tiene sus datos con nosotros (Supabase) o el que tiene su propia Supabase en sus servidores o en los nuestros. Por lo tanto a nivel de backups, nosotros como administradores del servicio del cliente y como superadmin para todos los clientes, hemos de poder crear un backup, pero también el cliente desde su dashboard (solo para sus recursos, independientes o no)."*

**Implicaciones derivadas (importantes — cambian el alcance):**

1. **Hay dos modalidades de despliegue del cliente:**

   | Modalidad | Dónde vive la BD del cliente | Quién opera la infra |
   |---|---|---|
   | **A — BD compartida en nuestra Supabase** | En la instancia Supabase del Auditor (Easypanel) | Auditor |
   | **B — Supabase dedicada del cliente** | En servidor propio del cliente, o en servidor del Auditor pero instancia separada | Auditor administra; cliente posee |

   **Esto cambia el modelo de datos y de seguridad fundamentalmente.** Las dos modalidades requieren diseños distintos:
   - **Modalidad A** = multi-tenant Postgres (lo que ya hay), un esquema con `tenant_id` en cada tabla.
   - **Modalidad B** = N instancias Supabase independientes, una por cliente. Sin compartir datos físicamente.

2. **Sistema de backups con dos niveles de acceso:**

   | Quién | Puede hacer backup de | Vía |
   |---|---|---|
   | Auditor (superadmin) | Cualquier cliente, cualquier modalidad | Panel admin global |
   | Cliente final (admin tenant) | **Solo sus propios recursos** (los de su `tenant_id` en Modalidad A, o su Supabase completa en Modalidad B) | Panel del cliente |

3. **Tipos de backup a soportar:**

   | Tipo | Frecuencia | Quién lanza | Retención propuesta |
   |---|---|---|---|
   | Automático (programado) | Diario | Sistema | 30 días |
   | Semanal completo | Semanal | Sistema | 90 días |
   | Bajo demanda | Cuando se necesite | Auditor o cliente | Indefinida hasta borrar |
   | Pre-deployment | Antes de cambios mayores | Sistema (CI/CD) | 30 días |

4. **Implementación técnica:**
   - **Modalidad A:** scripts `pg_dump` filtrados por `WHERE tenant_id = X` (no es trivial — tablas con FKs requieren orden correcto y dump+restore consistente).
   - **Modalidad B:** `pg_dump` completo de la instancia entera del cliente.
   - **Storage de backups:** S3-compatible (MinIO ya en stack) con cifrado at-rest.
   - **Restore:** UI con preview de qué se va a restaurar antes de ejecutar.

5. **Estimación: 1-2 semanas para el módulo de backups multi-nivel + UI** en Sprint 2 o Sprint 3.

6. **Seguridad del proceso:**
   - El cliente NO puede hacer backup de otro tenant (RLS aplicada al script).
   - Los backups del cliente se guardan en bucket S3 separado por tenant.
   - Cifrado de backups con clave gestionada en KMS o similar.
   - Auditoría: cada backup deja registro (quién, cuándo, qué tamaño, hash).

#### <a id="r-023c"></a>R-023.c — Versiones de Supabase / Postgres / GoTrue ✅ RESPONDIDA (investigación del Auditor)

**Investigación realizada por el Auditor sobre `api-db.linkstation.ai`** (HEAD requests sin autenticación):

| Componente | Versión detectada | Fuente |
|---|---|---|
| **Kong API Gateway** | **2.8.1** | Header `Server: kong/2.8.1` en todas las 401s y 200s |
| HTTP/3 ALPN | Habilitado | `Alt-Svc: h3=":443"; ma=2592000` |
| Storage API endpoint | Operativo | `/storage/v1/status` devolvió HTTP 200 sin auth |
| CORS | **Wildcard** `*` | `Access-Control-Allow-Origin: *` en todos los endpoints |
| Cliente JS (lado app) | `@supabase/supabase-js@^2.97.0` + `@supabase/ssr@^0.8.0` | `package.json` |

**🚨 Implicaciones de seguridad CRÍTICAS:**

1. **Kong 2.8.1 está End-of-Life desde julio 2023.** No recibe parches de seguridad desde hace casi 3 años:

   | Vulnerabilidad | CVSS | Impacto |
   |---|---|---|
   | CVE-2023-44487 (HTTP/2 rapid reset) | 7.5 | DoS — afecta a Kong basado en Nginx |
   | CVE-2024-26143 (Kong < 3.6) | 6.5 | Header smuggling |
   | Varias CVE de OpenSSL/Nginx transitivas | Diversos | Diversos |

   **Recomendación:** Kong 3.7+ LTS antes de cualquier exposición a más tráfico.

2. **Toda la pila Supabase tiene unos 2-3 años de retraso.** Si Kong es 2.8.1, las imágenes asociadas que se solían empaquetar juntas eran:

   | Componente | Versión probable (2022) | Versión actual estable (2026) | Salto |
   |---|---|---|---|
   | PostgreSQL | 14.x o 15.1 | 16.x / 17.x | 1-2 majors |
   | GoTrue (Auth) | v2.62 ~ v2.99 | v2.180+ | ~80 versiones |
   | PostgREST | v10.x | v12.x | 2 majors |
   | Realtime | v2.10 ~ v2.21 | v2.34+ | ~13 versiones |
   | Storage API | v0.40 ~ v0.46 | v1.x | 1 major |
   | Studio | 2022.x | 2026.x | Casi total |

   Cada versión acumula fixes de seguridad. **Estamos heredando ~3 años de CVEs sin parchear.**

3. **CORS `*` con tokens de sesión** — aunque los endpoints autenticados requieren API key (lo que mitiga el problema directo), tener CORS abierto en endpoints públicos como `/storage/v1/status` significa que cualquier web puede hacer peticiones. Si se introduce algún endpoint nuevo sin auth (como los 7 ya detectados en el audit), CORS `*` los expone globalmente.

4. **`/storage/v1/status` devuelve 200 sin auth** — esto es comportamiento normal de Supabase Storage (healthcheck público), pero confirma que el módulo Storage está activo y expuesto.

**Acciones para Sprint 0 o Sprint 0.5:**

- [ ] **Actualizar pila Supabase completa** a versiones estables 2026. Sub-tarea de 2-3 días con riesgo de regresiones (cambios en API de GoTrue entre v2.62 y v2.180+).
- [ ] **Migrar Kong 2.8.1 → Kong 3.7 LTS o equivalente** (algunos despliegues self-hosted recientes usan `kong/kong-gateway:3.x`).
- [ ] **Plan de update:** crear snapshot/backup → update en staging → smoke tests → update producción en ventana de mantenimiento.
- [ ] **Configurar CORS adecuadamente** — `Access-Control-Allow-Origin` solo a los dominios reales del SaaS y del widget embeddable, no `*`.
- [ ] Pedir a Easypanel el log de despliegue actual para identificar versión exacta de cada imagen.

---

### <a id="r-024"></a>R-024 — P-024 — Mismo equipo con condiciones de método

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Quién va a ejecutar el Sprint 0 y la consolidación de la capa de datos (Fase 1, originalmente propuesta como migración a Drizzle — anulada el 20-05-2026)? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta** | Mismo equipo con método nuevo (Recomendado) |

#### Lo que significa

El programador actual (el que entregó el informe v3.5 con afirmaciones factualmente incorrectas) continúa siendo el responsable técnico de ejecutar las correcciones. **Pero con condiciones de método obligatorias** que evitarán que se repita el patrón.

#### Las 3 condiciones de método (no negociables)

##### Condición 1 — Tests automatizados obligatorios por finding cerrado

Cada vez que se declare un finding como "cerrado", debe acompañarse de **al menos un test automatizado** que demuestre que el bug ya no se reproduce.

**Ejemplo concreto:** para cerrar F-04-001 (`fetchCalls` sin filtro tenant), no basta con añadir el filtro. Hay que escribir un test que:
1. Cree 2 tenants ficticios (A y B) con leads cada uno.
2. Inicie sesión como user del tenant A.
3. Invoque `fetchCalls()`.
4. **Verifique que NO devuelve ningún lead del tenant B.**

Sin ese test, el finding queda "abierto" en el tablero, aunque el código parezca correcto.

##### Condición 2 — Revisión externa de PRs antes de merge

Cada Pull Request que cierre un finding del audit debe ser **revisado por una persona externa al equipo del programador actual**, antes del merge.

**Quién hace la revisión:** Auditor Javier HP en primera ronda. Si el volumen lo justifica, contratar un revisor adicional independiente.

**Qué revisa el revisor externo:**
- Que el código cambia lo que el finding describe (no otra cosa).
- Que los tests pasan **localmente y en CI**.
- Que se ejecutan los comandos `grep` de verificación (Condición 3) y devuelven el resultado esperado.
- Que no se han introducido nuevos `as any` o nuevos secretos hardcoded.

**No hace falta que el revisor refactorice ni proponga arquitectura alternativa. Solo verifica que el finding cerrado está realmente cerrado.**

##### Condición 3 — Comandos `grep` de verificación pre-merge

Cada PR que cierre un finding debe documentar en su descripción **el comando `grep` ejecutable** que demuestra el cierre.

**Ejemplos de comandos pre-merge** (del anexo del informe de comparativa):

```bash
# Para cerrar 3-001 (USER_ESTUDIES)
grep -rn "USER_ESTUDIES" src/      # Debe devolver 0 resultados

# Para cerrar 3-002 (YEARS_EXPERIENCE variantes)
grep -rE "YEARS_?\s?EXPERIENCI?E?" src/   # Solo YEARS_EXPERIENCE permitido

# Para cerrar F-05-SEC-001 (JWTs hardcoded)
grep -rn "eyJhbGciOiJIUzI1NiIs" src/     # Debe devolver 0 resultados
```

El revisor ejecuta el comando antes de aprobar. Si devuelve resultados inesperados, el PR se rechaza con motivo concreto.

#### Implicaciones derivadas

1. **Setup técnico antes de Sprint 0** (1-2 días):
   - Instalar Vitest como framework de tests.
   - Configurar GitHub Actions (o equivalente CI) que ejecute tests + `grep` checks en cada PR.
   - Documentar el protocolo de revisión externa.

2. **Carga adicional para el equipo del programador:**
   - Escribir tests por cada cambio (no estaba haciéndolo: 0% cobertura actual).
   - Curva de aprendizaje de Vitest si no la conoce: 1-2 días.

3. **Carga para el Auditor Javier HP:**
   - Revisión de PRs durante las 6-8 semanas del plan.
   - Estimación: 1-2 horas/día de revisión durante el plan completo.

4. **Documento formal a producir:** *Protocolo de Sprint 0 — Condiciones de método.* Es un documento corto (2-3 páginas) que el programador firma como compromiso antes de empezar Sprint 0.

5. **Métrica clave a vigilar:**
   - Número de findings "cerrados" que se reabren después porque el test no era suficiente.
   - Si llegamos a 3+ reaperturas, escalar a Plan B (capa de verificación externa más fuerte) o Plan C (cambio de equipo).

#### Severidad de la implicación

🟠 **ALTA en proceso** — requiere disciplina sostenida del equipo. Pero técnicamente factible. El mayor riesgo es **soltar las condiciones a la primera semana** porque "ralentizan". Hay que resistir esa tentación.

#### Acciones inmediatas

- [ ] Producir el documento "Protocolo de Sprint 0" con las 3 condiciones formalizadas.
- [ ] Reunión con el programador para presentarle las condiciones y obtener su compromiso explícito.
- [ ] Setup de CI con tests + grep checks.

---

### <a id="r-025"></a>R-025 — P-025 — Pausa completa en ventas 6-8 semanas

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Aceptas pausar la captación de nuevos clientes durante las 6-8 semanas de correcciones? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta** | Pausa completa 6-8 semanas (Recomendado) |

#### Lo que significa

Durante las 6-8 semanas que durará el plan de remediación (Sprint 0 + 1 + 2), **no se aceptan nuevos clientes en el sistema**. Cero exposición adicional al problema multi-tenant mientras se repara.

#### Implicaciones derivadas

1. **Acción comercial inmediata:**
   - Comunicar internamente al equipo comercial: stop captación productiva.
   - Si hay leads en pipeline avanzado (firma pendiente, demo agendada), deferirlos con explicación honesta: *"estamos cerrando una fase de mejoras técnicas críticas, te contacto a partir del [fecha + 8 semanas]"*.
   - No comunicar detalles del problema a leads externos (sería información sensible).

2. **Posible upside:**
   - Ventana sin presión de "atender clientes nuevos" → el equipo se concentra mejor en correcciones.
   - Los clientes actuales (si los hay, ver P-001) reciben más atención durante la fase.
   - Cuando se anuncie la vuelta a captación, se puede comunicar como **lanzamiento 2.0 con seguridad reforzada** (no como excusa de pausa).

3. **Posible downside:**
   - 6-8 semanas sin firma de nuevos contratos = impacto en revenue/runway del SaaS.
   - **Hay que asegurar que el negocio aguanta esa pausa.** Si no, replantear a "pausa limitada a piloto controlado" (P-025 opción B).

4. **Métricas a vigilar durante la pausa:**
   - Que efectivamente no entren clientes nuevos (revisar registros nuevos en BD).
   - Que el equipo dedica el tiempo a Sprint 0/1/2 (no a otras features).
   - Que el plan avanza según calendario.

5. **Reanudación de ventas — checklist antes de anunciar:**
   - [ ] Los 16 Critical del audit cerrados con tests.
   - [ ] Verificación independiente del Auditor confirma cierre.
   - [ ] Re-test manual en producción con cuenta de pruebas (replicar Vector 1, Vector 2, Vector 3 del audit).
   - [ ] Backup de BD reciente confirmado.
   - [ ] Plan de respuesta a incidentes en su sitio (a quién llamar si pasa algo).

6. **Comunicación a clientes existentes** (si los hay según P-001):
   - **NO contar detalles técnicos** (sería información explotable).
   - **SÍ informar de "ventana de mejoras técnicas":** *"Durante las próximas 6-8 semanas vamos a aplicar mejoras de seguridad y rendimiento. El servicio sigue operativo pero puede haber ventanas de mantenimiento puntuales."*
   - **SÍ informar de la ventana de mantenimiento de 30 min** del Sprint 0 (P-003).

#### Severidad de la implicación

🟠 **ALTA en lo comercial** pero **POSITIVA en lo técnico** — protege al sistema y a los clientes futuros. La decisión correcta. Solo requiere asegurar viabilidad financiera del negocio durante la pausa.

#### Acciones inmediatas

- [ ] Confirmar al equipo comercial: pausa empieza fecha [X].
- [ ] Definir fecha objetivo de reanudación: 8 semanas desde Sprint 0 (ajustable según avance).
- [ ] Preparar plantilla de comunicación a leads en pipeline.

---

---

### <a id="r-021a"></a>R-021.a — Cuántas bases de Airtable y cuántos leads ⚠️ RESPUESTA PARCIAL

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Cuántas bases de Airtable hay que migrar y cuántos leads aprox en total? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta literal** | *"No solo se, pero puede que haya más de una."* |

#### Acciones pendientes

- [ ] **Inventario formal de bases Airtable** del cliente Esden antes de planificar la migración (Sprint 1-3).
- [ ] Exportar metadatos de cada base (CSV o vía API) para contar leads y campos.
- [ ] Identificar si hay bases de otros clientes (no Esden) que también deban migrarse en el futuro.

**Bloqueo:** la migración no se puede dimensionar con precisión hasta tener el inventario. Estimación inicial (a refinar): **3-5 días/dev por base Airtable**.

---

### <a id="r-022a"></a>R-022.a — Volumen de cambios mensuales del KB 🔄 BLOQUEADA POR R-020

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Cuál es el volumen esperado de cambios mensuales del Knowledge Base? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta literal** | *"Depende del informe que me hagas."* |

#### Estado

La respuesta del Auditor remite a la decisión final sobre los CRMs (R-020, ya cerrada con el research de Opus). Con los 5 conectores definidos y el modelo de negocio claro (R-022 — gestión + auto-administración parcial del cliente), el volumen de cambios se puede ahora dimensionar:

#### Estimación operativa (ya posible con R-020 y R-022 cerrados)

| Tipo de cambio | Frecuencia esperada | Quién lo hace | Esfuerzo |
|---|---|---|---|
| Actualizar precios | Trimestral por cliente | Cliente final (auto-servicio) | 5 min |
| Subir nuevo PDF temario | 2-4 veces/año por cliente | Cliente final (auto-servicio) | 10 min |
| Cambiar fechas inicio cursos | Semestral por cliente | Cliente final (auto-servicio) | 10 min |
| Configurar nuevo CRM tenant | Onboarding (una vez) | Equipo Auditor | 30-60 min |
| Mantenimiento técnico KB | Mensual | Equipo Auditor | 1-2 horas |

**Conclusión:** con N clientes activos, el equipo del Auditor dedica aproximadamente **2-4 horas/mes por cliente** a mantenimiento operativo. Esto entra en el modelo de servicio gestionado (R-022).

---

### <a id="r-022b"></a>R-022.b — Auto-servicio del cliente en fase posterior ✅ RESPONDIDA (con matiz importante)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Quieres prever auto-servicio del cliente final en una fase posterior? |
| **Respondedor** | Javier HP (Auditor) |
| **Fecha** | 2026-05-19 |
| **Respuesta literal** | *"No, en principio no, pero es probable que el haya ciertas funciones, como alimentación de rag o información sobre los cursos, precios y fechas que sí recaigan en la auto administración del cliente. Aunque hay que subrayar que este proyecto no es un SaaS al uso, sino que el cliente nos contrata como asesores para ayudarle a conseguir unos objetivos con los leads."* |

#### Implicación crítica — modelo de negocio aclarado

Esta respuesta **redefine el producto** que estamos construyendo. No es un SaaS de autoservicio. Es un **servicio profesional gestionado con dashboard del cliente para tareas de mantenimiento autónomo**.

**Lo que cambia:**

1. **Panel admin global del Auditor** (nosotros) — gestionamos todos los clientes, configuramos integraciones, monitoreamos performance, hacemos onboarding, definimos prompts, conectamos CRMs. Es el panel principal de operación.

2. **Panel del cliente final** — limitado a tareas que el cliente puede hacer sin nosotros:
   - **Alimentación del RAG** (subir PDFs nuevos, retirar viejos).
   - **Información de cursos** (nombre, programa, modalidad).
   - **Precios** (con histórico).
   - **Fechas de inicio**.
   - **Ver sus propios leads** (ya estaba previsto).
   - **Ver sus métricas básicas** (conversiones, costes).
   - **Hacer backup de sus datos** (ver R-023.b).

3. **Lo que NO ve el cliente**:
   - Configuración del prompt Virginia (lo gestionamos nosotros).
   - Configuración del orquestador y reglas de cualificación (lo gestionamos nosotros).
   - Configuración del CRM conector (la hacemos en onboarding, no la toca después).
   - Métricas avanzadas (logs detallados, observabilidad).

4. **Cambia el SLA y la oferta comercial.** No vendemos "el software" — vendemos "el servicio". El precio incluye la operación, no es una licencia mensual de un panel.

5. **Implicación para escalabilidad**: el modelo de servicio gestionado tiene límite de escala. Si el equipo del Auditor son 2-3 personas, dimensionar el negocio para 50 clientes no es viable sin contratar más operadores. Convendría definir cuántos clientes activos soporta el equipo antes de saturar.

#### Acciones derivadas

- [ ] Diseñar **dos paneles distintos**: admin global (Auditor) y admin tenant (cliente).
- [ ] Definir el contrato/SLA con el cliente: qué incluye el servicio gestionado, qué requiere intervención del Auditor, qué puede hacer el cliente solo.
- [ ] Dimensionar el negocio: cuántos clientes activos soporta el equipo del Auditor con calidad razonable.

---

## ⏳ Decisiones pendientes (19)

Las siguientes 19 preguntas están en `PREGUNTAS-PARA-LA-CLIENTE.md` esperando respuesta. Una vez respondidas (por Javier HP en otro chat o por el cliente final), se trasladarán aquí con el mismo formato.

### Bloque 1 — Urgentes (3 pendientes — bloquean Sprint 0)

| ID | Pregunta corta | Estado |
|---|---|---|
| P-001 | ¿Clientes reales usando el sistema ahora? | ⏳ Pendiente |
| P-002 | ¿Quién tiene/tuvo acceso al repositorio de código? | ⏳ Pendiente |
| P-003 | ¿Ventana de mantenimiento de 30 minutos? | ⏳ Pendiente |

### Bloque 2 — Reglas de negocio (4 pendientes — Sprint 0)

| ID | Pregunta corta | Estado |
|---|---|---|
| P-004 | Regla B: ¿2 o 3 años de experiencia? | ⏳ Pendiente |
| P-005 | Regla C (sin estudios + 5 años): ¿legítima o invento? | ⏳ Pendiente |
| P-006 | Exclusiones de profesiones manuales: ¿se aplican? | ⏳ Pendiente |
| P-007 | Estado "prematriculado": ¿válido o vestigio? | ⏳ Pendiente |

### Bloque 3 — Nomenclatura (5 pendientes — Sprint 0-3)

| ID | Pregunta corta | Estado |
|---|---|---|
| P-008 | `user_profession` o `user_profesion`? | ⏳ Pendiente |
| P-009 | `year_experience` o `years_experience`? | ⏳ Pendiente |
| P-010 | `curse_name` o `course_name`? | ⏳ Pendiente |
| P-011 | Valores de `qualified`: ¿`apto`/`no apto` u otro? | ⏳ Pendiente |
| P-012 | Columna `nivel_estudios` en BD: ¿se usa? | ⏳ Pendiente |

### Bloque 4 — Operativa de seguimiento (4 pendientes — Sprint 0-3)

| ID | Pregunta corta | Estado |
|---|---|---|
| P-013 | Protocolo multi-día: ¿cuántos contactos, qué intervalos? | ⏳ Pendiente |
| P-014 | Sync CRM: ¿añadir o sobrescribir? | ⏳ Pendiente |
| P-015 | Estados "informado"/"matriculado": ¿auto o manual? | ⏳ Pendiente |
| P-016 | Ultravox: ¿analizar transcripción al final? | ⏳ Pendiente |

### Bloque 5 — Agente Virginia IA (3 pendientes — Sprint 1-3)

| ID | Pregunta corta | Estado |
|---|---|---|
| P-017 | Typo `book_appointmen`: ¿corregir en doc fuente? | ⏳ Pendiente |
| P-018 | ¿Prompt Virginia (945 líneas) es definitivo? | ⏳ Pendiente |
| P-019 | ¿Fase de pruebas controlada antes de escalar? | ⏳ Pendiente |

---

## Nuevas preguntas surgidas a partir de las decisiones tomadas

Estas preguntas no estaban en el listado original; han aparecido como consecuencia de las respuestas. **6 de las 7 ya han sido respondidas en esta sesión.**

| ID | Pregunta | Surge de | Estado | Respuesta |
|---|---|---|---|---|
| P-020.a | ¿Confirmas los 5 CRMs definitivos? | R-020 | ⏳ Pendiente validación formal | Top 5 propuesto por research: HubSpot, Zoho, Salesforce, GHL, ActiveCampaign |
| P-021.a | ¿Cuántas bases de Airtable y cuántos leads? | R-021 | ⚠️ Parcial | Ver [R-021.a](#r-021a) — más de una, número exacto pendiente de inventario |
| P-022.a | ¿Volumen esperado de cambios mensuales en KB? | R-022 | ✅ Estimado | Ver [R-022.a](#r-022a) — 2-4 horas/mes por cliente activo |
| P-022.b | ¿Auto-servicio del cliente en fase posterior? | R-022 | ✅ Respondida | Ver [R-022.b](#r-022b) — sí parcial (RAG, cursos, precios, fechas) |
| P-023.a | ¿Quién administra la instancia? | R-023 | ✅ Respondida | Ver [R-023.a](#r-023a) — Auditor, control total Easypanel |
| P-023.b | ¿Backups automáticos y manuales? | R-023 | ✅ Respondida | Ver [R-023.b](#r-023b) — multi-nivel + 2 modalidades cliente |
| P-023.c | ¿Versión de Supabase/Postgres/GoTrue? | R-023 | ✅ Respondida | Ver [R-023.c](#r-023c) — Kong 2.8.1 EOL detectado, pila 2-3 años de retraso |

**La única derivada pendiente (P-020.a)** se cerrará cuando el Auditor lea el informe de research y dé el OK formal al top 5 propuesto (o pida ajustes).

---

## Cómo se actualiza este documento

Cuando llegue una nueva respuesta (vía este chat o el otro), el procedimiento es:

1. Mover la pregunta de "⏳ Decisiones pendientes" a "✅ Decisiones tomadas".
2. Documentar la respuesta con:
   - Pregunta original (referencia).
   - Respuesta literal y respondedor (Javier HP / Cliente / otro).
   - Fecha.
   - **Implicaciones derivadas** (qué cambia en el plan).
   - **Severidad de la implicación** (🔴 alta / 🟠 media / 🟡 baja).
   - **Acciones inmediatas** (checklist de qué hacer ahora).
   - **Preguntas abiertas derivadas** (si la respuesta abre nuevas dudas).
3. Actualizar la tabla de resumen del estado al inicio.
4. Si surgen nuevas preguntas, añadirlas también al `PREGUNTAS-PARA-LA-CLIENTE.md` para mantener ambos documentos sincronizados.

---

**Status:** LIVING_DOCUMENT — se actualiza con cada respuesta nueva.
**Última actualización:** 2026-05-19 (sesión 3).
**Auditor responsable del documento:** Javier HP.
**Total preguntas (originales + derivadas):** 33 = 25 + 7 + 1 nueva (P-020.b).
**Decisiones tomadas:** 14 / 33 (6 originales + 8 derivadas incluido refinamiento R-020 y cierre de P-020.b).
**Pendientes:** 19 / 33 (19 originales del otro chat).
**Investigación de soporte:** [`RESEARCH-CRM-SECTOR-FORMACION-ES-LATAM.md`](RESEARCH-CRM-SECTOR-FORMACION-ES-LATAM.md) (Opus, 2026-05-19).
**Refinamientos del alcance documentados:**

- [R-020-refinement](#r-020-refinement) (sesión 2, ⚠️ SUPERSEDED) — propuso "2 CRMs + Google Sheets" en MVP.
- [R-020-refinement-v2](#r-020-refinement-v2) (sesión 3, ✅ VIGENTE) — MVP Fase 2 confirmado: **HubSpot + Zoho** (Google Sheets aplazado a Fase 4 post-release).
