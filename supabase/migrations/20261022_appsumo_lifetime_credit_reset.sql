-- AppSumo lifetime deals: monthly credit refresh without revoking access.
-- SaaS pause/cancel must never strip appsumo_tier, appsumo_plan, or LTD credits.

CREATE OR REPLACE FUNCTION public.appsumo_monthly_quota(p_tier integer, p_plan text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_plan text := lower(coalesce(p_plan, ''));
BEGIN
  IF coalesce(p_tier, 0) >= 3
     OR v_plan IN ('tier_3', 'tier3', 'appsumo_tier3', 'appsumo_b2b', 'b2b_tier') THEN
    RETURN 1000;
  END IF;
  IF coalesce(p_tier, 0) >= 2
     OR v_plan IN ('tier_2', 'tier2', 'appsumo_tier2') THEN
    RETURN 200;
  END IF;
  IF coalesce(p_tier, 0) >= 1
     OR v_plan IN ('tier_1', 'tier1', 'appsumo_tier1') THEN
    RETURN 50;
  END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_appsumo_lifetime_profile(p_row public.profiles)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF coalesce(p_row.appsumo_tier, 0) >= 1 THEN
    RETURN true;
  END IF;
  IF coalesce(p_row.appsumo_codes_count, 0) >= 1 THEN
    RETURN true;
  END IF;
  IF lower(coalesce(p_row.appsumo_plan, '')) ~ '(tier_?[123]|appsumo)' THEN
    RETURN true;
  END IF;
  IF lower(coalesce(p_row.subscription_tier, '')) LIKE 'appsumo%' THEN
    RETURN true;
  END IF;
  IF lower(coalesce(p_row.plan_type, '')) LIKE 'appsumo%' THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

DROP FUNCTION IF EXISTS public.reset_monthly_credits_if_due(uuid);

CREATE OR REPLACE FUNCTION public.reset_monthly_credits_if_due(user_id_input uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.profiles%ROWTYPE;
  v_limit integer;
  v_remaining integer;
  v_new_balance integer;
  v_period text;
  v_status text;
  v_appsumo boolean;
BEGIN
  SELECT * INTO v_row
  FROM public.profiles
  WHERE user_id = user_id_input OR id = user_id_input
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_remaining := COALESCE(v_row.remaining_credits, v_row.credits_balance, 0);
  v_limit := COALESCE(v_row.monthly_credit_limit, 0);
  v_period := COALESCE(v_row.billing_period, 'monthly');
  v_status := COALESCE(v_row.subscription_status, 'active');
  v_appsumo := public.is_appsumo_lifetime_profile(v_row);

  -- Lifetime Deal: never revoke plan/status. Refresh monthly quota when due.
  IF v_appsumo THEN
    IF v_limit <= 0 THEN
      v_limit := public.appsumo_monthly_quota(v_row.appsumo_tier, v_row.appsumo_plan);
    END IF;
    IF v_row.credit_reset_date IS NULL OR v_row.credit_reset_date > now() THEN
      RETURN v_remaining;
    END IF;
    UPDATE public.profiles
    SET
      remaining_credits = v_limit,
      credits_remaining = v_limit,
      credits_balance = v_limit,
      monthly_credit_limit = v_limit,
      credit_reset_date = now() + interval '1 month',
      updated_at = now()
    WHERE id = v_row.id;
    RETURN v_limit;
  END IF;

  IF v_row.credit_reset_date IS NULL OR v_row.credit_reset_date > now() THEN
    RETURN v_remaining;
  END IF;

  IF v_status = 'paused' THEN
    UPDATE public.profiles
    SET
      credit_reset_date = now() + interval '1 month',
      updated_at = now()
    WHERE id = v_row.id;
    RETURN v_remaining;
  END IF;

  IF v_limit <= 0 THEN
    UPDATE public.profiles
    SET
      credit_reset_date = now() + interval '1 month',
      updated_at = now()
    WHERE id = v_row.id;
    RETURN v_remaining;
  END IF;

  IF v_period IN ('yearly', 'annual', 'annually') THEN
    v_new_balance := LEAST(v_remaining + v_limit, v_limit * 2);
  ELSE
    v_new_balance := v_limit;
  END IF;

  UPDATE public.profiles
  SET
    remaining_credits = v_new_balance,
    credits_remaining = v_new_balance,
    credits_balance = v_new_balance,
    credit_reset_date = now() + interval '1 month',
    updated_at = now()
  WHERE id = v_row.id;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_monthly_credits_if_due(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.appsumo_monthly_quota(integer, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_appsumo_monthly_credits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.profiles p
  SET
    remaining_credits = GREATEST(COALESCE(p.monthly_credit_limit, 0), public.appsumo_monthly_quota(p.appsumo_tier, p.appsumo_plan)),
    credits_remaining = GREATEST(COALESCE(p.monthly_credit_limit, 0), public.appsumo_monthly_quota(p.appsumo_tier, p.appsumo_plan)),
    credits_balance = GREATEST(COALESCE(p.monthly_credit_limit, 0), public.appsumo_monthly_quota(p.appsumo_tier, p.appsumo_plan)),
    monthly_credit_limit = GREATEST(COALESCE(p.monthly_credit_limit, 0), public.appsumo_monthly_quota(p.appsumo_tier, p.appsumo_plan)),
    credit_reset_date = now() + interval '1 month',
    updated_at = now()
  WHERE public.is_appsumo_lifetime_profile(p)
    AND p.credit_reset_date IS NOT NULL
    AND p.credit_reset_date <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_appsumo_monthly_credits() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('refresh-appsumo-monthly-credits');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'refresh-appsumo-monthly-credits',
      '20 0 * * *',
      'SELECT public.refresh_appsumo_monthly_credits()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
