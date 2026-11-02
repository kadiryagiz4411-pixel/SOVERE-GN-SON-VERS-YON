-- Award 50 credits once, when five different people sign up with a profile referral code.
-- Runs inside the signup insert. AppSumo and SaaS balances are not locked by this trigger.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_reward_at timestamptz;

UPDATE public.profiles AS p
SET referral_code = lower(substr(md5(p.user_id::text), 1, 8))
WHERE p.user_id IS NOT NULL
  AND (p.referral_code IS NULL OR btrim(p.referral_code) = '')
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles AS other
    WHERE lower(other.referral_code) = lower(substr(md5(p.user_id::text), 1, 8))
      AND other.user_id IS DISTINCT FROM p.user_id
  );

CREATE OR REPLACE FUNCTION public.reward_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := lower(btrim(coalesce(NEW.referred_by, '')));
  v_referrer uuid;
  v_rewarded timestamptz;
  v_count integer;
BEGIN
  IF v_code = '' OR length(v_code) < 4 OR length(v_code) > 32 OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id, referral_reward_at
    INTO v_referrer, v_rewarded
  FROM public.profiles
  WHERE lower(referral_code) = v_code
    AND user_id IS DISTINCT FROM NEW.user_id
  LIMIT 1;

  IF v_referrer IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.referrals (referrer_user_id, referred_user_id, credits_awarded)
  VALUES (v_referrer, NEW.user_id, 0)
  ON CONFLICT (referred_user_id) DO NOTHING;

  SELECT count(*)::integer INTO v_count
  FROM public.referrals
  WHERE referrer_user_id = v_referrer;

  IF v_count >= 5 AND v_rewarded IS NULL THEN
    UPDATE public.profiles
    SET bonus_credits = coalesce(bonus_credits, 0) + 50,
        credits_remaining = coalesce(credits_remaining, 0) + 50,
        remaining_credits = coalesce(remaining_credits, 0) + 50,
        referral_reward_at = now()
    WHERE user_id = v_referrer
      AND referral_reward_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reward_referral_signup ON public.profiles;
CREATE TRIGGER reward_referral_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_referral_signup();

REVOKE ALL ON FUNCTION public.reward_referral_signup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reward_referral_signup() FROM anon, authenticated;
