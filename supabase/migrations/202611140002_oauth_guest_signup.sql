-- Idempotent profile init for Google / LinkedIn OAuth signups.
-- handle_new_user must not fail when a parallel user-sync already inserted the profile.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_provider text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_ref TEXT;
  v_name TEXT;
  v_provider TEXT;
BEGIN
  v_ref := new.raw_user_meta_data ->> 'referred_by';
  v_name := COALESCE(
    NULLIF(new.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(new.raw_user_meta_data ->> 'name', ''),
    NULLIF(new.raw_user_meta_data ->> 'given_name', ''),
    split_part(COALESCE(new.email, ''), '@', 1)
  );
  v_provider := COALESCE(new.raw_app_meta_data ->> 'provider', 'email');

  INSERT INTO public.profiles (
    user_id,
    full_name,
    credits_balance,
    free_credits_granted,
    plan_type,
    referred_by,
    free_proposals_left,
    free_cvs_left,
    auth_provider
  )
  VALUES (
    new.id,
    v_name,
    100,
    TRUE,
    'FREE',
    v_ref,
    1,
    1,
    v_provider
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
    FROM public.credit_transactions
    WHERE user_id = new.id
      AND transaction_type = 'signup_bonus'
  ) THEN
    INSERT INTO public.credit_transactions (
      user_id, amount, balance_after, transaction_type, reference_type, description
    )
    VALUES (
      new.id, 100, 100, 'signup_bonus', 'system', 'Welcome bonus – 100 credits'
    );
  END IF;

  IF v_ref IS NOT NULL THEN
    UPDATE public.affiliate_codes
    SET total_referrals = total_referrals + 1
    WHERE code = UPPER(v_ref) AND is_active = TRUE;
  END IF;

  BEGIN
    PERFORM public.claim_pending_pass_grants(new.id, new.email);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN new;
END;
$fn$;
