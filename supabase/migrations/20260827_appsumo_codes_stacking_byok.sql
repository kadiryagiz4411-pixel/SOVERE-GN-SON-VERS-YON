-- =============================================================================
-- Migration: AppSumo Codes Stacking Table + BYOK Profile Columns
-- -----------------------------------------------------------------------------
-- Adds the new `appsumo_codes` table (separate from legacy `license_keys`),
-- BYOK columns on profiles, and a new stacking RPC.
--
-- Stacking rules (count of codes redeemed by THIS user):
--   1 code  → appsumo_tier1 · 200 credits/mo
--   2 codes → appsumo_tier2 · 500 credits/mo
--   3+codes → appsumo_b2b   · 1200 credits/mo + byok_unlocked = true
-- =============================================================================

-- ── 1. appsumo_codes table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appsumo_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,
  tier_level          INTEGER NOT NULL DEFAULT 1 CHECK (tier_level BETWEEN 1 AND 3),
  is_redeemed         BOOLEAN NOT NULL DEFAULT FALSE,
  redeemed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only the owning user can see their own redeemed codes; admins see all
ALTER TABLE public.appsumo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own redeemed codes"
  ON public.appsumo_codes FOR SELECT
  USING (redeemed_by_user_id = auth.uid());

-- ── 2. Add BYOK + custom_openai_key columns to profiles ──────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS byok_unlocked       BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_openai_key   TEXT,
  ADD COLUMN IF NOT EXISTS appsumo_codes_count INTEGER  NOT NULL DEFAULT 0;

-- ── 3. Seed demo stacking codes (tier_level 1/2/3) ───────────────────────────
INSERT INTO public.appsumo_codes (code, tier_level) VALUES
  ('SOV-SUMO-T1-DEMO1', 1),
  ('SOV-SUMO-T1-DEMO2', 1),
  ('SOV-SUMO-T1-DEMO3', 1),
  ('SOV-SUMO-T2-DEMO1', 2),
  ('SOV-SUMO-T2-DEMO2', 2),
  ('SOV-SUMO-T3-DEMO1', 3)
ON CONFLICT (code) DO NOTHING;

-- ── 4. RPC: redeem_stacking_code ─────────────────────────────────────────────
-- Counts all codes redeemed by the user across BOTH appsumo_codes AND the
-- legacy license_keys table, then assigns the correct tier/credits/byok flag.
-- Returns: 'ok' | 'invalid_code' | 'already_redeemed' | 'not_found'

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
  v_total_codes INTEGER;
  v_new_limit   INTEGER;
  v_new_tier    TEXT;
  v_byok        BOOLEAN;
BEGIN
  -- ── Find code (case-insensitive) ────────────────────────────────────────────
  SELECT * INTO v_code_row
  FROM public.appsumo_codes
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(input_code));

  IF NOT FOUND         THEN RETURN 'invalid_code';    END IF;
  IF v_code_row.is_redeemed THEN RETURN 'already_redeemed'; END IF;

  -- ── Mark as redeemed (with lock) ─────────────────────────────────────────────
  UPDATE public.appsumo_codes
  SET
    is_redeemed         = TRUE,
    redeemed_by_user_id = target_user_id,
    redeemed_at         = now()
  WHERE id = v_code_row.id
    AND NOT is_redeemed;   -- guard against race condition

  GET DIAGNOSTICS v_total_codes = ROW_COUNT;
  IF v_total_codes = 0 THEN RETURN 'already_redeemed'; END IF;

  -- ── Count ALL codes this user has redeemed (new + legacy) ────────────────────
  SELECT
    (SELECT COUNT(*) FROM public.appsumo_codes
     WHERE redeemed_by_user_id = target_user_id AND is_redeemed)
    +
    (SELECT COUNT(*) FROM public.license_keys
     WHERE redeemed_by = target_user_id AND status = 'redeemed')
  INTO v_total_codes;

  -- ── Determine new tier + credit limit ────────────────────────────────────────
  IF v_total_codes >= 3 THEN
    v_new_limit := 1200;
    v_new_tier  := 'appsumo_b2b';
    v_byok      := TRUE;
  ELSIF v_total_codes = 2 THEN
    v_new_limit := 500;
    v_new_tier  := 'appsumo_tier2';
    v_byok      := FALSE;
  ELSE
    v_new_limit := 200;
    v_new_tier  := 'appsumo_tier1';
    v_byok      := FALSE;
  END IF;

  -- ── Upsert profile with new tier/credits/byok ────────────────────────────────
  -- Only upgrade subscription_tier, never downgrade
  UPDATE public.profiles
  SET
    subscription_tier    = CASE
                             WHEN subscription_tier IN ('appsumo_b2b', 'enterprise') THEN subscription_tier
                             WHEN v_new_tier = 'appsumo_b2b'   THEN 'appsumo_b2b'
                             WHEN v_new_tier = 'appsumo_tier2' AND subscription_tier NOT IN ('appsumo_b2b','enterprise') THEN 'appsumo_tier2'
                             WHEN v_new_tier = 'appsumo_tier1' AND subscription_tier = 'free' THEN 'appsumo_tier1'
                             ELSE subscription_tier
                           END,
    monthly_credit_limit = GREATEST(COALESCE(monthly_credit_limit, 0), v_new_limit),
    remaining_credits    = GREATEST(COALESCE(remaining_credits, 0),
                                    GREATEST(COALESCE(monthly_credit_limit, 0), v_new_limit)),
    credit_reset_date    = COALESCE(credit_reset_date, now()) + INTERVAL '30 days',
    byok_unlocked        = v_byok OR COALESCE(byok_unlocked, FALSE),
    appsumo_codes_count  = v_total_codes,
    updated_at           = now()
  WHERE user_id = target_user_id;

  RETURN 'ok';
END;
$$;

-- ── 5. Helper view: user's stacking summary ───────────────────────────────────
CREATE OR REPLACE VIEW public.appsumo_stacking_summary AS
SELECT
  redeemed_by_user_id AS user_id,
  COUNT(*)            AS codes_redeemed,
  MAX(redeemed_at)    AS last_redeemed_at,
  CASE COUNT(*)
    WHEN 1 THEN 'AppSumo Tier 1 · 200 credits/mo'
    WHEN 2 THEN 'AppSumo Tier 2 · 500 credits/mo'
    ELSE        'AppSumo Tier 3 (B2B) · 1200 credits/mo + BYOK'
  END AS tier_label
FROM public.appsumo_codes
WHERE is_redeemed = TRUE
GROUP BY redeemed_by_user_id;
