-- Sovereign AppSumo stacking, credit aliases, agency KB, CRM tracker
-- Aligns existing columns with the architecture spec without dropping live data.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS appsumo_tier integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_remaining integer,
  ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS encrypted_openai_key text,
  ADD COLUMN IF NOT EXISTS is_account_paused boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_appsumo_tier_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_appsumo_tier_check
      CHECK (appsumo_tier BETWEEN 0 AND 3);
  END IF;
END $$;

-- Backfill aliases from existing credit / BYOK / pause columns
UPDATE public.profiles
SET
  credits_remaining = COALESCE(credits_remaining, remaining_credits, credits_balance, 100),
  monthly_credit_limit = COALESCE(NULLIF(monthly_credit_limit, 0), 100),
  credits_reset_at = COALESCE(credits_reset_at, credit_reset_date, now() + interval '1 month'),
  encrypted_openai_key = COALESCE(encrypted_openai_key, custom_openai_key),
  is_account_paused = COALESCE(is_account_paused, subscription_status = 'paused', false),
  appsumo_tier = CASE
    WHEN appsumo_tier > 0 THEN appsumo_tier
    WHEN COALESCE(appsumo_codes_count, 0) >= 3
      OR subscription_tier IN ('appsumo_b2b', 'appsumo_tier3', 'enterprise', 'B2B_ENTERPRISE') THEN 3
    WHEN COALESCE(appsumo_codes_count, 0) = 2
      OR subscription_tier IN ('appsumo_tier2', 'pro', 'elite') THEN 2
    WHEN COALESCE(appsumo_codes_count, 0) = 1
      OR subscription_tier IN ('appsumo_tier1', 'standard') THEN 1
    ELSE 0
  END;

CREATE TABLE IF NOT EXISTS public.appsumo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.appsumo_codes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS redeemed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier_level INTEGER NOT NULL DEFAULT 1;

UPDATE public.appsumo_codes
SET user_id = COALESCE(user_id, redeemed_by_user_id)
WHERE user_id IS NULL AND redeemed_by_user_id IS NOT NULL;

ALTER TABLE public.appsumo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their own redeemed codes" ON public.appsumo_codes;
CREATE POLICY "Users see their own redeemed codes"
  ON public.appsumo_codes FOR SELECT
  USING (COALESCE(redeemed_by_user_id, user_id) = auth.uid());

CREATE TABLE IF NOT EXISTS public.agency_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'case_study',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_own_select" ON public.agency_knowledge_base;
DROP POLICY IF EXISTS "kb_own_write" ON public.agency_knowledge_base;
CREATE POLICY "kb_own_select" ON public.agency_knowledge_base
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "kb_own_write" ON public.agency_knowledge_base
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.crm_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'saved',
  match_score INT NOT NULL DEFAULT 0,
  job_description TEXT,
  generated_pitch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_own_select" ON public.crm_applications;
DROP POLICY IF EXISTS "crm_own_write" ON public.crm_applications;
CREATE POLICY "crm_own_select" ON public.crm_applications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "crm_own_write" ON public.crm_applications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_kb_user ON public.agency_knowledge_base (user_id);
CREATE INDEX IF NOT EXISTS idx_crm_user ON public.crm_applications (user_id, status);

-- Keep remaining_credits / credits_remaining and pause flags in sync
CREATE OR REPLACE FUNCTION public.sync_profile_credit_aliases()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.credits_remaining := COALESCE(NEW.credits_remaining, NEW.remaining_credits, NEW.credits_balance, 0);
  NEW.remaining_credits := COALESCE(NEW.remaining_credits, NEW.credits_remaining, 0);
  NEW.credits_reset_at := COALESCE(NEW.credits_reset_at, NEW.credit_reset_date);
  NEW.credit_reset_date := COALESCE(NEW.credit_reset_date, NEW.credits_reset_at);
  IF NEW.encrypted_openai_key IS NULL AND NEW.custom_openai_key IS NOT NULL THEN
    NEW.encrypted_openai_key := NEW.custom_openai_key;
  END IF;
  IF NEW.custom_openai_key IS NULL AND NEW.encrypted_openai_key IS NOT NULL THEN
    NEW.custom_openai_key := NEW.encrypted_openai_key;
  END IF;
  IF NEW.is_account_paused IS TRUE THEN
    NEW.subscription_status := 'paused';
  ELSIF NEW.subscription_status = 'paused' THEN
    NEW.is_account_paused := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_credit_aliases ON public.profiles;
CREATE TRIGGER trg_sync_profile_credit_aliases
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_credit_aliases();

-- Stacking RPC: 1→100, 2→300, 3→unlimited BYOK, max 3 codes
DROP FUNCTION IF EXISTS public.redeem_stacking_code(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.redeem_stacking_code(
  input_code      TEXT,
  target_user_id  UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_row    public.appsumo_codes%ROWTYPE;
  v_total_codes INTEGER := 0;
  v_legacy      INTEGER := 0;
  v_new_limit   INTEGER;
  v_new_tier    TEXT;
  v_appsumo_n   INTEGER;
  v_byok        BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_total_codes
  FROM public.appsumo_codes
  WHERE is_redeemed = TRUE
    AND COALESCE(redeemed_by_user_id, user_id) = target_user_id;

  BEGIN
    SELECT COUNT(*) INTO v_legacy
    FROM public.license_keys
    WHERE redeemed_by = target_user_id AND status = 'redeemed';
  EXCEPTION WHEN undefined_table THEN
    v_legacy := 0;
  END;

  IF COALESCE(v_total_codes, 0) + COALESCE(v_legacy, 0) >= 3 THEN
    RETURN 'max_stack';
  END IF;

  SELECT * INTO v_code_row
  FROM public.appsumo_codes
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(input_code));

  IF NOT FOUND THEN RETURN 'invalid_code'; END IF;
  IF v_code_row.is_redeemed OR v_code_row.user_id IS NOT NULL THEN
    RETURN 'already_redeemed';
  END IF;

  UPDATE public.appsumo_codes
  SET
    is_redeemed         = TRUE,
    redeemed_by_user_id = target_user_id,
    user_id             = target_user_id,
    redeemed_at         = now()
  WHERE id = v_code_row.id
    AND COALESCE(is_redeemed, FALSE) = FALSE
    AND user_id IS NULL;

  IF NOT FOUND THEN RETURN 'already_redeemed'; END IF;

  SELECT COUNT(*) INTO v_total_codes
  FROM public.appsumo_codes
  WHERE is_redeemed = TRUE
    AND COALESCE(redeemed_by_user_id, user_id) = target_user_id;

  v_total_codes := COALESCE(v_total_codes, 0) + COALESCE(v_legacy, 0);
  v_appsumo_n := LEAST(v_total_codes, 3);

  IF v_appsumo_n >= 3 THEN
    v_new_limit := 999999;
    v_new_tier  := 'appsumo_tier3';
    v_byok      := TRUE;
  ELSIF v_appsumo_n = 2 THEN
    v_new_limit := 300;
    v_new_tier  := 'appsumo_tier2';
    v_byok      := FALSE;
  ELSE
    v_new_limit := 100;
    v_new_tier  := 'appsumo_tier1';
    v_byok      := FALSE;
  END IF;

  UPDATE public.profiles
  SET
    appsumo_tier         = v_appsumo_n,
    appsumo_codes_count  = v_appsumo_n,
    subscription_tier    = CASE
                             WHEN subscription_tier IN ('enterprise', 'B2B_ENTERPRISE') THEN subscription_tier
                             WHEN v_appsumo_n >= 3 THEN 'appsumo_tier3'
                             ELSE v_new_tier
                           END,
    plan_type            = CASE
                             WHEN v_appsumo_n >= 3 THEN COALESCE(NULLIF(plan_type, 'free'), 'B2B_ENTERPRISE')
                             WHEN v_appsumo_n = 2 THEN COALESCE(NULLIF(plan_type, 'free'), 'pro')
                             ELSE COALESCE(NULLIF(plan_type, 'free'), 'standard')
                           END,
    monthly_credit_limit = v_new_limit,
    remaining_credits    = CASE WHEN v_appsumo_n >= 3 THEN 999999 ELSE GREATEST(COALESCE(remaining_credits, 0), v_new_limit) END,
    credits_remaining    = CASE WHEN v_appsumo_n >= 3 THEN 999999 ELSE GREATEST(COALESCE(credits_remaining, remaining_credits, 0), v_new_limit) END,
    credit_reset_date    = COALESCE(credit_reset_date, now()) + INTERVAL '1 month',
    credits_reset_at     = COALESCE(credits_reset_at, now()) + INTERVAL '1 month',
    byok_unlocked        = v_byok OR COALESCE(byok_unlocked, FALSE),
    updated_at           = now()
  WHERE user_id = target_user_id OR id = target_user_id;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_stacking_code(TEXT, UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.appsumo_stacking_summary AS
SELECT
  COALESCE(redeemed_by_user_id, user_id) AS user_id,
  COUNT(*) AS codes_redeemed,
  MAX(redeemed_at) AS last_redeemed_at,
  CASE LEAST(COUNT(*), 3)
    WHEN 1 THEN 'AppSumo Tier 1 · 100 credits/mo'
    WHEN 2 THEN 'AppSumo Tier 2 · 300 credits/mo'
    ELSE 'AppSumo Tier 3 · Unlimited BYOK'
  END AS tier_label
FROM public.appsumo_codes
WHERE is_redeemed = TRUE OR user_id IS NOT NULL
GROUP BY COALESCE(redeemed_by_user_id, user_id);
