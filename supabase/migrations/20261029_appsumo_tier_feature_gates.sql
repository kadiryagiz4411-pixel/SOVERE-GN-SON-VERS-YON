-- Map redeemed AppSumo codes to starter / pro / agency, with 50 / 200 / 1000 monthly credits.
-- Starter and Pro do not receive B2B access. Agency does.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_tier text,
  ADD COLUMN IF NOT EXISTS credits_limit integer,
  ADD COLUMN IF NOT EXISTS is_appsumo boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.redeem_appsumo_code(code_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code public.appsumo_codes%ROWTYPE;
  v_raw text;
  v_rank integer;
  v_effective integer;
  v_limit integer;
  v_plan_tier text;
  v_plan_type text;
  v_appsumo_plan text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Oturum gerekli. Lütfen giriş yapın.'
      USING ERRCODE = 'P0001';
  END IF;

  IF trim(coalesce(code_input, '')) = '' THEN
    RAISE EXCEPTION 'Geçersiz veya kullanılmış kod.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.appsumo_codes
  SET
    is_redeemed = true,
    redeemed_by = v_uid,
    redeemed_at = now()
  WHERE upper(trim(code)) = upper(trim(code_input))
    AND coalesce(is_redeemed, false) = false
    AND redeemed_by IS NULL
  RETURNING * INTO v_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geçersiz veya kullanılmış kod.'
      USING ERRCODE = 'P0001';
  END IF;

  v_raw := lower(replace(trim(coalesce(v_code.tier, '')), '-', '_'));
  IF v_raw IN ('tier3', 'tier_3', 'appsumo_tier3', 'appsumo_b2b', 'b2b_tier', 'agency', 'b2b', 'enterprise') THEN
    v_rank := 3;
  ELSIF v_raw IN ('tier2', 'tier_2', 'appsumo_tier2', 'pro') THEN
    v_rank := 2;
  ELSE
    v_rank := 1;
  END IF;

  SELECT GREATEST(coalesce(appsumo_tier, 0), v_rank)
  INTO v_effective
  FROM public.profiles
  WHERE user_id = v_uid OR id = v_uid
  ORDER BY CASE WHEN user_id = v_uid THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_effective IS NULL THEN
    RAISE EXCEPTION 'Profil bulunamadı. Destek ile iletişime geçin.'
      USING ERRCODE = 'P0001';
  END IF;

  v_limit := CASE WHEN v_effective >= 3 THEN 1000 WHEN v_effective = 2 THEN 200 ELSE 50 END;
  v_plan_tier := CASE WHEN v_effective >= 3 THEN 'agency' WHEN v_effective = 2 THEN 'pro' ELSE 'starter' END;
  v_plan_type := CASE WHEN v_effective >= 3 THEN 'appsumo_b2b' WHEN v_effective = 2 THEN 'appsumo_tier2' ELSE 'appsumo_tier1' END;
  v_appsumo_plan := CASE WHEN v_effective >= 3 THEN 'tier_3' WHEN v_effective = 2 THEN 'tier_2' ELSE 'tier_1' END;

  SELECT count(*) INTO v_count
  FROM public.appsumo_codes
  WHERE coalesce(is_redeemed, false) = true
    AND redeemed_by = v_uid;

  UPDATE public.profiles
  SET
    is_appsumo = true,
    plan_tier = v_plan_tier,
    tier = v_plan_tier,
    appsumo_tier = v_effective,
    appsumo_plan = v_appsumo_plan,
    appsumo_codes_count = GREATEST(coalesce(appsumo_codes_count, 0), coalesce(v_count, v_effective)),
    plan_type = v_plan_type,
    subscription_tier = v_plan_type,
    subscription_plan = v_plan_type,
    credits_limit = v_limit,
    monthly_credit_limit = v_limit,
    remaining_credits = v_limit,
    credits_remaining = v_limit,
    credits_balance = v_limit,
    credits = v_limit,
    b2b_access = (v_effective >= 3),
    apply_queue_access = (v_effective >= 2),
    credit_reset_date = coalesce(credit_reset_date, now()) + interval '1 month',
    credits_reset_at = coalesce(credits_reset_at, now()) + interval '1 month',
    updated_at = now()
  WHERE user_id = v_uid OR id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'tier', v_appsumo_plan,
    'plan_tier', v_plan_tier,
    'tier_label', CASE v_plan_tier WHEN 'agency' THEN 'AppSumo Agency' WHEN 'pro' THEN 'AppSumo Pro' ELSE 'AppSumo Starter' END,
    'monthly_limit', v_limit,
    'credits_limit', v_limit,
    'b2b_access', (v_effective >= 3),
    'apply_queue_access', (v_effective >= 2),
    'message', format('Tebrikler! %s paketiniz başarıyla tanımlandı.', v_plan_tier)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_appsumo_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_appsumo_code(text) TO authenticated;

WITH redeemed AS (
  SELECT
    redeemed_by AS uid,
    MAX(
      CASE
        WHEN lower(replace(coalesce(tier, ''), '-', '_')) IN ('tier_3', 'tier3', 'appsumo_tier3', 'appsumo_b2b', 'b2b_tier', 'agency', 'b2b', 'enterprise') THEN 3
        WHEN lower(replace(coalesce(tier, ''), '-', '_')) IN ('tier_2', 'tier2', 'appsumo_tier2', 'pro') THEN 2
        ELSE 1
      END
    ) AS rank
  FROM public.appsumo_codes
  WHERE coalesce(is_redeemed, false) = true
    AND redeemed_by IS NOT NULL
  GROUP BY redeemed_by
)
UPDATE public.profiles p
SET
  is_appsumo = true,
  appsumo_tier = GREATEST(coalesce(p.appsumo_tier, 0), r.rank),
  plan_tier = CASE
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3 THEN 'agency'
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) = 2 THEN 'pro'
    ELSE 'starter'
  END,
  tier = CASE
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3 THEN 'agency'
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) = 2 THEN 'pro'
    ELSE 'starter'
  END,
  appsumo_plan = CASE
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3 THEN 'tier_3'
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) = 2 THEN 'tier_2'
    ELSE 'tier_1'
  END,
  plan_type = CASE
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3 THEN 'appsumo_b2b'
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) = 2 THEN 'appsumo_tier2'
    ELSE 'appsumo_tier1'
  END,
  subscription_tier = CASE
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3 THEN 'appsumo_b2b'
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) = 2 THEN 'appsumo_tier2'
    ELSE 'appsumo_tier1'
  END,
  subscription_plan = CASE
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3 THEN 'appsumo_b2b'
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) = 2 THEN 'appsumo_tier2'
    ELSE 'appsumo_tier1'
  END,
  credits_limit = CASE
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3 THEN 1000
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) = 2 THEN 200
    ELSE 50
  END,
  monthly_credit_limit = CASE
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3 THEN 1000
    WHEN GREATEST(coalesce(p.appsumo_tier, 0), r.rank) = 2 THEN 200
    ELSE 50
  END,
  b2b_access = GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 3,
  apply_queue_access = GREATEST(coalesce(p.appsumo_tier, 0), r.rank) >= 2,
  updated_at = now()
FROM redeemed r
WHERE p.user_id = r.uid OR p.id = r.uid;
