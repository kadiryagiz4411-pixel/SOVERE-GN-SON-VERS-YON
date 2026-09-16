-- 14-day cardless B2B Enterprise trial + AppSumo upsell state.
-- Keep integer profiles.appsumo_tier (stacking engine). appsumo_plan is the
-- UI enum: none | tier_1 | tier_2 | tier_3.

DO $$ BEGIN
  CREATE TYPE public.b2b_subscription_status AS ENUM (
    'none', 'trialing', 'active', 'past_due', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.appsumo_plan_enum AS ENUM (
    'none', 'tier_1', 'tier_2', 'tier_3'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_trial_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS b2b_subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS appsumo_plan text NOT NULL DEFAULT 'none';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_b2b_subscription_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_b2b_subscription_status_check
  CHECK (b2b_subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_appsumo_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_appsumo_plan_check
  CHECK (appsumo_plan IN ('none', 'tier_1', 'tier_2', 'tier_3'));

-- Backfill from existing integer AppSumo stacking + claimed trials.
UPDATE public.profiles
SET
  appsumo_plan = CASE
    WHEN COALESCE(appsumo_tier, 0) >= 3 THEN 'tier_3'
    WHEN COALESCE(appsumo_tier, 0) >= 2 THEN 'tier_2'
    WHEN COALESCE(appsumo_tier, 0) >= 1 THEN 'tier_1'
    ELSE 'none'
  END,
  has_used_trial = COALESCE(has_used_trial, false) OR COALESCE(trial_claimed, false)
WHERE true;

CREATE OR REPLACE FUNCTION public.sync_appsumo_plan_from_tier()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.appsumo_plan := CASE
    WHEN COALESCE(NEW.appsumo_tier, 0) >= 3 THEN 'tier_3'
    WHEN COALESCE(NEW.appsumo_tier, 0) >= 2 THEN 'tier_2'
    WHEN COALESCE(NEW.appsumo_tier, 0) >= 1 THEN 'tier_1'
    ELSE COALESCE(NEW.appsumo_plan, 'none')
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_appsumo_plan ON public.profiles;
CREATE TRIGGER trg_sync_appsumo_plan
  BEFORE INSERT OR UPDATE OF appsumo_tier ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appsumo_plan_from_tier();

CREATE OR REPLACE FUNCTION public.expire_stale_b2b_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_trial_active = false,
    b2b_subscription_status = CASE
      WHEN b2b_subscription_status = 'active' THEN 'active'
      WHEN b2b_subscription_status = 'past_due' THEN 'past_due'
      ELSE 'canceled'
    END,
    updated_at = now()
  WHERE is_trial_active = true
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now()
    AND COALESCE(b2b_subscription_status, 'none') <> 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.start_b2b_cardless_trial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.profiles%ROWTYPE;
  ends timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO rec
  FROM public.profiles
  WHERE user_id = uid OR id = uid
  LIMIT 1;

  IF rec.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  IF COALESCE(rec.b2b_subscription_status, 'none') = 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_active');
  END IF;

  IF COALESCE(rec.has_used_trial, false) OR COALESCE(rec.trial_claimed, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'trial_already_used');
  END IF;

  ends := now() + interval '14 days';

  UPDATE public.profiles
  SET
    trial_started_at = now(),
    trial_ends_at = ends,
    is_trial_active = true,
    has_used_trial = true,
    trial_claimed = true,
    b2b_subscription_status = 'trialing',
    updated_at = now()
  WHERE id = rec.id;

  RETURN jsonb_build_object(
    'ok', true,
    'trial_started_at', now(),
    'trial_ends_at', ends,
    'b2b_subscription_status', 'trialing'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_b2b_cardless_trial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_b2b_cardless_trial() TO authenticated;

REVOKE ALL ON FUNCTION public.expire_stale_b2b_trials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_b2b_trials() TO authenticated, service_role;
