-- Restore reset_monthly_credits_if_due so frontend { user_id_input } works,
-- and match rows by profiles.user_id (auth id) OR profiles.id (PK).

DROP FUNCTION IF EXISTS public.reset_monthly_credits_if_due(uuid);

CREATE OR REPLACE FUNCTION public.reset_monthly_credits_if_due(user_id_input uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  UPDATE public.profiles
  SET
    remaining_credits = COALESCE(monthly_credit_limit, remaining_credits, 0),
    credit_reset_date = now() + interval '1 month',
    updated_at = now()
  WHERE (user_id = user_id_input OR id = user_id_input)
    AND credit_reset_date IS NOT NULL
    AND credit_reset_date <= now()
  RETURNING remaining_credits INTO v_remaining;

  IF v_remaining IS NOT NULL THEN
    RETURN v_remaining;
  END IF;

  SELECT remaining_credits
    INTO v_remaining
  FROM public.profiles
  WHERE user_id = user_id_input OR id = user_id_input
  LIMIT 1;

  RETURN COALESCE(v_remaining, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_monthly_credits_if_due(uuid) TO anon, authenticated, service_role;
