
-- Add onboarding data and roadmap fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_role text,
  ADD COLUMN IF NOT EXISTS onboarding_experience text,
  ADD COLUMN IF NOT EXISTS onboarding_goal text,
  ADD COLUMN IF NOT EXISTS onboarding_volume text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS career_roadmap jsonb;
