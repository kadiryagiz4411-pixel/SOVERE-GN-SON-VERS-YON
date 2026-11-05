-- Recurring 30% affiliate payout ledger for partners and creators.
-- Partners earn on the first paid month and every subsequent subscription invoice.

CREATE TABLE IF NOT EXISTS public.affiliate_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  commission_pct integer NOT NULL DEFAULT 30 CHECK (commission_pct BETWEEN 1 AND 50),
  payout_mode text NOT NULL DEFAULT 'monthly_recurring',
  status text NOT NULL DEFAULT 'active',
  lemon_affiliate_id text,
  total_clicks integer NOT NULL DEFAULT 0,
  total_signups integer NOT NULL DEFAULT 0,
  total_paid_referrals integer NOT NULL DEFAULT 0,
  lifetime_commission_usd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  landing_path text,
  utm_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  referred_user_id uuid,
  ls_subscription_id text,
  ls_invoice_id text,
  source_event text NOT NULL,
  invoice_usd numeric(12,2) NOT NULL DEFAULT 0,
  commission_usd numeric(12,2) NOT NULL DEFAULT 0,
  commission_pct integer NOT NULL DEFAULT 30,
  period_start date,
  status text NOT NULL DEFAULT 'accrued',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ls_invoice_id, source_event)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_partners_code ON public.affiliate_partners (lower(code));
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code ON public.affiliate_clicks (lower(code), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_partner ON public.affiliate_commissions (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_lower ON public.profiles (lower(referred_by));

ALTER TABLE public.affiliate_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners read own row" ON public.affiliate_partners;
CREATE POLICY "Partners read own row"
  ON public.affiliate_partners FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Partners insert own row" ON public.affiliate_partners;
CREATE POLICY "Partners insert own row"
  ON public.affiliate_partners FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Partners update own row" ON public.affiliate_partners;
CREATE POLICY "Partners update own row"
  ON public.affiliate_partners FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Partners read own commissions" ON public.affiliate_commissions;
CREATE POLICY "Partners read own commissions"
  ON public.affiliate_commissions FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM public.affiliate_partners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages affiliate clicks" ON public.affiliate_clicks;
CREATE POLICY "Service role manages affiliate clicks"
  ON public.affiliate_clicks
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
