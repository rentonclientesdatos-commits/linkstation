-- ============================================================================
-- Sprint 0 tarea 1-16: migrar is_admin de user_metadata → app_metadata
-- ============================================================================
--
-- ANTES: el flag `admin` o `is_admin` vivía en `auth.users.raw_user_meta_data`
-- (user_metadata), editable por el propio usuario via
-- `supabase.auth.updateUser({ data: { is_admin: true } })` → privilege
-- escalation trivial. Finding: DA-2-005.
--
-- AHORA: la fuente de verdad es `auth.users.raw_app_meta_data.is_admin`,
-- escrita SOLO desde server con service_role. Los usuarios NO pueden
-- modificar app_metadata.
--
-- Este script:
--   1. Detecta users con admin=true o is_admin=true en user_metadata.
--   2. Copia ese flag a app_metadata.is_admin = true.
--   3. NO borra el campo en user_metadata (compatibilidad temporal — limpieza
--      planificada en Sprint 1 una vez verificado que ningún cliente legacy
--      lo lee). Lo importante es que YA no se lee desde código (1-16 cambió
--      todos los puntos de lectura).
--
-- Idempotente: ejecutable múltiples veces sin efectos colaterales.
--
-- LOCAL: aplicar con:
--   docker exec -i linkstation-dashboard-postgres-1 \
--     psql -U postgres -d postgres < supabase/scripts/migrate-is-admin-to-app-metadata.sql
--
-- VPS: diferido a sesión pre-deploy del Sprint que promueva a staging.
-- ============================================================================

DO $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  -- Cuenta users que serán migrados (información, no obligatorio)
  SELECT COUNT(*) INTO migrated_count
  FROM auth.users
  WHERE (raw_user_meta_data->>'is_admin' = 'true'
         OR raw_user_meta_data->>'admin' = 'true'
         OR raw_user_meta_data->'is_admin' = 'true'::jsonb
         OR raw_user_meta_data->'admin' = 'true'::jsonb)
    AND COALESCE(raw_app_meta_data->>'is_admin', 'false') <> 'true';

  RAISE NOTICE 'Users a migrar (admin en user_metadata pero no en app_metadata): %', migrated_count;

  -- Migración: copia is_admin / admin de user_metadata → app_metadata.is_admin
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                          || jsonb_build_object('is_admin', true)
  WHERE (raw_user_meta_data->>'is_admin' = 'true'
         OR raw_user_meta_data->>'admin' = 'true'
         OR raw_user_meta_data->'is_admin' = 'true'::jsonb
         OR raw_user_meta_data->'admin' = 'true'::jsonb)
    AND COALESCE(raw_app_meta_data->>'is_admin', 'false') <> 'true';

  RAISE NOTICE 'Migración completada.';
END $$;

-- Verificación: cuántos admins activos hay ahora en app_metadata
SELECT
  COUNT(*) FILTER (WHERE raw_app_meta_data->>'is_admin' = 'true') AS admins_app_metadata,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'is_admin' = 'true'
                     OR raw_user_meta_data->>'admin' = 'true') AS legacy_in_user_metadata,
  COUNT(*) AS total_users
FROM auth.users;
