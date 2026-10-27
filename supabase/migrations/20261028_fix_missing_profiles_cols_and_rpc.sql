-- =============================================================================
-- Fix: missing profiles columns + recompile broken RPC functions
-- =============================================================================
-- Root causes:
--   1. appsumo_codes_count never added → is_appsumo_lifetime_profile accesses
--      a non-existent field → reset_monthly_credits_if_due crashes at runtime.
--   2. Several columns from 20260901 and 20260916 migrations were never applied
--      to the live Supabase project (subscription_paused_*, ls_customer_id,
--      b2b_subscription_status).
--   3. reset_monthly_credits_if_due compiled against an older profiles schema;
--      DROP+CREATE forces a fresh compile against the current table definition.
--
-- Idempotent: safe to run multiple times (ADD COLUMN IF NOT EXISTS, DO/IF blocks).
-- =============================================================================

-- ── 1. Columns from 20260901 that are missing on the live instance ────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_paused_at    timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_pause_until  timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_pause_reason text,
  ADD COLUMN IF NOT EXISTS ls_customer_id            text;

-- Ensure subscription_status constraint exists (column is present, constraint may not be)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_subscription_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_status_check
      CHECK (subscription_status IN ('active', 'paused', 'canceled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
  ON public.profiles (subscription_status);

-- ── 2. Columns from 20260916 that are missing ─────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS b2b_subscription_status text NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_b2b_subscription_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_b2b_subscription_status_check
      CHECK (b2b_subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled'));
  END IF;
END $$;

-- ── 3. appsumo_codes_count — referenced by is_appsumo_lifetime_profile ─────────
-- This column was never added to the live table, causing the function to crash
-- whenever it is called with a profiles row (field access at runtime).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS appsumo_codes_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_appsumo_codes_count
  ON public.profiles (appsumo_codes_count)
  WHERE appsumo_codes_count > 0;

-- ── 4. Recompile is_appsumo_lifetime_profile against the updated schema ────────
-- CREATE OR REPLACE forces a fresh parse of the function body, resolving all
-- composite-type field references against the current profiles table definition.

CREATE OR REPLACE FUNCTION public.is_appsumo_lifetime_profile(p_row profiles)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF COALESCE(p_row.appsumo_tier, 0) >= 1 THEN RETURN true; END IF;
  IF COALESCE(p_row.appsumo_codes_count, 0) >= 1 THEN RETURN true; END IF;
  IF lower(COALESCE(p_row.appsumo_plan, '')) ~ '(tier_?[123]|appsumo)' THEN RETURN true; END IF;
  IF lower(COALESCE(p_row.subscription_tier, '')) LIKE 'appsumo%' THEN RETURN true; END IF;
  IF lower(COALESCE(p_row.plan_type, '')) LIKE 'appsumo%' THEN RETURN true; END IF;
  RETURN false;
END;
$$;

-- ── 5. Recompile reset_monthly_credits_if_due ─────────────────────────────────
-- DROP + CREATE forces PostgreSQL to re-parse the function body against the now-
-- complete profiles schema.  The logic is unchanged from the version in
-- 20260901_subscription_pause_annual_rollover.sql; we just add credits_remaining
-- to the UPDATE so all credit columns stay in sync.

DROP FUNCTION IF EXISTS public.reset_monthly_credits_if_due(uuid);

CREATE OR REPLACE FUNCTION public.reset_monthly_credits_if_due(user_id_input uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row         public.profiles%ROWTYPE;
  v_limit       integer;
  v_remaining   integer;
  v_new_balance integer;
  v_period      text;
  v_status      text;
  v_appsumo     boolean;
BEGIN
  SELECT * INTO v_row
  FROM public.profiles
  WHERE user_id = user_id_input OR id = user_id_input
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_remaining := COALESCE(v_row.remaining_credits, v_row.credits_balance, 0);
  v_limit     := COALESCE(v_row.monthly_credit_limit, 0);
  v_period    := COALESCE(v_row.billing_period, 'monthly');
  v_status    := COALESCE(v_row.subscription_status, 'active');
  v_appsumo   := public.is_appsumo_lifetime_profile(v_row);

  -- ── AppSumo lifetime accounts ─────────────────────────────────────────────
  -- Always reset to plan quota; SaaS pause/cancel status never applies.
  -- AppSumo accounts must never be hard-locked by SaaS subscription checks.
  IF v_appsumo THEN
    IF v_limit <= 0 THEN
      v_limit := public.appsumo_monthly_quota(v_row.appsumo_tier, v_row.appsumo_plan);
    END IF;
    IF v_row.credit_reset_date IS NULL OR v_row.credit_reset_date > now() THEN
      RETURN v_remaining;
    END IF;
    UPDATE public.profiles
    SET
      remaining_credits    = v_limit,
      credits_remaining    = v_limit,
      credits_balance      = v_limit,
      monthly_credit_limit = v_limit,
      credit_reset_date    = now() + interval '1 month',
      updated_at           = now()
    WHERE id = v_row.id;
    RETURN v_limit;
  END IF;

  -- ── SaaS subscriptions ────────────────────────────────────────────────────
  IF v_row.credit_reset_date IS NULL OR v_row.credit_reset_date > now() THEN
    RETURN v_remaining;
  END IF;

  -- Paused: advance the reset window but keep credits frozen.
  IF v_status = 'paused' THEN
    UPDATE public.profiles
    SET credit_reset_date = now() + interval '1 month', updated_at = now()
    WHERE id = v_row.id;
    RETURN v_remaining;
  END IF;

  IF v_limit <= 0 THEN
    UPDATE public.profiles
    SET credit_reset_date = now() + interval '1 month', updated_at = now()
    WHERE id = v_row.id;
    RETURN v_remaining;
  END IF;

  -- Annual: unused credits roll over, capped at 2x monthly limit.
  -- Monthly: reset to full limit (standard behaviour).
  IF v_period IN ('yearly', 'annual', 'annually') THEN
    v_new_balance := LEAST(v_remaining + v_limit, v_limit * 2);
  ELSE
    v_new_balance := v_limit;
  END IF;

  UPDATE public.profiles
  SET
    remaining_credits = v_new_balance,
    credits_remaining = v_new_balance,
    credits_balance   = v_new_balance,
    credit_reset_date = now() + interval '1 month',
    updated_at        = now()
  WHERE id = v_row.id;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_monthly_credits_if_due(uuid) TO anon, authenticated, service_role;
