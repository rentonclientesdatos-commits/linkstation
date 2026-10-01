# Google Sheets como CRM — guía de configuración (tenant)

> Sprint 4 (post-MVP). Esta guía está dirigida al **tenant final** (academia / centro de formación) que quiera usar Google Sheets como su sistema CRM en lugar de HubSpot/Zoho/etc.

## Por qué cada tenant trae su propia app

Al contrario que HubSpot o Zoho (que comparten una app OAuth centralizada de LinkStation), Google Sheets exige que **cada tenant registre su propia aplicación** en Google Cloud Console. Esto es una decisión arquitectónica deliberada (27-05-2026):

- **Cuota Sheets API por proyecto Cloud**: 300 read/min, 60 write/min. Si todos los tenants compartieran nuestra app, una academia con 10k filas/día bloquearía al resto. Con app propia, cada tenant gestiona su propia cuota.
- **OAuth Verification**: una app Google con >100 usuarios externos necesita pasar la verificación oficial de Google (semanas, política privacidad, dominio verificado, etc). Apps de tenant individual NO requieren verification (≤100 usuarios) → cero fricción.
- **Privacidad**: el consent screen dice "Tu Academia quiere acceder a tus Sheets", no "LinkStation quiere acceder a tus Sheets". Mejor confianza.
- **Soberanía de datos**: la relación con Google la tiene la academia, no Automatiza. Si la academia cancela, sus tokens mueren con su proyecto Cloud.

## Pasos

Tiempo total: **5–10 minutos**. Solo se hace **una vez** por tenant.

### 1. Crear proyecto en Google Cloud Console

1. Ir a <https://console.cloud.google.com/>.
2. Iniciar sesión con la cuenta Google de la academia (recomendado: cuenta administrativa, no personal).
3. Arriba a la izquierda, abrir el desplegable de proyectos → **NEW PROJECT**.
4. Rellenar:
   - **Project name**: `Academia <NombreTuAcademia> — CRM Sheets` (ejemplo: `Academia Esden — CRM Sheets`).
   - **Organization** / **Location**: si tu cuenta tiene workspace empresarial, déjalo. Si es personal, "No organization".
5. **CREATE** y espera ~30 segundos a que el proyecto se aprovisione. Asegúrate de que está seleccionado como proyecto activo (selector arriba a la izquierda).

### 2. Habilitar las APIs necesarias

1. En el menú lateral → **APIs & Services** → **Library**.
2. Buscar y habilitar (una por una):
   - **Google Sheets API** → Enable.
   - **Google Drive API** → Enable.
   - **Google Picker API** → Enable.

### 3. Configurar OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**.
2. **User Type**:
   - Si tu academia tiene **Google Workspace** corporativo → elige **Internal** (solo tu organización). Lo más simple.
   - Si usas Gmail genérico → elige **External**.
3. **App information**:
   - **App name**: `<NombreTuAcademia> CRM Connector`.
   - **User support email**: el email de soporte de la academia.
   - **App logo**: opcional.
4. **App domain** (solo si External): podéis dejarlo en blanco salvo el campo `Application home page` y `Developer contact email`.
5. **Scopes**: NO añadáis ningún scope manualmente aquí. Los scopes los pide nuestra aplicación en runtime. Pulsa **Save and continue**.
6. **Test users** (solo si External): añadid el email de la cuenta Google que vais a usar para conectar Sheets. Si no, no podréis hacer login mientras la app esté en modo Testing.
7. Pulsa **Back to dashboard**.

> **Nota Externa / Testing**: si elegiste External, la app queda en estado "Testing" y solo los emails listados como test users pueden hacer OAuth. Esto está bien para uso interno y no requiere verification de Google.

### 4. Crear credenciales OAuth Client ID

1. **APIs & Services** → **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**.
2. **Application type**: `Web application`.
3. **Name**: `LinkStation Connector` (o el que prefieras).
4. **Authorized JavaScript origins** — pulsar **+ ADD URI** y añadir:
   - `http://localhost:8500` (solo si tu equipo desarrolla en local).
   - `https://dev.linkstation.ai` (entorno dev del proyecto).
   - `https://app.linkstation.ai` (producción — opcional hasta que esté desplegado).
5. **Authorized redirect URIs** — pulsar **+ ADD URI** y añadir:
   - `http://localhost:8500/api/integrations/google/callback`
   - `https://dev.linkstation.ai/api/integrations/google/callback`
   - `https://app.linkstation.ai/api/integrations/google/callback` (cuando esté en prod)
6. Pulsa **CREATE**.
7. Aparece una ventana con `Client ID` y `Client Secret`. **COPIA AMBOS** (los necesitas en el paso siguiente). El secret no se vuelve a mostrar entero después.

### 5. Pegar las credenciales en el dashboard

1. Vuelve a tu dashboard de LinkStation.
2. Navega a **Settings** → **Integraciones** → **Google Sheets** (o directamente <https://dev.linkstation.ai/dashboard/settings/integrations/google-sheets>).
3. En el **Paso 1 — Tu propia app de Google Cloud**, pega:
   - **Client ID**: el que copiaste de Google Cloud.
   - **Client Secret**: idem.
4. Pulsa **Guardar y seguir**. Las credenciales se cifran con AES-256-GCM antes de guardarlas en nuestra base de datos. Nadie de LinkStation las puede ver en claro.

### 6. Conectar tu cuenta Google

1. En el **Paso 2 — Conectar tu cuenta Google**, pulsa **Conectar con Google**.
2. Eliges la cuenta Google que usarás (debe ser una con acceso a las hojas que quieres conectar).
3. Verás un consent screen con el nombre de **tu app** (no de LinkStation) pidiendo acceso solo al scope `drive.file`. Acepta.
4. Vuelves al dashboard con el mensaje **✅ Cuenta Google conectada correctamente**.

> **Scope `drive.file`**: este scope es el más restrictivo posible. Significa que la app SOLO accede a las hojas que tú elijas explícitamente vía el Google Picker. NO podemos ver el resto de tu Drive, ni hojas ajenas, ni archivos personales. Cada hoja se autoriza individualmente.

### 7. Conectar las hojas

1. En el **Paso 3 — Selecciona hojas de cálculo**, pulsa **Conectar hoja(s)**.
2. Se abre el Google Picker — selecciona **una o varias** Sheets (puedes seleccionar todas las que necesites: una para entrada de leads, otra para exportación, otra para reporting, etc).
3. Pulsa **Select**. Cada hoja seleccionada se conecta con:
   - Un mapeo de columnas auto-sugerido (heurística por nombre de cabecera).
   - Un watch channel de Drive (notificación en tiempo real cuando se añadan filas).
   - Una primera sincronización manual.

### 8. Revisar el mapeo y el write-back

1. En el **Paso 4 — Configurar cada hoja**, expande cada hoja conectada (engranaje ⚙️) y revisa:
   - **Pestaña**: nombre de la pestaña concreta de la hoja a leer (por defecto "Hoja 1").
   - **Propósito**: `leads_inbound` (lee filas → crea leads), `leads_export`, `reporting` o `custom`.
   - **Write-back activo**: si quieres que el sistema escriba cambios de estado del lead de vuelta en la Sheet (estado, fecha agenda, cualificación, etc), marca esta casilla.
   - **Tabla de columnas**: cada fila indica `letra columna → campo destino → tipo → write-back`. Ajusta lo que la heurística no haya detectado.
2. Pulsa **Guardar mapeo**.

## Campos destino disponibles

El catálogo de campos al que puedes mapear una columna de tu Sheet:

### Tabla `lead` (campos principales del lead)

| Target                 | Tipo recomendado  | Notas                                                                                             |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| `lead.id_lead_externo` | string            | ID externo si lo tienes (ej. tu numeración interna)                                               |
| `lead.nombre`          | string            | Nombre del lead                                                                                   |
| `lead.apellido`        | string            | Apellidos                                                                                         |
| `lead.telefono`        | phone             | Se normaliza (quitamos formatos)                                                                  |
| `lead.email`           | email             | Se valida y lower-case                                                                            |
| `lead.pais`            | string            |                                                                                                   |
| `lead.tipo_lead`       | string            |                                                                                                   |
| `lead.origen`          | string            | Web, Facebook ads, etc                                                                            |
| `lead.campana`         | string            |                                                                                                   |
| `lead.foto_url`        | url               |                                                                                                   |
| `lead.current_stage`   | `enum:lead_stage` | `QUALIFICATION`, `SCHEDULING`, `COMPLETED`, `DROPPED`, `UNREACHABLE`. Recomendado writeback=true. |
| `lead.is_ai_enabled`   | boolean           | ¿Permitir IA en este lead?                                                                        |

### Tabla `lead_cualificacion` (datos de cualificación)

| Target                                 | Tipo                   | Notas                                                                                        |
| -------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `lead_cualificacion.cualificacion`     | `enum:qualified`       | `apto`, `no apto`, `""`. Writeback=true recomendado.                                         |
| `lead_cualificacion.motivo_anulacion`  | `enum:motivo_descarte` | Lista cerrada (no cumple requisitos, no interesado, etc.)                                    |
| `lead_cualificacion.anios_experiencia` | number                 |                                                                                              |
| `lead_cualificacion.nivel_estudios`    | `enum:nivel_estudios`  | `Postgrado/master`, `universitario`, `técnico`, `preuniversitario`, `básico`, `sin estudios` |

### Tabla `lead.metadata` (campos extensibles JSONB)

Cualquier campo no estándar puede mapearse aquí. Catálogo recomendado:

| Target                              | Tipo                  | Notas                                       |
| ----------------------------------- | --------------------- | ------------------------------------------- |
| `metadata.empresa`                  | string                | Centro/empresa actual del lead              |
| `metadata.cargo`                    | string                | Puesto del lead                             |
| `metadata.user_age`                 | number                | Edad                                        |
| `metadata.user_profession`          | string                | Profesión actual                            |
| `metadata.year_experience`          | number                | Años de experiencia                         |
| `metadata.user_studies`             | string                | Estudios cursados                           |
| `metadata.nivel_estudios`           | `enum:nivel_estudios` | Lista cerrada (ver arriba)                  |
| `metadata.user_motivations`         | text                  | Motivación libre                            |
| `metadata.curse_name`               | string                | Curso por el que pregunta                   |
| `metadata.curse_origin`             | string                | Origen del curso                            |
| `metadata.fecha_agenda`             | datetime              | Cuándo se ha citado. Writeback recomendado. |
| `metadata.ok_whatsapp`              | boolean               | Acepta comunicación WhatsApp                |
| `metadata.notas`                    | text                  | Notas libres                                |
| `metadata.qualified`                | string                | Espejo informativo de cualificación         |
| `metadata.estado`                   | string                | Valor del .docx de variables                |
| `metadata.motivo_descarte`          | string                | Espejo del motivo                           |
| `metadata.conversation_status`      | string                | `continue` / `closed`                       |
| `metadata.scheduled_call_confirmed` | boolean               |                                             |
| `metadata.qa_handled`               | boolean               |                                             |
| `metadata.qa_topic`                 | string                |                                             |

**También puedes usar `metadata.<lo_que_quieras>`** para campos custom no listados arriba — el sistema los guarda igual.

## Tipos de columna soportados

- `string`, `text`, `email`, `phone`, `url`
- `number` (decimales con coma o punto), `boolean` (true/false/sí/no/1/0)
- `datetime`, `date` (formatos: ISO 8601, `DD/MM/YYYY [HH:mm]`, `DD-MM-YYYY [HH:mm]`)
- `json` (parseo libre, si falla queda como string)
- Enums: `enum:lead_stage`, `enum:qualified`, `enum:estado`, `enum:motivo_descarte`, `enum:nivel_estudios`

## Preguntas frecuentes

**¿Qué pasa si añado una fila nueva a la Sheet?**
Drive notifica a nuestro webhook en segundos. El sistema lee la fila, crea el lead, y dispara automáticamente el orquestador agéntico (cualificación, secuencia de llamadas, WhatsApp, etc.).

**¿Qué pasa si edito una fila existente?**
El hash de la fila cambia → el sistema detecta la modificación. Las modificaciones en filas ya importadas NO crean leads nuevos; sí actualizan las celdas con write-back si el campo destino cambió.

**¿Puedo conectar más de una hoja?**
Sí. El Picker permite multi-selección y cada hoja se gestiona independientemente (propio mapeo, propio purpose, propio write-back).

**¿Qué pasa si rotamos el Client Secret en Google Cloud?**
Vuelve a `Settings → Integraciones → Google Sheets`, pega el nuevo secret en el Paso 1 y vuelve a conectar la cuenta. Los watch channels existentes siguen funcionando (Drive los mantiene independientemente del client secret durante su TTL).

**¿Y si quiero pausar una hoja temporalmente?**
Botón pausa (⏸️) en el Paso 4. La hoja queda inactiva pero conectada. Reactivable con ▶️.

**¿Cómo se renuevan los watch channels de Drive?**
Drive limita los watch channels a 7 días. Nuestro worker BullMQ los renueva automáticamente 24h antes del expiry. Sin intervención del tenant.

**¿Funciona con Excel Online / Office 365?**
NO. Esta integración es específica de Google Sheets. Para Excel Online sería un adapter distinto (no planificado en MVP).

## Soporte

Si tienes problemas durante el setup, contacta a `soporte@linkstation.ai` con:

- Captura del error (si lo hay).
- ID de tu tenant (visible en Settings).
- Email Google que estás usando.

NO compartas el `Client Secret` por email. Si necesitas ayuda con él, programa una llamada y se comparte por canal seguro.
