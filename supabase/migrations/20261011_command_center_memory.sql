-- B2B Command Center activity log + editable memory bank

CREATE TABLE IF NOT EXISTS public.command_center_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT CHECK (activity_type IN (
        'CV_PARSED',
        'CANDIDATE_EVALUATED',
        'CV_AUDITED',
        'PROPOSAL_GENERATED',
        'OUTREACH_SENT',
        'SHARE_LINK_CREATED'
    )),
    entity_id UUID,
    entity_name TEXT NOT NULL,
    summary_snippet TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.b2b_memory_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT CHECK (category IN ('TECH_STACK', 'PAST_HIRING_WIN', 'PROPOSAL_PATTERN', 'COMPANY_CULTURE')),
    key_title TEXT NOT NULL,
    memory_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cca_user_created ON public.command_center_activities (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cca_search ON public.command_center_activities USING gin (to_tsvector('simple', coalesce(entity_name,'') || ' ' || coalesce(summary_snippet,'')));
CREATE INDEX IF NOT EXISTS idx_memory_bank_user ON public.b2b_memory_bank (user_id, created_at DESC);

ALTER TABLE public.command_center_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_memory_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own activities" ON public.command_center_activities;
CREATE POLICY "Users access own activities"
    ON public.command_center_activities FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own memory" ON public.b2b_memory_bank;
CREATE POLICY "Users access own memory"
    ON public.b2b_memory_bank FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
