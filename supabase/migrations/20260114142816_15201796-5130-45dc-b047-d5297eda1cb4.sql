-- Create function to check and apply pending upgrades when user signs up
CREATE OR REPLACE FUNCTION public.check_pending_upgrades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger to check pending upgrades after profile is created
CREATE TRIGGER on_profile_created_check_upgrades
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pending_upgrades();