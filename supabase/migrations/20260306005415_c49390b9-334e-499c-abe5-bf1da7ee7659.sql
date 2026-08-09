ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_subscribed boolean NOT NULL DEFAULT false;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_subscribed_at timestamptz;