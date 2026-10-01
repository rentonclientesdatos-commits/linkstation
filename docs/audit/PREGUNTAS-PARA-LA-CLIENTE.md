---
title: "Preguntas pendientes para la cliente"
date: 2026-05-19
audience: cliente y equipo no técnico
type: open-questions
status: LIVING_DOCUMENT
sources:
  - audit/00-client-spec-extraction.md (sección 10)
  - audit/00-known-divergences.md (3-004 a 3-009)
  - audit/gap-analysis-spec-vs-code.md (sección final)
  - audit/COMPARATIVA-INFORME-PROGRAMADOR-V3.5.md
  - audit/STACK-DECISION-DRIZZLE-MIGRATION.md
---

# Preguntas pendientes para la cliente

## Para qué sirve este documento

Durante la auditoría del sistema hemos encontrado **decisiones que el equipo técnico no puede tomar solo** porque dependen de cómo funciona tu negocio en realidad, no de cómo está escrito el código. Este documento las recoge todas en lenguaje claro.

**Cada pregunta tiene tres partes:**
1. **La pregunta** — qué necesitamos saber.
2. **Por qué importa** — qué pasa si la respuesta es A o B.
3. **Cuándo necesitamos la respuesta** — algunas bloquean trabajo urgente, otras pueden esperar.

**Es un documento vivo:** cuando tengamos una respuesta confirmada, la marcamos en el documento y se cierra la pregunta.

---

## 🔴 Bloque 1 — Preguntas urgentes (bloquean trabajo de esta semana)

Estas tres preguntas necesitan respuesta antes de poder ejecutar las correcciones de seguridad. Sin respuesta, no podemos avanzar.

### P-001 — ¿Hay clientes reales usando el sistema en este momento?

**Por qué importa:** la auditoría ha encontrado problemas de seguridad que permiten que un usuario registrado vea o borre datos de otros clientes. Si hay clientes activos ahora mismo, hay que avisarles antes de tocar nada y actuar con más cuidado. Si todavía no hay clientes en producción, las correcciones pueden hacerse con menos restricciones y más rápido.

**Necesitamos saber:**
- Cuántos clientes están dados de alta y entrando al sistema cada semana.
- Si alguno tiene leads reales (no de prueba) dentro.
- Si hay acuerdo de nivel de servicio (SLA) firmado con alguno.

**Cuándo:** **antes de empezar Sprint 0** (esta semana).

---

### P-002 — ¿Quién tiene o ha tenido acceso al código fuente del proyecto?

**Por qué importa:** las contraseñas que dan acceso de administrador a tu base de datos están escritas dentro del propio código. Eso quiere decir que **cualquier persona que haya tenido acceso al repositorio en GitHub** tiene acceso técnico a todos los datos de tus clientes hasta enero de 2030.

Necesitamos hacer una lista de personas:
- Desarrolladores actuales del proyecto.
- Desarrolladores antiguos que ya no trabajan en él.
- Empresas o autónomos contratados puntualmente.
- Personas que hayan recibido el código en un archivo ZIP por correo o servicios de transferencia.

**Por qué insisto:** rotar las contraseñas (lo haremos en Sprint 0) invalida las antiguas. Pero **si alguien las copió fuera del repositorio** mientras eran válidas, puede que haya hecho copias de datos sin que nos enteremos. Saber a quién hay que confiar (y a quién no) cambia la urgencia.

**Necesitamos saber:**
- Lista de personas con acceso al repositorio `LinkStation/linkstation-dashboard` en GitHub.
- Lista de personas que han recibido el código por otro medio (ZIP, etc.).
- Si alguna de esas personas ya no debería tener acceso.

**Cuándo:** **antes de la rotación de credenciales** (Sprint 0, esta semana).

---

### P-003 — ¿Podemos hacer una ventana de mantenimiento de 30 minutos?

**Por qué importa:** rotar las contraseñas comprometidas requiere reiniciar la aplicación. Durante esos minutos, el sistema no responde. Si hay clientes usándolo ahora mismo, lo notarán.

**Necesitamos saber:**
- Día y hora preferidos (por ejemplo, sábado madrugada).
- Si hay que avisar a clientes con antelación.

**Cuándo:** **antes de ejecutar Sprint 0**.

---

## 🟠 Bloque 2 — Preguntas sobre las reglas de negocio (cualificación de leads)

El sistema decide si un lead es "apto" para entrar al curso/máster aplicando unas reglas. La auditoría ha encontrado que **las reglas del código no coinciden con las que están escritas en tu documentación**. Necesitamos confirmar cuál es la versión correcta.

### P-004 — Regla B: ¿2 o 3 años de experiencia?

**Lo que dice tu documento del prompt de Virginia:**
> "Si el lead tiene formación técnica/FP y **2 años o más** de experiencia relevante → APTO"

**Lo que hace el código:**
> "Si el lead tiene formación técnica/FP y **3 años o más** de experiencia relevante → APTO"

**Consecuencia práctica:** un lead que diga "soy técnico con 2 años de experiencia" debería ser apto según tu documento, pero el código lo está rechazando.

**Pregunta:** ¿el umbral correcto es **2 años o 3 años**?

**Cuándo:** antes del Sprint 0 (próximas 2 semanas).

---

### P-005 — Regla C: ¿existe la regla "sin estudios + 5 años de experiencia"?

**Lo que hace el código:** si un lead no tiene estudios pero tiene 5 o más años de experiencia, lo marca como apto.

**Lo que dice tu documento:** esa regla **no aparece**. Tu documento solo menciona Regla A (universitarios) y Regla B (técnicos con experiencia).

**Pregunta:**
- ¿Esa Regla C es legítima y olvidaste documentarla?
- ¿O es un invento del programador y hay que eliminarla?

**Por qué importa:** si Regla C no es legítima, el sistema está aceptando leads que tú no consideras aptos para el curso.

**Cuándo:** antes del Sprint 0.

---

### P-006 — Exclusiones de profesiones manuales (fontaneros, albañiles, etc.)

**Lo que dice tu documento:**
> "Excluir leads cuya profesión sea de oficios manuales (fontanero, albañil, etc.)."

**Lo que hace el código:** **no aplica esta exclusión**. Un fontanero con 3 años de experiencia técnica entraría como apto.

**Pregunta:** ¿confirmas que quieres aplicar esta exclusión y, si es así, cuál es la lista completa de profesiones a excluir?

**Sugerencia:** mejor pasar de "lista de exclusión" a "lista de inclusión" — más fácil de mantener y más justo. Pero es tu decisión.

**Cuándo:** antes del Sprint 0.

---

### P-007 — Estado "prematriculado"

**Lo que dice tu documento:** en la línea 73 del prompt de Virginia aparece un estado llamado "prematriculado".

**Lo que hace el código:** no lo gestiona. Si un lead llega a ese estado, no pasa nada — se queda guardado pero no dispara ninguna acción.

**Pregunta:**
- ¿Es un estado válido que sí debería existir y disparar algo (por ejemplo, recordatorio de pago)?
- ¿O era un borrador del prompt que se quedó por descuido?

**Cuándo:** Sprint 0 o 2.

---

## 🟡 Bloque 3 — Cómo se llaman las cosas (nomenclatura)

Esto suena menor, pero **es lo que hace que tus datos pasen bien al CRM externo o no**. Si en el código el campo se llama de una forma y en tu CRM (Zoho u otro) se llama de otra, los datos no se mapean.

### P-008 — `user_profession` (con doble s) o `user_profesion` (sin doble s)

**El problema:** en tus propios documentos aparecen las dos grafías.
- Tu documento *"VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx"* usa `user_profession` (con doble s, inglés correcto).
- Tu documento *"Promt-Virginia.md"* usa `user_profesion` (sin doble s, parece spanglish).

El código usa `USER_PROFESION` (sin doble s).

**Pregunta:** ¿cuál es la grafía oficial? Una vez decidida, **se actualizan los tres documentos a la vez** y se ajusta el código.

**Importancia:** afecta a la sincronización con cualquier CRM externo.

**Cuándo:** Sprint 1 o 3.

---

### P-009 — `year_experience` (singular) o `years_experience` (plural)

**El problema:** la documentación oficial usa `year_experience` (singular), pero el prompt de Virginia usa `years_experience` (plural). El código tiene **cuatro variantes diferentes** que coexisten (`years_experience`, `YEARS_EXPERIENCE`, `YEARS_EXPERIENCIE` con typo, y `YEARS_ EXPERIENCIE` con un espacio en medio del nombre).

**Pregunta:** ¿cuál es la grafía correcta?

**Recomendación técnica:** `years_experience` (plural). Es la convención en inglés y es la que más usa el código.

**Cuándo:** Sprint 1 o 3.

---

### P-010 — `curse_name` o `course_name`

**El problema:** tu documento oficial usa `curse_name` (con "u"). Eso parece un typo del inglés correcto que es `course_name` (con "ou"). El código tiene las dos.

**Pregunta:**
- ¿Mantener `curse_name` porque ya está así en tu CRM y cambiarlo rompería integraciones?
- ¿O corregir a `course_name` (más correcto) y actualizar también el CRM?

**Cuándo:** Sprint 1 o 3. No es urgente, pero conviene cerrarlo antes de la sincronización con CRM externo.

---

### P-011 — Valores aceptados para "cualificado": ¿`apto`/`no apto` o algo distinto?

**Lo que dice tu documento del prompt Virginia:**
> El agente devuelve `qualified = "apto"` o `qualified = "no apto"` o `""` (vacío si todavía está cualificando).

**Lo que hace el código:** tiene **tres sistemas diferentes** que coexisten:
- En unas partes guarda `"si"`, `"no"` o `"anulado"`.
- En otras partes guarda `"SI"`, `"NO"` o `"PENDIENTE"`.
- En otras partes guarda `"cualificado"` o `"no cualificado"`.

**Ninguno** de los tres coincide con lo que tu documento dice (`"apto"`/`"no apto"`).

**Pregunta:** ¿confirmas que los valores correctos son `"apto"` / `"no apto"` / `""`?

**Importancia: CRÍTICA.** Esto está afectando ahora mismo a cómo se clasifican los leads en tu base de datos. El día que conectemos al CRM externo, ningún valor de los tres del código coincidirá con lo que el CRM espera.

**Cuándo:** lo antes posible. Idealmente en Sprint 0.

---

### P-012 — Columna `nivel_estudios` en la base de datos

**El problema:** en la base de datos existe una columna llamada `nivel_estudios` (con valores tipo "FP", "Grado universitario", "Sin estudios"). Pero la IA no la rellena nunca — los datos van a otro sitio.

**Pregunta:**
- ¿Esa columna debe existir y la IA debe rellenarla?
- ¿O era un experimento antiguo y se puede eliminar?

**Cuándo:** Sprint 1 (decisión de limpieza de base de datos).

---

## 🔵 Bloque 4 — Cómo se hace el seguimiento a los leads

Aquí preguntamos sobre el flujo operativo. Cómo el sistema contacta a los leads, cuándo, en qué orden.

### P-013 — Protocolo de contacto multi-día: ¿cuántos contactos, en qué intervalos?

**Lo que dice tu documento:** el sistema debe contactar al lead varios días seguidos si no responde el primer día (llamada → WhatsApp → otra llamada al día siguiente, etc.).

**Lo que hace el código:** **solo se ejecuta el contacto del primer día**. Los contactos de día 2, día 3, etc. están técnicamente rotos por un bug y nunca se ejecutan en producción (ver finding F-02-001 en el informe).

**Pregunta:**
- ¿Cuántos contactos en total queremos hacer a un lead que no responde?
- ¿En qué orden (llamada, WhatsApp, llamada de nuevo)?
- ¿Con qué intervalo de tiempo entre cada uno?

**Importancia:** la respuesta define cómo configuramos el orquestador cuando arreglemos el bug.

**Cuándo:** Sprint 0.

---

### P-014 — Sincronización con CRM externo: ¿añadir o sobrescribir datos?

**Lo que dice tu documento:** "Agregar al CRM, no sobrescribir lo que ya está."

**Lo que hace el código:** lo intenta, pero no está garantizado al 100%. En algunos casos puede sobrescribir.

**Pregunta:**
- Si un lead ya existe en tu CRM con ciertos datos, y nuestro sistema tiene datos nuevos para ese lead, ¿qué pasa?
  - **Opción A:** los datos nuevos se añaden como campos adicionales sin tocar los que ya estaban.
  - **Opción B:** los datos nuevos reemplazan a los antiguos.
  - **Opción C:** depende del campo (algunos sí, otros no).

**Cuándo:** Sprint 1.

---

### P-015 — Estados "informado" y "matriculado"

**Lo que dice tu documento:** existen estados llamados "informado" y "matriculado", pero no especifica si los actualiza un asesor humano manualmente o si el sistema lo hace automáticamente.

**Lo que hace el código:** **no los gestiona**. No existen en el orquestador.

**Pregunta:**
- ¿Esos estados los rellena un asesor humano desde el panel?
- ¿O queremos que el sistema los detecte automáticamente (por ejemplo, "matriculado" cuando se confirme el pago)?

**Cuándo:** Sprint 1 o 3.

---

### P-016 — Llamadas con Ultravox: ¿analizamos lo que se dijo al final?

**Contexto:** el sistema tiene dos proveedores de llamada de voz: Retell y Ultravox.

**Lo que hace con Retell:** cuando termina la llamada, recibe la transcripción, la analiza y actualiza el estado del lead (apto / no apto / etc.).

**Lo que hace con Ultravox:** la llamada se hace, pero **nunca se analiza la transcripción**. La llamada se "olvida" en cuanto cuelga.

**Pregunta:**
- ¿Queremos que Ultravox haga lo mismo que Retell (analizar al final)?
- ¿O Ultravox tiene un propósito diferente?

**Cuándo:** Sprint 1 o 3.

---

## 🟢 Bloque 5 — El agente Virginia (la IA)

### P-017 — El typo `book_appointmen` (sin la 't' final)

**El problema:** en tu documento del prompt de Virginia, la herramienta para agendar citas aparece dos veces como `book_appointmen` — le **falta la 't' final**. Lo correcto sería `book_appointment`.

El código tiene `book_appointment` (correcto). Pero si en algún momento alguien actualiza el prompt desde tu documento (copiando y pegando), el typo entrará en la base de datos y **las citas dejarán de agendarse automáticamente**.

**Pregunta:**
- ¿Corregimos el typo en tu documento fuente (`Promt-Virginia.md`) ahora para que no vuelva a entrar?

**Recomendación: sí**, es un cambio de 2 segundos y elimina una bomba de relojería.

**Cuándo:** ya. Solo necesitamos tu OK por escrito.

---

### P-018 — ¿El prompt actual de Virginia es la versión definitiva?

**Contexto:** el documento `Promt-Virginia.md` que nos entregaste tiene 945 líneas. Eso es **mucho** prompt para un agente de WhatsApp/voz — añade latencia (cada mensaje tarda más en responder), aumenta costes de OpenAI y dificulta el mantenimiento.

**Pregunta:**
- ¿Has iterado y este es el resultado final, o todavía hay margen para acortar?
- ¿Quieres que hagamos una propuesta de optimización (versión más corta, mismo comportamiento) para revisar?

**Cuándo:** Sprint 1 o 3.

---

### P-019 — Pruebas con leads reales antes de ampliar

**Pregunta:** ¿quieres que organicemos una fase de pruebas con un grupo pequeño y controlado de leads reales **antes de escalar el sistema a más volumen**?

**Por qué importa:** ahora mismo tenemos varios módulos rotos en silencio (ver findings). Hasta que se arreglen, escalar significa exponer más datos al problema. Una fase de pruebas controlada con 20-50 leads permitirá validar que las correcciones funcionan antes de procesar miles.

**Cuándo:** después de Sprint 0 (cuando los hotfixes de seguridad estén aplicados).

---

## 🟣 Bloque 6 — Integraciones con sistemas externos

### P-020 — ¿Qué CRM externo es el destino actual? ✅ RESPONDIDA

**Lo que sabemos:** el diagrama que entregaste menciona Airtable, pero en una conversación previa indicaste que **Airtable era el CRM previo de Esden, no el actual**. La auditoría confirma que el código **no usa Airtable** en ningún sitio.

**Pregunta:**
- ¿Cuál es el CRM destino actual? ¿Zoho, HubSpot, Salesforce, otro?
- ¿Cómo nos conectamos? ¿API REST, webhook, exportación manual?

**Cuándo:** Sprint 1 o 3.

> ✅ **Respondida 2026-05-19 por Javier HP (Auditor)** — Ver [R-020 en el Registro de decisiones](DECISIONES-AUDITOR-JAVIER-HP.md#r-020).

---

### P-021 — Datos antiguos en Airtable ✅ RESPONDIDA

**Pregunta:** los datos de leads que ya existían en Airtable cuando arrancó este proyecto:
- ¿Se migraron al nuevo sistema?
- ¿Siguen archivados solo en Airtable como histórico?
- ¿Es información que queremos integrar en un futuro?

**Cuándo:** Sprint 2 o más adelante.

> ✅ **Respondida 2026-05-19 por Javier HP (Auditor)** — Ver [R-021 en el Registro de decisiones](DECISIONES-AUDITOR-JAVIER-HP.md#r-021).

---

### P-022 — Variables de agenda y RAG (Knowledge Base) ✅ RESPONDIDA

**Contexto:** el sistema tiene un "Knowledge Base" — un módulo que la IA usa para responder preguntas del lead consultando documentos PDF que tú subes al sistema (precios, temarios, modalidades).

Tu propio documento marca estas variables como "pendientes de definición":
- Slots disponibles para agendar (¿en qué franjas horarias?)
- Nombre del master/curso al que se redirige.
- Precio actualizado.
- Fechas de inicio del próximo curso.

**Pregunta:**
- ¿Tenemos esos datos ya definidos para los cursos actuales?
- ¿Quién va a mantenerlos actualizados a futuro? ¿Lo subes tú al sistema o lo hace el equipo técnico?

**Cuándo:** Sprint 2.

> ✅ **Respondida 2026-05-19 por Javier HP (Auditor)** — Ver [R-022 en el Registro de decisiones](DECISIONES-AUDITOR-JAVIER-HP.md#r-022).

---

## ⚙️ Bloque 7 — Infraestructura y equipo

### P-023 — Acceso superuser a la base de datos Postgres ✅ RESPONDIDA

**Por qué lo preguntamos:** para arreglar correctamente el problema de seguridad de las contraseñas, necesitamos crear un usuario nuevo de base de datos con permisos limitados (en vez de usar el usuario "superadministrador" actual, que es demasiado poderoso).

**Pregunta:**
- ¿Tenemos acceso al panel de Supabase como propietario de la cuenta (no como miembro)?
- ¿O necesitamos que alguien de Esden lo haga por nosotros?

**Cuándo:** Sprint 0.

> ✅ **Respondida 2026-05-19 por Javier HP (Auditor)** — Ver [R-023 en el Registro de decisiones](DECISIONES-AUDITOR-JAVIER-HP.md#r-023).

---

### P-024 — ¿El equipo de desarrollo actual continúa?

**Esta es la pregunta más delicada del documento.**

El programador actual ha entregado un informe técnico (v3.5) que afirma que el sistema está "completamente balanceado, securizado y optimizado para producción". La auditoría externa ha encontrado que **al menos 9 afirmaciones concretas de ese informe son demostrablemente falsas** (cualquiera puede comprobarlo en 5 minutos con los comandos que están en el informe de comparativa).

Esto no significa necesariamente que actuara con mala fe — puede ser falta de método (afirmar "ya está hecho" sin verificarlo). Pero el patrón es preocupante: las cosas que el informe declara como "corregidas" siguen estando rotas en producción ahora mismo.

**Pregunta:**
- ¿El mismo equipo va a ejecutar las correcciones del Sprint 0 y la consolidación de la capa de datos (Fase 1, sin ORM nuevo — la propuesta original de Drizzle fue anulada el 20-05-2026)?
- ¿O quieres contratar refuerzo externo / cambiar de equipo?

**Si la respuesta es "el mismo equipo continúa":** recomendamos imponer **3 condiciones de método** para evitar que pase lo mismo:
1. Tests automáticos obligatorios por cada finding cerrado.
2. Revisión externa del código antes de marcar nada como "terminado".
3. Lista de comandos `grep` ejecutables que cualquiera puede correr para verificar.

**Cuándo:** **antes de empezar Sprint 0**.

> ✅ **Respondida 2026-05-19 por Javier HP (Auditor)** — Ver [R-024 en el Registro de decisiones](DECISIONES-AUDITOR-JAVIER-HP.md#r-024).

---

### P-025 — Pausa en ventas durante las 6-8 semanas de correcciones

**Pregunta:**
- ¿Aceptas pausar la captación de nuevos clientes durante las 6-8 semanas que durará el plan de correcciones (Sprint 0 + Sprint 0 + Sprint 1)?

**Por qué importa:** mientras el problema de aislamiento entre clientes esté abierto, cada cliente nuevo expone al resto. Cerrar la pausa demasiado pronto significa volver a tener el problema con más datos comprometidos.

**Alternativa:** mantener captación pero limitada a clientes piloto controlados, no a clientes productivos completos.

**Cuándo:** antes de Sprint 0.

> ✅ **Respondida 2026-05-19 por Javier HP (Auditor)** — Ver [R-025 en el Registro de decisiones](DECISIONES-AUDITOR-JAVIER-HP.md#r-025).

---

## 📋 Resumen ejecutivo — todas las preguntas en una tabla

| # | Pregunta | Categoría | Urgencia | Bloquea |
|---|---|---|---|---|
| P-001 | ¿Hay clientes reales usando el sistema? | Estado | 🔴 Urgente | Sprint 0 |
| P-002 | ¿Quién tiene/tuvo acceso al repo de código? | Seguridad | 🔴 Urgente | Sprint 0 |
| P-003 | ¿Ventana de mantenimiento de 30 min? | Operativa | 🔴 Urgente | Sprint 0 |
| P-004 | Regla B: ¿2 o 3 años? | Negocio | 🟠 Alta | Sprint 0 |
| P-005 | ¿Regla C (sin estudios + 5 años) es legítima? | Negocio | 🟠 Alta | Sprint 0 |
| P-006 | ¿Exclusiones de profesiones manuales? | Negocio | 🟠 Alta | Sprint 0 |
| P-007 | Estado "prematriculado": ¿válido o vestigio? | Negocio | 🟡 Media | Sprint 1 |
| P-008 | `user_profession` o `user_profesion`? | Nomenclatura | 🟡 Media | Sprint 1-3 |
| P-009 | `year_experience` o `years_experience`? | Nomenclatura | 🟡 Media | Sprint 1-3 |
| P-010 | `curse_name` o `course_name`? | Nomenclatura | 🟡 Media | Sprint 1-3 |
| P-011 | Valores de `qualified`: ¿`apto`/`no apto`? | Nomenclatura | 🟠 Alta | Sprint 0 |
| P-012 | Columna `nivel_estudios`: ¿se usa? | Nomenclatura | 🟡 Media | Sprint 1 |
| P-013 | Protocolo multi-día: ¿cuántos contactos? | Operativa | 🟠 Alta | Sprint 0 |
| P-014 | Sync CRM: ¿añadir o sobrescribir? | Integración | 🟡 Media | Sprint 1 |
| P-015 | Estados "informado"/"matriculado": ¿auto o manual? | Operativa | 🟡 Media | Sprint 1-3 |
| P-016 | Ultravox: ¿analizar transcripción al final? | Operativa | 🟡 Media | Sprint 1-3 |
| P-017 | Typo `book_appointmen`: ¿corregir en doc fuente? | IA | 🟢 Baja | Cualquier momento |
| P-018 | ¿Prompt Virginia es la versión definitiva? | IA | 🟢 Baja | Sprint 1-3 |
| P-019 | ¿Fase de pruebas controlada antes de escalar? | Operativa | 🟡 Media | Post-Sprint 0 |
| P-020 ✅ | ¿Qué CRM externo es el destino actual? | Integración | — | Multi-CRM (5 conectores) — [R-020](DECISIONES-AUDITOR-JAVIER-HP.md#r-020) |
| P-021 ✅ | Datos antiguos en Airtable: ¿migrar o archivar? | Integración | — | Migrar a Supabase — [R-021](DECISIONES-AUDITOR-JAVIER-HP.md#r-021) |
| P-022 ✅ | Variables agenda/RAG: ¿quién las mantiene? | IA | — | Equipo dev — [R-022](DECISIONES-AUDITOR-JAVIER-HP.md#r-022) |
| P-023 ✅ | ¿Acceso superuser BD Postgres? | Infraestructura | — | Self-hosted Coolify — [R-023](DECISIONES-AUDITOR-JAVIER-HP.md#r-023) |
| P-024 ✅ | ¿Mismo equipo de desarrollo continúa? | Equipo | — | Sí, con condiciones — [R-024](DECISIONES-AUDITOR-JAVIER-HP.md#r-024) |
| P-025 ✅ | ¿Pausa de ventas 6-8 semanas? | Negocio | — | Pausa completa — [R-025](DECISIONES-AUDITOR-JAVIER-HP.md#r-025) |

---

## 🟢 Bloque 8 — Decisiones tomadas (resumen)

Las respuestas detalladas se mantienen en un documento separado: [**`DECISIONES-AUDITOR-JAVIER-HP.md`**](DECISIONES-AUDITOR-JAVIER-HP.md) — registro oficial firmado por el Auditor.

### Decisiones tomadas hasta ahora

| Pregunta | Decisión | Impacto |
|---|---|---|
| [R-020](DECISIONES-AUDITOR-JAVIER-HP.md#r-020) + [v2](DECISIONES-AUDITOR-JAVIER-HP.md#r-020-refinement-v2) | Multi-CRM top 5 (HubSpot, Zoho, Salesforce, GHL, ActiveCampaign). **MVP Fase 2 = HubSpot + Zoho** (Google Sheets bidireccional aplazado a Fase 4 post-release) | Fase 2 reducida a 2-3 sem; Sheets y resto del top 5 en Fase 4 |
| [R-021](DECISIONES-AUDITOR-JAVIER-HP.md#r-021) | Migrar leads de Airtable a Supabase | Sub-proyecto en Sprint 1-3 |
| [R-022](DECISIONES-AUDITOR-JAVIER-HP.md#r-022) | Equipo dev mantiene contenido KB | +5-7 días panel admin + carga operativa continua |
| [R-023](DECISIONES-AUDITOR-JAVIER-HP.md#r-023) | Supabase self-hosted en Coolify | 3 sub-preguntas derivadas |
| [R-024](DECISIONES-AUDITOR-JAVIER-HP.md#r-024) | Mismo equipo + 3 condiciones de método | Tests + revisión externa + greps pre-merge |
| [R-025](DECISIONES-AUDITOR-JAVIER-HP.md#r-025) | Pausa de ventas 6-8 semanas | Sprint 0+1+2 sin clientes nuevos |

### Resueltas previamente

**R-001 — Airtable como destino de datos:** Airtable era el CRM previo. El sistema actual usa Supabase. La aparición de Airtable en el diagrama era residual. Confirmado en el cruce código + spec cliente del audit (gap G-07).

---

## Cómo usar este documento

1. **Lee las preguntas del Bloque 1** primero. Son las que bloquean Sprint 0.
2. **Responde lo que puedas** y déjanos saber qué necesitas consultar con tu equipo interno.
3. **Las preguntas sin respuesta** las marcamos en el documento — no asumimos.
4. **Cuando una pregunta se resuelva**, se mueve al Bloque 8 con la fecha y la decisión final.

**Para responder, puede usar cualquier canal:** correo, llamada, mensaje. Una vez respondida, el equipo técnico la documenta aquí.

---

**Status:** LIVING_DOCUMENT — se actualiza cuando llegan respuestas.
**Última revisión:** 2026-05-19.
**Total preguntas:** 25 + 7 derivadas nuevas = 32.
**Resueltas:** 6 (P-020, P-021, P-022, P-023, P-024, P-025) — firmadas por Javier HP (Auditor).
**Pendientes:** 19 originales + 7 derivadas = 26.

> 📋 El detalle de cada respuesta con implicaciones está en [`DECISIONES-AUDITOR-JAVIER-HP.md`](DECISIONES-AUDITOR-JAVIER-HP.md).
