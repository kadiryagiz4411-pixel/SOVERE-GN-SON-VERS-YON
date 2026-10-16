-- ─────────────────────────────────────────────────────────────────────────────
-- Single-File Multi-CV Batch Evaluation System
-- Tables: batch_uploads, batch_candidates, batch_evaluations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Table 1: Batch Upload Tracker ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batch_uploads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,
    file_type       TEXT NOT NULL,
    total_candidates INT DEFAULT 0,
    status          TEXT DEFAULT 'processing'
                    CHECK (status IN ('processing', 'parsing', 'evaluating', 'completed', 'failed')),
    job_context     TEXT,          -- optional job description for evaluation context
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Table 2: Extracted Candidates ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batch_candidates (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id         UUID REFERENCES public.batch_uploads(id) ON DELETE CASCADE,
    full_name        TEXT NOT NULL DEFAULT 'Unknown Candidate',
    title            TEXT,
    email            TEXT,
    location         TEXT,
    experience_years INT DEFAULT 0,
    photo_url        TEXT,
    summary          TEXT,
    skills           TEXT[] DEFAULT '{}',
    education        TEXT,
    work_history     JSONB DEFAULT '[]',
    raw_data         JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Table 3: Rational Evaluations & Rankings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batch_evaluations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id         UUID REFERENCES public.batch_candidates(id) ON DELETE CASCADE,
    batch_id             UUID REFERENCES public.batch_uploads(id) ON DELETE CASCADE,
    overall_score        INT CHECK (overall_score BETWEEN 0 AND 100),
    rank_position        INT NOT NULL DEFAULT 0,
    why_this_candidate   TEXT NOT NULL DEFAULT '',
    key_strengths        TEXT[] DEFAULT '{}',
    missing_skills       TEXT[] DEFAULT '{}',
    recommendation       TEXT CHECK (recommendation IN ('Top Pick', 'Strong Fit', 'Moderate Fit', 'Not Recommended')),
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_batch_uploads_user_id    ON public.batch_uploads (user_id);
CREATE INDEX IF NOT EXISTS idx_batch_candidates_batch   ON public.batch_candidates (batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_evaluations_batch  ON public.batch_evaluations (batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_evaluations_cand   ON public.batch_evaluations (candidate_id);

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE public.batch_uploads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_candidates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_evaluations ENABLE ROW LEVEL SECURITY;

-- batch_uploads: owner access
DROP POLICY IF EXISTS "Users access own batch uploads"     ON public.batch_uploads;
CREATE POLICY "Users access own batch uploads"
    ON public.batch_uploads FOR ALL
    USING (auth.uid() = user_id);

-- batch_candidates: accessible if related batch belongs to current user
DROP POLICY IF EXISTS "Users access own batch candidates"  ON public.batch_candidates;
CREATE POLICY "Users access own batch candidates"
    ON public.batch_candidates FOR ALL
    USING (
        batch_id IN (
            SELECT id FROM public.batch_uploads WHERE user_id = auth.uid()
        )
    );

-- batch_evaluations: accessible if related batch belongs to current user
DROP POLICY IF EXISTS "Users access own batch evaluations" ON public.batch_evaluations;
CREATE POLICY "Users access own batch evaluations"
    ON public.batch_evaluations FOR ALL
    USING (
        batch_id IN (
            SELECT id FROM public.batch_uploads WHERE user_id = auth.uid()
        )
    );

-- ── updated_at trigger ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_batch_uploads_updated_at ON public.batch_uploads;
CREATE TRIGGER trg_batch_uploads_updated_at
    BEFORE UPDATE ON public.batch_uploads
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
