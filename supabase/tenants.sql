-- ============================================================
-- LinkStation — Tenants Schema
-- Paste this in the Supabase SQL Editor of your AUTH/MAIN project.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: tenants
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

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read" ON public.tenants
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON public.tenants
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON public.tenants
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete" ON public.tenants
    FOR DELETE TO authenticated USING (true);
