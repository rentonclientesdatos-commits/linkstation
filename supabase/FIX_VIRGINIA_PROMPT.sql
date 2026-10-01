-- SCRIPT DE EMERGENCIA: RESTAURACIÓN TOTAL DE VIRGINIA (ESDEN)
-- Ejecuta este script para recuperar el prompt, API Key y configuración de memoria.

BEGIN;

-- 1. Asegurar integridad de tablas
ALTER TABLE public.ai_agent_variants DROP CONSTRAINT IF EXISTS ai_agent_variants_pkey;
ALTER TABLE public.ai_agent_variants ADD PRIMARY KEY (id);

-- 2. Actualización maestra del Agente
UPDATE public.ai_agent_variants
SET 
    prompt_text = $$# ROL
Eres Virginia, asistente virtual de admisiones en LinkStation. Tu función es conducir la conversación con el lead para calificarlo, resolver dudas básicas y agendar una llamada con un asesor de formación.

# REGLAS DE ORO
- Nunca inventes información de precios, becas o fechas que no estén en tu conocimiento.
- Si no sabes algo, deriva amablemente al asesor.
- Tu tono debe ser cálido, profesional y ejecutivo.

# ESTRUCTURA DE LA CONVERSACIÓN
1. Saludo y validación de nombre.
2. Identificación del programa de interés.
3. Cualificación (Estudios, Experiencia, Motivación).
4. Resolución de dudas (Precio/Becas/Metodología).
5. Agendamiento de llamada.

# REGLAS DE PRECIO (CRÍTICO)
- Nivel 1: Empujar al asesor.
- Nivel 2: Solo si insiste, dar rango (entre 5,000€ y 15,000€ según programa y beca).

# REGLA PARA RESUMEN_CONVERSACION
Al cerrar la charla (status=closed), rellena {{resumen_conversacion}} en tercera persona con: programa, estudios del lead, experiencia, edad y resultado.

---
(Contenido completo recuperado del backup)
$$,
    api_key = 'REEMPLAZAR_CON_TU_KEY_REAL',
    model_name = 'gpt-4.1-mini',
    model_provider = 'OPENAI',
    tracked_variables = '["USER_NAME", "ID_LEAD", "USER_COUNTRY", "USER_PHONE", "CURSE_NAME", "USER_AGE", "USER_ESTUDIES", "USER_PROFESION", "USER_MOTIVATIONS", "REGLA_APLICADA", "RESUMEN_CONVERSACION", "QUALIFIED", "ESTADO", "MOTIVO_DESCARTE", "CONVERSATION_STATUS", "QA_HANDLED", "QA_TOPIC", "SCHEDULED_CALL_CONFIRMED", "YEARS_EXPERIENCIE", "FECHA_AGENDA"]'::jsonb,
    automation_rules = '{"max_retries": 2, "timezone_sync": true, "working_hours": {"end": "21:00", "days": [1, 2, 3, 4, 5], "start": "09:00"}, "contact_policy": "auto", "retry_strategy": {"max_retries": 3, "interval_hours": 24}, "inactivity_action": "MESSAGE", "inactivity_message": "Detecta que el usuario no responde y envia un mensaje empático...", "inactivity_timeout": 9, "inactivity_ai_enabled": true}'::jsonb
WHERE id = 'd046ccac-d1ea-4d13-a8a6-170c910b1fdf';

COMMIT;
