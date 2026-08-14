-- =====================================================================
-- Migration: B2B HR Engine — Job Postings, Candidate Evaluations, Members
-- =====================================================================

-- ── Extend organizations with HR-specific fields ───────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'enterprise_b2b'
    CHECK (subscription_tier IN ('enterprise_b2b', 'staffing_agency', 'enterprise_plus')),
  ADD COLUMN IF NOT EXISTS cv_evaluations_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cv_evaluations_limit INTEGER NOT NULL DEFAULT 500;

-- Allow org members to read their own org row
CREATE POLICY IF NOT EXISTS "Members can read own org"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.org_id = organizations.id
    )
  );

-- ── Organization Members (HR role mapping) ────────────────────────────────
-- Dedicated junction for HR-specific roles independent of general org_role
CREATE TABLE IF NOT EXISTS public.organization_members (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT NOT NULL DEFAULT 'recruiter'
                     CHECK (role IN ('owner', 'hr_manager', 'recruiter')),
  invited_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at        TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  invited_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org's member list"
  ON public.organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and HR managers can insert members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'hr_manager')
    )
  );

CREATE POLICY "Owners can delete members"
  ON public.organization_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members (user_id);

-- ── Job Postings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_postings (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  required_skills  JSONB NOT NULL DEFAULT '[]',
  nice_to_have_skills JSONB NOT NULL DEFAULT '[]',
  seniority_level  TEXT NOT NULL DEFAULT 'mid'
                     CHECK (seniority_level IN ('junior', 'mid', 'senior', 'lead', 'executive')),
  employment_type  TEXT NOT NULL DEFAULT 'full_time'
                     CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'freelance')),
  location         TEXT DEFAULT NULL,
  salary_range     JSONB DEFAULT NULL,
  created_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  candidate_count  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view job postings"
  ON public.job_postings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "HR managers and owners can manage job postings"
  ON public.job_postings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = job_postings.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = job_postings.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'hr_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_job_postings_org_id ON public.job_postings (organization_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON public.job_postings (organization_id, is_active);

CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Candidate Evaluations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.candidate_evaluations (
  id                       UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id           UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  organization_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_name           TEXT NOT NULL DEFAULT '',
  candidate_email          TEXT DEFAULT NULL,
  cv_storage_path          TEXT DEFAULT NULL,
  cv_text_extracted        TEXT DEFAULT NULL,
  match_score_percentage   NUMERIC(5,2) DEFAULT NULL CHECK (match_score_percentage >= 0 AND match_score_percentage <= 100),
  confidence_score         NUMERIC(4,3) DEFAULT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  statistical_metrics      JSONB DEFAULT NULL,
  -- {technical_skill_fit, experience_depth_fit, seniority_alignment, culture_and_soft_skills}
  ai_analysis              JSONB DEFAULT NULL,
  -- {key_strengths, critical_gaps, risk_assessment, statistical_percentile, explainable_reasoning, hiring_verdict}
  processing_status        TEXT NOT NULL DEFAULT 'pending'
                             CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message            TEXT DEFAULT NULL,
  evaluated_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view evaluations"
  ON public.candidate_evaluations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert evaluations"
  ON public.candidate_evaluations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update evaluations"
  ON public.candidate_evaluations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "HR managers can delete evaluations"
  ON public.candidate_evaluations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = candidate_evaluations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'hr_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_candidate_evals_job_id ON public.candidate_evaluations (job_posting_id);
CREATE INDEX IF NOT EXISTS idx_candidate_evals_org_id ON public.candidate_evaluations (organization_id);
CREATE INDEX IF NOT EXISTS idx_candidate_evals_score ON public.candidate_evaluations (match_score_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_evals_status ON public.candidate_evaluations (processing_status);

CREATE TRIGGER update_candidate_evaluations_updated_at
  BEFORE UPDATE ON public.candidate_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Storage bucket policies for org CVs ──────────────────────────────────
-- Bucket 'organization-cvs' must be created in the Supabase dashboard as private

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-cvs',
  'organization-cvs',
  FALSE,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members can upload CVs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organization-cvs'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can read CVs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'organization-cvs'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can delete CVs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'organization-cvs'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

-- ── Helper RPC: get_candidates_ranked ────────────────────────────────────
-- Returns all candidates for a job posting ranked by match score
CREATE OR REPLACE FUNCTION public.get_candidates_ranked(
  _job_posting_id UUID,
  _caller_user_id UUID
)
RETURNS TABLE (
  id                     UUID,
  candidate_name         TEXT,
  candidate_email        TEXT,
  match_score_percentage NUMERIC,
  confidence_score       NUMERIC,
  statistical_metrics    JSONB,
  ai_analysis            JSONB,
  processing_status      TEXT,
  created_at             TIMESTAMPTZ,
  percentile_rank        FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE user_id = _caller_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Not a member of any organization'; END IF;

  -- Verify job belongs to caller's org
  IF NOT EXISTS (
    SELECT 1 FROM public.job_postings jp
    WHERE jp.id = _job_posting_id AND jp.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Job posting not found or access denied';
  END IF;

  RETURN QUERY
  SELECT
    ce.id,
    ce.candidate_name,
    ce.candidate_email,
    ce.match_score_percentage,
    ce.confidence_score,
    ce.statistical_metrics,
    ce.ai_analysis,
    ce.processing_status,
    ce.created_at,
    PERCENT_RANK() OVER (ORDER BY ce.match_score_percentage) AS percentile_rank
  FROM public.candidate_evaluations ce
  WHERE ce.job_posting_id = _job_posting_id
    AND ce.organization_id = v_org_id
  ORDER BY ce.match_score_percentage DESC NULLS LAST;
END;
$$;
