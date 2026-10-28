-- One free proposal and one free CV for every account.
-- Existing rows pick up DEFAULT 1. New signups set the same values explicitly.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_proposals_left integer NOT NULL DEFAULT 1;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_cvs_left integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE v_ref TEXT;
BEGIN
  v_ref := new.raw_user_meta_data ->> 'referred_by';
  INSERT INTO public.profiles (
    user_id,
    full_name,
    credits_balance,
    free_credits_granted,
    plan_type,
    referred_by,
    free_proposals_left,
    free_cvs_left
  )
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    100,
    TRUE,
    'FREE',
    v_ref,
    1,
    1
  );
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, transaction_type, reference_type, description
  )
  VALUES (
    new.id, 100, 100, 'signup_bonus', 'system', 'Welcome bonus – 100 credits'
  );
  IF v_ref IS NOT NULL THEN
    UPDATE public.affiliate_codes
    SET total_referrals = total_referrals + 1
    WHERE code = UPPER(v_ref) AND is_active = TRUE;
  END IF;
  RETURN new;
END;
$fn$;

-- Caller can only spend their own free allowance. Never increments.
CREATE OR REPLACE FUNCTION public.consume_free_allowance(p_kind text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_left integer;
BEGIN
  IF v_uid IS NULL OR p_kind NOT IN ('proposal', 'cv') THEN
    RETURN NULL;
  END IF;

  IF p_kind = 'proposal' THEN
    UPDATE public.profiles
       SET free_proposals_left = free_proposals_left - 1
     WHERE ctid = (
       SELECT ctid FROM public.profiles
       WHERE (user_id = v_uid OR id = v_uid) AND free_proposals_left > 0
       LIMIT 1
     )
    RETURNING free_proposals_left INTO v_left;
  ELSE
    UPDATE public.profiles
       SET free_cvs_left = free_cvs_left - 1
     WHERE ctid = (
       SELECT ctid FROM public.profiles
       WHERE (user_id = v_uid OR id = v_uid) AND free_cvs_left > 0
       LIMIT 1
     )
    RETURNING free_cvs_left INTO v_left;
  END IF;

  RETURN v_left;
END;
$fn$;

-- Service-role path used by edge functions after a successful generation.
CREATE OR REPLACE FUNCTION public.consume_free_allowance_for_user(p_user_id uuid, p_kind text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_left integer;
BEGIN
  IF p_user_id IS NULL OR p_kind NOT IN ('proposal', 'cv') THEN
    RETURN NULL;
  END IF;

  IF p_kind = 'proposal' THEN
    UPDATE public.profiles
       SET free_proposals_left = free_proposals_left - 1
     WHERE ctid = (
       SELECT ctid FROM public.profiles
       WHERE (user_id = p_user_id OR id = p_user_id) AND free_proposals_left > 0
       LIMIT 1
     )
    RETURNING free_proposals_left INTO v_left;
  ELSE
    UPDATE public.profiles
       SET free_cvs_left = free_cvs_left - 1
     WHERE ctid = (
       SELECT ctid FROM public.profiles
       WHERE (user_id = p_user_id OR id = p_user_id) AND free_cvs_left > 0
       LIMIT 1
     )
    RETURNING free_cvs_left INTO v_left;
  END IF;

  RETURN v_left;
END;
$fn$;

REVOKE ALL ON FUNCTION public.consume_free_allowance(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_free_allowance(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_free_allowance(text) TO authenticated;

REVOKE ALL ON FUNCTION public.consume_free_allowance_for_user(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_free_allowance_for_user(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.consume_free_allowance_for_user(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_free_allowance_for_user(uuid, text) TO service_role;
