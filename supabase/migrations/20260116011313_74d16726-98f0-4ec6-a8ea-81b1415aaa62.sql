-- Fix security issue: Add RLS policies to pending_upgrades table
ALTER TABLE public.pending_upgrades ENABLE ROW LEVEL SECURITY;

-- Only admins can access pending_upgrades
CREATE POLICY "Only admins can view pending_upgrades" 
ON public.pending_upgrades 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert pending_upgrades" 
ON public.pending_upgrades 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update pending_upgrades" 
ON public.pending_upgrades 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete pending_upgrades" 
ON public.pending_upgrades 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles table: Add explicit deny for unauthenticated access
CREATE POLICY "Deny public access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);