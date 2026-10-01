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
