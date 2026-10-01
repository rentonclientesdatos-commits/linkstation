-- ==========================================
-- SCRIPT DE INICIALIZACIÓN COMPLETO (CLEAN INSTALL)
-- ==========================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ESQUEMA PÚBLICO (Tablas principales)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_email TEXT UNIQUE,
    is_admin BOOLEAN DEFAULT false,
    auth_user_id UUID,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'PAUSED',
    configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orchestration_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    definition JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PERMISOS Y SEGURIDAD (RLS Deshabilitado temporalmente para facilitar configuración)
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestration_graphs DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 4. USUARIO ADMINISTRADOR INICIAL
-- Email: admin@linkstation.ai
-- Password: admin123
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
    is_super_admin
) VALUES (
    'f9782efc-1938-4f79-8df6-7d849d701c52',
    '00000000-0000-0000-0000-000000000000',
    'admin@linkstation.ai', 
    crypt('admin123', gen_salt('bf')), 
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
) VALUES (
    gen_random_uuid(),
    'f9782efc-1938-4f79-8df6-7d849d701c52',
    '{"sub":"f9782efc-1938-4f79-8df6-7d849d701c52","email":"admin@linkstation.ai"}',
    'email',
    now(),
    now(),
    now(),
    'f9782efc-1938-4f79-8df6-7d849d701c52'
) ON CONFLICT DO NOTHING;

-- 5. VINCULACIÓN EN LA TABLA DE TENANTS
INSERT INTO public.tenants (
    id, name, client_email, is_admin, auth_user_id
) VALUES (
    'f9782efc-1938-4f79-8df6-7d849d701c52',
    'ADMINISTRADOR SISTEMA',
    'admin@linkstation.ai',
    true,
    'f9782efc-1938-4f79-8df6-7d849d701c52'
) ON CONFLICT (id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;
