
-- Referral & bonus credit system
-- Add bonus_credits column to profiles for tracking extra proposal credits
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bonus_credits integer NOT NULL DEFAULT 0;

-- Add referral tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  credits_awarded integer NOT NULL DEFAULT 10,
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referrer_user_id);

-- Add referral_code column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := LOWER(SUBSTRING(MD5(NEW.user_id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate referral code on profile creation
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles
SET referral_code = LOWER(SUBSTRING(MD5(user_id::text), 1, 8))
WHERE referral_code IS NULL;
