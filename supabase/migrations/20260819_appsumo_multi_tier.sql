-- =============================================================================
-- Migration: AppSumo Multi-Tier LTD System
-- Tiers: tier1 ($49), tier2 ($99), b2b_tier ($149)
-- Extends the 20260818_appsumo_credits.sql baseline.
-- =============================================================================

-- ── 1. Update license_keys.tier CHECK constraint ──────────────────────────────
-- Drop old constraint and add the correct one (tier1 | tier2 | b2b_tier)
ALTER TABLE public.license_keys
  DROP CONSTRAINT IF EXISTS license_keys_tier_check;

ALTER TABLE public.license_keys
  ADD CONSTRAINT license_keys_tier_check
  CHECK (tier IN ('tier1', 'tier2', 'b2b_tier'));

-- ── 2. Update profiles.subscription_tier CHECK constraint ─────────────────────
-- Drop old constraint and replace with the correct value set
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN (
    'free',
    'appsumo_tier1',
    'appsumo_tier2',
    'appsumo_b2b',
    'pro_monthly',
    'enterprise'
  ));

-- ── 3. Add b2b_features_enabled flag to profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS b2b_features_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Auto-set flag when subscription_tier is appsumo_b2b or enterprise
CREATE OR REPLACE FUNCTION public.sync_b2b_features_flag()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.b2b_features_enabled :=
    NEW.subscription_tier IN ('appsumo_b2b', 'enterprise', 'B2B_ENTERPRISE');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_b2b_features ON public.profiles;
CREATE TRIGGER trg_sync_b2b_features
  BEFORE INSERT OR UPDATE OF subscription_tier ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_b2b_features_flag();

-- ── 4. Drop and replace redeem_appsumo_code RPC ───────────────────────────────
-- Supports:
--   tier1    → appsumo_tier1, 50 credits/mo
--   tier2    → appsumo_tier2, 200 credits/mo
--   b2b_tier → appsumo_b2b,   1000 credits/mo
--
-- Code Stacking rules:
--   free         → any tier: upgrade
--   appsumo_tier1 → tier2 or b2b_tier: upgrade
--   appsumo_tier1 → tier1 again: STACK (add credits only, keep tier)
--   appsumo_tier2 → b2b_tier: upgrade
--   appsumo_tier2 → tier2 again: STACK credits
--   appsumo_b2b   → any AppSumo code: STACK credits only
-- Returns: 'ok' | 'invalid_code' | 'already_redeemed' | 'disabled' | 'no_upgrade_needed'

DROP FUNCTION IF EXISTS public.redeem_appsumo_code(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.redeem_appsumo_code(
  code_input    TEXT,
  user_id_input UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key           public.license_keys%ROWTYPE;
  v_profile       public.profiles%ROWTYPE;
  v_new_limit     INTEGER;
  v_new_tier_str  TEXT;

  -- Tier rank helpers (higher = better)
  v_current_rank  INTEGER;
  v_incoming_rank INTEGER;
BEGIN
  -- ── Fetch the key (case-insensitive) ───────────────────────────────────────
  SELECT * INTO v_key
  FROM public.license_keys
  WHERE UPPER(code) = UPPER(TRIM(code_input));

  IF NOT FOUND         THEN RETURN 'invalid_code';    END IF;
  IF v_key.status = 'disabled' THEN RETURN 'disabled'; END IF;
  IF v_key.status = 'redeemed' THEN RETURN 'already_redeemed'; END IF;

  -- ── Resolve credit limit + new tier string ─────────────────────────────────
  CASE v_key.tier
    WHEN 'tier1'    THEN v_new_limit := 50;   v_new_tier_str := 'appsumo_tier1';
    WHEN 'tier2'    THEN v_new_limit := 200;  v_new_tier_str := 'appsumo_tier2';
    WHEN 'b2b_tier' THEN v_new_limit := 1000; v_new_tier_str := 'appsumo_b2b';
    ELSE                 v_new_limit := 50;   v_new_tier_str := 'appsumo_tier1';
  END CASE;

  -- ── Fetch profile with row-level lock ──────────────────────────────────────
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = user_id_input
  FOR UPDATE;

  IF NOT FOUND THEN RETURN 'invalid_code'; END IF;

  -- ── Compute tier ranks ─────────────────────────────────────────────────────
  v_current_rank := CASE v_profile.subscription_tier
    WHEN 'free'          THEN 0
    WHEN 'appsumo_tier1' THEN 1
    WHEN 'appsumo_tier2' THEN 2
    WHEN 'appsumo_b2b'   THEN 3
    WHEN 'pro_monthly'   THEN 2
    WHEN 'enterprise'    THEN 4
    ELSE 0
  END;

  v_incoming_rank := CASE v_key.tier
    WHEN 'tier1'    THEN 1
    WHEN 'tier2'    THEN 2
    WHEN 'b2b_tier' THEN 3
    ELSE 1
  END;

  -- ── Stacking logic ─────────────────────────────────────────────────────────
  IF v_incoming_rank > v_current_rank THEN
    -- Hard upgrade: apply new tier + new limit
    UPDATE public.profiles
    SET
      subscription_tier    = v_new_tier_str,
      subscription_plan    = CASE
                               WHEN v_key.tier = 'b2b_tier' THEN 'B2B_ENTERPRISE'
                               ELSE 'pro'
                             END,
      monthly_credit_limit = v_new_limit,
      remaining_credits    = v_new_limit,
      credit_reset_date    = now() + INTERVAL '30 days',
      updated_at           = now()
    WHERE user_id = user_id_input;

  ELSIF v_incoming_rank = v_current_rank THEN
    -- Same tier: stack credits (add another month's worth)
    UPDATE public.profiles
    SET
      remaining_credits    = LEAST(monthly_credit_limit * 3,
                                   remaining_credits + v_new_limit),
      credit_reset_date    = COALESCE(credit_reset_date, now()) + INTERVAL '30 days',
      updated_at           = now()
    WHERE user_id = user_id_input;

  ELSE
    -- Downgrade attempt — do nothing but still redeem the code
    -- (user keeps their higher tier; credits are stacked)
    UPDATE public.profiles
    SET
      remaining_credits = LEAST(monthly_credit_limit * 3,
                                remaining_credits + v_new_limit),
      updated_at        = now()
    WHERE user_id = user_id_input;
  END IF;

  -- ── Mark code as redeemed ──────────────────────────────────────────────────
  UPDATE public.license_keys
  SET
    status      = 'redeemed',
    redeemed_by = user_id_input,
    redeemed_at = now()
  WHERE id = v_key.id;

  RETURN 'ok';
END;
$$;

-- ── 5. Seed demo codes for all three new tiers ────────────────────────────────
INSERT INTO public.license_keys (code, tier, status) VALUES
  ('APPSM-SOVR-T1-2026A', 'tier1',    'active'),
  ('APPSM-SOVR-T1-2026B', 'tier1',    'active'),
  ('APPSM-SOVR-T2-2026A', 'tier2',    'active'),
  ('APPSM-SOVR-T2-2026B', 'tier2',    'active'),
  ('APPSM-SOVR-B2B-2026', 'b2b_tier', 'active'),
  ('APPSM-SOVR-B2B-DEMO', 'b2b_tier', 'active')
ON CONFLICT (code) DO NOTHING;

-- Update any existing 'tier3' codes to 'b2b_tier' for backward compatibility
UPDATE public.license_keys SET tier = 'b2b_tier' WHERE tier = 'tier3';

-- Update any existing 'appsumo_tier3' profiles to 'appsumo_b2b'
UPDATE public.profiles SET subscription_tier = 'appsumo_b2b'
WHERE subscription_tier = 'appsumo_tier3';
