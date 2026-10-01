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
