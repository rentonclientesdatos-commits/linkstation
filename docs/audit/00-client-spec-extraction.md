---
title: "Spec normalizada de la cliente — fuente autoritaria"
date: 2026-05-18
status: extracted
source: docs/Docs-entrega-clienta/
authority: TOP
agent: Client-Spec-Extractor (Sonnet)
---

# Spec normalizada de la cliente

## 0. Resumen ejecutivo

LinkStation necesita un AI CRM + Workflow Orchestrator que automatice el contacto, cualificación y agendamiento de leads de másters. El sistema debe ingestar leads desde el CRM existente en tiempo real, iniciar contacto automático via llamada de voz o WhatsApp según zona horaria del lead (9am–9pm), cualificar al lead mediante un agente IA conversacional (Virginia), y si es apto, agendar una llamada con un asesor humano. Todo el estado del lead debe sincronizarse de vuelta al CRM del cliente. El volumen esperado es 3.000–4.000+ leads/mes. La plataforma es multi-tenant (pensada para varios centros educativos). La base de datos es Supabase (NO Airtable).

---

## 1. Flujo deseado paso a paso

Reconstruido a partir de `reunion-incial-flujo-deseado.docx` (notas de reunión Bea & Javi, May 18, 132 min) — autoridad TOP — que es transposición del PDF de reunión `reunion-inicial-flujo.pdf` (mismo contenido).

### Fase 0: Ingesta de lead
- Un nuevo lead entra al sistema extraído del CRM del cliente en tiempo real.
- El sistema detecta si el lead es duplicado (matching por teléfono o email). Si es duplicado, NO procesar.
- Datos nuevos del agente IA se **agregan** al CRM, nunca sobreescriben los existentes.

`[fuente: reunion-incial-flujo-deseado.docx, sección "Gestión de datos"]`

### Fase 1: Lógica de zona horaria y canal de contacto
- El sistema verifica la hora local del lead (`{country_user_time}`).
- **Si fuera de 9am–9pm** (zona horaria del lead): enviar mensaje de **plantilla oficial de WhatsApp**.
- **Si dentro de 9am–9pm**: iniciar una **llamada de voz** (agente Virginia via Retell/Ultravox).
- El sistema ejecuta un **protocolo de contacto multi-día configurable** (secuencia de llamadas + WhatsApps) para maximizar el alcance hasta que el lead responda o sea marcado como `ilocalizable`.

`[fuente: reunion-incial-flujo-deseado.docx, sección "Flujo central - Lógica de zona horaria"]`

### Fase 2: Cualificación por agente IA Virginia
El agente Virginia (voz + WhatsApp) conduce la conversación siguiendo este sub-flujo:

#### 3.1 Recogida de datos de identificación
- Si faltan: `{user_name}`, `{user_country}`, `{curse_name}` → preguntar antes de iniciar cualificación.

#### 3.2 Recogida de perfil académico y profesional
- Variables: `{user_studies}`, `{user_profession}`
- Requiere tipo de estudio (universitario, postgrado, máster, técnico/FP, preuniversitario, básico, sin estudios) + especialidad.
- Si ambiguo → pedir aclaración una vez. Si sigue ambiguo → guardar lo que hay.

#### 3.3 Recogida de experiencia y edad
- Variables: `{user_age}`, `{years_experience}` (solo el número).

#### 3.4 Recogida de motivación
- Variable: `{user_motivations}`

#### 3.5 Evaluación interna de cualificación (no comunicada al lead)
**Árbol de decisión:**
- **Regla A** (prioridad absoluta): estudios universitarios, postgrado, máster, ingeniero, bachiller → `qualified = "apto"` sin importar nada más.
- **Regla B**: estudios técnico/FP/preuniversitario/básico/sin estudios → requiere `years_experience >= 2` Y experiencia relevante (negocios, gestión, o dueño de negocio no excluido) → `qualified = "apto"`.
- **Exclusión**: perfiles manuales sin gestión (fontanero, camarero, albañil, cocinero, etc.) → `qualified = "no apto"`.

`[fuente: Promt-Virginia.md, secciones "ÁRBOL DE DECISIÓN" y "TABLA DE VERIFICACIÓN RÁPIDA"]`

### Fase 3: Acción según resultado de cualificación

#### Si `qualified = "apto"`:
- Virginia propone agendar llamada con asesor humano.
- Si el lead acepta → llama a `check_availability` → propone horario según franja (mañana/tarde) → confirma con `book_appointment`.
- Variable `{fecha_agenda}` = fecha confirmada (formato `dd/mm/yy, HH:mm`).
- Variables resultantes: `estado = "agendado"`, `scheduled_call_confirmed = true`, `conversation_status = "closed"`.

#### Si `qualified = "no apto"`:
- Virginia informa amablemente que no cumple requisitos.
- Variables: `estado = "descartado"`, `motivo_descarte = "No cumple requisitos"`, `conversation_status = "closed"`.

#### Descartes por otros motivos:
- `motivo_descarte` toma uno de los valores enumerados (ver §3).

`[fuente: Promt-Virginia.md, secciones "PARTE 2: PROCESO DE AGENDA" y "REGLAS DE TRANSICIÓN"]`

### Fase 4: Sincronización de datos al CRM del cliente
- Todo el estado del lead (variables de cualificación, resumen de conversación, fecha de agenda) se envía de vuelta al CRM del cliente.
- El `{resumen_conversacion}` es un párrafo de 2-3 líneas en tercera persona con: estudios, profesión, años experiencia, edad, motivación, resultado (apto/no apto) y si se agendó (con fecha si existe). Solo para uso interno del asesor.

`[fuente: Promt-Virginia.md, sección "REGLA PARA variable resumen_conversacion"]`

### Fase 6: Seguimiento post-agenda (estados avanzados)
- `estado = "informado"`: asesor ha informado al lead con detalle, enviado link de pago de matrícula por WhatsApp.
- `estado = "matriculado"`: matrícula confirmada en CRM (pago realizado).
- Estos estados parecen ser gestionados por el asesor humano o una fase posterior del flujo no especificada en la spec actual.

`[fuente: VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx, sección "{estado}"]`

---

## 2. Esquema BD Supabase esperado

Fuente: `docs/Docs-entrega-clienta/Estructura/ARQUITECTURA DE BASE DE DATOS SUPABASE.docx`

### 2.1 Módulo de Identidad y Configuración (Multi-tenancy)

| Tabla | Campos clave | Propósito | Relaciones |
|-------|-------------|-----------|-----------|
| `tenants` | `id` (UUID), `name`, `config` (JSONB con keys de WhatsApp/VAPI/etc.), `domain` | Nodo raíz de multi-tenancy | Nodo raíz; casi todas las tablas tienen `tenant_id` FK aquí |
| `tenant_orchestrator_config` | Tiempos de espera, reintentos de llamadas, flags de automatización | Config del Orquestador/Flow Builder por empresa | FK a `tenants` |

### 2.2 Gestión de Leads (núcleo del negocio)

| Tabla | Campos clave | Propósito | Relaciones |
|-------|-------------|-----------|-----------|
| `lead` | `nombre`, `apellido`, `telefono`, `email`, `origen` (Facebook/WhatsApp/Web), `is_ai_enabled` (switch IA on/off), `ai_agent_id` | Datos de contacto de prospectos | FK a `ai_agents`; FK a `tenants` |
| `lead_cualificacion` | Interés, presupuesto, país, nivel de estudios, etc. (variables dinámicas extraídas por IA) | "Hechos" capturados durante la conversación | Relación 1:1 con `lead` |
| `lead_programas` | — | Relación lead ↔ cursos/masters de interés | Tabla de unión M:N entre `lead` y `programas` |

### 2.3 Inteligencia Artificial (Text & Voice Agents)

| Tabla | Campos clave | Propósito | Relaciones |
|-------|-------------|-----------|-----------|
| `ai_agents` | — | Definición general de un asistente (ej: "Bot de Admisiones") | FK a `tenant_id` |
| `voice_agents` | — | Definición del agente de voz | FK a `tenant_id` |
| `ai_agent_variants` | `prompt_text`, `model_name` (GPT-4o, Claude 3.5), `api_key`, `temperature`, `tracked_variables` | Config técnica real de IA; soporta tests A/B | M:1 con `ai_agents` |
| `voice_agent_variants` | (análogo a ai_agent_variants) | Config técnica del agente de voz | M:1 con `voice_agents` |

### 2.4 Comunicación y Logs

| Tabla | Campos clave | Propósito | Notas |
|-------|-------------|-----------|-------|
| `chat_summaries` | Conversación completa en una fila (formato `[HH:MM] Rol: texto\n`) | Historial consolidado, optimizado en coste | 1 fila por `lead_id` |
| `chat_messages` | Mensajes individuales (Inbound/Outbound) | Modelo legacy / eventos tiempo real | Se mantiene por compatibilidad |
| `llamadas` | `duracion_segundos`, `estado_llamada` (Completada/No contestada), `grabacion_url`, `transcripcion` | Registro de interacciones de voz | FK a `lead` y opcionalmente a advisor |
| `intentos_llamadas` | — | Registro de intentos individuales | FK a `llamadas` o `lead` |

### 2.5 Agendamientos y Disponibilidad

| Tabla | Campos clave | Propósito | Relaciones |
|-------|-------------|-----------|-----------|
| `appointments` / `agendamientos` | `fecha_inicio`, `estado` (Confirmada/Cancelada), `link_reunion` | Citas confirmadas entre lead y asesor | FK a `lead` y a advisor |
| `availability_slots` | Bloques de tiempo libre | Disponibilidad de asesores humanos para que IA agende | FK a advisor |

### 2.6 Orquestación y Flujos (Flow Builder)

| Tabla | Campos clave | Propósito |
|-------|-------------|-----------|
| `orchestration_graphs` | Posición de nodos y lógica de conexión (JSON) | Mapa visual de nodos/flechas del camino de un lead |
| `orchestration_rules` | Condiciones lógicas ("Si lead es de España Y tiene presupuesto, llamar ahora") | Motor de reglas del orquestador |
| `workflows` | Secuencias de automatización por tiempo ("Mandar mensaje a los 3 días") | Automatizaciones temporales |

### 2.7 Base de Conocimiento (RAG)

| Tabla | Campos clave | Propósito |
|-------|-------------|-----------|
| `knowledge_base` | Documentos fuente (PDFs, URLs, Textos) | Fuente de información para respuestas del agente IA |
| `knowledge_base_embeddings` | Vectores de significado | Búsqueda semántica en milisegundos |

### 2.8 Relaciones principales (diagrama según spec)
```
TENANTS ||--o{ LEAD
TENANTS ||--o{ AI_AGENTS
TENANTS ||--o{ PROGRAMAS
AI_AGENTS ||--o{ AI_AGENT_VARIANTS
LEAD ||--|| LEAD_CUALIFICACION
LEAD ||--o{ CHAT_SUMMARIES
LEAD ||--o{ LLAMADAS
LEAD ||--o{ APPOINTMENTS
LEAD }o--o{ PROGRAMAS
KNOWLEDGE_BASE ||--o{ KNOWLEDGE_BASE_EMBEDDINGS
ORCHESTRATION_GRAPHS ||--o{ ORCHESTRATION_RULES
```

`[fuente: ARQUITECTURA DE BASE DE DATOS SUPABASE.docx, completo]`

---

## 3. Nomenclatura oficial variables de leads

**Fuentes comparadas:**
- Archivo A: `docs/Docs-entrega-clienta/VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx` (raíz)
- Archivo B: `docs/Docs-entrega-clienta/Estructura/VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx`
- Archivo C: `docs/Docs-entrega-clienta/Promt-Virginia.md` (prompt activo del agente)

**Resultado de comparación:** Los archivos A y B son **idénticos** en contenido. El archivo C (prompt Virginia) contiene algunas variaciones de nomenclatura — señaladas abajo.

### Variables de identificación del lead

| Variable oficial (A/B) | Variable en prompt C | Tipo | Descripción |
|------------------------|---------------------|------|-------------|
| `{user_name}` | `{{user_name}}` | string | Nombre del lead |
| `{id_lead}` | `{{id_lead}}` | string/UUID | ID del sistema del lead |
| `{user_country}` | `{{user_country}}` | string | País del lead |
| `{user_phone}` | `{{user_phone}}` | string | Número de teléfono |
| `{curse_name}` | `{{curse_name}}` | string | Nombre del curso solicitado — **TYPO: debería ser `course_name`** |
| `{curse_origin}` | _(no aparece en C)_ | string | Origen del lead (web, Facebook ads, Google ads, etc.) |

### Variables de cualificación del lead

| Variable oficial (A/B) | Variable en prompt C | Tipo | Descripción |
|------------------------|---------------------|------|-------------|
| `{user_studies}` | `{{user_studies}}` | string | Estudios del lead (tipo + especialidad) |
| `{nivel_estudios}` | _(no aparece en C)_ | enum | Nivel: Postgrado/master, universitario, técnico, preuniversitario, básico, sin estudios |
| `{user_profession}` | `{{user_profesion}}` | string | Profesión actual — **DISCREPANCIA: A/B usa `profession`, C usa `profesion`** |
| `{user_age}` | `{{user_age}}` | number | Edad del lead |
| `{year_experience}` | `{{years_experience}}` | number | Años de experiencia — **DISCREPANCIA: A/B usa `year_experience` (singular), C usa `years_experience` (plural)** |
| `{user_motivations}` | `{{user_motivations}}` | string | Motivación del lead |
| `{qualified}` | `{{qualified}}` | enum | Cualificación: `"apto"` / `"no apto"` / `""` |
| `{regla_aplicada}` | `{{regla_aplicada}}` | enum | Regla interna aplicada para cualificación |

### Variables de estado del proceso

| Variable oficial (A/B) | Variable en prompt C | Tipo | Descripción |
|------------------------|---------------------|------|-------------|
| `{estado}` | `{{estado}}` | enum | Estado del lead: `""` / `"cualificado"` / `"agendado"` / `"informado"` / `"matriculado"` / `"descartado"` / `"ilocalizable"` |
| `{motivo_descarte}` | `{{motivo_descarte}}` | enum | Motivo de descarte (ver valores válidos en §1.4) |
| `{conversation_status}` | `{{conversation_status}}` | enum | `"continue"` / `"closed"` |
| `{scheduled_call_confirmed}` | `{{scheduled_call_confirmed}}` | boolean | true/false (NUNCA strings) |
| `{fecha_agenda}` | `{{fecha_agenda}}` | string | Fecha agenda: formato `DD/MM/AA, HH:MMh` (A/B) vs `dd/mm/yy, HH:mm` (C) — **DISCREPANCIA menor de formato** |
| `{resumen_conversacion}` | `{{resumen_conversacion}}` | string | Resumen interno de la conversación (nunca mostrado al lead) |

### Variables de preguntas respondidas (QA)

| Variable oficial (A/B) | Variable en prompt C | Tipo | Descripción |
|------------------------|---------------------|------|-------------|
| `{qa_handled}` | `{{qa_handled}}` | boolean | El lead ha hecho preguntas |
| `{qa_topic}` | `{{qa_topic}}` | enum | Tema de la pregunta — **DISCREPANCIA de valores**: A/B incluye "modalidad", "temario", "duración", "Fechas inicio/fin", "Validez/homologación", "Oficialidad"; C incluye "metodologia", "duracion", "salidas profesionales", "agenda", "otros" |

### Variables de zona horaria y agenda

| Variable oficial (A/B) | Variable en prompt C | Tipo | Descripción |
|------------------------|---------------------|------|-------------|
| `{country_user_time}` | _(no en C)_ | string | Hora en zona horaria del país del lead |
| `{current_time}` | _(no en C)_ | string | Hora actual en zona horaria del centro |
| `{preferred_user_date}` | _(no en C)_ | string | Preferencia de agenda del lead (fecha) |
| `{date_time_preferer_user}` | _(no en C)_ | string | Preferencia de agenda del lead (fecha+hora) |
| `{ok_whatsapp}` | _(no en C)_ | boolean | El lead en llamada acepta recibir WhatsApp |

### Herramientas de calendario (tools del agente)
- `book_appointment` — Agendar nueva cita (prompt C usa `book_appointmen` — **TYPO en C**)
- `cancel_appointment` — Cancelar cita existente
- `reschedule_appointment` — Cambiar fecha de cita
- `check_availability` — Consultar huecos libres

### Nota de la cliente sobre variables faltantes
El propio documento A/B contiene esta nota explícita de la cliente:
> "Faltan variables de agenda (días, horas, slot, ventanas, etc disponibles). ¿Hacen falta?"
> "Faltan también variables de RAG (fecha inicio, hora, beneficios, nombre master, descripción, precio, modalidad y cualquier otra Info. ¿Esto debe tener variables?)"

Estas preguntas sin responder son gaps de spec que requieren decisión.

`[fuente: VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx (ambos), sección "Faltan variables"]`

---

## 4. Prompt del agente IA Virginia

Fuente: `docs/Docs-entrega-clienta/Promt-Virginia.md`

### Identidad y rol
- **Nombre**: Virginia
- **Rol**: Asistente de admisiones en LinkStation
- **Canal**: voz + WhatsApp (mismo prompt para ambos canales)
- **Restricciones absolutas**: no inventa información, no altera lógica de negocio, no omite variables, no improvisa fuera del flujo.

### Objetivos (en orden)
1. Dar información del curso y del centro de manera comercial.
2. Cualificar al lead según criterios de admisión.
3. Si el lead es apto, gestionar agenda con un asesor.
4. Resolver dudas solo con información oficial (RAG).
5. Seguir exactamente el flujo conversacional.

### Estilo de comunicación
- Sin markdown, sin asteriscos, sin listas, sin saltos de línea, sin emojis.
- Un solo bloque de texto. Tono amable, claro, profesional y comercial.
- **PROHIBIDO**: confirmar en voz alta datos recibidos, anunciar pasos internos, hacer resúmenes del perfil, usar frases de transición que expongan el proceso ("voy a cualificarte", "ya tengo tus datos").
- El lead debe percibir ayuda, no un formulario.

### Restricciones clave del negocio
- Precios: empujar al asesor en primera mención. Solo dar rango ("entre X y Y euros") en segunda mención insistente.
- Máximo 3 preguntas consecutivas del lead antes de reconducir a agenda.
- Si pregunta si es IA: responder que sí, como "asistente virtual de admisiones con IA".
- Protocolo de rectificación: si el lead rectifica su titulación tras recibir "no apto", se puede reverificar UNA SOLA VEZ.

### Contexto institucional de Esden (para RAG)
- Escuela de negocios de Madrid, fundada 1996.
- Formación post-universitaria con metodología innovadora.
- Inmersiones internacionales exclusivas para alumnos.
- Alianzas: Instituto Marangoni, IMD, Harvard Business Publishing Education.

`[fuente: Promt-Virginia.md, completo]`

---

## 5. Menú lateral / navegación del dashboard

Fuente: `docs/Docs-entrega-clienta/Menú lateral app.docx`

Estructura de navegación requerida por la cliente:

```
Constructor & IA:
  - Constructor (Flow Builder visual)
  - Agentes AI
  - Knowledge Base
  - Agentes de Voz
  - Chatbot Web

Leads:
  - Resumen Leads
      → Vista de todos los leads con: número de llamadas, mensajes WhatsApp,
        resultado (apto/no apto/agendado/informado/etc.)
      → Referencia visual: https://airtable.com/appngn2RsYWbNE6BZ/pagTQ45P2IS6Nk28O/preview
        [NOTA: referencia es Airtable pero destino es Supabase — solo referencia UX]
      → Al hacer click en un lead: ver filas por cada impacto de contacto
        (llamadas, WhatsApp, etc. y resultado de cada uno)
  - Conversaciones WhatsApp (conversación completa, como aparece actualmente)
  - Calendario
  - Campañas (crear nuevas campañas, como estaba antes)

Métricas:
  - Llamadas
  - WhatsApp
  - Campañas
  - Historial

Pruebas y Logs:
  - Simulador Playground
  - Auditoría Logs

Negocio:
  - Análisis de Costes

Admin Panel:
  - Ajustes
  - Docs
```

`[fuente: Menú lateral app.docx, completo]`

---

## 6. Agente de voz + WhatsApp

### 6.1 Descripción funcional (del flujo de reunión)

Fuente: `reunion-incial-flujo-deseado.docx` (el PDF del agente es imagen sin texto extraíble).

El agente de voz + WhatsApp es la implementación de Virginia para ambos canales:

**Canal WhatsApp:**
- Activado cuando el lead está fuera de horario (fuera de 9am–9pm hora local).
- También activado cuando el lead en llamada indica preferencia por WhatsApp.
- Usa el mismo flujo de cualificación conversacional que el agente de voz.

**Canal Voz:**
- Activado cuando el lead está en horario (9am–9pm hora local).
- Implementado via Retell o Ultravox (mencionado en descripción del proyecto).
- Virginia conduce la conversación de cualificación.

**Protocolo de contacto multi-día:**
- Configurable por el cliente (número de días, intentos, canales).
- Secuencia de llamadas y WhatsApps hasta alcanzar al lead o marcarlo `ilocalizable`.

### 6.2 Notas sobre el PDF del agente (imagen no extraíble)

El archivo `Agente voz y whatsapp que cualifica.pdf` es un PDF de imagen (JPEG embedido, versión PDF 1.3). No tiene capa de texto extraíble. El contenido es presumiblemente un diagrama de flujo visual del agente, coincidente con el PNG `Flujo-agent-ia-voz-whatsapp.png`.

`[fuente: reunion-incial-flujo-deseado.docx; Agente voz y whatsapp que cualifica.pdf — no extraíble por texto, contenido visual]`

---

## 7. Diagrama de flujo (PNG)

Fuente: `docs/Docs-entrega-clienta/Fujos de Trabajo/Flujo-agent-ia-voz-whatsapp.png` (1705x1085px, RGBA)

### Descripción visual del diagrama

El PNG muestra un diagrama de flujo complejo del agente IA de voz y WhatsApp. La estructura general que se puede identificar:

- **Título**: "AGENTE DE IA CON VOZ y WhatsApp" (etiqueta amarilla top-left).
- **Entrada izquierda**: un elemento de datos (posiblemente base de datos/CRM) que representa la ingesta de leads.
- **Flujo principal**: múltiples ramas de decisión (rombos) que representan las condiciones de cualificación, horario, y estado del lead.
- **Nodos rectangulares**: acciones del agente (enviar mensaje, hacer llamada, agendar, etc.).
- **Nodos circulares**: estados o checkpoints del proceso.
- **Salidas múltiples**: distintos caminos de cierre (apto/agendado, no apto/descartado, ilocalizable).

### Presencia de "Airtable" en el diagrama

**DIVERGENCIA CONFIRMADA**: El diagrama PNG menciona o muestra referencias a "Airtable" en al menos un nodo (visible en el área de entrada/datos del lado izquierdo del diagrama). La resolución del PNG (263KB, imagen comprimida) no permite leer todo el texto, pero la referencia a Airtable es consistente con el hecho de que el nodo de la izquierda representa el CRM externo del cliente.

**Interpretación correcta según spec**: La cliente NO quiere Airtable como solución. La referencia en el diagrama es al CRM del cliente existente (Airtable era el CRM previo de Esden). El sistema debe usar **Supabase** como base de datos interna. La integración con el CRM externo del cliente (sea cual sea — Airtable, Salesforce, etc.) es via API/webhook, no una dependencia de arquitectura.

`[fuente: Flujo-agent-ia-voz-whatsapp.png — análisis visual multimodal; reunion-incial-flujo-deseado.docx — confirmación de Supabase como destino]`

---

## 8. Links externos

| Archivo | URL | Estado |
|---------|-----|--------|
| `Bea & Javi.url` | `https://fathom.video/share/X-P7CgviDfQSWi3ja8CXfsT79yMxpcjU` | Grabación de video de la reunión (132 min) — no consultado, solo si bloqueante |
| `Miro-Diagrama de flujo.url` | `https://miro.com/app/board/uXjVGXi6qhE=/` | Tablero Miro con diagrama de flujo — referenciado en reunión como "única fuente de verdad" visual — no consultado, requiere acceso |

**Nota**: El tablero de Miro fue identificado explícitamente en la reunión como la fuente visual autoritativa del flujo. Su contenido puede ser más completo que el PNG disponible localmente. Marcado como "pendiente consulta si los Fases 1-5 necesitan más detalle del flujo".

`[fuente: Bea & Javi.url; Miro-Diagrama de flujo.url — archivos INI leídos directamente]`

---

## 9. Conflictos detectados entre archivos cliente

### 2-001: Nombre de variable `user_profession` vs `user_profesion`
- **Archivo A/B** (VARIABLES DEFINIDAS): `{user_profession}` (con doble 's')
- **Archivo C** (Promt-Virginia.md): `{{user_profesion}}` (sin 's', con tilde implícita en nombre)
- **Impacto**: si el código usa uno y el prompt usa otro, los datos no mapean. Critico.

### 2-002: Nombre de variable `year_experience` vs `years_experience`
- **Archivo A/B**: `{year_experience}` (singular)
- **Archivo C**: `{{years_experience}}` (plural)
- **Impacto**: misma consecuencia que 2-001. Critico.

### 2-003: Typo en herramienta del agente
- **Archivo A/B**: `book_appointment` (correcto)
- **Archivo C**: `book_appointmen` (sin 't' final)
- **Impacto**: si el código implementa el nombre del A/B pero el prompt llama al del C, el tool call falla.

### 2-004: Typo en nombre de variable de curso
- **Archivos A/B/C**: `{curse_name}` — debería ser `{course_name}` en inglés.
- **Impacto**: si el código normaliza el typo, hay inconsistencia. Los tres archivos coinciden en el typo, por lo que **es la nomenclatura oficial de la cliente**, no un error a corregir sin consultar.

### 2-005: Valores de `{qa_topic}` divergen entre A/B y C
- **A/B**: `"precio"`, `"modalidad"`, `"temario"`, `"duración"`, `"Fechas inicio/fin"`, `"Validez/homologación"`, `"Oficialidad"`, `"Otras"`
- **C**: `"precio"`, `"becas"`, `"requisitos"`, `"duracion"`, `"metodologia"`, `"salidas profesionales"`, `"agenda"`, `"otros"`
- **Impacto**: conjuntos de valores diferentes. El prompt C es el que ejecuta el agente actualmente. No están sincronizados.

### 2-006: Formato de fecha en `{fecha_agenda}`
- **A/B**: `DD/MM/AA, HH:MMh`
- **C**: `dd/mm/yy, HH:mm`
- **Impacto**: diferencia menor pero puede afectar parsing en código.

### 2-007: Estado `"prematriculado"` en prompt C pero no en A/B
- **Archivo C** (Promt-Virginia.md, línea 73): `"prematriculado"` aparece como valor de `{estado}` con descripción "se ha dado información completa y el lead confirma interés, habiéndose enviado el link de matrícula por whatsapp".
- **Archivo A/B**: este estado NO aparece en la lista de valores de `{estado}`.
- **Impacto**: el prompt del agente tiene un estado que no está en la spec de variables oficial. Requiere aclaración.

### 2-008: Variable `{nivel_estudios}` en A/B pero no en C
- **A/B**: define `{nivel_estudios}` como variable separada con enum de niveles.
- **C**: no existe `{nivel_estudios}` como variable separada; el nivel va embebido en `{user_studies}`.
- **Impacto**: BD puede tener columna `nivel_estudios` sin fuente de datos clara.

---

## 10. Preguntas para la cliente

1. **Variables de agenda**: ¿Se deben implementar variables para slots disponibles, ventanas de agenda, etc.? (La propia spec lo menciona como pendiente.)
2. **Variables de RAG**: ¿El nombre del máster, precio, modalidad, fechas de inicio, etc. deben estar como variables en el sistema o solo en el RAG? (Mencionado como pendiente en spec.)
3. **`{nivel_estudios}` vs embebido en `{user_studies}`**: ¿Es una columna separada en BD o va dentro del texto de `user_studies`?
4. **Estado `"prematriculado"`**: ¿Es un estado válido del sistema o es un vestigio del borrador del prompt?
5. **Nomenclatura canónica**: ¿`user_profession` o `user_profesion`? ¿`year_experience` o `years_experience`? ¿`book_appointment` o `book_appointmen`?
6. **CRM externo**: ¿Con qué CRM del cliente se integra el sistema actualmente? ¿Airtable, Salesforce, otro? ¿Via API REST, webhook, o ambos?
7. **Tablero Miro**: ¿El diagrama de Miro está actualizado como única fuente de verdad del flujo? ¿Se puede compartir acceso de solo lectura para el audit?
8. **Protocolo de contacto multi-día**: ¿Cuál es la secuencia concreta configurable? ¿Cuántas llamadas, cuántos WhatsApps, en qué intervalos?
9. **Grabación de reunión (Fathom)**: ¿El link de Fathom es accesible para el equipo de audit?
10. **Estados avanzados (`informado`, `matriculado`)**: ¿Quién los actualiza? ¿El asesor humano manualmente en el dashboard, o hay automatización?

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Spec normalizada extraída de todos los archivos disponibles. El PDF del agente de voz es imagen sin texto extraíble (contenido asumido equivalente al PNG). Se detectaron 8 conflictos internos entre archivos de la cliente y 10 preguntas sin respuesta en la spec.
**Concerns/Blockers:**
- `Agente voz y whatsapp que cualifica.pdf` es imagen — no extraíble por texto. Contenido asumido coincidente con PNG pero no verificable sin OCR.
- Tablero Miro y grabación Fathom no consultados (requieren acceso externo). El Miro fue designado "única fuente de verdad visual" en la reunión — las Fases 1-5 deberían consultarlo si necesitan más detalle del flujo.
- 5 discrepancias de nomenclatura de variables entre spec A/B y prompt C activo — riesgo alto de bugs en integración.
