-- =============================================================================
-- Safety Migration: bulletproof profiles bootstrap + on_auth_user_created guard
-- =============================================================================
-- Idempotent: safe to run multiple times on any environment.

-- ── 1. Ensure core columns exist ──────────────────────────────────────────────

-- credits_balance may already exist; add only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'credits_balance'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN credits_balance INTEGER NOT NULL DEFAULT 100;
  END IF;
END $$;

-- appsumo_tier may already exist; add only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'appsumo_tier'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN appsumo_tier INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- plan_type may already exist; add only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'FREE';
  END IF;
END $$;

-- ── 2. Bulletproof handle_new_user — ON CONFLICT DO NOTHING ──────────────────
-- Replaces any prior version.  Uses ON CONFLICT (user_id) DO NOTHING so that
-- duplicate INSERT events (e.g. from retried webhooks) never crash.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref  TEXT;
  v_name TEXT;
BEGIN
  v_ref  := new.raw_user_meta_data ->> 'referred_by';
  v_name := COALESCE(
              new.raw_user_meta_data ->> 'full_name',
              new.raw_user_meta_data ->> 'name',
              split_part(new.email, '@', 1)
            );

  -- Create profile row — silently skip if one already exists (idempotent).
  INSERT INTO public.profiles (
    user_id,
    full_name,
    credits_balance,
    free_credits_granted,
    plan_type,
    appsumo_tier,
    referred_by
  )
  VALUES (
    new.id,
    v_name,
    100,
    TRUE,
    'FREE',
    0,
    v_ref
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Welcome credit transaction — only insert if profile row was just created.
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, transaction_type, reference_type, description
  )
  SELECT
    new.id, 100, 100, 'signup_bonus', 'system', 'Welcome bonus – 100 credits'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = new.id AND transaction_type = 'signup_bonus'
  );

  -- Increment referral count on affiliate code if present.
  IF v_ref IS NOT NULL THEN
    UPDATE public.profiles
    SET referral_count = COALESCE(referral_count, 0) + 1
    WHERE referral_code = v_ref;
  END IF;

  RETURN new;
END;
$$;

-- ── 3. Ensure the trigger exists (CREATE OR REPLACE not available for triggers)

-- Drop and recreate idempotently
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
