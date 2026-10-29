-- ================================================================
-- Migración: Crear orchestration_logs para trazabilidad y webhook audit
-- ================================================================

CREATE TABLE IF NOT EXISTS public.orchestration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    lead_id UUID REFERENCES public.lead(id) ON DELETE SET NULL,
    workflow_id TEXT,
    step_number INT DEFAULT 0,
    action_type TEXT,
    agent_used TEXT,
    ab_variant TEXT,
    result TEXT DEFAULT 'SUCCESS',
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orchestration_logs_tenant ON public.orchestration_logs(tenant_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_lead ON public.orchestration_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_logs_workflow ON public.orchestration_logs(workflow_id);

ALTER TABLE public.orchestration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orchestration_logs_service_role" ON public.orchestration_logs;
CREATE POLICY "orchestration_logs_service_role" ON public.orchestration_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orchestration_logs_authenticated" ON public.orchestration_logs;
CREATE POLICY "orchestration_logs_authenticated" ON public.orchestration_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
