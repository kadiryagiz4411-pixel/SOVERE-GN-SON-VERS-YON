-- =============================================================================
-- AppSumo license codes + atomic redeem RPC
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
-- Compatible with existing appsumo_codes / profiles columns.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.appsumo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'tier_1',
  is_redeemed boolean NOT NULL DEFAULT false,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appsumo_codes
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS is_redeemed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tier_level integer;

UPDATE public.appsumo_codes
SET
  code = UPPER(TRIM(code)),
  is_redeemed = COALESCE(is_redeemed, false),
  redeemed_by = COALESCE(redeemed_by, redeemed_by_user_id, user_id),
  redeemed_by_user_id = COALESCE(redeemed_by_user_id, redeemed_by, user_id),
  user_id = COALESCE(user_id, redeemed_by, redeemed_by_user_id),
  tier = COALESCE(
    NULLIF(tier, ''),
    CASE
      WHEN COALESCE(tier_level, 0) >= 3 THEN 'tier_3'
      WHEN COALESCE(tier_level, 0) = 2 THEN 'tier_2'
      WHEN COALESCE(tier_level, 0) = 1 THEN 'tier_1'
      ELSE 'tier_1'
    END
  ),
  created_at = COALESCE(created_at, now())
WHERE true;

UPDATE public.appsumo_codes
SET tier = 'tier_1'
WHERE tier IS NULL OR TRIM(tier) = '';

ALTER TABLE public.appsumo_codes
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN tier SET NOT NULL,
  ALTER COLUMN is_redeemed SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.appsumo_codes
  DROP CONSTRAINT IF EXISTS appsumo_codes_tier_check;
ALTER TABLE public.appsumo_codes
  ADD CONSTRAINT appsumo_codes_tier_check
  CHECK (tier IN ('tier_1', 'tier_2', 'tier_3', 'tier1', 'tier2', 'b2b_tier', 'appsumo_tier1', 'appsumo_tier2', 'appsumo_b2b'));

CREATE UNIQUE INDEX IF NOT EXISTS appsumo_codes_code_upper_idx
  ON public.appsumo_codes (UPPER(TRIM(code)));

ALTER TABLE public.appsumo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their own redeemed codes" ON public.appsumo_codes;
CREATE POLICY "Users see their own redeemed codes"
  ON public.appsumo_codes FOR SELECT
  TO authenticated
  USING (COALESCE(redeemed_by, redeemed_by_user_id, user_id) = auth.uid());

-- Profile flags used by session / Apply Queue
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS b2b_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apply_queue_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS b2b_features_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS appsumo_plan text,
  ADD COLUMN IF NOT EXISTS appsumo_tier integer,
  ADD COLUMN IF NOT EXISTS appsumo_codes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS byok_unlocked boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

-- =============================================================================
-- Atomic RPC: redeem_appsumo_code(code_input)
-- Uses auth.uid() — never trust a client-supplied user id.
-- =============================================================================

DROP FUNCTION IF EXISTS public.redeem_appsumo_code(TEXT, UUID);
DROP FUNCTION IF EXISTS public.redeem_appsumo_code(TEXT);

CREATE OR REPLACE FUNCTION public.redeem_appsumo_code(code_input TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_norm text;
  v_code public.appsumo_codes%ROWTYPE;
  v_tier text;
  v_tier_n integer;
  v_sub_tier text;
  v_plan_type text;
  v_limit integer;
  v_label text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Oturum gerekli. Lütfen giriş yapın.'
      USING ERRCODE = 'P0001';
  END IF;

  v_norm := UPPER(TRIM(COALESCE(code_input, '')));
  IF v_norm = '' THEN
    RAISE EXCEPTION 'Geçersiz veya kullanılmış kod.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.appsumo_codes
  SET
    is_redeemed = true,
    redeemed_by = v_uid,
    redeemed_by_user_id = v_uid,
    user_id = v_uid,
    redeemed_at = now()
  WHERE UPPER(TRIM(code)) = v_norm
    AND COALESCE(is_redeemed, false) = false
    AND COALESCE(redeemed_by, redeemed_by_user_id) IS NULL
  RETURNING * INTO v_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geçersiz veya kullanılmış kod.'
      USING ERRCODE = 'P0001';
  END IF;

  v_tier := LOWER(REPLACE(TRIM(v_code.tier), '-', '_'));
  IF v_tier IN ('tier1', 'appsumo_tier1', 'standard') THEN
    v_tier := 'tier_1';
  ELSIF v_tier IN ('tier2', 'appsumo_tier2', 'pro') THEN
    v_tier := 'tier_2';
  ELSIF v_tier IN ('tier3', 'tier_3', 'b2b_tier', 'appsumo_b2b', 'appsumo_tier3', 'enterprise') THEN
    v_tier := 'tier_3';
  ELSIF v_tier NOT IN ('tier_1', 'tier_2', 'tier_3') THEN
    v_tier := CASE
      WHEN COALESCE(v_code.tier_level, 0) >= 3 THEN 'tier_3'
      WHEN COALESCE(v_code.tier_level, 0) = 2 THEN 'tier_2'
      ELSE 'tier_1'
    END;
  END IF;

  v_tier_n := CASE v_tier WHEN 'tier_3' THEN 3 WHEN 'tier_2' THEN 2 ELSE 1 END;
  v_sub_tier := CASE v_tier
    WHEN 'tier_3' THEN 'appsumo_b2b'
    WHEN 'tier_2' THEN 'appsumo_tier2'
    ELSE 'appsumo_tier1'
  END;
  v_plan_type := CASE v_tier
    WHEN 'tier_3' THEN 'B2B_ENTERPRISE'
    WHEN 'tier_2' THEN 'pro'
    ELSE 'standard'
  END;
  v_limit := CASE v_tier WHEN 'tier_3' THEN 1000 WHEN 'tier_2' THEN 200 ELSE 50 END;
  v_label := CASE v_tier WHEN 'tier_3' THEN 'Tier 3' WHEN 'tier_2' THEN 'Tier 2' ELSE 'Tier 1' END;

  SELECT COUNT(*) INTO v_count
  FROM public.appsumo_codes
  WHERE is_redeemed = true
    AND COALESCE(redeemed_by, redeemed_by_user_id, user_id) = v_uid;

  UPDATE public.profiles
  SET
    appsumo_plan = v_tier,
    appsumo_tier = GREATEST(COALESCE(appsumo_tier, 0), v_tier_n),
    appsumo_codes_count = GREATEST(COALESCE(appsumo_codes_count, 0), COALESCE(v_count, v_tier_n)),
    subscription_tier = CASE
      WHEN subscription_tier IN ('enterprise', 'B2B_ENTERPRISE', 'appsumo_b2b') THEN subscription_tier
      ELSE v_sub_tier
    END,
    subscription_plan = CASE
      WHEN subscription_plan IN ('enterprise', 'B2B_ENTERPRISE') THEN subscription_plan
      ELSE v_plan_type
    END,
    plan_type = CASE
      WHEN plan_type IN ('B2B_ENTERPRISE', 'enterprise') THEN plan_type
      ELSE v_plan_type
    END,
    b2b_access = true,
    apply_queue_access = true,
    b2b_features_enabled = CASE WHEN v_tier = 'tier_3' THEN true ELSE COALESCE(b2b_features_enabled, false) END,
    byok_unlocked = CASE WHEN v_tier = 'tier_3' THEN true ELSE COALESCE(byok_unlocked, false) END,
    monthly_credit_limit = GREATEST(COALESCE(monthly_credit_limit, 0), v_limit),
    remaining_credits = GREATEST(COALESCE(remaining_credits, 0), v_limit),
    credits_remaining = GREATEST(COALESCE(credits_remaining, remaining_credits, 0), v_limit),
    credits_balance = GREATEST(COALESCE(credits_balance, 0), v_limit),
    credit_reset_date = COALESCE(credit_reset_date, now()) + INTERVAL '1 month',
    credits_reset_at = COALESCE(credits_reset_at, now()) + INTERVAL '1 month',
    updated_at = now()
  WHERE user_id = v_uid OR id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil bulunamadı. Destek ile iletişime geçin.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tier', v_tier,
    'tier_label', v_label,
    'monthly_limit', v_limit,
    'b2b_access', true,
    'apply_queue_access', true,
    'message', format('Tebrikler! %s paketiniz başarıyla tanımlandı.', v_label)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_appsumo_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_appsumo_code(TEXT) TO authenticated;

-- Optional: provision unused codes in SQL Editor, e.g.
-- INSERT INTO public.appsumo_codes (code, tier) VALUES
--   ('SOVR-T1-XXXX', 'tier_1'),
--   ('SOVR-T2-XXXX', 'tier_2'),
--   ('SOVR-T3-XXXX', 'tier_3')
-- ON CONFLICT (code) DO NOTHING;
