-- Single Pass ($1.99) credits, Polar/LS webhook idempotency, guest-email bind.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS single_pass_credits integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS polar_customer_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS polar_subscription_id text;

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  user_id uuid,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS public.pending_pass_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  event_id text NOT NULL,
  provider text NOT NULL,
  credits integer NOT NULL DEFAULT 1,
  claimed_at timestamptz,
  claimed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS pending_pass_grants_email_idx
  ON public.pending_pass_grants (lower(email))
  WHERE claimed_at IS NULL;

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_pass_grants ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.billing_events TO service_role;
GRANT INSERT ON public.billing_events TO service_role;
GRANT SELECT ON public.pending_pass_grants TO service_role;
GRANT INSERT ON public.pending_pass_grants TO service_role;
GRANT UPDATE ON public.pending_pass_grants TO service_role;

CREATE OR REPLACE FUNCTION public.grant_single_pass(
  user_id_input uuid,
  provider_input text,
  event_id_input text,
  email_input text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer := 0;
BEGIN
  IF user_id_input IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(single_pass_credits, 0) INTO v_credits
  FROM public.profiles
  WHERE user_id = user_id_input OR id = user_id_input
  LIMIT 1
  FOR UPDATE;

  UPDATE public.profiles
  SET
    single_pass_credits = COALESCE(single_pass_credits, 0) + 1,
    plan_type = CASE
      WHEN COALESCE(plan_type, 'free') IN ('free', '', 'none', 'trial') THEN 'single_pass'
      ELSE plan_type
    END,
    subscription_plan = CASE
      WHEN COALESCE(subscription_plan, 'free') IN ('free', '', 'none', 'trial') THEN 'single_pass'
      ELSE subscription_plan
    END,
    subscription_status = COALESCE(NULLIF(subscription_status, ''), 'active'),
    updated_at = now()
  WHERE user_id = user_id_input OR id = user_id_input
  RETURNING single_pass_credits INTO v_credits;

  RETURN COALESCE(v_credits, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_pending_pass_grants(
  user_id_input uuid,
  email_input text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  claimed integer := 0;
  email_norm text;
BEGIN
  IF user_id_input IS NULL THEN
    RETURN 0;
  END IF;

  email_norm := lower(COALESCE(email_input, ''));
  IF email_norm = '' THEN
    SELECT lower(u.email) INTO email_norm
    FROM auth.users u
    WHERE u.id = user_id_input;
  END IF;
  IF email_norm IS NULL OR email_norm = '' THEN
    RETURN 0;
  END IF;

  FOR rec IN
    SELECT id, event_id, provider, credits
    FROM public.pending_pass_grants
    WHERE lower(email) = email_norm AND claimed_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.grant_single_pass(user_id_input, rec.provider, rec.event_id, email_norm);
    UPDATE public.pending_pass_grants
    SET claimed_at = now(), claimed_by = user_id_input
    WHERE id = rec.id;
    claimed := claimed + COALESCE(rec.credits, 1);
  END LOOP;

  UPDATE public.pending_upgrades
  SET processed = true, processed_at = now()
  WHERE lower(email) = email_norm
    AND processed = false
    AND plan = 'single_pass';

  RETURN claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_monthly_credit(
  user_id_input uuid,
  amount_input integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer := 0;
  v_pass integer := 0;
BEGIN
  PERFORM public.reset_monthly_credits_if_due(user_id_input);

  SELECT COALESCE(remaining_credits, 0), COALESCE(single_pass_credits, 0)
  INTO v_remaining, v_pass
  FROM public.profiles
  WHERE user_id = user_id_input OR id = user_id_input
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_remaining >= amount_input THEN
    UPDATE public.profiles
    SET remaining_credits = remaining_credits - amount_input,
        updated_at = now()
    WHERE user_id = user_id_input OR id = user_id_input;
    RETURN TRUE;
  END IF;

  IF v_pass >= 1 THEN
    UPDATE public.profiles
    SET single_pass_credits = GREATEST(COALESCE(single_pass_credits, 0) - 1, 0),
        updated_at = now()
    WHERE user_id = user_id_input OR id = user_id_input;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_pending_upgrades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pending_record RECORD;
BEGIN
  SELECT * INTO pending_record
  FROM public.pending_upgrades
  WHERE email = LOWER(NEW.email) AND processed = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles
      SET subscription_plan = pending_record.plan,
          plan_type = pending_record.plan,
          updated_at = now()
      WHERE user_id = NEW.id OR id = NEW.id;
    UPDATE public.pending_upgrades
      SET processed = true, processed_at = now()
      WHERE id = pending_record.id;
  END IF;

  PERFORM public.claim_pending_pass_grants(NEW.id, NEW.email);
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.grant_single_pass(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_pending_pass_grants(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deduct_monthly_credit(uuid, integer) TO authenticated, service_role;
