
-- Add subscription expiry tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'When the current subscription period expires';
COMMENT ON COLUMN public.profiles.billing_period IS 'monthly or yearly';
