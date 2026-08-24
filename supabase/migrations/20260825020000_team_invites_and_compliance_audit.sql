-- Additive tables for Enterprise team seats and GDPR/KVKK audit logs.
-- Does not alter or drop existing tables.

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'recruiter'
    CHECK (role IN ('owner', 'hr_manager', 'recruiter')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.compliance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  legal_basis TEXT NOT NULL DEFAULT 'GDPR Art. 6(1)(f) / KVKK Art. 5',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.organization_invites (organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_org ON public.compliance_audit_logs (organization_id, created_at DESC);
