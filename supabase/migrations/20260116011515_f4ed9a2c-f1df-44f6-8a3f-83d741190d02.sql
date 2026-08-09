-- Add trial tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN trial_started_at timestamp with time zone DEFAULT NULL,
ADD COLUMN trial_claimed boolean DEFAULT false;

-- Create a table to track global trial claims count
CREATE TABLE public.trial_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL
);

-- Enable RLS
ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own trial claims
CREATE POLICY "Users can view their own trial claims"
ON public.trial_claims
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own trial claim
CREATE POLICY "Users can insert their own trial claim"
ON public.trial_claims
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to check if trials are still available (first 100)
CREATE OR REPLACE FUNCTION public.get_trial_claims_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.trial_claims;
$$;

-- Create function to check if user can claim trial
CREATE OR REPLACE FUNCTION public.can_claim_trial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.trial_claims WHERE user_id = _user_id
  ) AND (SELECT COUNT(*) FROM public.trial_claims) < 100;
$$;