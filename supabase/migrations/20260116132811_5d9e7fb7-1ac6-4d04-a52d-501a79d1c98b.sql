-- Fix check_pending_upgrades function to use correct email field from auth.users
CREATE OR REPLACE FUNCTION public.check_pending_upgrades()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pending_record RECORD;
BEGIN
  -- Check if there's a pending upgrade for this user's email
  SELECT * INTO pending_record
  FROM public.pending_upgrades
  WHERE email = LOWER(NEW.email)
    AND processed = false
  ORDER BY created_at DESC
  LIMIT 1;

  -- If found, update the profile with the purchased plan
  IF FOUND THEN
    -- Update profile with the pending plan
    UPDATE public.profiles
    SET subscription_plan = pending_record.plan,
        updated_at = now()
    WHERE user_id = NEW.id;

    -- Mark the pending upgrade as processed
    UPDATE public.pending_upgrades
    SET processed = true,
        processed_at = now()
    WHERE id = pending_record.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Add RLS policy to allow users to view their own pending reviews (not just approved ones)
CREATE POLICY "Users can view their own reviews" 
ON public.reviews 
FOR SELECT 
USING (auth.uid() = user_id);