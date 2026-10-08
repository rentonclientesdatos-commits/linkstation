-- ============================================================
-- Instagram Configurations Table
-- Stores per-tenant Instagram integration credentials
-- ============================================================

CREATE TABLE IF NOT EXISTS instagram_configurations (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_access_token    TEXT NOT NULL,
  ig_account_id        TEXT NOT NULL,
  page_id              TEXT,
  webhook_verify_token TEXT DEFAULT 'linkstation_ig_webhook_2026',
  ai_enabled           BOOLEAN DEFAULT TRUE,
  lead_ads_enabled     BOOLEAN DEFAULT TRUE,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT instagram_configurations_tenant_unique UNIQUE (tenant_id)
);

-- RLS: Only service role can read/write
ALTER TABLE instagram_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on instagram_configurations"
  ON instagram_configurations
  USING (TRUE)
  WITH CHECK (TRUE);

-- Index for webhook lookup by ig_account_id
CREATE INDEX IF NOT EXISTS idx_instagram_configurations_ig_account_id
  ON instagram_configurations (ig_account_id);

-- Index for Lead Ads lookup by page_id
CREATE INDEX IF NOT EXISTS idx_instagram_configurations_page_id
  ON instagram_configurations (page_id);

-- ============================================================
-- conversaciones_instagram Table
-- Tracks IG DM conversations (mirrors conversaciones_whatsapp)
-- ============================================================

CREATE TABLE IF NOT EXISTS conversaciones_instagram (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id_lead              UUID REFERENCES lead(id) ON DELETE SET NULL,
  ig_igsid             TEXT,                   -- Instagram-scoped User ID
  fecha_ultimo_mensaje TIMESTAMPTZ DEFAULT NOW(),
  estado               TEXT DEFAULT 'ACTIVA',  -- ACTIVA | CERRADA | ARCHIVADA
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversaciones_instagram ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on conversaciones_instagram"
  ON conversaciones_instagram
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_conversaciones_instagram_tenant
  ON conversaciones_instagram (tenant_id);

CREATE INDEX IF NOT EXISTS idx_conversaciones_instagram_lead
  ON conversaciones_instagram (id_lead);
