-- Agency knowledge base: create if missing, then backfill columns for older installs.
CREATE TABLE IF NOT EXISTS public.agency_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agency_knowledge_base
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.agency_knowledge_base
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.agency_knowledge_base
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_kb_user ON public.agency_knowledge_base (user_id);

ALTER TABLE public.agency_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own agency knowledge base" ON public.agency_knowledge_base;
CREATE POLICY "Users manage own agency knowledge base"
ON public.agency_knowledge_base
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_knowledge_base TO authenticated;
GRANT ALL ON public.agency_knowledge_base TO service_role;

NOTIFY pgrst, 'reload schema';
