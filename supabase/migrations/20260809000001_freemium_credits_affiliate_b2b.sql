-- =====================================================================
-- Migration: Freemium Credits, Affiliate Tracking & B2B License Schema
-- =====================================================================

-- ── Task 3: User Model Extensions ────────────────────────────────────

-- Add plan_type enum (text-based for flexibility) to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'FREE'
    CHECK (plan_type IN ('FREE', 'PRO_MONTHLY', 'B2B_ENTERPRISE'));

-- credits column already exists as credits_balance; ensure default is 0
ALTER TABLE public.profiles
  ALTER COLUMN credits_balance SET DEFAULT 0;

-- ── Task 4: Affiliate Tracking ────────────────────────────────────────

-- Track which referral code brought this user
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL;

-- Affiliate codes registry (optional — for server-side validation)
CREATE TABLE IF NOT EXISTS public.affiliate_codes (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  owner_email TEXT NOT NULL,
  owner_name  TEXT DEFAULT '',
  commission_pct INTEGER NOT NULL DEFAULT 50,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_revenue_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;

-- Only admins / service role can read affiliate codes
CREATE POLICY "Service role can manage affiliate_codes"
  ON public.affiliate_codes
  USING (auth.role() = 'service_role');

CREATE TRIGGER update_affiliate_codes_updated_at
  BEFORE UPDATE ON public.affiliate_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Task 5: B2B / Corporate License ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  license_key   TEXT NOT NULL UNIQUE,
  owner_email   TEXT NOT NULL,
  max_seats     INTEGER NOT NULL DEFAULT 10,
  used_seats    INTEGER NOT NULL DEFAULT 0,
  plan_type     TEXT NOT NULL DEFAULT 'B2B_ENTERPRISE',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at    TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Only service role manages orgs; users can read their own org via profiles join
CREATE POLICY "Service role manages organizations"
  ON public.organizations
  USING (auth.role() = 'service_role');

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link users to their organization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles (org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles (referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type ON public.profiles (plan_type);

-- ── Org License Redemption RPC ────────────────────────────────────────

-- Allows a user to redeem an org license key.
-- Returns: 'ok', 'invalid_key', 'expired', 'no_seats', or 'already_member'
CREATE OR REPLACE FUNCTION public.redeem_org_license(
  _user_id  UUID,
  _key      TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org       public.organizations%ROWTYPE;
  v_profile   public.profiles%ROWTYPE;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN 'invalid_key'; END IF;

  -- Already in an org
  IF v_profile.org_id IS NOT NULL THEN RETURN 'already_member'; END IF;

  -- Find org
  SELECT * INTO v_org FROM public.organizations WHERE license_key = _key AND is_active = TRUE;
  IF NOT FOUND THEN RETURN 'invalid_key'; END IF;

  -- Check expiry
  IF v_org.expires_at IS NOT NULL AND v_org.expires_at < now() THEN RETURN 'expired'; END IF;

  -- Check seats
  IF v_org.used_seats >= v_org.max_seats THEN RETURN 'no_seats'; END IF;

  -- Assign user to org
  UPDATE public.profiles
    SET org_id = v_org.id,
        plan_type = 'B2B_ENTERPRISE',
        subscription_plan = 'elite'
    WHERE user_id = _user_id;

  -- Increment seat count
  UPDATE public.organizations SET used_seats = used_seats + 1 WHERE id = v_org.id;

  RETURN 'ok';
END;
$$;

-- ── Update handle_new_user to capture referred_by from metadata ───────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref TEXT;
BEGIN
  -- Extract optional referral code passed as user metadata
  v_ref := new.raw_user_meta_data ->> 'referred_by';

  INSERT INTO public.profiles (
    user_id,
    full_name,
    credits_balance,
    free_credits_granted,
    plan_type,
    referred_by
  )
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    100,
    TRUE,
    'FREE',
    v_ref
  );

  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, transaction_type, reference_type, description
  )
  VALUES (
    new.id, 100, 100, 'signup_bonus', 'system', 'Welcome bonus – 100 credits'
  );

  -- Increment referral count on affiliate code if present
  IF v_ref IS NOT NULL THEN
    UPDATE public.affiliate_codes
      SET total_referrals = total_referrals + 1
      WHERE code = UPPER(v_ref) AND is_active = TRUE;
  END IF;

  RETURN new;
END;
$$;

-- ── Credit consumption helper (called by optimize-cv edge function) ───

CREATE OR REPLACE FUNCTION public.consume_credit(
  _user_id UUID,
  _amount  INTEGER DEFAULT 1,
  _reason  TEXT    DEFAULT 'cv_optimization'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT credits_balance INTO v_balance FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < _amount THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
    SET credits_balance = credits_balance - _amount
    WHERE user_id = _user_id;

  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, transaction_type, reference_type, description
  )
  VALUES (
    _user_id,
    -_amount,
    v_balance - _amount,
    'debit',
    'feature',
    _reason
  );

  RETURN TRUE;
END;
$$;
