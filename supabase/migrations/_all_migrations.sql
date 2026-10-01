-- ===== 20260101000000_initial_tenants.sql =====
-- ============================================================
-- Initial migration: tenants table
-- Originally from supabase/tenants.sql; promoted to migrations/
-- so Supabase CLI applies it before other migrations that
-- reference public.tenants(id) via foreign keys.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    supabase_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    client_email TEXT,
    auth_user_id UUID,
    config JSONB NOT NULL DEFAULT '{
        "headers": [],
        "dashboard_title": "LinkStation",
        "primary_color": "#4f46e5"
    }'::jsonb
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.tenants
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON public.tenants
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON public.tenants
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete" ON public.tenants
    FOR DELETE TO authenticated USING (true);
-- ===== 20260101000001_base_schema.sql =====
-- ============================================================
-- Base schema consolidado para dev local
--
-- Combina MASTER_RESTORE.sql (16 tablas) + tablas faltantes
-- (llamadas, lead_cualificacion, conversaciones_whatsapp,
-- chat_messages, intentos*, notificaciones, lead_programas,
-- campanas) extraidas de migrations-historical/.
--
-- Sustituye al pg_dump --schema-only del cliente hasta que
-- tengamos acceso a Easypanel.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ADVISORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.advisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    origins TEXT[] DEFAULT '{}',
    campaigns TEXT[] DEFAULT '{}',
    countries TEXT[] DEFAULT '{}',
    courses TEXT[] DEFAULT '{}'
);
ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AI AGENTS + VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    status TEXT DEFAULT 'PAUSED',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    flow_config JSONB DEFAULT '{}'::jsonb,
    automation_rules JSONB DEFAULT '{}'::jsonb,
    crm_config JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_agent_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    version_label TEXT,
    prompt_text TEXT,
    is_active BOOLEAN DEFAULT false,
    is_variant_b BOOLEAN DEFAULT false,
    weight DECIMAL(3,2) DEFAULT 0.5,
    metrics JSONB DEFAULT '{}'::jsonb,
    api_key TEXT,
    model_provider TEXT,
    model_name TEXT,
    knowledge_base_id UUID,
    knowledge_base_ids UUID[] DEFAULT '{}',
    dynamic_variables JSONB DEFAULT '{}'::jsonb,
    tracked_variables JSONB DEFAULT '[]'::jsonb,
    automation_rules JSONB DEFAULT '{}'::jsonb,
    crm_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_agent_variants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VOICE AGENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voice_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE',
    provider TEXT,
    provider_agent_id TEXT,
    voice_id TEXT,
    from_number TEXT,
    retell_llm_id TEXT,
    prompt_text_retell TEXT,
    retell_llm_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.voice_agents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LEAD (combina MASTER_RESTORE + columnas de migraciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead_externo TEXT,
    nombre TEXT,
    apellido TEXT,
    telefono TEXT,
    email TEXT,
    pais TEXT,
    tipo_lead TEXT,
    origen TEXT,
    campana TEXT,
    status TEXT DEFAULT 'PENDING',
    is_ai_enabled BOOLEAN DEFAULT true,
    photo_url TEXT,
    segmentation TEXT,
    advisor_id UUID REFERENCES public.advisors(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    fecha_ingreso_crm TIMESTAMPTZ,
    fecha_primer_contacto TIMESTAMPTZ DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT now(),
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lead ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lead_tenant ON public.lead(tenant_id);

-- ============================================================
-- LLAMADAS
-- ============================================================
-- llamadas (columnas segun src/lib/constants/schema.ts)
CREATE TABLE IF NOT EXISTS public.llamadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_llamada_retell TEXT,
    tipo_agente TEXT,
    nombre_agente TEXT,
    estado_llamada TEXT,
    razon_termino TEXT,
    fecha_inicio TIMESTAMPTZ DEFAULT now(),
    duracion_segundos INTEGER,
    url_grabacion TEXT,
    transcripcion TEXT,
    resumen TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.llamadas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_llamadas_tenant ON public.llamadas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_lead ON public.llamadas(id_lead);

-- ============================================================
-- LEAD CUALIFICACION
-- ============================================================
-- lead_cualificacion (columnas segun src/lib/constants/schema.ts)
CREATE TABLE IF NOT EXISTS public.lead_cualificacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_llamada UUID,
    cualificacion TEXT,
    motivo_anulacion TEXT,
    anios_experiencia INTEGER,
    nivel_estudios TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lead_cualificacion ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lead_cual_tenant ON public.lead_cualificacion(tenant_id);

-- ============================================================
-- CONVERSACIONES WHATSAPP
-- ============================================================
-- conversaciones_whatsapp (columnas segun schema.ts)
CREATE TABLE IF NOT EXISTS public.conversaciones_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_conversacion_chatwoot TEXT,
    opt_in_whatsapp BOOLEAN DEFAULT false,
    estado TEXT DEFAULT 'ACTIVA',
    fecha_ultimo_mensaje TIMESTAMPTZ DEFAULT now(),
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_conv_whatsapp_tenant ON public.conversaciones_whatsapp(tenant_id);

-- ============================================================
-- CHAT MESSAGES (whatsapp inbox)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    lead_id UUID REFERENCES public.lead(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'TEMPLATE', 'SYSTEM_LOG', 'IMAGE', 'DOCUMENT')),
    content TEXT NOT NULL,
    sent_by TEXT,
    status TEXT DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chat_messages_lead ON public.chat_messages(lead_id);

-- ============================================================
-- INTENTOS DE LLAMADAS / INTENTOS
-- ============================================================
-- intentos_llamadas (columnas segun schema.ts)
CREATE TABLE IF NOT EXISTS public.intentos_llamadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_llamada UUID,
    tipo_intento TEXT,
    numero_intento INTEGER DEFAULT 1,
    fecha_reintento TIMESTAMPTZ,
    estado TEXT,
    fecha_ejecucion TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.intentos_llamadas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.intentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    tipo TEXT,
    canal TEXT,
    resultado TEXT,
    fecha TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.intentos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID REFERENCES public.lead(id) ON DELETE CASCADE,
    tipo TEXT,
    titulo TEXT,
    mensaje TEXT,
    leida BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROGRAMAS + LEAD_PROGRAMAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    precio DECIMAL(10,2),
    duracion_meses INTEGER,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.programas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lead_programas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_programa UUID NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
    estado TEXT DEFAULT 'INTERESADO',
    fecha_inscripcion TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (id_lead, id_programa)
);
ALTER TABLE public.lead_programas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CAMPANAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campanas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    fecha_inicio TIMESTAMPTZ DEFAULT now(),
    fecha_fin TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.campanas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- APPOINTMENTS + AVAILABILITY SLOTS
-- ============================================================
-- agendamientos (columnas segun schema.ts)
CREATE TABLE IF NOT EXISTS public.agendamientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID REFERENCES public.lead(id) ON DELETE CASCADE,
    advisor_id UUID REFERENCES public.advisors(id) ON DELETE SET NULL,
    fecha_agendada_cliente TIMESTAMPTZ,
    fecha_agendada_lead TIMESTAMPTZ,
    confirmado BOOLEAN DEFAULT false,
    meeting_link TEXT,
    notas TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agendamientos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_agendamientos_tenant ON public.agendamientos(tenant_id);

-- appointments mantenido como alias para compatibilidad
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.lead(id) ON DELETE CASCADE,
    advisor_id UUID REFERENCES public.advisors(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'SCHEDULED',
    meeting_link TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);

CREATE TABLE IF NOT EXISTS public.availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID REFERENCES public.advisors(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN DEFAULT false
);
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- WORKFLOWS + ORCHESTRATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.orchestration_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    graph_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.orchestration_graphs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- WEB WIDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.web_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
    welcome_message TEXT,
    required_variables JSONB,
    bubble_color TEXT,
    bubble_icon TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.web_widgets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LOG TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    level TEXT,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    agent_id UUID,
    lead_id UUID,
    message TEXT,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID,
    event_type TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLITICAS RLS
-- service_role: acceso total (backend de confianza).
-- authenticated: SELECT con AISLAMIENTO POR TENANT (BUG-SEC RLS-001, 10-06-2026).
--
-- ANTES (bug): `authenticated_read_* USING (true)` permitia a cualquier usuario
-- authenticated leer filas de CUALQUIER tenant via anon key (IDOR multi-tenant).
-- AHORA: cada tabla filtra por su relacion al tenant del usuario logueado.
-- Patron: tenant_id IN (SELECT id FROM tenants WHERE auth_user_id = auth.uid()).
-- ============================================================

-- service_role_all_* para TODAS las tablas (sin cambio).
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'tenants', 'advisors', 'ai_agents', 'ai_agent_variants',
            'voice_agents', 'lead', 'llamadas', 'lead_cualificacion',
            'conversaciones_whatsapp', 'chat_messages', 'intentos_llamadas',
            'intentos', 'notificaciones', 'programas', 'lead_programas',
            'campanas', 'agendamientos', 'appointments', 'availability_slots', 'workflows',
            'orchestration_graphs', 'knowledge_base', 'web_widgets',
            'system_logs', 'ai_agent_logs', 'lead_events'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "service_role_all_%I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
        -- Limpiar cualquier authenticated_read previa (incluida la version OPEN bugueada).
        EXECUTE format('DROP POLICY IF EXISTS "authenticated_read_%I" ON public.%I', tbl, tbl);
    END LOOP;
END $$;

-- authenticated_read_* FILTRADO POR TENANT, por grupo segun como se relaciona cada tabla:

-- (a) Tablas con tenant_id UUID directo.
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'advisors','ai_agent_logs','agendamientos','appointments','campanas',
        'conversaciones_whatsapp','intentos','intentos_llamadas','lead','lead_cualificacion',
        'lead_programas','llamadas','notificaciones','orchestration_graphs','system_logs',
        'voice_agents','workflows'
    ]) LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=tbl) THEN
            EXECUTE format(
              'CREATE POLICY "authenticated_read_%I" ON public.%I FOR SELECT TO authenticated '
              'USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()))', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- (b) chat_messages: tenant_id es TEXT → cast id::text.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='chat_messages') THEN
        CREATE POLICY "authenticated_read_chat_messages" ON public.chat_messages FOR SELECT TO authenticated
          USING (tenant_id IN (SELECT id::text FROM public.tenants WHERE auth_user_id = auth.uid()));
    END IF;
END $$;

-- (c) availability_slots: sin tenant_id → via advisor_id.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='availability_slots') THEN
        CREATE POLICY "authenticated_read_availability_slots" ON public.availability_slots FOR SELECT TO authenticated
          USING (advisor_id IN (SELECT a.id FROM public.advisors a
                 WHERE a.tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.auth_user_id = auth.uid())));
    END IF;
END $$;

-- (d) lead_events: sin tenant_id → via lead_id.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='lead_events') THEN
        CREATE POLICY "authenticated_read_lead_events" ON public.lead_events FOR SELECT TO authenticated
          USING (lead_id IN (SELECT l.id FROM public.lead l
                 WHERE l.tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.auth_user_id = auth.uid())));
    END IF;
END $$;

-- (e) tenants: el usuario solo ve SU propia fila (auth_user_id = auth.uid()) o admin.
--     NO se crea authenticated_read_tenants OPEN (era el leak de anon_key/email cross-tenant).
--     El acceso legitimo a la fila propia lo da tenants_select_owner_or_admin (definida en migracion de tenants).
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='tenants') THEN
        CREATE POLICY "authenticated_read_tenants" ON public.tenants FOR SELECT TO authenticated
          USING (auth_user_id = auth.uid()
                 OR COALESCE(((auth.jwt() -> 'app_metadata') ->> 'is_admin'), 'false') = 'true');
    END IF;
END $$;

-- NOTA: programas, ai_agents, ai_agent_variants, knowledge_base, web_widgets ya definen
-- sus propias politicas *_owner_or_admin (filtradas) en sus migraciones — no se tocan aqui.
-- ===== 20260521000000_rls_tenants_hardening.sql =====
-- ============================================================================
-- Sprint 0 tarea 1-18: RLS hardening tabla `public.tenants`
-- ============================================================================
--
-- ANTES (migration 20260101000000_initial_tenants.sql):
--   - SELECT/INSERT/UPDATE/DELETE policies con `USING (true)` y
--     `WITH CHECK (true)` → cualquier usuario autenticado podía leer y
--     modificar TODOS los tenants. Finding DA-2-010.
--
-- AHORA:
--   - SELECT: solo si `auth_user_id = auth.uid()` (cliente ve su propio tenant)
--     O si el caller tiene `app_metadata.is_admin = true` (admin ve todos).
--   - INSERT/UPDATE/DELETE: SOLO admins (los CRUD de tenant son operaciones
--     de gestión, no de cliente final). El gate adicional `assertAdminAccess`
--     en `src/lib/actions/tenant.ts` (tarea 1-17) refuerza esto desde la app.
--   - service_role bypassa RLS automáticamente (jobs internos, webhooks).
--
-- La detección de admin se hace leyendo el JWT actual:
--   auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true'
-- Esto va atado a 1-16 (is_admin vive en app_metadata, NO en user_metadata).
--
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE.
-- ============================================================================

-- Asegura RLS activado (no-op si ya estaba)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Drop policies tautológicas legacy
DROP POLICY IF EXISTS "Allow authenticated read" ON public.tenants;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.tenants;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.tenants;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.tenants;

-- Drop policies de esta migration por si se re-corre
DROP POLICY IF EXISTS "tenants_select_owner_or_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_admin_only" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_admin_only" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete_admin_only" ON public.tenants;

-- Helper inline: ¿el caller es admin? Lee app_metadata.is_admin del JWT.
-- No se crea como función SECURITY DEFINER para evitar complejidad; cada
-- policy lo evalúa en línea.

CREATE POLICY "tenants_select_owner_or_admin"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "tenants_insert_admin_only"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "tenants_update_admin_only"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "tenants_delete_admin_only"
  ON public.tenants
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );
-- ===== 20260521000001_rls_knowledge_base_hardening.sql =====
-- ============================================================================
-- Sprint 0 tarea 1-19: RLS hardening tabla `public.knowledge_base`
-- ============================================================================
--
-- Finding F-04-004 / DA-2:
--   Una migration legacy (`supabase/migrations-historical/20260424000000_knowledge_and_billing.sql`)
--   define la policy:
--
--     CREATE POLICY ... USING (tenant_id::text = current_setting('app.current_tenant', true));
--
--   El backend NUNCA ejecuta `SET app.current_tenant`, por lo que la policy
--   evalúa siempre NULL → bloquea TODO para `authenticated` (silencioso) y
--   `service_role` la bypassa. Dead letter — protección RLS inefectiva.
--
--   Adicionalmente, la migration vigente (base_schema.sql) creó un loop que
--   añade `authenticated_read_knowledge_base USING (true)` → cross-tenant leak
--   total para authenticated.
--
-- AHORA:
--   - DROP de cualquier policy legacy sobre `knowledge_base`.
--   - SELECT: el caller debe ser dueño del tenant (vía `tenants.auth_user_id`)
--     o admin (`app_metadata.is_admin`).
--   - INSERT/UPDATE/DELETE: idéntico — solo dueño del tenant o admin.
--   - `service_role` mantiene el bypass para jobs internos y webhooks.
--
-- Idempotente. Aplica en local YA; VPS diferido a pre-deploy.
-- ============================================================================

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Limpia policies legacy (nombres conocidos del histórico + auto-generadas)
DROP POLICY IF EXISTS "knowledge_base_tenant_isolation" ON public.knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_select" ON public.knowledge_base;
DROP POLICY IF EXISTS "kb_tenant" ON public.knowledge_base;
DROP POLICY IF EXISTS "authenticated_read_knowledge_base" ON public.knowledge_base;
-- service_role_all_knowledge_base se MANTIENE (creado en base_schema.sql loop) —
-- es necesario para que el backend (BullMQ workers, webhooks) opere.

-- Drop policies de esta migration por si se re-corre
DROP POLICY IF EXISTS "kb_select_owner_or_admin" ON public.knowledge_base;
DROP POLICY IF EXISTS "kb_insert_owner_or_admin" ON public.knowledge_base;
DROP POLICY IF EXISTS "kb_update_owner_or_admin" ON public.knowledge_base;
DROP POLICY IF EXISTS "kb_delete_owner_or_admin" ON public.knowledge_base;

CREATE POLICY "kb_select_owner_or_admin"
  ON public.knowledge_base
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "kb_insert_owner_or_admin"
  ON public.knowledge_base
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "kb_update_owner_or_admin"
  ON public.knowledge_base
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "kb_delete_owner_or_admin"
  ON public.knowledge_base
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );
-- ===== 20260522000000_widget_hardening_allowed_domains_rate_limit.sql =====
-- ============================================================================
-- Sprint 0 tarea 1-27: Widget hardening — allowed_domains + rate limit
-- ============================================================================
--
-- Origen: Informe técnico de Renzo sobre el Módulo de Chatbot Web V1
--   (`docs/Informes de programacion/Reporte-Modulo-Chatbot-Web-Renzo-V1.pdf` §3 🔴).
--
-- Vulnerabilidad cerrada:
--   La Server Action `getChatbotResponse` en `src/lib/actions/widget.ts` es un
--   endpoint público accesible desde cualquier dominio sin auth, sin CORS ni
--   rate limit. Conocer el `widgetId` (visible en el código fuente del sitio
--   del cliente) bastaba para vaciar el saldo OpenAI del tenant + llenar la
--   tabla `lead` y `chat_messages` de basura.
--
-- Solución:
--   Dos nuevas columnas en `web_widgets`:
--     - allowed_domains text[]: hosts permitidos para enviar mensajes
--       (validados contra Origin/Referer de la request). Si está vacío →
--       modo LEGACY: permite todos los orígenes con log warning. Si está
--       poblado → enforce estricto (rechaza orígenes fuera de la lista).
--       Decisión deliberada: NO deny-by-default como en 1-22 (tenants), ya
--       que romper widgets en producción de clientes es peor que el riesgo
--       residual durante la ventana de migración. Una tarea de Sprint 1
--       forzará la migración a allowlists pobladas.
--     - rate_limit_per_minute integer: límite de peticiones por minuto por
--       (widgetId, IP). Aplicado SIEMPRE desde el inicio (sliding window
--       Redis). Por defecto 5 req/min — generoso para uso humano legítimo,
--       letal para bots.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- ============================================================================

ALTER TABLE public.web_widgets
  ADD COLUMN IF NOT EXISTS allowed_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rate_limit_per_minute integer NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.web_widgets.allowed_domains IS
  'Hosts permitidos (Origin/Referer) para invocar el widget. Vacío = legacy ALLOW. Poblado = enforce. Soporta wildcards de subdominio (*.ejemplo.com).';

COMMENT ON COLUMN public.web_widgets.rate_limit_per_minute IS
  'Rate limit por (widgetId, IP) en peticiones/minuto. Default 5. Sliding window Redis. Cuando se excede, getChatbotResponse devuelve error sin llamar OpenAI.';

-- Validación: el rate limit debe ser positivo (1 req/min es el mínimo razonable).
ALTER TABLE public.web_widgets
  DROP CONSTRAINT IF EXISTS web_widgets_rate_limit_positive;

ALTER TABLE public.web_widgets
  ADD CONSTRAINT web_widgets_rate_limit_positive
  CHECK (rate_limit_per_minute > 0);
-- ===== 20260522200000_lead_unreachable_handoff_policy.sql =====
-- ============================================================================
-- Sprint 1 NEW-13 — Política handoff unificada (Bea correcciones V1)
-- ============================================================================
--
-- Origen: docs/Docs-entrega-clienta/Correcciones_aclaraciones Bea V1.pdf
--   §"Escalado a Humanos (Handoff)":
--   > "Por llamada fallida o lead con número no válido NO se pasa a cliente para que
--   > ellos continúen en seguimiento. Si número no válido, se tipifica en CRM del
--   > cliente y en base de datos interna como tal, si es llamada fallida se harán
--   > reintentos por WhatsApp y llamada hasta completar número de intentos
--   > establecido, y si no se consigue contacto se descartará lead y se tipificará
--   > como 'ilocalizable'."
--
-- ADR completo: docs/adr/0014-politica-handoff-humano.md
--
-- Cambios:
--   1) Columna lead.unreachable_reason TEXT NULL — motivo del descarte (NULL = no
--      está unreachable). Valores: 'invalid_phone', 'max_attempts_exceeded',
--      'user_requested_stop'. Sin CHECK constraint para permitir extensión futura.
--   2) Columna lead.contact_attempts INTEGER NOT NULL DEFAULT 0 — contador de
--      intentos de contacto (llamada + whatsapp) realizados. Incrementa cada vez
--      que executeSequenceStep o executeRetrySequenceStep procesa un step de
--      contacto. Cuando supera tenant.config.max_contact_attempts (default 5) el
--      lead pasa a UNREACHABLE.
--   3) Índice parcial idx_lead_unreachable para queries del dashboard que muestran
--      leads ilocalizables (filtros tipo "ver todos los UNREACHABLE del mes").
--
-- Idempotente: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- ============================================================================

ALTER TABLE public.lead
  ADD COLUMN IF NOT EXISTS unreachable_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS contact_attempts INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.lead.unreachable_reason IS
  'Motivo del descarte del lead como ilocalizable. NULL = activo. Valores típicos: invalid_phone, max_attempts_exceeded, user_requested_stop. Lo setea src/lib/core/handoff.ts:handleUnreachable. NEW-13 Sprint 1.';

COMMENT ON COLUMN public.lead.contact_attempts IS
  'Contador de intentos de contacto realizados por el orquestador (llamada + whatsapp). Cuando supera tenant.config.max_contact_attempts (default 5) el lead pasa a current_stage=UNREACHABLE y tipo_lead=ilocalizable. NEW-13 Sprint 1.';

-- Índice parcial para queries de dashboard "ilocalizables del mes" — sólo indexa
-- rows con unreachable_reason poblado (la mayoría serán NULL, no inflar índice).
CREATE INDEX IF NOT EXISTS idx_lead_unreachable
  ON public.lead (tenant_id, unreachable_reason)
  WHERE unreachable_reason IS NOT NULL;
-- ===== 20260522210000_ai_agent_variants_model_name_cleanup.sql =====
-- Sprint 1 · Tarea 2-35
-- Limpia valores legacy/inválidos en ai_agent_variants.model_name antes de
-- que la whitelist ModelNameSchema (Zod, src/lib/schemas/ai-agents.ts) sea
-- enforced en el boundary (Server Action saveAgentVariant).
--
-- Política: cualquier model_name fuera de la whitelist actual se reescribe a
-- 'gpt-4o-mini' (default seguro, económico). El admin puede ajustar después.
--
-- Whitelist sincronizada con src/lib/schemas/ai-agents.ts ModelNameSchema.
-- Mantener ambas listas en sync cada vez que se añada un modelo (ver ADR).

DO $$
BEGIN
    UPDATE public.ai_agent_variants
    SET model_name = 'gpt-4o-mini'
    WHERE model_name IS NOT NULL
      AND model_name NOT IN (
        -- OpenAI
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.5-preview',
        -- Anthropic
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307',
        'claude-3-opus-20240229',
        -- Google Gemini
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-2.0-flash'
      );

    IF FOUND THEN
        RAISE NOTICE 'ai_agent_variants: model_name legacy values normalized to gpt-4o-mini';
    END IF;
END $$;
-- ===== 20260522220000_rls_ai_agents_hardening.sql =====
-- ============================================================================
-- Sprint 1 · Tarea 2-23 — RLS hardening ai_agents + ai_agent_variants
-- ============================================================================
-- Finding F-04-005 / DA-2: la policy actual `authenticated_read_ai_agents`
-- USING (true) permite leer agents de cualquier tenant. ai_agent_variants
-- hereda la vulnerabilidad porque NO tiene tenant_id directo (se vincula
-- al tenant via ai_agents.tenant_id por agent_id).
--
-- Fix:
--   - ai_agents: SELECT/INSERT/UPDATE/DELETE solo si tenant_id pertenece al
--     auth.uid() actual (resuelto via tenants.auth_user_id) o admin.
--   - ai_agent_variants: misma logica via subquery (variant.agent_id IN
--     agents del tenant del caller).
-- service_role mantiene bypass para webhooks/jobs.
-- Idempotente.
-- ============================================================================

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_ai_agents" ON public.ai_agents;
DROP POLICY IF EXISTS "authenticated_read_ai_agent_variants" ON public.ai_agent_variants;
DROP POLICY IF EXISTS "ai_agents_tenant_isolation" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agent_variants_tenant_isolation" ON public.ai_agent_variants;

DROP POLICY IF EXISTS "ai_agents_select_owner_or_admin" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agents_insert_owner_or_admin" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agents_update_owner_or_admin" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agents_delete_owner_or_admin" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agent_variants_select_owner_or_admin" ON public.ai_agent_variants;
DROP POLICY IF EXISTS "ai_agent_variants_insert_owner_or_admin" ON public.ai_agent_variants;
DROP POLICY IF EXISTS "ai_agent_variants_update_owner_or_admin" ON public.ai_agent_variants;
DROP POLICY IF EXISTS "ai_agent_variants_delete_owner_or_admin" ON public.ai_agent_variants;

-- ai_agents
CREATE POLICY "ai_agents_select_owner_or_admin"
  ON public.ai_agents
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "ai_agents_insert_owner_or_admin"
  ON public.ai_agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "ai_agents_update_owner_or_admin"
  ON public.ai_agents
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "ai_agents_delete_owner_or_admin"
  ON public.ai_agents
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

-- ai_agent_variants: tenant scope via agent_id -> ai_agents.tenant_id
CREATE POLICY "ai_agent_variants_select_owner_or_admin"
  ON public.ai_agent_variants
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.ai_agents
      WHERE tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    )
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "ai_agent_variants_insert_owner_or_admin"
  ON public.ai_agent_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.ai_agents
      WHERE tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    )
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "ai_agent_variants_update_owner_or_admin"
  ON public.ai_agent_variants
  FOR UPDATE
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.ai_agents
      WHERE tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    )
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.ai_agents
      WHERE tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    )
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "ai_agent_variants_delete_owner_or_admin"
  ON public.ai_agent_variants
  FOR DELETE
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.ai_agents
      WHERE tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    )
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );
-- ===== 20260522220001_rls_web_widgets_hardening.sql =====
-- ============================================================================
-- Sprint 1 · Tarea 2-24 — RLS hardening web_widgets
-- ============================================================================
-- Finding F-04-006: web_widgets devuelve registros de todos los tenants
-- a usuarios authenticated.
--
-- Fix:
--   - DROP policy authenticated_read_web_widgets USING (true).
--   - CREATE policies owner_or_admin para SELECT/INSERT/UPDATE/DELETE.
--   - service_role mantiene bypass.
--
-- NOTA: la lectura PUBLICA del widget (chat embebido en sitio del cliente)
-- se hace vía endpoint `/widget/[id]` que usa el cliente Supabase server-side
-- (service_role), no via authenticated, por lo que NO se rompe esa via.
-- Idempotente.
-- ============================================================================

ALTER TABLE public.web_widgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_web_widgets" ON public.web_widgets;
DROP POLICY IF EXISTS "web_widgets_tenant_isolation" ON public.web_widgets;
DROP POLICY IF EXISTS "web_widgets_select_owner_or_admin" ON public.web_widgets;
DROP POLICY IF EXISTS "web_widgets_insert_owner_or_admin" ON public.web_widgets;
DROP POLICY IF EXISTS "web_widgets_update_owner_or_admin" ON public.web_widgets;
DROP POLICY IF EXISTS "web_widgets_delete_owner_or_admin" ON public.web_widgets;

CREATE POLICY "web_widgets_select_owner_or_admin"
  ON public.web_widgets
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "web_widgets_insert_owner_or_admin"
  ON public.web_widgets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "web_widgets_update_owner_or_admin"
  ON public.web_widgets
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "web_widgets_delete_owner_or_admin"
  ON public.web_widgets
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );
-- ===== 20260522220002_rls_programas_hardening.sql =====
-- ============================================================================
-- Sprint 1 · Tarea 2-25 — RLS hardening programas (cursos del cliente)
-- ============================================================================
-- Finding F-04-008: getPrograms expone programas de todos los clientes a
-- authenticated. Origen: policy tautologica authenticated_read_programas.
--
-- Fix: tenant_id scope via tenants.auth_user_id, igual patron que knowledge_base.
-- service_role bypass mantiene operacion de webhooks.
-- Idempotente.
-- ============================================================================

ALTER TABLE public.programas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_programas" ON public.programas;
DROP POLICY IF EXISTS "programas_tenant_isolation" ON public.programas;
DROP POLICY IF EXISTS "programas_select_owner_or_admin" ON public.programas;
DROP POLICY IF EXISTS "programas_insert_owner_or_admin" ON public.programas;
DROP POLICY IF EXISTS "programas_update_owner_or_admin" ON public.programas;
DROP POLICY IF EXISTS "programas_delete_owner_or_admin" ON public.programas;

CREATE POLICY "programas_select_owner_or_admin"
  ON public.programas
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "programas_insert_owner_or_admin"
  ON public.programas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "programas_update_owner_or_admin"
  ON public.programas
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "programas_delete_owner_or_admin"
  ON public.programas
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );
-- ===== 20260522220003_integrations_table.sql =====
-- ============================================================================
-- Sprint 1 · Tarea 2-26 — Tabla integrations + columnas cifradas
-- ============================================================================
-- Crea la tabla `integrations` que persiste credenciales OAuth cifradas
-- (AES-256-GCM, ver src/lib/crypto/token-crypto.ts).
--
-- Columnas:
--   credentials_cipher TEXT — payload cifrado (formato iv:ct:authTag).
--   credentials_iv     TEXT — NO se usa (el iv ya va dentro del payload). Lo
--     mantenemos por compat con el schema Zod IntegrationSchema; valor NULL.
--
-- El backend (Server Actions + repo) es el unico punto que cifra/descifra,
-- nunca persiste tokens en claro.
--
-- RLS: solo owner_or_admin. service_role bypass para webhooks/jobs.
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL CHECK (crm_type IN (
    'hubspot', 'zoho', 'google_sheets', 'salesforce', 'gohighlevel', 'activecampaign'
  )),
  data_center TEXT CHECK (data_center IN ('us', 'eu', 'in', 'au', 'cn', 'jp') OR data_center IS NULL),
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  credentials_cipher TEXT,
  credentials_iv TEXT,
  scopes TEXT[],
  expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_crm
  ON public.integrations(tenant_id, crm_type)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_active
  ON public.integrations(tenant_id)
  WHERE is_active = true;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integrations_select_owner_or_admin" ON public.integrations;
DROP POLICY IF EXISTS "integrations_insert_owner_or_admin" ON public.integrations;
DROP POLICY IF EXISTS "integrations_update_owner_or_admin" ON public.integrations;
DROP POLICY IF EXISTS "integrations_delete_owner_or_admin" ON public.integrations;
DROP POLICY IF EXISTS "service_role_all_integrations" ON public.integrations;

CREATE POLICY "integrations_select_owner_or_admin"
  ON public.integrations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "integrations_insert_owner_or_admin"
  ON public.integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "integrations_update_owner_or_admin"
  ON public.integrations
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "integrations_delete_owner_or_admin"
  ON public.integrations
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "service_role_all_integrations"
  ON public.integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at auto.
CREATE OR REPLACE FUNCTION public.touch_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_integrations_updated_at ON public.integrations;
CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_integrations_updated_at();
-- ===== 20260522230000_lead_opportunities.sql =====
-- ============================================================================
-- Sprint 1 · Tarea NEW-06 — Tabla lead_opportunities + dedup
-- ============================================================================
-- Modelo: un lead (persona) puede tener N solicitudes de informacion sobre
-- programas distintos a lo largo del tiempo. Bea V1: "se debera ver, con
-- fechas de solicitud, lo que paso en cada una".
--
-- Dedup: si un mismo lead+programa pide en <48h, la segunda se marca como
-- duplicada (is_duplicate_of) — politica explicita Bea V1.
--
-- RLS owner_or_admin (igual patron knowledge_base / integrations).
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
  programa_id UUID REFERENCES public.programas(id) ON DELETE SET NULL,
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado_oportunidad TEXT NOT NULL DEFAULT 'NUEVA' CHECK (
    estado_oportunidad IN ('NUEVA', 'EN_PROCESO', 'CUALIFICADA', 'AGENDADA', 'CERRADA', 'DESCARTADA')
  ),
  is_duplicate_of UUID REFERENCES public.lead_opportunities(id) ON DELETE SET NULL,
  source TEXT, -- 'webhook_crm', 'ingest_form', 'manual', etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_opportunities_lead
  ON public.lead_opportunities(lead_id, fecha_solicitud DESC);

CREATE INDEX IF NOT EXISTS idx_lead_opportunities_tenant
  ON public.lead_opportunities(tenant_id, fecha_solicitud DESC);

CREATE INDEX IF NOT EXISTS idx_lead_opportunities_dedup
  ON public.lead_opportunities(lead_id, programa_id, fecha_solicitud)
  WHERE is_duplicate_of IS NULL;

ALTER TABLE public.lead_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_opportunities_select_owner_or_admin" ON public.lead_opportunities;
DROP POLICY IF EXISTS "lead_opportunities_insert_owner_or_admin" ON public.lead_opportunities;
DROP POLICY IF EXISTS "lead_opportunities_update_owner_or_admin" ON public.lead_opportunities;
DROP POLICY IF EXISTS "lead_opportunities_delete_owner_or_admin" ON public.lead_opportunities;
DROP POLICY IF EXISTS "service_role_all_lead_opportunities" ON public.lead_opportunities;

CREATE POLICY "lead_opportunities_select_owner_or_admin"
  ON public.lead_opportunities
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "lead_opportunities_insert_owner_or_admin"
  ON public.lead_opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "lead_opportunities_update_owner_or_admin"
  ON public.lead_opportunities
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "service_role_all_lead_opportunities"
  ON public.lead_opportunities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_lead_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_opportunities_updated_at ON public.lead_opportunities;
CREATE TRIGGER trg_lead_opportunities_updated_at
  BEFORE UPDATE ON public.lead_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.touch_lead_opportunities_updated_at();

-- Migración datos legacy: 1 oportunidad por lead existente, sin dedup retroactivo.
-- Idempotente: NO inserta duplicados si ya existe la oportunidad legacy.
INSERT INTO public.lead_opportunities (tenant_id, lead_id, fecha_solicitud, estado_oportunidad, source, metadata)
SELECT
  l.tenant_id,
  l.id,
  COALESCE(l.fecha_ingreso_crm, l.fecha_creacion, NOW()),
  'NUEVA',
  'legacy_backfill',
  jsonb_build_object('backfilled_at', NOW(), 'lead_origen', COALESCE(l.origen, ''))
FROM public.lead l
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_opportunities lo
  WHERE lo.lead_id = l.id AND lo.source = 'legacy_backfill'
);
-- ===== 20260524000000_web_widgets_updated_at_and_orchestrator_flag.sql =====
-- ============================================================
-- 20260524000000 — web_widgets.updated_at + orchestrator flag
-- ============================================================
-- Phase B fixes from plan plans/260524-1020-doc-agent-empty-states-full/:
--   B.4: add web_widgets.updated_at column + trigger (schema cache error fix).
--   B.3: enable test_orchestrator_enabled flag for ALL existing tenants
--        (silences "Orchestration disabled for tenant" 403 in dashboard).

-- ----------------------------------------------------------------
-- Shared trigger function for updated_at maintenance.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- B.4 — web_widgets.updated_at
-- ----------------------------------------------------------------
ALTER TABLE public.web_widgets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS trg_web_widgets_updated_at ON public.web_widgets;
CREATE TRIGGER trg_web_widgets_updated_at
  BEFORE UPDATE ON public.web_widgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill existing rows so updated_at is never NULL.
UPDATE public.web_widgets SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

-- ----------------------------------------------------------------
-- B.3 — enable test_orchestrator_enabled for existing tenants
-- ----------------------------------------------------------------
-- The flag is the guard from src/lib/api-auth.ts::requireOrchestrationEnabled.
-- The dashboard fails with 403 if it's not explicitly true. Seeded tenants
-- pre-this-migration didn't have it set, so we patch the JSONB column.
UPDATE public.tenants
SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('test_orchestrator_enabled', true)
WHERE COALESCE((config ->> 'test_orchestrator_enabled')::boolean, false) IS DISTINCT FROM true;

-- ----------------------------------------------------------------
-- Reload PostgREST schema cache so the new column is visible immediately.
-- ----------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
-- ===== 20260524000001_create_help_sections.sql =====
-- ============================================================
-- 20260524000001 — help_sections table for Doc Admin + Docs Clientes
-- ============================================================
-- Phase C of plans/260524-1020-doc-agent-empty-states-full/.
-- Stores documentation content shown in two distinct dashboard pages:
--   /dashboard/docs-admin   (scope='admin')   — visible to admins only
--   /dashboard/docs-clientes (scope='clientes') — visible to any authenticated user
-- Maintained by the help-docs-keeper agent (writes via service_role).

CREATE TABLE IF NOT EXISTS public.help_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('admin', 'clientes')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  route_in_app TEXT,
  status TEXT NOT NULL DEFAULT 'provisional' CHECK (status IN ('provisional', 'completada')),
  brief TEXT,
  content_markdown TEXT,
  screenshots JSONB DEFAULT '[]'::jsonb,
  fields_table JSONB DEFAULT '[]'::jsonb,
  steps JSONB DEFAULT '[]'::jsonb,
  common_cases JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0,
  icon TEXT,
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (scope, slug)
);

CREATE INDEX IF NOT EXISTS idx_help_sections_scope ON public.help_sections (scope, display_order);
CREATE INDEX IF NOT EXISTS idx_help_sections_status ON public.help_sections (status);
CREATE INDEX IF NOT EXISTS idx_help_sections_route ON public.help_sections (route_in_app);

DROP TRIGGER IF EXISTS trg_help_sections_updated_at ON public.help_sections;
CREATE TRIGGER trg_help_sections_updated_at
  BEFORE UPDATE ON public.help_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------
-- RLS — multi-tenant not applicable (help is global), but we gate reads
-- by audience: anyone authenticated can read 'clientes'; only admins can
-- read 'admin' (admins identified by app_metadata.is_admin = true).
-- ----------------------------------------------------------------
ALTER TABLE public.help_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS help_sections_select_clientes ON public.help_sections;
CREATE POLICY help_sections_select_clientes ON public.help_sections
  FOR SELECT TO authenticated
  USING (scope = 'clientes');

DROP POLICY IF EXISTS help_sections_select_admin ON public.help_sections;
CREATE POLICY help_sections_select_admin ON public.help_sections
  FOR SELECT TO authenticated
  USING (
    scope = 'admin'
    AND COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean,
      false
    ) = true
  );

-- Writes left to service_role only (bypass RLS).
COMMENT ON TABLE public.help_sections IS
  'Content for /dashboard/docs-admin and /dashboard/docs-clientes. Maintained by help-docs-keeper agent.';

-- Refresh PostgREST schema cache.
NOTIFY pgrst, 'reload schema';
-- ===== 20260524100000_integrations_oauth_and_audit.sql =====
-- ============================================================================
-- Sprint 2 · Phase 01 — Ampliación tabla integrations + crm_write_audit
-- ============================================================================
-- Añade columnas necesarias para Sprint 2 (Adapter HubSpot + Zoho):
--   - write_policy + override_fields → enforcement del WriteGuard (R-014).
--   - oauth_state → state ephemeral durante OAuth handshake (anti-CSRF, se borra
--     en el callback).
--   - last_healthcheck_at + healthcheck_status → UI muestra estado del provider.
--   - portal_id → HubSpot hub_id (multi-portal). Zoho usa metadata.api_domain
--     (no necesita columna nueva — JSONB ya existe en metadata desde Sprint 1).
--
-- IMPORTANTE: NO crea columnas access_token_encrypted / refresh_token_encrypted
-- porque Sprint 1 ya entregó `credentials_cipher TEXT` que persiste
-- JSON.stringify({accessToken, refreshToken}) cifrado con AES-256-GCM
-- (ver src/lib/crypto/token-crypto.ts + ADR-017).
--
-- Constraint UNIQUE(tenant_id): enforza decisión cliente "1 CRM activo por
-- tenant" (24-05-2026). Se aplica como índice único parcial sobre filas
-- con is_active = true, para permitir registros históricos desactivados
-- de integraciones anteriores (audit trail).
--
-- crm_write_audit: append-only a nivel DB (no UPDATE, no DELETE policies),
-- sólo service_role INSERT, authenticated SELECT del propio tenant.
--
-- Ref: plans/260524-1330-sprint-2-adapter-hubspot-zoho/research/researcher-03-adapter-pattern.md §3
-- ============================================================================

-- ── 1. Nuevas columnas en integrations ──────────────────────────────────────

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS write_policy TEXT NOT NULL DEFAULT 'append_only'
    CHECK (write_policy IN ('append_only', 'overwrite_with_audit'));

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS override_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS oauth_state TEXT;

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS last_healthcheck_at TIMESTAMPTZ;

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS healthcheck_status TEXT
    CHECK (healthcheck_status IN ('ok', 'error') OR healthcheck_status IS NULL);

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS portal_id TEXT;

COMMENT ON COLUMN public.integrations.write_policy IS
  'append_only = nunca sobrescribir campos con valor no-null en el CRM. overwrite_with_audit = permite sobrescribir SOLO campos listados en override_fields, escribiendo audit row en crm_write_audit.';

COMMENT ON COLUMN public.integrations.override_fields IS
  'Whitelist de campos permitidos para overwrite cuando write_policy = overwrite_with_audit. Array vacío = bloquea cualquier overwrite.';

COMMENT ON COLUMN public.integrations.oauth_state IS
  'State HMAC efímero usado durante el OAuth handshake. Se limpia (UPDATE oauth_state = NULL) tras callback exitoso.';

COMMENT ON COLUMN public.integrations.healthcheck_status IS
  'Resultado del último healthcheck del provider. ok = autenticado y alcanzable. error = falló (revisar logs). NULL = nunca ejecutado.';

COMMENT ON COLUMN public.integrations.portal_id IS
  'HubSpot hub_id / portal_id obtenido de /oauth/v1/access-tokens/{token}. Para Zoho NO se usa (la región vive en metadata.api_domain).';

-- ── 2. UNIQUE(tenant_id) WHERE is_active = true ─────────────────────────────
-- Decisión cliente 24-05-2026: 1 CRM activo por tenant. Permite mantener filas
-- históricas con is_active = false (audit). El índice parcial cubre el caso
-- común sin romper bajas/altas.

CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_one_active_per_tenant
  ON public.integrations(tenant_id)
  WHERE is_active = true;

COMMENT ON INDEX public.idx_integrations_one_active_per_tenant IS
  'Enforza máximo 1 integración activa por tenant (decisión 24-05-2026).';

-- ── 3. crm_write_audit (append-only) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_write_audit (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL,
  lead_id        TEXT NOT NULL,
  field_name     TEXT NOT NULL,
  old_value      TEXT,
  new_value      TEXT NOT NULL,
  write_policy   TEXT NOT NULL,
  actor_id       UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.crm_write_audit IS
  'Append-only log de overwrites a CRMs externos. Solo service_role INSERT. Sin policies UPDATE/DELETE → inmutable a nivel DB.';

CREATE INDEX IF NOT EXISTS idx_crm_write_audit_tenant_lead
  ON public.crm_write_audit(tenant_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_write_audit_integration
  ON public.crm_write_audit(integration_id, created_at DESC);

ALTER TABLE public.crm_write_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_owner_or_admin" ON public.crm_write_audit;
DROP POLICY IF EXISTS "audit_insert_service_role" ON public.crm_write_audit;

CREATE POLICY "audit_select_owner_or_admin"
  ON public.crm_write_audit
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "audit_insert_service_role"
  ON public.crm_write_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- No UPDATE policy. No DELETE policy. service_role bypassa RLS de todas formas
-- (igual que en el resto de tablas), pero a nivel de capa app NO permitimos.

-- ── 4. PostgREST cache reload ───────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
-- ===== 20260524110000_help_sections_integrations.sql =====
-- Sprint 2 Phase 06: seed sección "integrations" en help_sections.
-- Idempotente (UPSERT por key).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'help_sections'
  ) THEN
    RAISE NOTICE 'help_sections table missing — skipping seed';
    RETURN;
  END IF;

  -- Fix 03-06-2026: la tabla real es (scope, slug, title, content_markdown)
  -- con UNIQUE(scope, slug). Antes usaba columnas inexistentes (content_md, audience).
  INSERT INTO public.help_sections (scope, slug, title, content_markdown, updated_at)
  VALUES (
    'admin',
    'integrations',
    'Integraciones CRM',
    E'## Conectar HubSpot o Zoho\n\n1. Ir a **Ajustes → Integraciones → CRM**.\n2. Click **Conectar** en el provider que prefieras.\n3. Aprobar la app en el portal del CRM (full-page redirect).\n4. Volverás al dashboard con la card en estado **Conectado**.\n\n## Política de escritura\n\n- **append_only** (default): el dashboard SOLO escribe campos vacíos en el CRM. Datos manuales del rep comercial nunca se pisan.\n- **overwrite_with_audit**: permite sobrescribir SOLO los campos listados, con audit trail completo. Útil para corregir typos en email/teléfono masivamente.\n\n## Solo 1 CRM activo por tenant\n\nDesconecta el actual antes de conectar otro. El historial de audit se preserva aunque desconectes.\n\n## ¿Algo falla?\n\n- Click **Test connection** en la card para ver si el CRM responde.\n- Si ves estado "Error", revisa logs del servidor (Easypanel) y reconecta.\n',
    NOW()
  )
  ON CONFLICT (scope, slug) DO UPDATE SET
    title = EXCLUDED.title,
    content_markdown = EXCLUDED.content_markdown,
    updated_at = NOW();
END $$;

NOTIFY pgrst, 'reload schema';
-- ===== 20260526100000_campaigns_and_holidays.sql =====
-- Sprint 3 phase-08 Bloque 3.B (NEW-09 + NEW-10).
-- Crea 2 tablas:
--   campaigns       : entidad propia para campañas (antes solo TEXT column en leads).
--   tenant_holidays : festivos manuales por país per-tenant (bloquea scheduler).
--
-- Ambas con RLS multi-tenant + índices + dedup.

-- =============================================================================
-- campaigns — NEW-09
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  -- Source CSV/Excel/API. NULL si creada en UI manual.
  source TEXT,
  -- Config flexible: cadencia (leads/min), ventana horaria, días activos.
  -- Ejemplo: { "rate_per_min": 5, "window_start": "09:00", "window_end": "20:00", "active_days": [1,2,3,4,5] }
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(tenant_id, status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_tenant_select ON campaigns
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY campaigns_tenant_insert ON campaigns
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY campaigns_tenant_update ON campaigns
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY campaigns_tenant_delete ON campaigns
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );

-- Trigger updated_at automático.
CREATE OR REPLACE FUNCTION campaigns_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION campaigns_updated_at_trigger();

-- =============================================================================
-- tenant_holidays — NEW-10
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  country_code CHAR(2) NOT NULL,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (tenant_id, country_code, date)
);

CREATE INDEX IF NOT EXISTS idx_tenant_holidays_lookup
  ON tenant_holidays(tenant_id, country_code, date);

ALTER TABLE tenant_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_holidays_tenant_select ON tenant_holidays
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY tenant_holidays_tenant_insert ON tenant_holidays
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY tenant_holidays_tenant_delete ON tenant_holidays
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );

-- Comentarios para audit trail
COMMENT ON TABLE campaigns IS 'Sprint 3 NEW-09: campañas como entidad propia (antes solo TEXT column en leads). Config JSONB para cadencia configurable.';
COMMENT ON TABLE tenant_holidays IS 'Sprint 3 NEW-10: festivos manuales por país per-tenant. Usado por BullMQ scheduler para evitar envíos en festivos.';
-- ===== 20260527000000_sheet_connections.sql =====
-- ============================================================================
-- Sprint 4 · Google Sheets bidireccional — tabla sheet_connections
-- ============================================================================
-- Modelo: 1 tenant -> 1 integration (crm_type = 'google_sheets') -> N sheets.
--
-- Una sola integración `integrations` por tenant guarda Client ID/Secret +
-- OAuth tokens del tenant (cifrados AES-256 vía credentials_cipher).
--
-- Esta tabla registra N hojas independientes conectadas por ese tenant
-- mediante Google Picker (scope drive.file). Cada hoja tiene:
--   - Su propio Drive watch channel (TTL 7 días, renovación BullMQ).
--   - Su propio column_mapping (estructura de columnas distinta por hoja).
--   - Su propio purpose (leads_inbound / leads_export / reporting / custom).
--   - Estado activo independiente (pausar 1 hoja sin afectar al resto).
--
-- RLS: dueño del tenant + admin. service_role bypass (webhooks/workers).
-- Idempotente.
--
-- Ref: plans/260521-0000-sprint-4-google-sheets/plan.md
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sheet_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_id        UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,

  -- Identificación Google Drive
  spreadsheet_id        TEXT NOT NULL,
  spreadsheet_name      TEXT,
  sheet_tab_name        TEXT NOT NULL DEFAULT 'Hoja 1',

  -- Configuración funcional
  purpose               TEXT NOT NULL DEFAULT 'leads_inbound'
    CHECK (purpose IN ('leads_inbound', 'leads_export', 'reporting', 'custom')),
  column_mapping        JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Push notifications Drive (watch channel)
  drive_channel_id      UUID,
  drive_channel_token   TEXT,
  drive_resource_id     TEXT,
  drive_channel_expiry  TIMESTAMPTZ,

  -- Write-back hacia la Sheet (estado del lead, etc.)
  writeback_enabled     BOOLEAN NOT NULL DEFAULT false,

  -- Estado
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_synced_at        TIMESTAMPTZ,
  last_sync_error       TEXT,

  -- Auditoría
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES auth.users(id),

  -- Una hoja sólo puede estar conectada una vez por tenant.
  UNIQUE (tenant_id, spreadsheet_id, sheet_tab_name)
);

COMMENT ON TABLE public.sheet_connections IS
  'N Sheets conectadas por tenant vía Google Picker (scope drive.file). Cada hoja tiene watch channel propio + column mapping configurable.';

COMMENT ON COLUMN public.sheet_connections.purpose IS
  'leads_inbound = leer filas nuevas y crear leads. leads_export = escribir leads procesados. reporting = solo lectura. custom = lógica ad-hoc.';

COMMENT ON COLUMN public.sheet_connections.column_mapping IS
  'JSONB tipado validado por ColumnMappingSchema (src/lib/integrations/sheets/types.ts). Estructura: { header_row, data_start_row, columns: [{ letter, header, target, type, writeback }] }. target permite lead.<campo>, lead_cualificacion.<campo>, metadata.<campo>. writeback=true habilita escritura desde Esden hacia esa celda.';

COMMENT ON COLUMN public.sheet_connections.drive_channel_token IS
  'Token HMAC validado en /api/webhooks/google-sheets. Auto-generado al crear watch channel. Por hoja, no compartido.';

COMMENT ON COLUMN public.sheet_connections.drive_channel_expiry IS
  'TTL del watch channel (Drive limita a 7 días). Worker BullMQ renueva 24h antes.';

COMMENT ON COLUMN public.sheet_connections.writeback_enabled IS
  'Si true, los cambios de stage del lead se reflejan en la celda correspondiente de la Sheet.';

-- ── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sheet_connections_tenant
  ON public.sheet_connections(tenant_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sheet_connections_integration
  ON public.sheet_connections(integration_id);

CREATE INDEX IF NOT EXISTS idx_sheet_connections_channel
  ON public.sheet_connections(drive_channel_id)
  WHERE drive_channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sheet_connections_expiry
  ON public.sheet_connections(drive_channel_expiry)
  WHERE is_active = true AND drive_channel_expiry IS NOT NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.sheet_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sheet_connections_select_owner_or_admin" ON public.sheet_connections;
DROP POLICY IF EXISTS "sheet_connections_insert_owner_or_admin" ON public.sheet_connections;
DROP POLICY IF EXISTS "sheet_connections_update_owner_or_admin" ON public.sheet_connections;
DROP POLICY IF EXISTS "sheet_connections_delete_owner_or_admin" ON public.sheet_connections;
DROP POLICY IF EXISTS "service_role_all_sheet_connections" ON public.sheet_connections;

CREATE POLICY "sheet_connections_select_owner_or_admin"
  ON public.sheet_connections
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "sheet_connections_insert_owner_or_admin"
  ON public.sheet_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "sheet_connections_update_owner_or_admin"
  ON public.sheet_connections
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "sheet_connections_delete_owner_or_admin"
  ON public.sheet_connections
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "service_role_all_sheet_connections"
  ON public.sheet_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Trigger updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_sheet_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sheet_connections_updated_at ON public.sheet_connections;
CREATE TRIGGER trg_sheet_connections_updated_at
  BEFORE UPDATE ON public.sheet_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_sheet_connections_updated_at();

-- ============================================================================
-- sheet_row_processed — idempotencia: evitar reprocesar misma fila
-- ============================================================================
-- Drive notifica "algo cambió en este archivo" sin decir qué. El worker debe
-- leer toda la Sheet, hashear cada fila y registrar las nuevas/modificadas.
-- Esta tabla guarda el hash de cada fila YA procesada para skipear duplicados
-- y detectar updates.
--
-- TTL implícito: rotar/purgar filas con last_seen_at > 90 días + Sheet inactiva.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sheet_row_processed (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_connection_id   UUID NOT NULL REFERENCES public.sheet_connections(id) ON DELETE CASCADE,
  row_index             INTEGER NOT NULL,
  row_hash              TEXT NOT NULL,
  lead_id               UUID REFERENCES public.lead(id) ON DELETE SET NULL,
  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (sheet_connection_id, row_index)
);

COMMENT ON TABLE public.sheet_row_processed IS
  'Idempotencia pull: hash de cada fila procesada por sheet_connection. Permite detectar nuevas vs modificadas vs ya vistas.';

CREATE INDEX IF NOT EXISTS idx_sheet_row_processed_lead
  ON public.sheet_row_processed(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sheet_row_processed_connection
  ON public.sheet_row_processed(sheet_connection_id, last_seen_at DESC);

ALTER TABLE public.sheet_row_processed ENABLE ROW LEVEL SECURITY;

-- Solo service_role escribe. Authenticated lee filas de sus propias sheets
-- (vía join implícito por sheet_connection_id que ya tiene RLS).

DROP POLICY IF EXISTS "sheet_row_processed_select_owner" ON public.sheet_row_processed;
DROP POLICY IF EXISTS "service_role_all_sheet_row_processed" ON public.sheet_row_processed;

CREATE POLICY "sheet_row_processed_select_owner"
  ON public.sheet_row_processed
  FOR SELECT
  TO authenticated
  USING (
    sheet_connection_id IN (
      SELECT id FROM public.sheet_connections
      WHERE tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    )
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "service_role_all_sheet_row_processed"
  ON public.sheet_row_processed
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── PostgREST cache reload ─────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
-- ===== 20260527000001_integrations_tenant_oauth_app.sql =====
-- ============================================================================
-- Sprint 4 · Google Sheets — credenciales OAuth de la app por tenant
-- ============================================================================
-- Cada tenant que use Google Sheets como CRM trae su propia app OAuth de
-- Google Cloud Console (decision arquitectonica 27-05-2026). Esto evita que
-- todos los tenants compartan la cuota Sheets API de LinkStation y
-- elimina la necesidad de OAuth Verification de Google para la app central.
--
-- Modelo:
--   - app_client_id_cipher     -> Client ID de la app del tenant (cifrado).
--   - app_client_secret_cipher -> Client Secret de la app (cifrado AES-256-GCM).
--   - credentials_cipher       -> OAuth tokens rotables (existente Sprint 1).
--
-- Separar credenciales de app (raras de rotar) de tokens OAuth (rotan cada
-- hora) facilita auditoria y reduce superficie de rotacion.
--
-- Aplica solo a crm_type = 'google_sheets' por ahora. HubSpot/Zoho siguen
-- usando env vars del producto (GLOBALES) porque tienen apps verificadas
-- centralizadas. Sheets es la excepcion (decision 27-05-2026).
--
-- Idempotente.
-- ============================================================================

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS app_client_id_cipher TEXT;

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS app_client_secret_cipher TEXT;

COMMENT ON COLUMN public.integrations.app_client_id_cipher IS
  'Client ID de la app OAuth del tenant en Google Cloud Console (Sheets). Cifrado AES-256-GCM via src/lib/crypto/token-crypto.ts. NULL para CRMs con app central (HubSpot/Zoho).';

COMMENT ON COLUMN public.integrations.app_client_secret_cipher IS
  'Client Secret de la app OAuth del tenant (Sheets). Cifrado AES-256-GCM. NULL para CRMs con app central.';

NOTIFY pgrst, 'reload schema';
-- ===== 20260527000002_sheets_writeback_trigger.sql =====
-- ============================================================================
-- Sprint 4 · Google Sheets — Trigger writeback automatico
-- ============================================================================
-- Objetivo: cuando un lead originado en una Sheet conectada (sheet_row_processed
-- tiene fila con su lead_id) cambia algun campo write-back (current_stage,
-- assigned_advisor_id, last_advisor_assignment), encolar un job de write-back
-- sin que el orchestrator tenga que invocar nada explicitamente.
--
-- Diseño:
--   - Trigger AFTER UPDATE en lead.
--   - Solo procesa si el lead tiene fila en sheet_row_processed (originó de Sheet).
--   - Inserta row en sheets_writeback_outbox para que un worker BullMQ la consuma.
--   - Outbox pattern (no pg_notify directo) por durabilidad: si el worker está
--     caido, el job no se pierde — sigue en la tabla hasta procesado.
--
-- Cambios cubiertos:
--   - current_stage (lead_stage)
--   - assigned_advisor_id (tracking de owner)
--   - cualquier UPDATE explicito que toque columnas top-level.
--
-- NO cubre lead_cualificacion (esa tabla tiene su propio trigger en otra
-- migracion si se decide).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sheets_writeback_outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  changes       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

COMMENT ON TABLE public.sheets_writeback_outbox IS
  'Outbox pattern: cambios en lead que originaron de Sheet se encolan aqui. Worker BullMQ los lee y aplica writeBackLeadChange. Durable: sobrevive caidas del worker.';

CREATE INDEX IF NOT EXISTS idx_sheets_wb_outbox_pending
  ON public.sheets_writeback_outbox(created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sheets_wb_outbox_lead
  ON public.sheets_writeback_outbox(lead_id, status);

ALTER TABLE public.sheets_writeback_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wb_outbox_select_owner" ON public.sheets_writeback_outbox;
DROP POLICY IF EXISTS "service_role_all_wb_outbox" ON public.sheets_writeback_outbox;

CREATE POLICY "wb_outbox_select_owner"
  ON public.sheets_writeback_outbox
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "service_role_all_wb_outbox"
  ON public.sheets_writeback_outbox
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Trigger function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tr_lead_changes_to_sheets_writeback()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB := '{}'::jsonb;
  has_sheet_origin BOOLEAN;
BEGIN
  -- Solo procesar si el lead tiene origen Sheet (esta en sheet_row_processed).
  SELECT EXISTS(
    SELECT 1 FROM public.sheet_row_processed WHERE lead_id = NEW.id
  ) INTO has_sheet_origin;

  IF NOT has_sheet_origin THEN
    RETURN NEW;
  END IF;

  -- Detectar cambios en campos relevantes y armar payload.
  IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
    changes := changes || jsonb_build_object('lead.current_stage', NEW.current_stage);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    changes := changes || jsonb_build_object('lead.status', NEW.status);
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    changes := changes || jsonb_build_object('lead.email', NEW.email);
  END IF;
  IF NEW.telefono IS DISTINCT FROM OLD.telefono THEN
    changes := changes || jsonb_build_object('lead.telefono', NEW.telefono);
  END IF;

  -- Si no hay cambios trackables, salir sin tocar la outbox.
  IF changes = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.sheets_writeback_outbox (lead_id, tenant_id, changes)
  VALUES (NEW.id, NEW.tenant_id, changes);

  -- Notificacion best-effort para que el worker BullMQ procese rapido.
  -- Si no hay listener, no pasa nada — outbox queda durable.
  PERFORM pg_notify('sheets_writeback_pending', NEW.id::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_writeback ON public.lead;
CREATE TRIGGER trg_lead_writeback
  AFTER UPDATE ON public.lead
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_lead_changes_to_sheets_writeback();

-- ── PostgREST cache reload ─────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
-- ===== 20260529000000_crm_write_audit_align_schema.sql =====
-- ============================================================================
-- Sprint 4 · Alineamiento schema crm_write_audit (SQL ↔ Zod) — R-014
-- ============================================================================
-- El schema SQL original (20260524100000) tenía columnas granulares por celda:
--   provider, lead_id, field_name, old_value, new_value, write_policy, actor_id
--
-- El schema Zod (src/lib/schemas/integrations.ts:94) usa modelo por operación:
--   integration_id, crm_type, operation, local_entity, local_entity_id,
--   crm_entity_id, payload_hash, result, error_message, write_policy
--
-- Resultado: CrmWriteAuditRepository.create() insertaba payload Zod en columnas
-- SQL distintas → INSERT 400 silencioso.
--
-- Solución híbrida (decisión 29-05-2026): ALTER TABLE añade los campos Zod
-- como NULLABLE manteniendo los campos SQL originales también NULLABLE.
-- Zod actúa como guardián: valida payload completo antes del INSERT.
--
-- Casos de uso cubiertos:
--   - HubSpot/Zoho (Sprint 2): rellena campos Zod (operation/result/payload_hash).
--     Campos SQL granulares quedan NULL.
--   - Sheets writeback (Sprint 4): rellena campos SQL (field_name/old_value/new_value)
--     + Zod básicos (integration_id/crm_type='google_sheets'/operation='update'/result).
--
-- Idempotente. Solo añade columnas + index nuevo. NO altera datos existentes.
-- ============================================================================

-- ── 1. Columnas Zod nuevas (todas NULLABLE para compat con filas SQL pre-existentes) ──

ALTER TABLE public.crm_write_audit
  ADD COLUMN IF NOT EXISTS crm_type TEXT
    CHECK (crm_type IN ('hubspot', 'zoho', 'google_sheets', 'salesforce', 'gohighlevel', 'activecampaign'));

ALTER TABLE public.crm_write_audit
  ADD COLUMN IF NOT EXISTS operation TEXT
    CHECK (operation IN ('create', 'update', 'delete', 'upsert'));

ALTER TABLE public.crm_write_audit
  ADD COLUMN IF NOT EXISTS local_entity TEXT;

ALTER TABLE public.crm_write_audit
  ADD COLUMN IF NOT EXISTS local_entity_id UUID;

ALTER TABLE public.crm_write_audit
  ADD COLUMN IF NOT EXISTS crm_entity_id TEXT;

ALTER TABLE public.crm_write_audit
  ADD COLUMN IF NOT EXISTS payload_hash TEXT;

ALTER TABLE public.crm_write_audit
  ADD COLUMN IF NOT EXISTS result TEXT
    CHECK (result IN ('success', 'error', 'skipped', 'deferred'));

ALTER TABLE public.crm_write_audit
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ── 2. Aflojar NOT NULL en campos SQL granulares ─────────────────────────────
-- Antes eran NOT NULL (modelo por celda obligatorio). Ahora son opcionales
-- porque el modelo por operación (Zod) no los necesita.

ALTER TABLE public.crm_write_audit
  ALTER COLUMN provider DROP NOT NULL;

ALTER TABLE public.crm_write_audit
  ALTER COLUMN lead_id DROP NOT NULL;

ALTER TABLE public.crm_write_audit
  ALTER COLUMN field_name DROP NOT NULL;

ALTER TABLE public.crm_write_audit
  ALTER COLUMN new_value DROP NOT NULL;

-- ── 3. Comentarios actualizados ──────────────────────────────────────────────

COMMENT ON COLUMN public.crm_write_audit.crm_type IS
  'Tipo de CRM destino (alineado con integrations.crm_type). Requerido por Zod.';

COMMENT ON COLUMN public.crm_write_audit.operation IS
  'Tipo de operación: create | update | delete | upsert. Requerido por Zod.';

COMMENT ON COLUMN public.crm_write_audit.local_entity IS
  'Entidad local AF sobre la que se opera (lead, appointment, qualification, program).';

COMMENT ON COLUMN public.crm_write_audit.local_entity_id IS
  'ID local de la entidad AF (UUID interno).';

COMMENT ON COLUMN public.crm_write_audit.crm_entity_id IS
  'ID en el sistema CRM externo tras la operación (puede ser NULL si la op aún no devolvió ID).';

COMMENT ON COLUMN public.crm_write_audit.payload_hash IS
  'SHA-256 del payload enviado al CRM. Permite detectar duplicados de op idéntica.';

COMMENT ON COLUMN public.crm_write_audit.result IS
  'Resultado de la operación: success | error | skipped | deferred.';

COMMENT ON COLUMN public.crm_write_audit.error_message IS
  'Mensaje de error si result=error.';

COMMENT ON COLUMN public.crm_write_audit.field_name IS
  'Modelo granular (Sheets writeback): nombre del campo modificado (lead.current_stage, etc.). NULL para operaciones por payload (HubSpot/Zoho).';

COMMENT ON COLUMN public.crm_write_audit.old_value IS
  'Modelo granular (Sheets writeback): valor anterior del campo. NULL si no se conocía.';

COMMENT ON COLUMN public.crm_write_audit.new_value IS
  'Modelo granular (Sheets writeback): valor nuevo del campo. NULL para operaciones por payload.';

-- ── 4. Índices para queries habituales ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_crm_write_audit_local_entity
  ON public.crm_write_audit(tenant_id, local_entity, local_entity_id, created_at DESC)
  WHERE local_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_write_audit_payload_hash
  ON public.crm_write_audit(payload_hash)
  WHERE payload_hash IS NOT NULL;

-- ── 5. PostgREST cache reload ────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
-- ===== 20260603100000_lead_add_current_stage_and_advisor_fields.sql =====
-- Sprint 4 (BUG-4-04 / BUG-4-05) — Alinear tabla `lead` con el codigo.
--
-- Contexto: orchestrator.ts, leads-repository.ts, handoff.ts, api/leads/ingest,
-- el trigger trg_lead_writeback (20260527000002) y src/types/database.ts usan
-- columnas que NUNCA se crearon en ninguna migracion:
--   - current_stage         (etapa del pipeline agentico, LeadStageEnum)
--   - assigned_advisor_id    (advisor asignado en round-robin tras cualificar)
--   - last_advisor_assignment(timestamp de la ultima asignacion)
--
-- Verificado 03-06-2026: ausentes en local Y en VPS (no era migracion sin
-- aplicar — eran columnas fantasma). La tabla solo tenia `status`
-- (PENDING/QUALIFIED/REJECTED/CLIENTE) y `advisor_id`.
--
-- `status` (ciclo de vida administrativo) y `current_stage` (etapa pipeline IA)
-- son dimensiones INDEPENDIENTES — no se sustituyen, coexisten. Esta migracion
-- crea current_stage y hace backfill por correlacion con status.
--
-- Idempotente (IF NOT EXISTS) para que reset/re-apply no fallen.

-- ── 1. current_stage ────────────────────────────────────────────────────────
ALTER TABLE public.lead
  ADD COLUMN IF NOT EXISTS current_stage TEXT NOT NULL DEFAULT 'QUALIFICATION';

-- CHECK alineado con LeadStageEnum (src/lib/schemas/_base.ts).
-- Se anade por separado para poder backfillear antes de validar filas viejas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_current_stage_check'
  ) THEN
    -- Backfill por correlacion status -> stage ANTES de activar el CHECK.
    UPDATE public.lead SET current_stage = CASE status
      WHEN 'PENDING'   THEN 'QUALIFICATION'
      WHEN 'QUALIFIED' THEN 'SCHEDULING'
      WHEN 'CLIENTE'   THEN 'COMPLETED'
      WHEN 'REJECTED'  THEN 'DROPPED'
      ELSE 'QUALIFICATION'
    END
    WHERE current_stage = 'QUALIFICATION';  -- solo filas en el default recien anadido

    ALTER TABLE public.lead
      ADD CONSTRAINT lead_current_stage_check
      CHECK (current_stage IN (
        'QUALIFICATION', 'SCHEDULING', 'COMPLETED', 'DROPPED', 'UNREACHABLE'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_current_stage
  ON public.lead(tenant_id, current_stage);

COMMENT ON COLUMN public.lead.current_stage IS
  'Etapa del pipeline agentico (LeadStageEnum: QUALIFICATION/SCHEDULING/COMPLETED/DROPPED/UNREACHABLE). Independiente de status (ciclo de vida administrativo). BUG-4-04 Sprint 4.';

-- ── 2. assigned_advisor_id + last_advisor_assignment ────────────────────────
-- Usadas por orchestrator.handleNewLead (round-robin advisor). `advisor_id`
-- preexistente queda como esta (compat); assigned_advisor_id es el campo que
-- escribe el orquestador tras cualificar.
ALTER TABLE public.lead
  ADD COLUMN IF NOT EXISTS assigned_advisor_id UUID
    REFERENCES public.advisors(id) ON DELETE SET NULL;

ALTER TABLE public.lead
  ADD COLUMN IF NOT EXISTS last_advisor_assignment TIMESTAMPTZ;

COMMENT ON COLUMN public.lead.assigned_advisor_id IS
  'Advisor asignado por el orquestador en round-robin tras cualificar (orchestrator.ts). BUG-4-05 Sprint 4.';
COMMENT ON COLUMN public.lead.last_advisor_assignment IS
  'Timestamp de la ultima asignacion de advisor. BUG-4-05 Sprint 4.';

-- ── 3. Recargar el schema cache de PostgREST ────────────────────────────────
NOTIFY pgrst, 'reload schema';
-- ===== 20260608153000_zoho_sync_connections.sql =====
-- ============================================================================
-- Sprint 5 · Zoho CRM entrada de leads (event-driven) — capa de datos
-- ============================================================================
-- Modelo: 1 tenant -> 1 integration (crm_type = 'zoho', Sprint 2) -> 1 config
-- de pull. La conexión OAuth (Client ID/Secret + tokens cifrados AES-256) ya
-- vive en `integrations`. Estas tablas la REFERENCIAN vía integration_id, no
-- duplican credenciales.
--
-- Dos tablas:
--   - zoho_sync_connections: config del pull por tenant (criterio de búsqueda,
--     field mapping, suscripción Notifications API / Workflow Webhook, cursor
--     de reconciliación, writeback on/off, activo/pausado).
--   - zoho_lead_synced: idempotencia por zoho_lead_id. Zoho da IDs únicos por
--     lead → no hace falta hash de fila (más simple que Sheets). Guarda
--     zoho_modified_time para comparar y NO re-procesar (clave anti-bucle).
--
-- RLS: dueño del tenant + admin. service_role bypass (webhooks/workers).
-- Idempotente.
--
-- Ref: plans/260608-1518-sprint-05-zoho-entrada-leads/phase-01-capa-datos-migraciones.md
-- ============================================================================

-- ── zoho_sync_connections ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zoho_sync_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_id        UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,

  -- Criterio de búsqueda Zoho (módulo + filtro). Default: Leads modificados.
  search_criteria       JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Mapeo campo Zoho -> target AF (lead.<campo> / lead_cualificacion.<campo> / metadata.<campo>).
  field_mapping         JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Suscripción event-driven
  subscription_channel_id  TEXT,
  subscription_token       TEXT,
  subscription_expiry      TIMESTAMPTZ,
  subscription_method      TEXT NOT NULL DEFAULT 'notifications_api'
    CHECK (subscription_method IN ('notifications_api', 'workflow_webhook')),

  -- Write-back hacia Zoho (estado del lead, etc.)
  writeback_enabled     BOOLEAN NOT NULL DEFAULT true,

  -- Estado
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_synced_at        TIMESTAMPTZ,
  last_sync_error       TEXT,

  -- Auditoría
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES auth.users(id),

  -- Una sola config de pull por (tenant, integración).
  UNIQUE (tenant_id, integration_id)
);

COMMENT ON TABLE public.zoho_sync_connections IS
  'Config de pull Zoho event-driven por tenant. Referencia la integración OAuth (Sprint 2) vía integration_id. Guarda suscripción Notifications API / Workflow Webhook + cursor de reconciliación.';

COMMENT ON COLUMN public.zoho_sync_connections.search_criteria IS
  'JSONB validado por ZohoSearchCriteriaSchema. Estructura: { module: "Leads", criteria?: "<Zoho COQL/criteria>" }. Default: Leads modificados.';

COMMENT ON COLUMN public.zoho_sync_connections.field_mapping IS
  'JSONB validado por ZohoFieldMappingSchema. Array de { zoho_field, target, type? }. target permite lead.<campo>, lead_cualificacion.<campo>, metadata.<campo>. Vacío => mapeo default.';

COMMENT ON COLUMN public.zoho_sync_connections.subscription_channel_id IS
  'ID del canal de la Notifications API de Zoho (channel_id). NULL si subscription_method = workflow_webhook.';

COMMENT ON COLUMN public.zoho_sync_connections.subscription_token IS
  'Token HMAC validado en /api/webhooks/zoho para autenticar la notificación entrante.';

COMMENT ON COLUMN public.zoho_sync_connections.subscription_expiry IS
  'TTL de la suscripción Notifications API (Zoho limita a 7 días). Worker renueva antes de caducar. NULL para workflow_webhook (no caduca).';

COMMENT ON COLUMN public.zoho_sync_connections.subscription_method IS
  'notifications_api = auto, caduca 7d, requiere renovación. workflow_webhook = manual en Zoho, NO caduca.';

COMMENT ON COLUMN public.zoho_sync_connections.last_synced_at IS
  'Cursor de la reconciliación diaria (red de seguridad). Marca hasta qué Modified_Time se procesó.';

-- ── Índices zoho_sync_connections ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_zoho_sync_conn_tenant
  ON public.zoho_sync_connections(tenant_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_zoho_sync_conn_integration
  ON public.zoho_sync_connections(integration_id);

CREATE INDEX IF NOT EXISTS idx_zoho_sync_conn_expiry
  ON public.zoho_sync_connections(subscription_expiry)
  WHERE is_active = true AND subscription_expiry IS NOT NULL;

-- ── RLS zoho_sync_connections ───────────────────────────────────────────────

ALTER TABLE public.zoho_sync_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zoho_sync_conn_select_owner_or_admin" ON public.zoho_sync_connections;
DROP POLICY IF EXISTS "zoho_sync_conn_insert_owner_or_admin" ON public.zoho_sync_connections;
DROP POLICY IF EXISTS "zoho_sync_conn_update_owner_or_admin" ON public.zoho_sync_connections;
DROP POLICY IF EXISTS "zoho_sync_conn_delete_owner_or_admin" ON public.zoho_sync_connections;
DROP POLICY IF EXISTS "service_role_all_zoho_sync_conn" ON public.zoho_sync_connections;

CREATE POLICY "zoho_sync_conn_select_owner_or_admin"
  ON public.zoho_sync_connections
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "zoho_sync_conn_insert_owner_or_admin"
  ON public.zoho_sync_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "zoho_sync_conn_update_owner_or_admin"
  ON public.zoho_sync_connections
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "zoho_sync_conn_delete_owner_or_admin"
  ON public.zoho_sync_connections
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "service_role_all_zoho_sync_conn"
  ON public.zoho_sync_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Trigger updated_at zoho_sync_connections ────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_zoho_sync_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_zoho_sync_connections_updated_at ON public.zoho_sync_connections;
CREATE TRIGGER trg_zoho_sync_connections_updated_at
  BEFORE UPDATE ON public.zoho_sync_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_zoho_sync_connections_updated_at();

-- ============================================================================
-- zoho_lead_synced — idempotencia por zoho_lead_id
-- ============================================================================
-- Zoho da IDs únicos por lead. Esta tabla mapea zoho_lead_id -> lead_id interno
-- y guarda Modified_Time del lead en Zoho para comparar y NO re-procesar leads
-- que no han cambiado (clave anti-bucle pull <-> writeback).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.zoho_lead_synced (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_id        UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  zoho_lead_id          TEXT NOT NULL,
  lead_id               UUID REFERENCES public.lead(id) ON DELETE SET NULL,
  zoho_modified_time    TIMESTAMPTZ,
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un lead Zoho sólo se registra una vez por integración.
  UNIQUE (integration_id, zoho_lead_id)
);

COMMENT ON TABLE public.zoho_lead_synced IS
  'Idempotencia del pull Zoho: mapea zoho_lead_id externo -> lead_id interno. zoho_modified_time evita re-procesar leads no modificados (anti-bucle).';

COMMENT ON COLUMN public.zoho_lead_synced.zoho_modified_time IS
  'Modified_Time del lead en Zoho. El pull lo compara antes de re-procesar: si Zoho no reporta cambio respecto a este valor, se omite (clave anti-bucle pull/writeback).';

CREATE INDEX IF NOT EXISTS idx_zoho_lead_synced_lead
  ON public.zoho_lead_synced(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zoho_lead_synced_integration
  ON public.zoho_lead_synced(integration_id);

ALTER TABLE public.zoho_lead_synced ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zoho_lead_synced_select_owner_or_admin" ON public.zoho_lead_synced;
DROP POLICY IF EXISTS "zoho_lead_synced_insert_owner_or_admin" ON public.zoho_lead_synced;
DROP POLICY IF EXISTS "zoho_lead_synced_update_owner_or_admin" ON public.zoho_lead_synced;
DROP POLICY IF EXISTS "zoho_lead_synced_delete_owner_or_admin" ON public.zoho_lead_synced;
DROP POLICY IF EXISTS "service_role_all_zoho_lead_synced" ON public.zoho_lead_synced;

CREATE POLICY "zoho_lead_synced_select_owner_or_admin"
  ON public.zoho_lead_synced
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "zoho_lead_synced_insert_owner_or_admin"
  ON public.zoho_lead_synced
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "zoho_lead_synced_update_owner_or_admin"
  ON public.zoho_lead_synced
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "zoho_lead_synced_delete_owner_or_admin"
  ON public.zoho_lead_synced
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "service_role_all_zoho_lead_synced"
  ON public.zoho_lead_synced
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── PostgREST cache reload ─────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
-- ===== 20260608153100_zoho_writeback_trigger.sql =====
-- ============================================================================
-- Sprint 5 · Zoho CRM — Trigger writeback automático + guard anti-bucle
-- ============================================================================
-- Objetivo: cuando un lead originado en Zoho (tiene fila en zoho_lead_synced)
-- cambia un campo writeback (current_stage, status, email, telefono), encolar
-- un job de write-back en zoho_writeback_outbox para que un worker BullMQ lo
-- envíe de vuelta a Zoho. Outbox pattern (durable): si el worker está caído,
-- el job no se pierde — sigue en la tabla hasta procesado.
--
-- GUARD ANTI-BUCLE CRÍTICO
-- ------------------------
-- El pull (webhook Zoho -> UPDATE lead) NO debe re-encolar writeback, o se
-- crearía un bucle infinito: pull actualiza lead -> trigger encola writeback ->
-- writeback actualiza Zoho -> Zoho notifica modificación -> pull re-procesa...
--
-- Mitigación: el procesador de pull ejecuta `SET LOCAL app.zoho_pull_in_progress
-- = 'true'` ANTES de hacer el UPDATE del lead. Este trigger comprueba ese flag
-- con `current_setting('app.zoho_pull_in_progress', true)` (el 2º arg `true` =
-- missing_ok, devuelve NULL/'' si no está seteado) y, si es 'true', hace
-- RETURN NEW sin encolar. El SET LOCAL solo vive dentro de la transacción del
-- pull, así que los UPDATE normales (UI/agentes) sí encolan writeback.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.zoho_writeback_outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  changes       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

COMMENT ON TABLE public.zoho_writeback_outbox IS
  'Outbox pattern: cambios en lead originados en Zoho se encolan aquí. Worker BullMQ los lee y los escribe en Zoho. Durable: sobrevive caídas del worker. El trigger respeta el guard anti-bucle app.zoho_pull_in_progress.';

CREATE INDEX IF NOT EXISTS idx_zoho_wb_outbox_pending
  ON public.zoho_writeback_outbox(created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_zoho_wb_outbox_lead
  ON public.zoho_writeback_outbox(lead_id, status);

ALTER TABLE public.zoho_writeback_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zoho_wb_outbox_select_owner" ON public.zoho_writeback_outbox;
DROP POLICY IF EXISTS "service_role_all_zoho_wb_outbox" ON public.zoho_writeback_outbox;

CREATE POLICY "zoho_wb_outbox_select_owner"
  ON public.zoho_writeback_outbox
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "service_role_all_zoho_wb_outbox"
  ON public.zoho_writeback_outbox
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Trigger function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tr_lead_changes_to_zoho_writeback()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB := '{}'::jsonb;
  has_zoho_origin BOOLEAN;
BEGIN
  -- GUARD ANTI-BUCLE: si el cambio viene del propio pull Zoho, NO encolar.
  -- El procesador de pull setea `SET LOCAL app.zoho_pull_in_progress = 'true'`
  -- dentro de su transacción antes de actualizar el lead.
  IF current_setting('app.zoho_pull_in_progress', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Solo procesar si el lead tiene origen Zoho (está en zoho_lead_synced).
  SELECT EXISTS(
    SELECT 1 FROM public.zoho_lead_synced WHERE lead_id = NEW.id
  ) INTO has_zoho_origin;

  IF NOT has_zoho_origin THEN
    RETURN NEW;
  END IF;

  -- Detectar cambios en campos relevantes y armar payload.
  IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
    changes := changes || jsonb_build_object('lead.current_stage', NEW.current_stage);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    changes := changes || jsonb_build_object('lead.status', NEW.status);
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    changes := changes || jsonb_build_object('lead.email', NEW.email);
  END IF;
  IF NEW.telefono IS DISTINCT FROM OLD.telefono THEN
    changes := changes || jsonb_build_object('lead.telefono', NEW.telefono);
  END IF;

  -- Si no hay cambios trackables, salir sin tocar la outbox.
  IF changes = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.zoho_writeback_outbox (lead_id, tenant_id, changes)
  VALUES (NEW.id, NEW.tenant_id, changes);

  -- Notificación best-effort para que el worker BullMQ procese rápido.
  -- Si no hay listener, no pasa nada — la outbox queda durable.
  PERFORM pg_notify('zoho_writeback_pending', NEW.id::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_lead_zoho_writeback ON public.lead;
CREATE TRIGGER trg_lead_zoho_writeback
  AFTER UPDATE ON public.lead
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_lead_changes_to_zoho_writeback();

-- ── PostgREST cache reload ─────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
-- ===== 20260608153200_zoho_pull_guarded_update.sql =====
-- ============================================================================
-- Sprint 5 · Zoho CRM — RPC de UPDATE de lead con guard anti-bucle
-- ============================================================================
-- Objetivo: el procesador de pull (event-processor.ts) necesita actualizar un
-- lead ya sincronizado desde Zoho SIN que el trigger trg_lead_zoho_writeback
-- re-encole un writeback (bucle infinito). El guard se basa en
-- `app.zoho_pull_in_progress = 'true'` seteado DENTRO de la misma transacción.
--
-- supabase-js NO puede ejecutar `SET LOCAL ...` + UPDATE de forma atómica en la
-- misma transacción. Esta función plpgsql lo hace: setea el flag LOCAL (solo
-- vive dentro de su transacción) y luego actualiza los campos writeback del lead.
--
-- Whitelist de columnas: solo current_stage, status, email, telefono, pais,
-- nombre, apellido (campos que el mapping puede tocar). Cualquier otra clave del
-- JSONB se ignora — evita inyección de columnas arbitrarias vía service_role.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.zoho_pull_update_lead(
  p_lead_id   UUID,
  p_tenant_id UUID,
  p_changes   JSONB
)
RETURNS VOID AS $$
BEGIN
  -- GUARD ANTI-BUCLE: vive solo dentro de esta transacción. El trigger
  -- tr_lead_changes_to_zoho_writeback lo lee con current_setting(..., true) y
  -- hace RETURN NEW sin encolar writeback.
  PERFORM set_config('app.zoho_pull_in_progress', 'true', true);

  UPDATE public.lead SET
    current_stage = COALESCE((p_changes ->> 'current_stage')::text, current_stage),
    status        = COALESCE((p_changes ->> 'status')::text, status),
    email         = COALESCE((p_changes ->> 'email')::text, email),
    telefono      = COALESCE((p_changes ->> 'telefono')::text, telefono),
    pais          = COALESCE((p_changes ->> 'pais')::text, pais),
    nombre        = COALESCE((p_changes ->> 'nombre')::text, nombre),
    apellido      = COALESCE((p_changes ->> 'apellido')::text, apellido),
    updated_at    = NOW()
  WHERE id = p_lead_id
    AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.zoho_pull_update_lead(UUID, UUID, JSONB) IS
  'Actualiza un lead desde el pull Zoho con guard anti-bucle (SET LOCAL app.zoho_pull_in_progress=true en la misma transacción). Whitelist de columnas writeback. Llamado vía supabase.rpc() por event-processor.ts.';

-- service_role y authenticated pueden ejecutarla (RLS del lead sigue aplicando
-- para authenticated; el worker usa service_role).
GRANT EXECUTE ON FUNCTION public.zoho_pull_update_lead(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.zoho_pull_update_lead(UUID, UUID, JSONB) TO authenticated;

-- ── PostgREST cache reload ─────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
-- ===== 20260608153300_integrations_unique_tenant_crm.sql =====
-- ============================================================================
-- Sprint 5 · Fix BUG-5-06 — constraint UNIQUE (tenant_id, crm_type) en integrations
-- ============================================================================
-- Bug preexistente desde Sprint 2 (migración 20260522220003_integrations_table):
-- la tabla `integrations` solo tenía un índice PARCIAL
-- `idx_integrations_tenant_crm ... WHERE is_active = true`. El OAuth start hace
--   upsert(..., { onConflict: "tenant_id,crm_type" })
-- y un índice parcial NO sirve como destino de ON CONFLICT salvo que el predicado
-- coincida exactamente, por lo que el upsert fallaba ("no unique or exclusion
-- constraint matching the ON CONFLICT specification").
--
-- Modelo de datos: un tenant tiene como mucho UNA integración por tipo de CRM
-- (activa o no). Añadimos el constraint UNIQUE total que el upsert necesita y
-- retiramos el índice parcial, ya redundante (el constraint crea su propio
-- índice sobre (tenant_id, crm_type)).
--
-- Idempotente: usa IF NOT EXISTS / IF EXISTS para poder aplicarse sobre entornos
-- donde el constraint ya se creó a mano durante las pruebas locales del Sprint 5.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_integrations_tenant_crm'
      AND conrelid = 'public.integrations'::regclass
  ) THEN
    ALTER TABLE public.integrations
      ADD CONSTRAINT uq_integrations_tenant_crm UNIQUE (tenant_id, crm_type);
  END IF;
END $$;

-- El índice parcial queda cubierto por el índice del constraint para los lookups
-- de upsert/ON CONFLICT. Lo eliminamos para no mantener dos índices solapados.
DROP INDEX IF EXISTS public.idx_integrations_tenant_crm;
-- ===== 20260609000000_simulator_sessions.sql =====
-- Migration: simulator_sessions
-- Created at: 2026-06-09
-- Fix: RLS policies corrected — use public.tenants.auth_user_id instead of
--      non-existent public.users table (project-standard pattern, Sprint 1 ADR-017).

CREATE TABLE IF NOT EXISTS public.simulator_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    session_name TEXT DEFAULT 'Sesión sin título',
    messages JSONB DEFAULT '[]'::jsonb,
    variables_captured JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por tenant
CREATE INDEX IF NOT EXISTS idx_simulator_sessions_tenant
  ON public.simulator_sessions(tenant_id, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.simulator_sessions ENABLE ROW LEVEL SECURITY;

-- Drop policies idempotente
DROP POLICY IF EXISTS "simulator_sessions_select_policy" ON public.simulator_sessions;
DROP POLICY IF EXISTS "simulator_sessions_insert_policy" ON public.simulator_sessions;
DROP POLICY IF EXISTS "simulator_sessions_update_policy" ON public.simulator_sessions;
DROP POLICY IF EXISTS "simulator_sessions_delete_policy" ON public.simulator_sessions;
DROP POLICY IF EXISTS "service_role_all_simulator_sessions" ON public.simulator_sessions;

-- Políticas RLS estándar del proyecto (patrón owner_or_admin via tenants.auth_user_id)
CREATE POLICY "simulator_sessions_select_policy"
  ON public.simulator_sessions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "simulator_sessions_insert_policy"
  ON public.simulator_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "simulator_sessions_update_policy"
  ON public.simulator_sessions
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

CREATE POLICY "simulator_sessions_delete_policy"
  ON public.simulator_sessions
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );

-- Service role bypass (para jobs/workers BullMQ que no tienen auth context)
CREATE POLICY "service_role_all_simulator_sessions"
  ON public.simulator_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.touch_simulator_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_simulator_sessions_updated_at ON public.simulator_sessions;
CREATE TRIGGER trg_simulator_sessions_updated_at
  BEFORE UPDATE ON public.simulator_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_simulator_sessions_updated_at();
-- ===== 20260609100000_fix_campaigns_holidays_rls_help_sections.sql =====
-- SP-4B (Sprint Validación Pre-MVP) — hotfix de reconciliación para entornos ya desplegados.
--
-- Contexto: durante la validación del Sprint 3 (NEW-09 campaigns / NEW-10 tenant_holidays)
-- y del Sprint 2 (seed help_sections) se detectó que:
--   1. Las políticas RLS de `campaigns` y `tenant_holidays` referenciaban una tabla
--      inexistente `user_tenants` (patrón `SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()`).
--      El patrón correcto del proyecto es `SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()`.
--      El bug quedó enmascarado porque el rol admin hace BYPASS de RLS; un usuario `authenticated`
--      de tenant normal tendría el acceso roto (deny-all o error).
--   2. El seed de `help_sections` (sección 'integrations') usaba columnas inexistentes
--      (`content_md`, `audience`, `ON CONFLICT (slug)`) en vez de las reales
--      (`content_markdown`, `scope`, `ON CONFLICT (scope, slug)`).
--
-- Las migraciones originales (20260524110000 / 20260526100000) ya fueron corregidas en su sitio
-- para que las instalaciones FRESCAS apliquen la versión buena. Esta migración forward existe para
-- CONVERGER entornos YA DESPLEGADOS (VPS dev.linkstation.ai) donde la versión bugueada
-- quedó marcada como aplicada y no se re-ejecuta. Es 100% idempotente.

-- =============================================================================
-- 1. RLS campaigns — re-asentar las 4 políticas con el patrón correcto
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'campaigns') THEN

    ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS campaigns_tenant_select ON public.campaigns;
    DROP POLICY IF EXISTS campaigns_tenant_insert ON public.campaigns;
    DROP POLICY IF EXISTS campaigns_tenant_update ON public.campaigns;
    DROP POLICY IF EXISTS campaigns_tenant_delete ON public.campaigns;

    CREATE POLICY campaigns_tenant_select ON public.campaigns
      FOR SELECT
      USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));

    CREATE POLICY campaigns_tenant_insert ON public.campaigns
      FOR INSERT
      WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));

    CREATE POLICY campaigns_tenant_update ON public.campaigns
      FOR UPDATE
      USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));

    CREATE POLICY campaigns_tenant_delete ON public.campaigns
      FOR DELETE
      USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));
  ELSE
    RAISE NOTICE 'campaigns table missing — skipping RLS reconciliation';
  END IF;
END $$;

-- =============================================================================
-- 2. RLS tenant_holidays — re-asentar las 3 políticas con el patrón correcto
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'tenant_holidays') THEN

    ALTER TABLE public.tenant_holidays ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_holidays_tenant_select ON public.tenant_holidays;
    DROP POLICY IF EXISTS tenant_holidays_tenant_insert ON public.tenant_holidays;
    DROP POLICY IF EXISTS tenant_holidays_tenant_delete ON public.tenant_holidays;

    CREATE POLICY tenant_holidays_tenant_select ON public.tenant_holidays
      FOR SELECT
      USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));

    CREATE POLICY tenant_holidays_tenant_insert ON public.tenant_holidays
      FOR INSERT
      WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));

    CREATE POLICY tenant_holidays_tenant_delete ON public.tenant_holidays
      FOR DELETE
      USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));
  ELSE
    RAISE NOTICE 'tenant_holidays table missing — skipping RLS reconciliation';
  END IF;
END $$;

-- =============================================================================
-- 3. Re-seed help_sections 'integrations' con columnas correctas (idempotente)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'help_sections') THEN

    INSERT INTO public.help_sections (slug, scope, title, content_markdown, updated_at)
    VALUES (
      'integrations',
      'admin',
      'Integraciones CRM',
      E'## Conectar HubSpot o Zoho\n\n1. Ir a **Ajustes → Integraciones → CRM**.\n2. Click **Conectar** en el provider que prefieras.\n3. Aprobar la app en el portal del CRM (full-page redirect).\n4. Volverás al dashboard con la card en estado **Conectado**.\n\n## Política de escritura\n\n- **append_only** (default): el dashboard SOLO escribe campos vacíos en el CRM. Datos manuales del rep comercial nunca se pisan.\n- **overwrite_with_audit**: permite sobrescribir SOLO los campos listados, con audit trail completo. Útil para corregir typos en email/teléfono masivamente.\n\n## Solo 1 CRM activo por tenant\n\nDesconecta el actual antes de conectar otro. El historial de audit se preserva aunque desconectes.\n\n## ¿Algo falla?\n\n- Click **Test connection** en la card para ver si el CRM responde.\n- Si ves estado "Error", revisa logs del servidor (Easypanel) y reconecta.\n',
      NOW()
    )
    ON CONFLICT (scope, slug) DO UPDATE SET
      title = EXCLUDED.title,
      content_markdown = EXCLUDED.content_markdown,
      updated_at = NOW();
  ELSE
    RAISE NOTICE 'help_sections table missing — skipping seed';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
-- ===== 20260610193500_fix_rls_authenticated_tenant_isolation.sql =====
-- BUG-SEC RLS-001 — Aislamiento multi-tenant en lectura para rol `authenticated`.
--
-- Contexto (detectado 10-06-2026 en review adversarial del plan Sprint 6, verificado en VPS + local):
--   `base_schema.sql` (DO block líneas 430-452) crea, para ~21 tablas multi-tenant, una política
--   `authenticated_read_* USING (true)` que permite a CUALQUIER usuario `authenticated` leer filas
--   de CUALQUIER tenant (no filtra tenant_id). Verificado en pg_policies de VPS y local: qual = true.
--
--   Vector de explotación CONFIRMADO: varios componentes CLIENTE leen estas tablas con la ANON key
--   filtrando por tenant_id EN EL CLIENTE (controlable por el atacante):
--     - src/app/dashboard/costs/page.tsx  → chat_messages, llamadas
--     - src/app/dashboard/logs/page.tsx   → orchestration_logs (join lead)
--     - src/components/agents/AIAgentInbox.tsx → Realtime channels sobre chat_summaries/leads
--   Como la RLS es permisiva, un usuario autenticado puede pedir datos de OTRO tenant. IDOR multi-tenant.
--
-- Fix: re-asentar las políticas `authenticated_read_*` con el patrón de aislamiento YA validado en el
--   proyecto (migración 20260609100000 campaigns/tenant_holidays):
--       tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
--   El rol admin sigue haciendo BYPASS de RLS (no se ve afectado). El rol service_role mantiene su
--   política `service_role_all_* USING (true)` (backend de confianza). Solo se restringe `authenticated`.
--
-- Nota tipos: `chat_messages.tenant_id` es TEXT (resto UUID) → cast `id::text` para esa tabla.
-- 100% idempotente (DROP POLICY IF EXISTS + CREATE). Converge entornos ya desplegados (VPS) y fresh.

-- =============================================================================
-- Tablas multi-tenant con tenant_id UUID → patrón estándar
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
  -- Solo tablas con columna `tenant_id` UUID directa (verificado en information_schema).
  -- EXCLUIDAS por NO tener tenant_id directo (lo heredan vía FK, requieren join — seguimiento aparte):
  --   availability_slots, lead_events.
  uuid_tables TEXT[] := ARRAY[
    'advisors', 'agendamientos', 'ai_agent_logs', 'appointments',
    'conversaciones_whatsapp', 'intentos', 'intentos_llamadas', 'lead', 'lead_cualificacion',
    'lead_programas', 'llamadas', 'notificaciones', 'orchestration_graphs', 'system_logs',
    'voice_agents', 'workflows'
  ];
BEGIN
  FOREACH tbl IN ARRAY uuid_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_read_%I" ON public.%I', tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "authenticated_read_%I" ON public.%I FOR SELECT TO authenticated '
        'USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()))',
        tbl, tbl
      );
    ELSE
      RAISE NOTICE 'Tabla % ausente — skip RLS reconciliation', tbl;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- chat_messages — tenant_id es TEXT, cast id::text
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_read_chat_messages" ON public.chat_messages;
    CREATE POLICY "authenticated_read_chat_messages" ON public.chat_messages
      FOR SELECT TO authenticated
      USING (tenant_id IN (SELECT id::text FROM public.tenants WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
-- ===== 20260610201500_fix_rls_residual_tenant_isolation.sql =====
-- BUG-SEC RLS-001 (parte 2) — cerrar agujeros RESIDUALES de lectura cross-tenant.
--
-- La migración 20260610193500 cerró las 17 tablas con `tenant_id` UUID directo.
-- Auditoría completa posterior (10-06-2026) detectó 3 tablas que SEGUÍAN con
-- `authenticated_read_* USING (true)` porque no tienen `tenant_id` directo o se
-- omitieron: `campanas`, `availability_slots`, `lead_events`.
--
-- Verificado: `campanas` tiene 8 filas de 2 tenants → leak cross-tenant real.
--             `availability_slots` se relaciona al tenant vía advisor_id → advisors.tenant_id.
--             `lead_events` se relaciona al tenant vía lead_id → lead.tenant_id.
--
-- NOTA sobre `tenants`: queda FUERA de esta migración a propósito. Tiene SELECT OPEN y
-- expone supabase_anon_key/client_email/config de todos los tenants (leak grave), PERO
-- un simulacro confirmó que cerrar su política OPEN rompe el subquery
-- `SELECT id FROM tenants WHERE auth_user_id = auth.uid()` que usan TODAS las demás
-- políticas (dependencia de evaluación → todos verían 0 filas). Requiere fix arquitectónico
-- dedicado (vista security-definer o función). Documentado en
-- plans/.../reports/security-hardening-vps-20260610.md como seguimiento BUG-SEC-RLS-002.
--
-- 100% idempotente. Converge VPS + fresh.

-- =============================================================================
-- campanas — tenant_id UUID directo (patrón estándar)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='campanas') THEN
    ALTER TABLE public.campanas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_read_campanas" ON public.campanas;
    CREATE POLICY "authenticated_read_campanas" ON public.campanas
      FOR SELECT TO authenticated
      USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

-- =============================================================================
-- availability_slots — sin tenant_id; se filtra vía advisor_id → advisors.tenant_id
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='availability_slots') THEN
    ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_read_availability_slots" ON public.availability_slots;
    CREATE POLICY "authenticated_read_availability_slots" ON public.availability_slots
      FOR SELECT TO authenticated
      USING (advisor_id IN (
        SELECT a.id FROM public.advisors a
        WHERE a.tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.auth_user_id = auth.uid())
      ));
  END IF;
END $$;

-- =============================================================================
-- lead_events — sin tenant_id; se filtra vía lead_id → lead.tenant_id
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='lead_events') THEN
    ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_read_lead_events" ON public.lead_events;
    CREATE POLICY "authenticated_read_lead_events" ON public.lead_events
      FOR SELECT TO authenticated
      USING (lead_id IN (
        SELECT l.id FROM public.lead l
        WHERE l.tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.auth_user_id = auth.uid())
      ));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
-- ===== 20260610210000_fix_rls_tenants_isolation.sql =====
-- BUG-SEC RLS-002 — cerrar leak cross-tenant en la tabla `tenants`.
--
-- `tenants` tenia `authenticated_read_tenants USING (true)` → cualquier usuario authenticated
-- leia supabase_anon_key / client_email / config de TODOS los tenants vía GET /rest/v1/tenants.
--
-- VERIFICADO CON LOGIN REAL (PostgREST, no psql) 10-06-2026:
--   - Con la policy OPEN: usuario real ve los 2 tenants (LEAK confirmado).
--   - Tras cerrarla (solo queda filtro auth_user_id = auth.uid()): ve SOLO su tenant (1),
--     y sigue viendo sus 29 leads + 18 llamadas (el subquery de aislamiento del resto NO se rompe).
--   El simulacro psql previo daba 0 por diferencia GUC vs sesion real — NO era fiable; por eso
--   se exigio verificacion con login real antes de tocar.
--
-- Fix: reemplazar la policy OPEN por una que solo deja ver la fila propia (o admin).
-- Idempotente. Converge VPS + local. base_schema.sql ya nace correcto para fresh installs.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='tenants') THEN
    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_read_tenants" ON public.tenants;
    CREATE POLICY "authenticated_read_tenants" ON public.tenants
      FOR SELECT TO authenticated
      USING (auth_user_id = auth.uid()
             OR COALESCE(((auth.jwt() -> 'app_metadata') ->> 'is_admin'), 'false') = 'true');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
-- ===== 20260611120000_integrations_one_active_per_crm_type.sql =====
-- ============================================================================
-- Sprint 5 · Fix BUG-5-08 — una integración activa por (tenant, crm_type)
-- ============================================================================
-- El índice `idx_integrations_one_active_per_tenant` (migración 20260524100000)
-- enforzaba UNIQUE(tenant_id) WHERE is_active = true, es decir: UN SOLO canal de
-- integración activo por tenant en total.
--
-- Eso rompe el modelo de entrada de leads multi-fuente: un tenant necesita poder
-- tener Google Sheets + Zoho + HubSpot activos a la vez (son canales de entrada
-- INDEPENDIENTES, no CRMs mutuamente excluyentes). Con el constraint viejo, al
-- conectar Zoho mientras Google Sheets estaba activo, el callback OAuth fallaba
-- con: "duplicate key value violates unique constraint
-- idx_integrations_one_active_per_tenant" → error persist_failed en la UI.
--
-- Fix: el límite pasa a ser UNA integración activa por (tenant_id, crm_type).
-- Así cada tipo de canal puede estar activo a la vez, pero sigue sin permitir
-- duplicados activos del mismo tipo (p. ej. dos Zoho activos a la vez).
--
-- Idempotente.
-- ============================================================================

-- Quitar el índice viejo (1 activa por tenant en total).
DROP INDEX IF EXISTS public.idx_integrations_one_active_per_tenant;

-- Nuevo: 1 activa por (tenant, tipo de CRM/canal).
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_one_active_per_tenant_crm
  ON public.integrations(tenant_id, crm_type)
  WHERE is_active = true;

COMMENT ON INDEX public.idx_integrations_one_active_per_tenant_crm IS
  'Enforza máximo 1 integración activa por (tenant, crm_type). Permite Sheets + Zoho + HubSpot activos a la vez, pero no duplicados activos del mismo tipo (fix BUG-5-08, 11-06-2026).';

NOTIFY pgrst, 'reload schema';
-- ===== 20260612150000_create_conversaciones_voz.sql =====
-- ============================================================
-- Migración: Crear conversaciones_voz + hardening
-- ============================================================

-- 1. Crear tabla conversaciones_voz (clon de conversaciones_whatsapp)
CREATE TABLE IF NOT EXISTS public.conversaciones_voz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_llamada_externa TEXT,
    estado TEXT DEFAULT 'ACTIVA',
    fecha_ultimo_mensaje TIMESTAMPTZ DEFAULT now(),
    fecha_creacion TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_conversaciones_voz_lead UNIQUE (id_lead)
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.conversaciones_voz ENABLE ROW LEVEL SECURITY;

-- 3. Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_conv_voz_tenant ON public.conversaciones_voz(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_voz_lead ON public.conversaciones_voz(id_lead);

-- 4. Crear políticas RLS seguras
-- Acceso completo para service_role (backend)
DROP POLICY IF EXISTS "service_role_all_conversaciones_voz" ON public.conversaciones_voz;
CREATE POLICY "service_role_all_conversaciones_voz" ON public.conversaciones_voz 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Acceso de lectura para usuarios autenticados con aislamiento de tenant (RLS-001)
DROP POLICY IF EXISTS "authenticated_read_conversaciones_voz" ON public.conversaciones_voz;
CREATE POLICY "authenticated_read_conversaciones_voz" ON public.conversaciones_voz 
    FOR SELECT TO authenticated 
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));

-- 5. Agregar UNIQUE constraint a la tabla llamadas para evitar duplicados por reintentos (WEBHOOK-001)
ALTER TABLE public.llamadas ADD CONSTRAINT unique_id_llamada_retell_tenant UNIQUE (id_llamada_retell, tenant_id);

-- 6. Backfill inicial a partir de las llamadas existentes (tomando la última llamada por cada lead)
INSERT INTO public.conversaciones_voz (tenant_id, id_lead, id_llamada_externa, fecha_ultimo_mensaje, fecha_creacion)
SELECT DISTINCT ON (id_lead) 
    tenant_id, 
    id_lead, 
    id_llamada_retell, 
    fecha_inicio, 
    fecha_creacion
FROM public.llamadas
ORDER BY id_lead, fecha_inicio DESC
ON CONFLICT (id_lead) DO NOTHING;
-- ===== 20260615_002_sprint_5_7_waba_integration.sql =====
-- =============================================================================
-- SPRINT 5.7 — Output WhatsApp (Meta WABA Integration)
-- Migration: 20260615_002_sprint_5_7_waba_integration.sql
-- Created: 2026-06-15
-- =============================================================================
-- Tables created:
--   1. waba_configurations    → WABA credentials per tenant
--   2. whatsapp_templates     → Templates synced from Meta Cloud API
--   3. whatsapp_message_logs  → Delivery log per sent message
--   4. whatsapp_message_outbox→ Outbound queue (for rate-limited sending)
--   5. whatsapp_opt_out       → Opt-out blacklist (GDPR / LOPD)
-- All tables have RLS with strict tenant isolation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. waba_configurations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waba_configurations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  waba_id         TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  display_name    TEXT,
  -- Access token stored encrypted — application layer must handle KMS rotation
  access_token    TEXT NOT NULL,
  webhook_verify_token TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Only one active WABA config per tenant
  CONSTRAINT uq_waba_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_waba_configurations_tenant ON waba_configurations(tenant_id);

-- ---------------------------------------------------------------------------
-- 2. whatsapp_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meta_id         TEXT NOT NULL,           -- Template ID from Meta
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,           -- e.g. MARKETING, UTILITY, AUTHENTICATION
  language        TEXT NOT NULL DEFAULT 'es', -- BCP-47 language code
  status          TEXT NOT NULL DEFAULT 'PENDING', -- APPROVED, PENDING, REJECTED, PAUSED
  -- Full components JSON as returned by Meta API
  components      JSONB NOT NULL DEFAULT '[]',
  -- Human-readable variable mapping: { "1": "nombre", "2": "fecha_cita" }
  variable_mapping JSONB NOT NULL DEFAULT '{}',
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_template_meta_tenant UNIQUE (tenant_id, meta_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant ON whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status  ON whatsapp_templates(tenant_id, status);

-- ---------------------------------------------------------------------------
-- 3. whatsapp_message_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES lead(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  phone_to        TEXT NOT NULL,
  -- message_sid: ID returned by Meta on send
  message_sid     TEXT,
  -- Status lifecycle: queued → sent → delivered → read | failed
  status          TEXT NOT NULL DEFAULT 'queued',
  error_message   TEXT,
  error_code      TEXT,
  -- Full payload sent (for debugging / audit)
  payload         JSONB,
  -- Timestamps for delivery tracking
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_tenant    ON whatsapp_message_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_lead      ON whatsapp_message_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_status    ON whatsapp_message_logs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_logs_message_sid ON whatsapp_message_logs(message_sid) WHERE message_sid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. whatsapp_message_outbox
-- ---------------------------------------------------------------------------
-- Outbound queue for rate-limited sending (avoids Meta 429 errors).
-- The outbox processor (cron or inline) picks up 'pending' rows and moves
-- them to 'processing' → 'done' | 'failed'.
CREATE TABLE IF NOT EXISTS whatsapp_message_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES lead(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  phone_to        TEXT NOT NULL,
  -- Resolved components after variable mapping
  components      JSONB NOT NULL DEFAULT '[]',
  template_name   TEXT NOT NULL,
  language        TEXT NOT NULL DEFAULT 'es',
  -- Queue status
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | processing | done | failed
  attempts        SMALLINT NOT NULL DEFAULT 0,
  max_attempts    SMALLINT NOT NULL DEFAULT 3,
  last_error      TEXT,
  -- Optional scheduled time for future sends
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_outbox_tenant   ON whatsapp_message_outbox(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_outbox_status   ON whatsapp_message_outbox(status, scheduled_at)
  WHERE status IN ('pending', 'processing');

-- ---------------------------------------------------------------------------
-- 5. whatsapp_opt_out
-- ---------------------------------------------------------------------------
-- GDPR/LOPD compliant opt-out blacklist.
-- Numbers stored normalized (E.164 without +).
CREATE TABLE IF NOT EXISTS whatsapp_opt_out (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL,
  reason          TEXT,                   -- e.g. 'user_request', 'webhook_stop'
  opted_out_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Allow re-opt-in: soft delete pattern
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_opt_out_phone_tenant UNIQUE (tenant_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_wa_opt_out_phone ON whatsapp_opt_out(tenant_id, phone) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  -- waba_configurations
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_waba_configurations_updated_at') THEN
    CREATE TRIGGER trg_waba_configurations_updated_at
      BEFORE UPDATE ON waba_configurations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- whatsapp_templates
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_whatsapp_templates_updated_at') THEN
    CREATE TRIGGER trg_whatsapp_templates_updated_at
      BEFORE UPDATE ON whatsapp_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- whatsapp_message_logs
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wa_message_logs_updated_at') THEN
    CREATE TRIGGER trg_wa_message_logs_updated_at
      BEFORE UPDATE ON whatsapp_message_logs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- whatsapp_message_outbox
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wa_outbox_updated_at') THEN
    CREATE TRIGGER trg_wa_outbox_updated_at
      BEFORE UPDATE ON whatsapp_message_outbox
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS) — tenant isolation
-- ---------------------------------------------------------------------------

ALTER TABLE waba_configurations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_opt_out        ENABLE ROW LEVEL SECURITY;

-- Helper: extract tenant_id from JWT claims (same pattern as other tables in this project)
-- Assumes JWT has a custom claim: { "tenant_id": "<uuid>" }

-- waba_configurations
CREATE POLICY "waba_configurations_tenant_isolation"
  ON waba_configurations
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- whatsapp_templates
CREATE POLICY "whatsapp_templates_tenant_isolation"
  ON whatsapp_templates
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- whatsapp_message_logs
CREATE POLICY "whatsapp_message_logs_tenant_isolation"
  ON whatsapp_message_logs
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- whatsapp_message_outbox
CREATE POLICY "whatsapp_message_outbox_tenant_isolation"
  ON whatsapp_message_outbox
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- whatsapp_opt_out
CREATE POLICY "whatsapp_opt_out_tenant_isolation"
  ON whatsapp_opt_out
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- Service role bypass (needed for server-side operations with service_role key)
CREATE POLICY "waba_configurations_service_role"
  ON waba_configurations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "whatsapp_templates_service_role"
  ON whatsapp_templates FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "whatsapp_message_logs_service_role"
  ON whatsapp_message_logs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "whatsapp_message_outbox_service_role"
  ON whatsapp_message_outbox FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "whatsapp_opt_out_service_role"
  ON whatsapp_opt_out FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE waba_configurations IS
  'Sprint 5.7: WABA credentials per tenant. One active config per tenant.';

COMMENT ON TABLE whatsapp_templates IS
  'Sprint 5.7: WhatsApp templates synced from Meta Cloud API. variable_mapping maps parameter index to lead field name.';

COMMENT ON TABLE whatsapp_message_logs IS
  'Sprint 5.7: Delivery audit log for every WhatsApp message sent. Updated via Meta delivery webhooks.';

COMMENT ON TABLE whatsapp_message_outbox IS
  'Sprint 5.7: Outbound queue. Processor dequeues rows respecting Meta rate limits (429 handling).';

COMMENT ON TABLE whatsapp_opt_out IS
  'Sprint 5.7: GDPR/LOPD opt-out blacklist. Checked before every outbound send.';
-- ===== 20260615000000_sprint_5_5_flow_persistency.sql =====
-- ============================================================================
-- Sprint 5.5 — Persistencia de Flow Builder y Estados de Espera
-- ============================================================================

-- 1. Tabla Principal de Flujos
CREATE TABLE IF NOT EXISTS public.agent_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL UNIQUE REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Nodos del Grafo (React Flow)
CREATE TABLE IF NOT EXISTS public.flow_nodes (
    flow_id UUID NOT NULL REFERENCES public.agent_flows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    position JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (flow_id, node_id)
);

-- 3. Tabla de Conexiones/Aristas del Grafo (React Flow)
CREATE TABLE IF NOT EXISTS public.flow_edges (
    flow_id UUID NOT NULL REFERENCES public.agent_flows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    edge_id TEXT NOT NULL,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    source_handle TEXT,
    target_handle TEXT,
    PRIMARY KEY (flow_id, edge_id)
);

-- 4. Tabla de Estados de Espera (Red Team)
CREATE TABLE IF NOT EXISTS public.flow_wait_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    flow_id UUID NOT NULL REFERENCES public.agent_flows(id) ON DELETE CASCADE,
    current_node_id TEXT NOT NULL,
    scheduled_resume_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (lead_id, flow_id)
);

-- Habilitar RLS en todas las nuevas tablas
ALTER TABLE public.agent_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_wait_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS RLS (Aislamiento por Tenant para Rol Authenticated y Admin)
-- ============================================================================

-- Políticas para agent_flows
CREATE POLICY "agent_flows_select_owner_or_admin" ON public.agent_flows
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

CREATE POLICY "agent_flows_insert_owner_or_admin" ON public.agent_flows
    FOR INSERT TO authenticated
    WITH CHECK (
        (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
         OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
        AND agent_id IN (SELECT id FROM public.ai_agents WHERE tenant_id = agent_flows.tenant_id)
    );

CREATE POLICY "agent_flows_update_owner_or_admin" ON public.agent_flows
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
    WITH CHECK (
        (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
         OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
        AND agent_id IN (SELECT id FROM public.ai_agents WHERE tenant_id = agent_flows.tenant_id)
    );

CREATE POLICY "agent_flows_delete_owner_or_admin" ON public.agent_flows
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

-- Políticas para flow_nodes
CREATE POLICY "flow_nodes_select_owner_or_admin" ON public.flow_nodes
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

CREATE POLICY "flow_nodes_insert_owner_or_admin" ON public.flow_nodes
    FOR INSERT TO authenticated
    WITH CHECK (
        (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
         OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
        AND flow_id IN (SELECT id FROM public.agent_flows WHERE tenant_id = flow_nodes.tenant_id)
    );

CREATE POLICY "flow_nodes_update_owner_or_admin" ON public.flow_nodes
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
    WITH CHECK (
        (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
         OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
        AND flow_id IN (SELECT id FROM public.agent_flows WHERE tenant_id = flow_nodes.tenant_id)
    );

CREATE POLICY "flow_nodes_delete_owner_or_admin" ON public.flow_nodes
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

-- Políticas para flow_edges
CREATE POLICY "flow_edges_select_owner_or_admin" ON public.flow_edges
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

CREATE POLICY "flow_edges_insert_owner_or_admin" ON public.flow_edges
    FOR INSERT TO authenticated
    WITH CHECK (
        (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
         OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
        AND flow_id IN (SELECT id FROM public.agent_flows WHERE tenant_id = flow_edges.tenant_id)
    );

CREATE POLICY "flow_edges_update_owner_or_admin" ON public.flow_edges
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
    WITH CHECK (
        (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
         OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
        AND flow_id IN (SELECT id FROM public.agent_flows WHERE tenant_id = flow_edges.tenant_id)
    );

CREATE POLICY "flow_edges_delete_owner_or_admin" ON public.flow_edges
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

-- Políticas para flow_wait_states
CREATE POLICY "flow_wait_states_select_owner_or_admin" ON public.flow_wait_states
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

CREATE POLICY "flow_wait_states_insert_owner_or_admin" ON public.flow_wait_states
    FOR INSERT TO authenticated
    WITH CHECK (
        (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
         OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
        AND lead_id IN (SELECT id FROM public.lead WHERE tenant_id = flow_wait_states.tenant_id)
        AND flow_id IN (SELECT id FROM public.agent_flows WHERE tenant_id = flow_wait_states.tenant_id)
    );

CREATE POLICY "flow_wait_states_update_owner_or_admin" ON public.flow_wait_states
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
    WITH CHECK (
        (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
         OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true')
        AND lead_id IN (SELECT id FROM public.lead WHERE tenant_id = flow_wait_states.tenant_id)
        AND flow_id IN (SELECT id FROM public.agent_flows WHERE tenant_id = flow_wait_states.tenant_id)
    );

CREATE POLICY "flow_wait_states_delete_owner_or_admin" ON public.flow_wait_states
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
           OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true');

-- ============================================================================
-- ACCESO TOTAL PARA EL ROL SERVICE_ROLE (Bypass para Webhooks/Trabajos de Fondo)
-- ============================================================================
CREATE POLICY "service_role_all_agent_flows" ON public.agent_flows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_flow_nodes" ON public.flow_nodes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_flow_edges" ON public.flow_edges FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_flow_wait_states" ON public.flow_wait_states FOR ALL TO service_role USING (true) WITH CHECK (true);
-- ===== 20260615175600_add_unique_constraint_agent_variants.sql =====
-- Add unique constraint to ai_agent_variants to support upsert by agent and variant type (is_variant_b)
-- Idempotent: drop first if exists, then recreate
ALTER TABLE "public"."ai_agent_variants"
DROP CONSTRAINT IF EXISTS unique_agent_variant;

ALTER TABLE "public"."ai_agent_variants"
ADD CONSTRAINT unique_agent_variant UNIQUE (agent_id, is_variant_b);
-- ===== 20260615192000_update_availability_slots_schema.sql =====
-- Align availability_slots schema with Orchestrator v3.0 specs (weekly recurring slots)
-- Drop existing table
DROP TABLE IF EXISTS public.availability_slots CASCADE;

-- Recreate with proper fields
CREATE TABLE public.availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    advisor_id UUID REFERENCES public.advisors(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT DEFAULT 30
);

-- Grants
GRANT ALL ON TABLE public.availability_slots TO postgres;
GRANT ALL ON TABLE public.availability_slots TO service_role;
GRANT ALL ON TABLE public.availability_slots TO authenticated;
GRANT ALL ON TABLE public.availability_slots TO anon;

-- RLS
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_advisor_day ON public.availability_slots(advisor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_tenant_day ON public.availability_slots(tenant_id, day_of_week);

-- Service role policy
CREATE POLICY "service_role_all_slots" ON public.availability_slots FOR ALL USING (true);

-- Authenticated policy
CREATE POLICY "authenticated_read_availability_slots" ON public.availability_slots
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()) OR
    advisor_id IN (
      SELECT a.id FROM public.advisors a
      WHERE a.tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.auth_user_id = auth.uid())
    )
  );

NOTIFY pgrst, 'reload schema';
-- ===== 20260616000000_create_chat_summaries_and_embeddings.sql =====
-- Create pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create chat_summaries table
CREATE TABLE IF NOT EXISTS public.chat_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.lead(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    last_interaction_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_lead_summary UNIQUE (lead_id)
);

-- Create knowledge_base_embeddings table
CREATE TABLE IF NOT EXISTS public.knowledge_base_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    knowledge_base_id UUID REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grants
GRANT ALL ON TABLE public.chat_summaries TO postgres;
GRANT ALL ON TABLE public.chat_summaries TO service_role;
GRANT ALL ON TABLE public.chat_summaries TO authenticated;
GRANT ALL ON TABLE public.chat_summaries TO anon;

GRANT ALL ON TABLE public.knowledge_base_embeddings TO postgres;
GRANT ALL ON TABLE public.knowledge_base_embeddings TO service_role;
GRANT ALL ON TABLE public.knowledge_base_embeddings TO authenticated;
GRANT ALL ON TABLE public.knowledge_base_embeddings TO anon;

-- RLS
ALTER TABLE public.chat_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_embeddings ENABLE ROW LEVEL SECURITY;

-- Service role policies (idempotent)
DROP POLICY IF EXISTS "service_role_all_chat_summaries" ON public.chat_summaries;
CREATE POLICY "service_role_all_chat_summaries" ON public.chat_summaries FOR ALL USING (true);

DROP POLICY IF EXISTS "service_role_all_knowledge_base_embeddings" ON public.knowledge_base_embeddings;
CREATE POLICY "service_role_all_knowledge_base_embeddings" ON public.knowledge_base_embeddings FOR ALL USING (true);

-- Authenticated select policies (tenant-isolated) (idempotent)
DROP POLICY IF EXISTS "authenticated_read_chat_summaries" ON public.chat_summaries;
CREATE POLICY "authenticated_read_chat_summaries" ON public.chat_summaries
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "authenticated_read_knowledge_base_embeddings" ON public.knowledge_base_embeddings;
CREATE POLICY "authenticated_read_knowledge_base_embeddings" ON public.knowledge_base_embeddings
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()));

-- Create RPC match_knowledge_base function for semantic search
CREATE OR REPLACE FUNCTION public.match_knowledge_base(
  query_embedding vector,
  match_threshold float,
  match_count int,
  p_tenant_id UUID,
  p_knowledge_base_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kbe.id,
    kbe.content,
    kbe.metadata,
    1 - (kbe.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base_embeddings kbe
  WHERE kbe.tenant_id = p_tenant_id
    AND (p_knowledge_base_ids IS NULL OR kbe.knowledge_base_id = ANY(p_knowledge_base_ids))
    AND 1 - (kbe.embedding <=> query_embedding) > match_threshold
  ORDER BY kbe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute on RPC
GRANT EXECUTE ON FUNCTION public.match_knowledge_base TO postgres;
GRANT EXECUTE ON FUNCTION public.match_knowledge_base TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_base TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge_base TO anon;

NOTIFY pgrst, 'reload schema';
-- ===== 20260616100000_rename_segmentation_to_segmentacion.sql =====
-- ============================================================================
-- Rename `segmentation` → `segmentacion` in public.lead
-- ============================================================================
-- The frontend and all business logic throughout the codebase (inbox.ts,
-- AIAgentInbox.tsx, QualificationProcessor.ts, interpreter.ts, etc.)
-- consistently use the Spanish word "segmentacion".
-- The original schema migration created the column as "segmentation" (English).
-- This migration renames it to align with the rest of the codebase and
-- avoid silent write failures when updating via update({ segmentacion: ... }).
-- ============================================================================

ALTER TABLE public.lead
  RENAME COLUMN segmentation TO segmentacion;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
-- ===== 20260616110000_add_appointments_fields.sql =====
-- Migration to add missing fields to the appointments table

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS agent_used TEXT,
ADD COLUMN IF NOT EXISTS ab_variant TEXT,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS watchdog_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure schema cache is refreshed
NOTIFY pgrst, 'reload schema';
-- ===== 20260619000000_add_knowledge_base_columns.sql =====
-- Agrega las columnas faltantes en la base de conocimientos que se usan en src/lib/actions/knowledge.ts
ALTER TABLE public.knowledge_base
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS file_key TEXT,
ADD COLUMN IF NOT EXISTS content_hash TEXT;
-- ===== 20260619060124_add_content_hash_to_knowledge_base.sql =====
-- ===== 20260620000000_fix_rls_admin_check.sql =====
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants') THEN
    DROP POLICY IF EXISTS "authenticated_read_tenants" ON public.tenants;
    CREATE POLICY "authenticated_read_tenants" ON public.tenants
      FOR SELECT TO authenticated
      USING (
        auth_user_id = auth.uid()
        OR COALESCE(((auth.jwt() -> 'app_metadata') ->> 'is_admin'), 'false') = 'true'
        OR COALESCE(((auth.jwt() -> 'app_metadata') ->> 'admin'), 'false') = 'true'
      );
  END IF;
END $$;
