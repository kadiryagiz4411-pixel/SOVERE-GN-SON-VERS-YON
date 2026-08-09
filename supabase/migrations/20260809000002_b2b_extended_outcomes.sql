-- =====================================================================
-- Migration: B2B Extended Schema, Application Outcomes, Org Role
-- =====================================================================

-- ── Org role on profiles ─────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_role TEXT NOT NULL DEFAULT 'user'
    CHECK (org_role IN ('user', 'org_admin', 'super_admin'));

-- ── Organization branding & template settings ────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_cv_template TEXT NOT NULL DEFAULT 'classic'
    CHECK (default_cv_template IN ('classic', 'modern', 'minimal', 'executive')),
  ADD COLUMN IF NOT EXISTS branding_accent_color TEXT DEFAULT NULL;

-- ── Application outcomes table ────────────────────────────────────────────────
-- Stores per-application outcome events for success-rate analytics and the
-- Interview Guarantee programme.
CREATE TABLE IF NOT EXISTS public.application_outcomes (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id       TEXT NOT NULL,           -- proposal or pipeline app ID (UUID stored as text for flexibility)
  outcome              TEXT NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending','viewed','replied','interview-invited','offer-received','rejected')),
  ats_score_at_apply   INTEGER DEFAULT NULL,
  interview_invited    BOOLEAN NOT NULL DEFAULT FALSE,
  offer_received       BOOLEAN NOT NULL DEFAULT FALSE,
  notes                TEXT DEFAULT '',
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

ALTER TABLE public.application_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own outcomes"
  ON public.application_outcomes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Org admins can view outcomes of all members in their org
CREATE POLICY "Org admins can view member outcomes"
  ON public.application_outcomes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.profiles admin_p ON admin_p.org_id = p.org_id
      WHERE p.user_id = application_outcomes.user_id
        AND admin_p.user_id = auth.uid()
        AND admin_p.org_role = 'org_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_outcomes_user ON public.application_outcomes (user_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_interview ON public.application_outcomes (interview_invited) WHERE interview_invited = TRUE;

CREATE TRIGGER update_application_outcomes_updated_at
  BEFORE UPDATE ON public.application_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Org member RPC ────────────────────────────────────────────────────────────
-- Returns all member profiles for an org admin.
CREATE OR REPLACE FUNCTION public.get_org_members(
  _admin_user_id UUID
)
RETURNS TABLE (
  user_id          UUID,
  full_name        TEXT,
  email            TEXT,
  org_role         TEXT,
  credits_balance  INTEGER,
  subscription_plan TEXT,
  optimizations    BIGINT,
  interviews       BIGINT,
  latest_score     INTEGER,
  joined_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Verify caller is org_admin
  SELECT org_id INTO v_org_id
    FROM public.profiles
    WHERE user_id = _admin_user_id AND org_role = 'org_admin';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized as org admin';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    u.email,
    p.org_role,
    p.credits_balance,
    p.subscription_plan,
    COALESCE((
      SELECT COUNT(*) FROM public.application_outcomes ao
      WHERE ao.user_id = p.user_id
    ), 0) AS optimizations,
    COALESCE((
      SELECT COUNT(*) FROM public.application_outcomes ao
      WHERE ao.user_id = p.user_id AND ao.interview_invited = TRUE
    ), 0) AS interviews,
    COALESCE((
      SELECT MAX(ao.ats_score_at_apply) FROM public.application_outcomes ao
      WHERE ao.user_id = p.user_id
    ), 0) AS latest_score,
    p.created_at AS joined_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.org_id = v_org_id
  ORDER BY p.created_at;
END;
$$;

-- ── Remove a member from org (org_admin only) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.remove_org_member(
  _admin_user_id UUID,
  _member_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id
    FROM public.profiles
    WHERE user_id = _admin_user_id AND org_role = 'org_admin';

  IF v_org_id IS NULL THEN RETURN FALSE; END IF;

  UPDATE public.profiles
    SET org_id = NULL, plan_type = 'FREE', subscription_plan = 'free', org_role = 'user'
    WHERE user_id = _member_user_id AND org_id = v_org_id;

  UPDATE public.organizations SET used_seats = GREATEST(0, used_seats - 1)
    WHERE id = v_org_id;

  RETURN TRUE;
END;
$$;

-- ── Grant org_admin role ──────────────────────────────────────────────────────
-- Service-role only; called when org is first created
CREATE OR REPLACE FUNCTION public.grant_org_admin(
  _user_id UUID,
  _org_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
    SET org_role = 'org_admin', org_id = _org_id
    WHERE user_id = _user_id;
END;
$$;

-- ── Update types index ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON public.profiles (org_role);
