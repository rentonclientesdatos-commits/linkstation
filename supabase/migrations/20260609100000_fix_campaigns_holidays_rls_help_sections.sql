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
