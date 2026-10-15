-- Migration: add app_secret column to waba_configurations
-- Each WABA (Meta App) has its own App Secret for HMAC verification
ALTER TABLE waba_configurations
ADD COLUMN IF NOT EXISTS app_secret TEXT;

-- Comment for clarity
COMMENT ON COLUMN waba_configurations.app_secret IS 
  'Meta App Secret for HMAC signature verification (x-hub-signature-256). 
   Each Meta App has a different secret. Found in: Meta for Developers → App → Configuración Básica → App Secret.';
