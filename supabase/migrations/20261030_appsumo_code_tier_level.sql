-- Integer tier_level on appsumo_codes, distinct redeem errors, and a
-- service-role-only bulk generator. Existing text `tier` values stay in place.

ALTER TABLE public.appsumo_codes
  ADD COLUMN IF NOT EXISTS tier_level integer,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.appsumo_codes
SET tier_level = CASE
  WHEN lower(replace(coalesce(tier, ''), '-', '_')) IN ('tier3', 'tier_3', 'appsumo_tier3', 'appsumo_b2b', 'b2b_tier', 'agency', 'b2b', 'enterprise') THEN 3
  WHEN lower(replace(coalesce(tier, ''), '-', '_')) IN ('tier2', 'tier_2', 'appsumo_tier2', 'pro') THEN 2
  ELSE 1
END
WHERE tier_level IS NULL;

ALTER TABLE public.appsumo_codes
  ALTER COLUMN tier_level SET NOT NULL;

ALTER TABLE public.appsumo_codes
  DROP CONSTRAINT IF EXISTS appsumo_codes_tier_level_check;

ALTER TABLE public.appsumo_codes
  ADD CONSTRAINT appsumo_codes_tier_level_check CHECK (tier_level BETWEEN 1 AND 3);

CREATE OR REPLACE FUNCTION public.sync_appsumo_code_tier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tier_level IS NULL THEN
    IF lower(replace(coalesce(NEW.tier, ''), '-', '_')) IN ('tier3', 'tier_3', 'appsumo_tier3', 'appsumo_b2b', 'b2b_tier', 'agency', 'b2b', 'enterprise') THEN
      NEW.tier_level := 3;
    ELSIF lower(replace(coalesce(NEW.tier, ''), '-', '_')) IN ('tier2', 'tier_2', 'appsumo_tier2', 'pro') THEN
      NEW.tier_level := 2;
    ELSE
      NEW.tier_level := 1;
    END IF;
  END IF;

  IF NEW.tier IS NULL OR btrim(NEW.tier) = '' THEN
    NEW.tier := CASE NEW.tier_level WHEN 3 THEN 'tier_3' WHEN 2 THEN 'tier_2' ELSE 'tier_1' END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appsumo_codes_sync_tier ON public.appsumo_codes;
CREATE TRIGGER appsumo_codes_sync_tier
  BEFORE INSERT OR UPDATE OF tier, tier_level
  ON public.appsumo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appsumo_code_tier();

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
  v_label text;
  v_count integer;
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'sign_in',
      'message', 'Sign in to redeem your code.'
    );
  END IF;

  IF trim(coalesce(code_input, '')) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'This code is not valid. Check it and try again.'
    );
  END IF;

  SELECT *
  INTO v_code
  FROM public.appsumo_codes
  WHERE upper(trim(code)) = upper(trim(code_input))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'This code is not valid. Check it and try again.'
    );
  END IF;

  IF coalesce(v_code.is_redeemed, false) OR v_code.redeemed_by IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_redeemed',
      'message', 'This code has already been used.'
    );
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'expired',
      'message', 'This code has expired.'
    );
  END IF;

  IF v_code.tier_level IN (1, 2, 3) THEN
    v_rank := v_code.tier_level;
  ELSE
    v_raw := lower(replace(trim(coalesce(v_code.tier, '')), '-', '_'));
    IF v_raw IN ('tier3', 'tier_3', 'appsumo_tier3', 'appsumo_b2b', 'b2b_tier', 'agency', 'b2b', 'enterprise') THEN
      v_rank := 3;
    ELSIF v_raw IN ('tier2', 'tier_2', 'appsumo_tier2', 'pro') THEN
      v_rank := 2;
    ELSE
      v_rank := 1;
    END IF;
  END IF;

  SELECT GREATEST(coalesce(appsumo_tier, 0), v_rank)
  INTO v_effective
  FROM public.profiles
  WHERE user_id = v_uid OR id = v_uid
  ORDER BY CASE WHEN user_id = v_uid THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_effective IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'profile_missing',
      'message', 'Your profile is not ready yet. Wait a moment and try again.'
    );
  END IF;

  UPDATE public.appsumo_codes
  SET
    is_redeemed = true,
    redeemed_by = v_uid,
    redeemed_at = now()
  WHERE id = v_code.id
    AND coalesce(is_redeemed, false) = false
    AND redeemed_by IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_redeemed',
      'message', 'This code has already been used.'
    );
  END IF;

  v_limit := CASE WHEN v_effective >= 3 THEN 1000 WHEN v_effective = 2 THEN 200 ELSE 50 END;
  v_plan_tier := CASE WHEN v_effective >= 3 THEN 'agency' WHEN v_effective = 2 THEN 'pro' ELSE 'starter' END;
  v_plan_type := CASE WHEN v_effective >= 3 THEN 'appsumo_b2b' WHEN v_effective = 2 THEN 'appsumo_tier2' ELSE 'appsumo_tier1' END;
  v_appsumo_plan := CASE WHEN v_effective >= 3 THEN 'tier_3' WHEN v_effective = 2 THEN 'tier_2' ELSE 'tier_1' END;
  v_label := CASE v_plan_tier WHEN 'agency' THEN 'AppSumo Agency' WHEN 'pro' THEN 'AppSumo Pro' ELSE 'AppSumo Starter' END;

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
    'error', null,
    'tier', v_appsumo_plan,
    'tier_level', v_effective,
    'plan_tier', v_plan_tier,
    'tier_label', v_label,
    'monthly_limit', v_limit,
    'credits_limit', v_limit,
    'b2b_access', (v_effective >= 3),
    'apply_queue_access', (v_effective >= 2),
    'message', format('%s is now active.', v_label)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_appsumo_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_appsumo_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_appsumo_codes(p_count integer, p_tier_level integer)
RETURNS TABLE(code text, tier_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  v_code text;
  v_tier text;
BEGIN
  IF p_count IS NULL OR p_count < 1 OR p_count > 500 THEN
    RAISE EXCEPTION 'count must be between 1 and 500';
  END IF;
  IF p_tier_level NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'tier_level must be 1, 2, or 3';
  END IF;

  v_tier := CASE p_tier_level WHEN 3 THEN 'tier_3' WHEN 2 THEN 'tier_2' ELSE 'tier_1' END;

  FOR i IN 1..p_count LOOP
    LOOP
      v_code := 'APPSM-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
        || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.appsumo_codes AS existing WHERE upper(existing.code) = v_code
      );
    END LOOP;

    INSERT INTO public.appsumo_codes (code, tier, tier_level, is_redeemed)
    VALUES (v_code, v_tier, p_tier_level, false);

    code := v_code;
    tier_level := p_tier_level;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_appsumo_codes(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_appsumo_codes(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.generate_appsumo_codes(integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.generate_appsumo_codes(integer, integer) TO service_role;
