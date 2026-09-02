-- Enterprise team seats + talent-pool search support.
-- Additive only.

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS invited_email TEXT;

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS org_id UUID;

UPDATE public.organization_members
SET org_id = organization_id
WHERE org_id IS NULL AND organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_invited_email ON public.organization_members (invited_email);

CREATE TABLE IF NOT EXISTS public.talent_pool_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  user_id UUID,
  candidate_name TEXT NOT NULL,
  email TEXT,
  cv_text TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  embedding_text TEXT,
  trust_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_pool_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_talent_pool_org ON public.talent_pool_profiles (org_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_embed ON public.talent_pool_profiles USING gin (to_tsvector('simple', coalesce(embedding_text, '')));
