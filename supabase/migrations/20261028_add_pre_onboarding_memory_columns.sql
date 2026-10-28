-- =============================================================================
-- Pre-login onboarding memory: add 10 questionnaire answer columns to profiles
-- =============================================================================
-- Idempotent: ADD COLUMN IF NOT EXISTS throughout.
-- These columns are populated by syncPreOnboardingMemory() immediately after
-- a user signs up or logs in, reading from localStorage key
-- 'sovereign_pre_onboarding' that is written by LandingOnboardingMemory.tsx.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profession           text,
  ADD COLUMN IF NOT EXISTS platform_preference  text,
  ADD COLUMN IF NOT EXISTS experience_level     text,
  ADD COLUMN IF NOT EXISTS tech_stack           text,
  ADD COLUMN IF NOT EXISTS hourly_rate_target   text,
  ADD COLUMN IF NOT EXISTS availability         text,
  ADD COLUMN IF NOT EXISTS proposal_tone        text,
  ADD COLUMN IF NOT EXISTS main_pain_point      text,
  ADD COLUMN IF NOT EXISTS work_mode            text,
  ADD COLUMN IF NOT EXISTS primary_goal         text;

COMMENT ON COLUMN public.profiles.profession          IS 'Step 1: pre-login onboarding — profession or role';
COMMENT ON COLUMN public.profiles.platform_preference IS 'Step 2: primary freelance platform (Upwork, Fiverr, etc.)';
COMMENT ON COLUMN public.profiles.experience_level    IS 'Step 3: experience level (Junior / Mid / Senior / Agency)';
COMMENT ON COLUMN public.profiles.tech_stack          IS 'Step 4: core tech stack or toolset';
COMMENT ON COLUMN public.profiles.hourly_rate_target  IS 'Step 5: target hourly rate baseline';
COMMENT ON COLUMN public.profiles.availability        IS 'Step 6: weekly availability';
COMMENT ON COLUMN public.profiles.proposal_tone       IS 'Step 7: preferred proposal tone';
COMMENT ON COLUMN public.profiles.main_pain_point     IS 'Step 8: biggest freelance bottleneck';
COMMENT ON COLUMN public.profiles.work_mode           IS 'Step 9: Solo / Studio / Agency';
COMMENT ON COLUMN public.profiles.primary_goal        IS 'Step 10: primary goal with Sovereign';
