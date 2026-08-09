-- Drop the incorrectly attached trigger from profiles table
DROP TRIGGER IF EXISTS on_profile_created_check_upgrades ON public.profiles;

-- Create the trigger correctly on auth.users table
CREATE TRIGGER on_auth_user_created_check_upgrades
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pending_upgrades();