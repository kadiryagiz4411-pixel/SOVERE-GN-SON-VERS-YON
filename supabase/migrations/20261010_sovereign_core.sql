-- ─────────────────────────────────────────────────────────────────────────────
-- Sovereign Core: contextual memory, live share portal, job proposals
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Contextual Memory ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sovereign_memory (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    company_name                TEXT,
    tech_stack                  TEXT[] DEFAULT '{}',
    ideal_candidate_persona     TEXT,
    winning_proposal_patterns   TEXT[] DEFAULT '{}',
    brand_voice                 TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Live Client Share Links ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.share_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID REFERENCES public.batch_uploads(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    share_code      TEXT UNIQUE NOT NULL,
    passcode        TEXT,
    title           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Client Candidate Decisions ────────────────────────────────────────────────
-- candidate_id references batch_candidates (the actual extracted-candidate table)
CREATE TABLE IF NOT EXISTS public.client_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id        UUID REFERENCES public.share_links(id) ON DELETE CASCADE,
    candidate_id    UUID REFERENCES public.batch_candidates(id) ON DELETE CASCADE,
    status          TEXT CHECK (status IN ('APPROVED', 'REJECTED', 'PENDING')) DEFAULT 'PENDING',
    feedback        TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (share_id, candidate_id)
);

-- ── Multi-Job Proposals ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_proposals (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id                UUID REFERENCES public.batch_uploads(id) ON DELETE CASCADE,
    user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_title               TEXT NOT NULL,
    client_name             TEXT,
    compatibility_score     INT CHECK (compatibility_score BETWEEN 0 AND 100),
    rank_position           INT,
    why_apply_rationale     TEXT NOT NULL DEFAULT '',
    generated_proposal      TEXT,
    auto_fill_payload       TEXT,
    raw_data                JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sovereign_memory_user  ON public.sovereign_memory (user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_code       ON public.share_links (share_code);
CREATE INDEX IF NOT EXISTS idx_share_links_batch      ON public.share_links (batch_id);
CREATE INDEX IF NOT EXISTS idx_client_decisions_share ON public.client_decisions (share_id);
CREATE INDEX IF NOT EXISTS idx_job_proposals_batch    ON public.job_proposals (batch_id);
CREATE INDEX IF NOT EXISTS idx_job_proposals_user     ON public.job_proposals (user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.sovereign_memory  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_decisions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_proposals     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own memory" ON public.sovereign_memory;
CREATE POLICY "Users manage own memory"
    ON public.sovereign_memory FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own share links" ON public.share_links;
CREATE POLICY "Users manage own share links"
    ON public.share_links FOR ALL
    USING (auth.uid() = user_id);

-- Public read of active share links by code (portal is unlisted, not secret-by-RLS)
DROP POLICY IF EXISTS "Public read active share links" ON public.share_links;
CREATE POLICY "Public read active share links"
    ON public.share_links FOR SELECT
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users manage own job proposals" ON public.job_proposals;
CREATE POLICY "Users manage own job proposals"
    ON public.job_proposals FOR ALL
    USING (auth.uid() = user_id);

-- Decisions: owners can read; anyone can insert/update for an active share
DROP POLICY IF EXISTS "Owners read client decisions" ON public.client_decisions;
CREATE POLICY "Owners read client decisions"
    ON public.client_decisions FOR SELECT
    USING (
        share_id IN (SELECT id FROM public.share_links WHERE user_id = auth.uid())
        OR share_id IN (SELECT id FROM public.share_links WHERE is_active = TRUE)
    );

DROP POLICY IF EXISTS "Public write client decisions" ON public.client_decisions;
CREATE POLICY "Public write client decisions"
    ON public.client_decisions FOR INSERT
    WITH CHECK (
        share_id IN (SELECT id FROM public.share_links WHERE is_active = TRUE)
    );

DROP POLICY IF EXISTS "Public update client decisions" ON public.client_decisions;
CREATE POLICY "Public update client decisions"
    ON public.client_decisions FOR UPDATE
    USING (
        share_id IN (SELECT id FROM public.share_links WHERE is_active = TRUE)
    );

-- Public read of batch_candidates for active share batches (portal grid)
DROP POLICY IF EXISTS "Public read shared batch candidates" ON public.batch_candidates;
CREATE POLICY "Public read shared batch candidates"
    ON public.batch_candidates FOR SELECT
    USING (
        batch_id IN (
            SELECT batch_id FROM public.share_links WHERE is_active = TRUE
        )
    );

DROP POLICY IF EXISTS "Public read shared batch evaluations" ON public.batch_evaluations;
CREATE POLICY "Public read shared batch evaluations"
    ON public.batch_evaluations FOR SELECT
    USING (
        batch_id IN (
            SELECT batch_id FROM public.share_links WHERE is_active = TRUE
        )
    );

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_sovereign_memory_updated_at ON public.sovereign_memory;
CREATE TRIGGER trg_sovereign_memory_updated_at
    BEFORE UPDATE ON public.sovereign_memory
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_client_decisions_updated_at ON public.client_decisions;
CREATE TRIGGER trg_client_decisions_updated_at
    BEFORE UPDATE ON public.client_decisions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
