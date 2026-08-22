-- =============================================================================
-- Migration: AppSumo LTD System + Monthly Credit Engine + Job Analysis Cache
-- =============================================================================

-- ── 1. AppSumo License Keys ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.license_keys (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  tier         TEXT NOT NULL DEFAULT 'tier1'
                 CHECK (tier IN ('tier1', 'tier2', 'tier3')),
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'redeemed', 'disabled')),
  redeemed_by  UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL DEFAULT NULL,
  redeemed_at  TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- Only admins / service role can manage keys; users can only redeem via RPC
CREATE POLICY "Service role manages license keys"
  ON public.license_keys
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage license keys"
  ON public.license_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_license_keys_code   ON public.license_keys (code);
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON public.license_keys (status);

-- ── 2. Extend profiles with monthly credit fields ─────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_credit_limit  INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS remaining_credits     INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS credit_reset_date     TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS subscription_tier     TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'appsumo_tier1', 'appsumo_tier2', 'appsumo_tier3', 'pro_monthly', 'enterprise'));

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles (subscription_tier);

-- ── 3. Job Analysis Cache (Stage 1 LLM dedup) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_analysis_cache (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash     TEXT NOT NULL UNIQUE,   -- SHA-256 of normalised job text
  job_url          TEXT DEFAULT NULL,
  raw_snippet      TEXT NOT NULL,          -- first 500 chars for debugging
  stage1_result    JSONB NOT NULL,         -- { keywords, requirements, ats_score, ... }
  model_used       TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  tokens_used      INTEGER DEFAULT NULL,
  hit_count        INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

ALTER TABLE public.job_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read cache hits; inserts done via service role
CREATE POLICY "Authenticated users can read cache"
  ON public.job_analysis_cache FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_job_cache_hash    ON public.job_analysis_cache (content_hash);
CREATE INDEX IF NOT EXISTS idx_job_cache_expires ON public.job_analysis_cache (expires_at);

-- Auto-cleanup expired entries (run via pg_cron or a scheduled function)
CREATE OR REPLACE FUNCTION public.purge_expired_job_cache()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.job_analysis_cache WHERE expires_at < now();
$$;

-- ── 4. RPC: redeem_appsumo_code ───────────────────────────────────────────────
-- Returns: 'ok' | 'invalid_code' | 'already_redeemed' | 'already_has_plan' | 'disabled'
CREATE OR REPLACE FUNCTION public.redeem_appsumo_code(
  code_input TEXT,
  user_id_input UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key   public.license_keys%ROWTYPE;
  v_limit INTEGER;
BEGIN
  -- Fetch the key (case-insensitive)
  SELECT * INTO v_key
  FROM public.license_keys
  WHERE UPPER(code) = UPPER(TRIM(code_input));

  IF NOT FOUND THEN
    RETURN 'invalid_code';
  END IF;

  IF v_key.status = 'disabled' THEN
    RETURN 'disabled';
  END IF;

  IF v_key.status = 'redeemed' THEN
    RETURN 'already_redeemed';
  END IF;

  -- Determine monthly credit limit by tier
  v_limit := CASE v_key.tier
    WHEN 'tier1' THEN 50
    WHEN 'tier2' THEN 150
    WHEN 'tier3' THEN 500
    ELSE 50
  END;

  -- Update user profile
  UPDATE public.profiles
  SET
    subscription_tier      = 'appsumo_' || v_key.tier,
    subscription_plan      = 'pro',           -- also elevate legacy plan field
    monthly_credit_limit   = v_limit,
    remaining_credits      = v_limit,
    credit_reset_date      = now() + INTERVAL '30 days',
    updated_at             = now()
  WHERE user_id = user_id_input;

  IF NOT FOUND THEN
    RETURN 'invalid_code';
  END IF;

  -- Mark key as redeemed
  UPDATE public.license_keys
  SET
    status      = 'redeemed',
    redeemed_by = user_id_input,
    redeemed_at = now()
  WHERE id = v_key.id;

  RETURN 'ok';
END;
$$;

-- ── 5. RPC: reset_monthly_credits (called lazily by creditService) ────────────
-- Returns new remaining_credits value after resetting if overdue.
CREATE OR REPLACE FUNCTION public.reset_monthly_credits_if_due(
  user_id_input UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = user_id_input FOR UPDATE;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- If reset date has passed, roll over
  IF v_profile.credit_reset_date IS NOT NULL AND now() >= v_profile.credit_reset_date THEN
    UPDATE public.profiles
    SET
      remaining_credits = monthly_credit_limit,
      credit_reset_date = credit_reset_date + INTERVAL '30 days',
      updated_at        = now()
    WHERE user_id = user_id_input
    RETURNING remaining_credits INTO v_profile.remaining_credits;
  END IF;

  RETURN v_profile.remaining_credits;
END;
$$;

-- ── 6. RPC: deduct_monthly_credit ─────────────────────────────────────────────
-- Returns TRUE if credit deducted, FALSE if insufficient.
CREATE OR REPLACE FUNCTION public.deduct_monthly_credit(
  user_id_input UUID,
  amount_input  INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- Lazy reset first
  v_remaining := public.reset_monthly_credits_if_due(user_id_input);

  IF v_remaining < amount_input THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET remaining_credits = remaining_credits - amount_input,
      updated_at        = now()
  WHERE user_id = user_id_input;

  RETURN TRUE;
END;
$$;

-- ── 7. Seed sample AppSumo codes (replace with real codes before go-live) ─────
INSERT INTO public.license_keys (code, tier, status) VALUES
  ('APPSM-SOVR-T1-DEMO1', 'tier1', 'active'),
  ('APPSM-SOVR-T1-DEMO2', 'tier1', 'active'),
  ('APPSM-SOVR-T2-DEMO1', 'tier2', 'active'),
  ('APPSM-SOVR-T3-DEMO1', 'tier3', 'active')
ON CONFLICT (code) DO NOTHING;
