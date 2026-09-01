-- Subscription pause/freeze + annual credit rollover
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_pause_until timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_pause_reason text,
  ADD COLUMN IF NOT EXISTS ls_customer_id text,
  ADD COLUMN IF NOT EXISTS ls_subscription_id text,
  ADD COLUMN IF NOT EXISTS remaining_credits integer,
  ADD COLUMN IF NOT EXISTS monthly_credit_limit integer,
  ADD COLUMN IF NOT EXISTS credit_reset_date timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_subscription_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_status_check
      CHECK (subscription_status IN ('active', 'paused', 'canceled'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.subscription_status IS 'active | paused | canceled';
COMMENT ON COLUMN public.profiles.subscription_pause_until IS 'When a pause must auto-expire (B2C ≤ 6 months, B2B ≤ 3 months)';

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
  ON public.profiles (subscription_status);

-- Recreate monthly reset: freeze while paused; rollover unused credits on annual plans.
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

  IF v_row.credit_reset_date IS NULL OR v_row.credit_reset_date > now() THEN
    RETURN v_remaining;
  END IF;

  -- Paused: keep remaining credits, only advance the reset window so freeze months
  -- do not dump stacked allotments when the user later unpauses.
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

  -- Annual: unused credits rollover, capped at 2× monthly limit.
  -- Monthly: unused credits expire (standard overwrite).
  IF v_period IN ('yearly', 'annual', 'annually') THEN
    v_new_balance := LEAST(v_remaining + v_limit, v_limit * 2);
  ELSE
    v_new_balance := v_limit;
  END IF;

  UPDATE public.profiles
  SET
    remaining_credits = v_new_balance,
    credits_balance = v_new_balance,
    credit_reset_date = now() + interval '1 month',
    updated_at = now()
  WHERE id = v_row.id;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_monthly_credits_if_due(uuid) TO anon, authenticated, service_role;
