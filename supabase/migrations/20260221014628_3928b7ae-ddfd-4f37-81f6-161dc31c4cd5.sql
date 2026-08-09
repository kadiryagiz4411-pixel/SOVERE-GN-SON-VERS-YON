
-- Add user segment, platform type, and profession cluster to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_segment text DEFAULT 'corporate',
ADD COLUMN IF NOT EXISTS platform_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profession_cluster text DEFAULT NULL;
