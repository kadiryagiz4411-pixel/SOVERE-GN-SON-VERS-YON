-- =============================================================================
-- SOVEREIGN — Full Database Schema (Combined Migrations)
-- Apply this once to a fresh Supabase project via:
--   Dashboard → SQL Editor → paste & run
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Extensions (must be first)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Shared helper: update_updated_at_column
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. app_role enum + user_roles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                      UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name               TEXT,
  skills                  TEXT[],
  experience              TEXT,
  hourly_rate             NUMERIC(10,2),
  bio                     TEXT,
  -- plan
  subscription_plan       TEXT NOT NULL DEFAULT 'basic',
  plan_type               TEXT NOT NULL DEFAULT 'FREE'
    CHECK (plan_type IN ('FREE','PRO_MONTHLY','B2B_ENTERPRISE','standard','pro','elite','single_pass','free','B2B_ENTERPRISE')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  subscription_cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  billing_period          TEXT DEFAULT NULL,
  ls_subscription_id      TEXT DEFAULT NULL,
  -- daily usage
  daily_proposals_used    INTEGER NOT NULL DEFAULT 0,
  last_usage_reset        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- credits
  credits_balance         INTEGER NOT NULL DEFAULT 0,
  free_credits_granted    BOOLEAN NOT NULL DEFAULT false,
  bonus_credits           INTEGER NOT NULL DEFAULT 0,
  -- trial
  trial_started_at        TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  trial_claimed           BOOLEAN DEFAULT false,
  -- referral
  referral_code           TEXT UNIQUE,
  referred_by             TEXT DEFAULT NULL,
  -- onboarding
  onboarding_role         TEXT,
  onboarding_experience   TEXT,
  onboarding_goal         TEXT,
  onboarding_volume       TEXT,
  onboarding_completed    BOOLEAN DEFAULT false,
  career_roadmap          JSONB,
  -- segmentation
  user_segment            TEXT DEFAULT 'corporate',
  platform_type           TEXT DEFAULT NULL,
  profession_cluster      TEXT DEFAULT NULL,
  -- portfolio
  portfolio_projects      JSONB DEFAULT '[]'::jsonb,
  -- B2B / org
  org_id                  UUID DEFAULT NULL,  -- FK added after organizations table
  org_role                TEXT NOT NULL DEFAULT 'user'
    CHECK (org_role IN ('user', 'org_admin', 'super_admin')),
  -- timestamps
  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Auto-generate referral code before insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := LOWER(SUBSTRING(MD5(NEW.user_id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Reset daily usage
CREATE OR REPLACE FUNCTION public.reset_daily_usage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.last_usage_reset::date < CURRENT_DATE THEN
    NEW.daily_proposals_used := 0;
    NEW.last_usage_reset := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reset_usage_on_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reset_daily_usage();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_org_id      ON public.profiles (org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles (referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type   ON public.profiles (plan_type);
CREATE INDEX IF NOT EXISTS idx_profiles_org_role    ON public.profiles (org_role);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Proposals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.proposals (
  id                 UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_description    TEXT NOT NULL,
  generated_proposal TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'draft',
  share_token        TEXT UNIQUE,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proposals_share_token ON public.proposals(share_token)
  WHERE share_token IS NOT NULL;

CREATE POLICY "Users can view their own proposals"
  ON public.proposals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own proposals"
  ON public.proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own proposals"
  ON public.proposals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own proposals"
  ON public.proposals FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view shared proposals by token"
  ON public.proposals FOR SELECT TO anon, authenticated
  USING (share_token IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Reviews
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.reviews (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  role        TEXT,
  company     TEXT,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content     TEXT NOT NULL,
  avatar_url  TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can view their own reviews" ON public.reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.reviews (name, role, company, rating, content, is_approved) VALUES
  ('Ahmet Yılmaz',  'Freelance Developer', 'Bağımsız',  5, 'Sovereign sayesinde iş başvurularımda kabul oranım %40 arttı.', true),
  ('Sarah Johnson',  'UX Designer',         'DesignCo',  5, 'Game changer! I get acceptance probability scores and know exactly where to focus.', true),
  ('Mehmet Kaya',    'Full Stack Developer', 'TechStart', 4, 'Şirkete özel optimizasyon özelliği muhteşem.', true),
  ('Emily Chen',     'Product Manager',      'StartupXYZ',5, 'The strategic insights helped me understand why my applications were failing. 3x higher response rate!', true),
  ('Zeynep Demir',   'Mobile Developer',     'AppWorks',  5, 'Elite plan ile gelen strateji özellikleri harika.', true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Trial claims
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.trial_claims (
  id         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trial claims" ON public.trial_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trial claim" ON public.trial_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_trial_claims_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM public.trial_claims;
$$;

CREATE OR REPLACE FUNCTION public.can_claim_trial(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.trial_claims WHERE user_id = _user_id
  ) AND (SELECT COUNT(*) FROM public.trial_claims) < 100;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Pending upgrades
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.pending_upgrades (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  plan         TEXT NOT NULL CHECK (plan IN ('single_pass','standard','pro','elite','B2B_ENTERPRISE')),
  sale_id      TEXT,
  payment_data JSONB,
  processed    BOOLEAN DEFAULT false,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_pending_upgrades_email     ON public.pending_upgrades(email);
CREATE INDEX idx_pending_upgrades_processed ON public.pending_upgrades(processed);

ALTER TABLE public.pending_upgrades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view pending_upgrades"    ON public.pending_upgrades FOR SELECT  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can insert pending_upgrades"  ON public.pending_upgrades FOR INSERT  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update pending_upgrades"  ON public.pending_upgrades FOR UPDATE  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete pending_upgrades"  ON public.pending_upgrades FOR DELETE  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Check & apply pending upgrades when a new user registers
CREATE OR REPLACE FUNCTION public.check_pending_upgrades()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  pending_record RECORD;
BEGIN
  SELECT * INTO pending_record
  FROM public.pending_upgrades
  WHERE email = LOWER(NEW.email) AND processed = false
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles
      SET subscription_plan = pending_record.plan, plan_type = pending_record.plan, updated_at = now()
      WHERE user_id = NEW.id;
    UPDATE public.pending_upgrades
      SET processed = true, processed_at = now()
      WHERE id = pending_record.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created_check_upgrades
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_pending_upgrades();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Leads
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.leads (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'acceptance_score_page',
  tag          TEXT NOT NULL DEFAULT 'lead_only',
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at    TIMESTAMP WITH TIME ZONE,
  sync_failed  BOOLEAN DEFAULT false,
  sync_error   TEXT
);

CREATE UNIQUE INDEX idx_leads_email ON public.leads (email);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert leads"    ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view all leads"  ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update leads"    ON public.leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete leads"    ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Referrals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id                      uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id        uuid NOT NULL,
  referred_user_id        uuid NOT NULL,
  credits_awarded         integer NOT NULL DEFAULT 10,
  referred_subscribed     boolean NOT NULL DEFAULT false,
  referred_subscribed_at  timestamptz,
  created_at              timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_user_id);
CREATE POLICY "Users can insert referrals"         ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Affiliate codes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_codes (
  id                 UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code               TEXT NOT NULL UNIQUE,
  owner_email        TEXT NOT NULL,
  owner_name         TEXT DEFAULT '',
  commission_pct     INTEGER NOT NULL DEFAULT 50,
  total_referrals    INTEGER NOT NULL DEFAULT 0,
  total_revenue_usd  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage affiliate_codes" ON public.affiliate_codes USING (auth.role() = 'service_role');
CREATE TRIGGER update_affiliate_codes_updated_at BEFORE UPDATE ON public.affiliate_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Organizations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id                       UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name                     TEXT NOT NULL,
  license_key              TEXT NOT NULL UNIQUE,
  owner_email              TEXT NOT NULL,
  max_seats                INTEGER NOT NULL DEFAULT 10,
  used_seats               INTEGER NOT NULL DEFAULT 0,
  plan_type                TEXT NOT NULL DEFAULT 'B2B_ENTERPRISE',
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at               TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  notes                    TEXT DEFAULT '',
  -- HR branding
  logo_url                 TEXT DEFAULT NULL,
  default_cv_template      TEXT NOT NULL DEFAULT 'classic'
    CHECK (default_cv_template IN ('classic', 'modern', 'minimal', 'executive')),
  branding_accent_color    TEXT DEFAULT NULL,
  -- HR usage quotas
  subscription_tier        TEXT NOT NULL DEFAULT 'enterprise_b2b'
    CHECK (subscription_tier IN ('enterprise_b2b', 'staffing_agency', 'enterprise_plus')),
  cv_evaluations_used      INTEGER NOT NULL DEFAULT 0,
  cv_evaluations_limit     INTEGER NOT NULL DEFAULT 500,
  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages organizations"
  ON public.organizations USING (auth.role() = 'service_role');
CREATE POLICY "Members can read own org"
  ON public.organizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.org_id = organizations.id
  ));

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now add the FK from profiles to organizations
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Credits: packages, transactions, apply_credit_change, consume_credit
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key  text NOT NULL UNIQUE,
  name         text NOT NULL,
  credits      integer NOT NULL,
  price_usd    numeric(10,2) NOT NULL,
  checkout_url text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active credit packages" ON public.credit_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage credit packages" ON public.credit_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  amount           integer NOT NULL,
  balance_after    integer NOT NULL,
  transaction_type text NOT NULL,
  reference_type   text,
  reference_id     text,
  description      text,
  created_at       timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Credit transactions owner or admin can read" ON public.credit_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "No direct credit transaction inserts" ON public.credit_transactions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at
  ON public.credit_transactions(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_credit_change(
  _user_id uuid, _amount integer, _transaction_type text,
  _reference_type text DEFAULT NULL, _reference_id text DEFAULT NULL, _description text DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _current_balance integer;
  _new_balance     integer;
BEGIN
  SELECT credits_balance INTO _current_balance FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF _current_balance IS NULL THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  _new_balance := _current_balance + _amount;
  IF _new_balance < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;
  UPDATE public.profiles SET credits_balance = _new_balance, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_type, reference_id, description)
  VALUES (_user_id, _amount, _new_balance, _transaction_type, _reference_type, _reference_id, _description);
  RETURN _new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_credit(
  _user_id UUID, _amount INTEGER DEFAULT 1, _reason TEXT DEFAULT 'cv_optimization'
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance INTEGER;
BEGIN
  SELECT credits_balance INTO v_balance FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < _amount THEN RETURN FALSE; END IF;
  UPDATE public.profiles SET credits_balance = credits_balance - _amount WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_type, description)
  VALUES (_user_id, -_amount, v_balance - _amount, 'debit', 'feature', _reason);
  RETURN TRUE;
END;
$$;

INSERT INTO public.credit_packages (package_key, name, credits, price_usd, checkout_url, is_active)
VALUES
  ('free-starter',  'Free Starter',  100,  0,   NULL, true),
  ('credits-500',   '500 Credits',   500,  10,  NULL, true),
  ('credits-1200',  '1200 Credits',  1200, 20,  NULL, true)
ON CONFLICT (package_key) DO UPDATE
  SET name = EXCLUDED.name, credits = EXCLUDED.credits,
      price_usd = EXCLUDED.price_usd, is_active = EXCLUDED.is_active, updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Profiles: final RLS policies (clean consolidated set)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Profiles owner or admin can read"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles owner or admin can insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles owner or admin can update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. user_roles: final RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Roles owner or admin can read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. Applications (Kanban tracker)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.applications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL,
  job_title          text NOT NULL,
  company            text NOT NULL DEFAULT '',
  job_url            text DEFAULT '',
  job_description    text DEFAULT '',
  generated_proposal text DEFAULT '',
  status             text NOT NULL DEFAULT 'applied',
  acceptance_score   integer DEFAULT NULL,
  notes              text DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own applications"   ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON public.applications FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. Apply queue + outcome tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.apply_queue (
  id                     UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID NOT NULL,
  job_title              TEXT NOT NULL,
  company                TEXT NOT NULL DEFAULT '',
  platform               TEXT NOT NULL DEFAULT 'Upwork',
  budget                 TEXT DEFAULT '',
  job_url                TEXT DEFAULT '',
  job_description        TEXT NOT NULL DEFAULT '',
  match_score            INTEGER NOT NULL DEFAULT 0,
  acceptance_probability INTEGER NOT NULL DEFAULT 0,
  match_reasoning        JSONB DEFAULT '[]'::jsonb,
  rejection_reason       TEXT DEFAULT NULL,
  generated_proposal     TEXT NOT NULL DEFAULT '',
  status                 TEXT NOT NULL DEFAULT 'pending',
  user_notes             TEXT DEFAULT '',
  skills_matched         TEXT[] DEFAULT '{}',
  competition_level      TEXT NOT NULL DEFAULT 'medium',
  client_quality_score   INTEGER DEFAULT 50,
  urgency                TEXT NOT NULL DEFAULT 'medium',
  batch_id               TEXT DEFAULT NULL,
  scanned_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apply_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own queue"   ON public.apply_queue FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue" ON public.apply_queue FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue" ON public.apply_queue FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own queue" ON public.apply_queue FOR DELETE  USING (auth.uid() = user_id);
CREATE INDEX idx_apply_queue_user_status  ON public.apply_queue (user_id, status);
CREATE INDEX idx_apply_queue_user_created ON public.apply_queue (user_id, created_at DESC);
CREATE TRIGGER update_apply_queue_updated_at BEFORE UPDATE ON public.apply_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.outcome_tracking (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL,
  application_id   UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  queue_item_id    UUID REFERENCES public.apply_queue(id) ON DELETE SET NULL,
  was_viewed       BOOLEAN DEFAULT false,
  client_replied   BOOLEAN DEFAULT false,
  outcome          TEXT DEFAULT 'pending',
  proposal_style_tags TEXT[] DEFAULT '{}',
  job_platform     TEXT DEFAULT '',
  job_category     TEXT DEFAULT '',
  match_score_at_apply INTEGER DEFAULT 0,
  lessons_learned  TEXT DEFAULT '',
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outcome_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own outcomes"   ON public.outcome_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own outcomes" ON public.outcome_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outcomes" ON public.outcome_tracking FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX idx_outcome_tracking_user ON public.outcome_tracking (user_id);
CREATE TRIGGER update_outcome_tracking_updated_at BEFORE UPDATE ON public.outcome_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. handle_new_user (final version — credits + referral tracking)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref TEXT;
BEGIN
  v_ref := new.raw_user_meta_data ->> 'referred_by';
  INSERT INTO public.profiles (user_id, full_name, credits_balance, free_credits_granted, plan_type, referred_by)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', 100, TRUE, 'FREE', v_ref);
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_type, description)
  VALUES (new.id, 100, 100, 'signup_bonus', 'system', 'Welcome bonus – 100 credits');
  IF v_ref IS NOT NULL THEN
    UPDATE public.affiliate_codes SET total_referrals = total_referrals + 1
    WHERE code = UPPER(v_ref) AND is_active = TRUE;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Notify admin on new signup (pg_net)
CREATE OR REPLACE FUNCTION public.notify_new_user_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE supabase_url text; service_key text;
BEGIN
  SELECT decrypted_secret INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO service_key  FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      url     := supabase_url || '/functions/v1/notify-new-user',
      body    := json_build_object('email', NEW.email, 'full_name', COALESCE(NEW.raw_user_meta_data->>'full_name', ''))::text,
      headers := json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key)::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_user_notify ON auth.users;
CREATE TRIGGER on_new_user_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_user_signup();

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. Org license redemption + member management RPCs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.redeem_org_license(_user_id UUID, _key TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org public.organizations%ROWTYPE; v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN 'invalid_key'; END IF;
  IF v_profile.org_id IS NOT NULL THEN RETURN 'already_member'; END IF;
  SELECT * INTO v_org FROM public.organizations WHERE license_key = _key AND is_active = TRUE;
  IF NOT FOUND THEN RETURN 'invalid_key'; END IF;
  IF v_org.expires_at IS NOT NULL AND v_org.expires_at < now() THEN RETURN 'expired'; END IF;
  IF v_org.used_seats >= v_org.max_seats THEN RETURN 'no_seats'; END IF;
  UPDATE public.profiles SET org_id = v_org.id, plan_type = 'B2B_ENTERPRISE', subscription_plan = 'elite' WHERE user_id = _user_id;
  UPDATE public.organizations SET used_seats = used_seats + 1 WHERE id = v_org.id;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_org_admin(_user_id UUID, _org_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET org_role = 'org_admin', org_id = _org_id WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_org_member(_admin_user_id UUID, _member_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE user_id = _admin_user_id AND org_role = 'org_admin';
  IF v_org_id IS NULL THEN RETURN FALSE; END IF;
  UPDATE public.profiles SET org_id = NULL, plan_type = 'FREE', subscription_plan = 'free', org_role = 'user'
    WHERE user_id = _member_user_id AND org_id = v_org_id;
  UPDATE public.organizations SET used_seats = GREATEST(0, used_seats - 1) WHERE id = v_org_id;
  RETURN TRUE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. Application outcomes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.application_outcomes (
  id                 UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id     TEXT NOT NULL,
  outcome            TEXT NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending','viewed','replied','interview-invited','offer-received','rejected')),
  ats_score_at_apply INTEGER DEFAULT NULL,
  interview_invited  BOOLEAN NOT NULL DEFAULT FALSE,
  offer_received     BOOLEAN NOT NULL DEFAULT FALSE,
  notes              TEXT DEFAULT '',
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

ALTER TABLE public.application_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own outcomes" ON public.application_outcomes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org admins can view member outcomes" ON public.application_outcomes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.profiles admin_p ON admin_p.org_id = p.org_id
    WHERE p.user_id = application_outcomes.user_id AND admin_p.user_id = auth.uid() AND admin_p.org_role = 'org_admin'
  ));

CREATE INDEX IF NOT EXISTS idx_outcomes_user      ON public.application_outcomes (user_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_interview  ON public.application_outcomes (interview_invited) WHERE interview_invited = TRUE;
CREATE TRIGGER update_application_outcomes_updated_at BEFORE UPDATE ON public.application_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_org_members(_admin_user_id UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT, org_role TEXT, credits_balance INTEGER,
               subscription_plan TEXT, optimizations BIGINT, interviews BIGINT, latest_score INTEGER, joined_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE user_id = _admin_user_id AND org_role = 'org_admin';
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Not authorized as org admin'; END IF;
  RETURN QUERY
  SELECT p.user_id, p.full_name, u.email, p.org_role, p.credits_balance, p.subscription_plan,
    COALESCE((SELECT COUNT(*) FROM public.application_outcomes ao WHERE ao.user_id = p.user_id), 0),
    COALESCE((SELECT COUNT(*) FROM public.application_outcomes ao WHERE ao.user_id = p.user_id AND ao.interview_invited = TRUE), 0),
    COALESCE((SELECT MAX(ao.ats_score_at_apply) FROM public.application_outcomes ao WHERE ao.user_id = p.user_id), 0),
    p.created_at
  FROM public.profiles p JOIN auth.users u ON u.id = p.user_id
  WHERE p.org_id = v_org_id ORDER BY p.created_at;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. B2B HR Engine: organization_members, job_postings, candidate_evaluations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_members (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'recruiter'
                    CHECK (role IN ('owner', 'hr_manager', 'recruiter')),
  invited_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their org's member list" ON public.organization_members FOR SELECT
  USING (organization_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "Owners and HR managers can insert members" ON public.organization_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid() AND om.role IN ('owner', 'hr_manager')
  ));
CREATE POLICY "Owners can delete members" ON public.organization_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid() AND om.role = 'owner'
  ));

CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON public.organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members (user_id);

CREATE TABLE IF NOT EXISTS public.job_postings (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  required_skills      JSONB NOT NULL DEFAULT '[]',
  nice_to_have_skills  JSONB NOT NULL DEFAULT '[]',
  seniority_level      TEXT NOT NULL DEFAULT 'mid'
                         CHECK (seniority_level IN ('junior', 'mid', 'senior', 'lead', 'executive')),
  employment_type      TEXT NOT NULL DEFAULT 'full_time'
                         CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'freelance')),
  location             TEXT DEFAULT NULL,
  salary_range         JSONB DEFAULT NULL,
  created_by           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  candidate_count      INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view job postings" ON public.job_postings FOR SELECT
  USING (organization_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "HR managers and owners can manage job postings" ON public.job_postings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = job_postings.organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'hr_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = job_postings.organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'hr_manager')));

CREATE INDEX IF NOT EXISTS idx_job_postings_org_id ON public.job_postings (organization_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON public.job_postings (organization_id, is_active);
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.candidate_evaluations (
  id                       UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id           UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  organization_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_name           TEXT NOT NULL DEFAULT '',
  candidate_email          TEXT DEFAULT NULL,
  cv_storage_path          TEXT DEFAULT NULL,
  cv_text_extracted        TEXT DEFAULT NULL,
  match_score_percentage   NUMERIC(5,2) DEFAULT NULL CHECK (match_score_percentage >= 0 AND match_score_percentage <= 100),
  confidence_score         NUMERIC(4,3) DEFAULT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  statistical_metrics      JSONB DEFAULT NULL,
  ai_analysis              JSONB DEFAULT NULL,
  processing_status        TEXT NOT NULL DEFAULT 'pending'
                             CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message            TEXT DEFAULT NULL,
  evaluated_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- pgvector
  embedding                vector(1536) DEFAULT NULL,
  embedding_generated_at   TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view evaluations"   ON public.candidate_evaluations FOR SELECT  USING (organization_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "Org members can insert evaluations" ON public.candidate_evaluations FOR INSERT  WITH CHECK (organization_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "Org members can update evaluations" ON public.candidate_evaluations FOR UPDATE  USING (organization_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid())) WITH CHECK (organization_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "HR managers can delete evaluations" ON public.candidate_evaluations FOR DELETE  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = candidate_evaluations.organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'hr_manager')));

CREATE INDEX IF NOT EXISTS idx_candidate_evals_job_id   ON public.candidate_evaluations (job_posting_id);
CREATE INDEX IF NOT EXISTS idx_candidate_evals_org_id   ON public.candidate_evaluations (organization_id);
CREATE INDEX IF NOT EXISTS idx_candidate_evals_score    ON public.candidate_evaluations (match_score_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_evals_status   ON public.candidate_evaluations (processing_status);
CREATE INDEX IF NOT EXISTS idx_candidate_embeddings_hnsw ON public.candidate_evaluations
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE TRIGGER update_candidate_evaluations_updated_at BEFORE UPDATE ON public.candidate_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for CVs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('organization-cvs', 'organization-cvs', FALSE, 10485760,
        ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members can upload CVs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'organization-cvs' AND (storage.foldername(name))[1] IN (SELECT p.org_id::text FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "Org members can read CVs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'organization-cvs' AND (storage.foldername(name))[1] IN (SELECT p.org_id::text FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "Org members can delete CVs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'organization-cvs' AND (storage.foldername(name))[1] IN (SELECT p.org_id::text FROM public.profiles p WHERE p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_candidates_ranked(_job_posting_id UUID, _caller_user_id UUID)
RETURNS TABLE (id UUID, candidate_name TEXT, candidate_email TEXT, match_score_percentage NUMERIC,
               confidence_score NUMERIC, statistical_metrics JSONB, ai_analysis JSONB,
               processing_status TEXT, created_at TIMESTAMPTZ, percentile_rank FLOAT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE user_id = _caller_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Not a member of any organization'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.job_postings jp WHERE jp.id = _job_posting_id AND jp.organization_id = v_org_id) THEN
    RAISE EXCEPTION 'Job posting not found or access denied';
  END IF;
  RETURN QUERY
  SELECT ce.id, ce.candidate_name, ce.candidate_email, ce.match_score_percentage,
         ce.confidence_score, ce.statistical_metrics, ce.ai_analysis, ce.processing_status,
         ce.created_at, PERCENT_RANK() OVER (ORDER BY ce.match_score_percentage) AS percentile_rank
  FROM public.candidate_evaluations ce
  WHERE ce.job_posting_id = _job_posting_id AND ce.organization_id = v_org_id
  ORDER BY ce.match_score_percentage DESC NULLS LAST;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. B2B Credit Ledger + Transactions + Packages + RPCs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.b2b_credit_ledger (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  credits_balance  INTEGER NOT NULL DEFAULT 0 CHECK (credits_balance >= 0),
  credits_lifetime INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view credit balance" ON public.b2b_credit_ledger FOR SELECT
  USING (organization_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE TRIGGER update_b2b_credit_ledger_updated_at BEFORE UPDATE ON public.b2b_credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_b2b_credit_ledger_org ON public.b2b_credit_ledger (organization_id);

CREATE TABLE IF NOT EXISTS public.b2b_credit_transactions (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount           INTEGER NOT NULL,
  balance_after    INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'evaluation', 'refund', 'bonus', 'expiry')),
  reference_id     TEXT DEFAULT NULL,
  description      TEXT NOT NULL DEFAULT '',
  performed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view credit transactions" ON public.b2b_credit_transactions FOR SELECT
  USING (organization_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_b2b_credit_txn_org ON public.b2b_credit_transactions (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.b2b_credit_packages (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  credits       INTEGER NOT NULL,
  price_usd     NUMERIC(8,2) NOT NULL,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view credit packages" ON public.b2b_credit_packages FOR SELECT USING (is_active = TRUE);

INSERT INTO public.b2b_credit_packages (name, credits, price_usd, bonus_credits, sort_order) VALUES
  ('Starter Pack',    100,   49.00,   0, 1),
  ('Growth Pack',     300,  129.00,  30, 2),
  ('Agency Pack',     750,  299.00, 100, 3),
  ('Enterprise Pack', 2000, 699.00, 350, 4)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.consume_b2b_credit(
  _org_id UUID, _amount INTEGER DEFAULT 10, _reference_id TEXT DEFAULT NULL, _description TEXT DEFAULT 'CV Evaluation'
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance INTEGER;
BEGIN
  SELECT credits_balance INTO v_balance FROM public.b2b_credit_ledger WHERE organization_id = _org_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < _amount THEN RETURN FALSE; END IF;
  UPDATE public.b2b_credit_ledger SET credits_balance = credits_balance - _amount WHERE organization_id = _org_id;
  INSERT INTO public.b2b_credit_transactions (organization_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES (_org_id, -_amount, v_balance - _amount, 'evaluation', _reference_id, _description);
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_b2b_credits(
  _org_id UUID, _amount INTEGER, _type TEXT DEFAULT 'purchase', _reference TEXT DEFAULT NULL, _description TEXT DEFAULT 'Credit purchase'
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new_balance INTEGER;
BEGIN
  INSERT INTO public.b2b_credit_ledger (organization_id, credits_balance, credits_lifetime)
    VALUES (_org_id, _amount, _amount)
    ON CONFLICT (organization_id) DO UPDATE
      SET credits_balance  = b2b_credit_ledger.credits_balance + _amount,
          credits_lifetime = b2b_credit_ledger.credits_lifetime + _amount
    RETURNING credits_balance INTO v_new_balance;
  INSERT INTO public.b2b_credit_transactions (organization_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES (_org_id, _amount, v_new_balance, _type, _reference, _description);
  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_talent_pool(
  _org_id UUID, _query_embedding vector(1536),
  _match_threshold FLOAT DEFAULT 0.65, _match_count INTEGER DEFAULT 20,
  _min_score FLOAT DEFAULT 0, _verdict_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID, candidate_name TEXT, candidate_email TEXT, job_posting_id UUID,
  match_score_percentage NUMERIC, confidence_score NUMERIC,
  statistical_metrics JSONB, ai_analysis JSONB,
  processing_status TEXT, created_at TIMESTAMPTZ, similarity FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT ce.id, ce.candidate_name, ce.candidate_email, ce.job_posting_id,
         ce.match_score_percentage, ce.confidence_score, ce.statistical_metrics,
         ce.ai_analysis, ce.processing_status, ce.created_at,
         1 - (ce.embedding <=> _query_embedding) AS similarity
  FROM public.candidate_evaluations ce
  WHERE ce.organization_id = _org_id
    AND ce.processing_status = 'completed'
    AND ce.embedding IS NOT NULL
    AND (ce.match_score_percentage IS NULL OR ce.match_score_percentage >= _min_score)
    AND (_verdict_filter IS NULL OR (ce.ai_analysis->>'hiring_verdict') = ANY(_verdict_filter))
    AND 1 - (ce.embedding <=> _query_embedding) >= _match_threshold
  ORDER BY ce.embedding <=> _query_embedding
  LIMIT _match_count;
END;
$$;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
