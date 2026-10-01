# Guía: configurar el Webhook manual de Zoho (Workflow)

Esta guía te lleva paso a paso para conectar Zoho CRM con el dashboard mediante una **regla de Workflow con acción Webhook**. Es la vía **manual**: no caduca y la configuras directamente en tu panel de Zoho.

> **Antes de empezar:** en la página de "Zoho CRM — Entrada de leads" del dashboard, pulsa **"Usar esta vía (generar URL del webhook)"** en la sección _Activación manual_. Eso genera tu **URL del webhook** (con tu token). Cópiala — la necesitarás en el paso 4.

---

## Paso 1 — Abre las reglas de Workflow

1. Entra en tu Zoho CRM: `https://crm.zoho.eu/` (o el Data Center de tu cuenta).
2. Arriba a la derecha, pulsa el icono de **Configuración** (⚙️).
3. En el menú lateral, ve a **Automatización → Reglas de Workflow** (_Workflow Rules_).
4. Pulsa **Crear regla** (_Create Rule_).

## Paso 2 — Define cuándo se dispara

1. **Módulo:** selecciona **Posibles clientes / Leads**.
2. **Nombre de la regla:** por ejemplo `linkstation entrada leads`.
3. Pulsa **Siguiente**.
4. En **¿Cuándo quieres ejecutar la regla?** elige **Al crear o editar un registro** (_On a record action → Create or Edit_).
   - Así entran tanto los leads nuevos como los modificados.
5. Pulsa **Siguiente**.

## Paso 3 — Condición (sin filtro)

1. En **Condición 1**, elige **Todos los posibles clientes** (_All Leads_) para que aplique a todos.
   - No pongas filtros si quieres recibir absolutamente todos los leads.
2. Pulsa **Siguiente**.

## Paso 4 — Añade la acción Webhook

1. En **Acciones instantáneas**, pulsa **Webhook → Nuevo webhook**.
2. Rellena:
   - **Nombre:** `linkstation entrada leads`
   - **Método:** **PUBLICAR** (POST)
   - **URL para notificar:** pega aquí la **URL del webhook** que copiaste del dashboard.
     Tiene este formato:
     `https://<tu-dominio>/api/webhooks/zoho?token=<tu-token>`
   - **Tipo de autorización:** **General**
3. En **Parámetros del módulo**, pulsa **Agregar parámetro** y añade el **ID del registro**:
   - **Nombre del parámetro:** `entity_id`
   - **Valor del parámetro:** selecciona **ID de Posible cliente** (_Lead Id_).
4. _(Opcional, recomendado)_ Añade más parámetros para que el lead entre **completo sin OAuth** — por cada campo que quieras traer:
   - `First_Name` → Nombre
   - `Last_Name` → Apellido
   - `Email` → Email
   - `Phone` → Teléfono
   - `Lead_Source` → Origen del lead
   - Los nombres de parámetro deben coincidir con los campos de Zoho (`First_Name`, `Email`, `Phone`...).
5. Pulsa **Guardar y asociar**.

## Paso 5 — Activa y prueba

1. Asegúrate de que la regla queda **activa** en la lista de Workflow.
2. **Crea o edita un lead** en el módulo Posibles clientes.
3. En segundos debería aparecer en el dashboard, en **Leads → Lista de Leads**.

---

## Solución de problemas

- **No llega ningún lead:** revisa que la regla esté **activa** y que el **trigger** sea _Al crear o editar_. Comprueba en Zoho (vista de la regla) que el webhook marca **"1 correcto, 0 errores"** tras crear un lead.
- **El lead entra sin datos (solo email/nombre vacíos):** añade los **parámetros del módulo** del Paso 4.4 para que Zoho envíe los campos, o conecta el OAuth (vía automática) para que el sistema traiga el lead completo.
- **El país no se rellena:** el sistema lo deriva del prefijo del teléfono (`+34` → España, `+52` → México…). Si el teléfono no tiene prefijo internacional, se asume España.
- **Token inválido (403):** si regeneraste la URL en el dashboard, actualiza la URL en la regla de Zoho con la nueva.

---

## Vía alternativa: activación automática (1 clic)

Si prefieres no configurar la regla manualmente, usa la **Activación automática** del dashboard: conecta Zoho por OAuth y pulsa _"Activar recepción automática"_. El sistema crea y renueva la suscripción por ti (Notifications API). No necesitas tocar el panel de Zoho.
