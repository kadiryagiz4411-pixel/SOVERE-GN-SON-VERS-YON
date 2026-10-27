-- =============================================================================
-- Fix: add missing trial + appsumo plan columns + B2B trial functions
-- =============================================================================
-- Root cause: 20260916_b2b_cardless_trial.sql was never applied to the live
-- Supabase instance.  Frontend queries selecting trial_ends_at, is_trial_active,
-- and has_used_trial caused 400 Bad Request errors because PostgREST validates
-- every named column in a select statement even when '*' is also present.
--
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- ── 1. Missing trial columns ──────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at     timestamptz,
  ADD COLUMN IF NOT EXISTS is_trial_active   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_used_trial    boolean NOT NULL DEFAULT false;

-- ── 2. appsumo_plan (text enum) + constraint ──────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS appsumo_plan text NOT NULL DEFAULT 'none';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_appsumo_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_appsumo_plan_check
  CHECK (appsumo_plan IN ('none', 'tier_1', 'tier_2', 'tier_3'));

-- ── 3. Backfill appsumo_plan + has_used_trial from existing data ──────────────

UPDATE public.profiles
SET
  appsumo_plan = CASE
    WHEN COALESCE(appsumo_tier, 0) >= 3 THEN 'tier_3'
    WHEN COALESCE(appsumo_tier, 0) >= 2 THEN 'tier_2'
    WHEN COALESCE(appsumo_tier, 0) >= 1 THEN 'tier_1'
    ELSE COALESCE(appsumo_plan, 'none')
  END,
  has_used_trial = COALESCE(has_used_trial, false) OR COALESCE(trial_claimed, false)
WHERE true;

-- ── 4. Trigger: keep appsumo_plan in sync with appsumo_tier ──────────────────

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

-- ── 5. expire_stale_b2b_trials ────────────────────────────────────────────────

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
      WHEN b2b_subscription_status = 'active'   THEN 'active'
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

-- ── 6. start_b2b_cardless_trial ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_b2b_cardless_trial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid  uuid := auth.uid();
  rec  public.profiles%ROWTYPE;
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
    trial_started_at       = now(),
    trial_ends_at          = ends,
    is_trial_active        = true,
    has_used_trial         = true,
    trial_claimed          = true,
    b2b_subscription_status = 'trialing',
    updated_at             = now()
  WHERE id = rec.id;

  RETURN jsonb_build_object(
    'ok',                true,
    'trial_started_at',  now(),
    'trial_ends_at',     ends,
    'b2b_subscription_status', 'trialing'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_b2b_cardless_trial()  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.start_b2b_cardless_trial()  TO authenticated;

REVOKE ALL ON FUNCTION public.expire_stale_b2b_trials() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.expire_stale_b2b_trials() TO authenticated, service_role;
