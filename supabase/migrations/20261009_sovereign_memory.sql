-- Contextual memory + workflow event log (idempotent vs 20261010_sovereign_core)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.sovereign_memory (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    company_name                TEXT,
    industry                    TEXT,
    tech_stack                  TEXT[] DEFAULT '{}',
    cultural_values             TEXT[] DEFAULT '{}',
    ideal_candidate_persona     TEXT,
    winning_proposal_patterns   TEXT[] DEFAULT '{}',
    brand_voice                 TEXT,
    calendly_url                TEXT,
    webhook_url                 TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sovereign_memory ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.sovereign_memory ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}';
ALTER TABLE public.sovereign_memory ADD COLUMN IF NOT EXISTS cultural_values TEXT[] DEFAULT '{}';
ALTER TABLE public.sovereign_memory ADD COLUMN IF NOT EXISTS ideal_candidate_persona TEXT;
ALTER TABLE public.sovereign_memory ADD COLUMN IF NOT EXISTS winning_proposal_patterns TEXT[] DEFAULT '{}';
ALTER TABLE public.sovereign_memory ADD COLUMN IF NOT EXISTS brand_voice TEXT;
ALTER TABLE public.sovereign_memory ADD COLUMN IF NOT EXISTS calendly_url TEXT;
ALTER TABLE public.sovereign_memory ADD COLUMN IF NOT EXISTS webhook_url TEXT;

CREATE TABLE IF NOT EXISTS public.workflow_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    share_id        UUID,
    candidate_id    UUID,
    event_type      TEXT NOT NULL,
    payload         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_user ON public.workflow_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_share ON public.workflow_events (share_id);

ALTER TABLE public.sovereign_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own memory" ON public.sovereign_memory;
CREATE POLICY "Users manage own memory"
    ON public.sovereign_memory FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own workflow events" ON public.workflow_events;
CREATE POLICY "Users manage own workflow events"
    ON public.workflow_events FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public insert workflow events" ON public.workflow_events;
CREATE POLICY "Public insert workflow events"
    ON public.workflow_events FOR INSERT
    WITH CHECK (true);
