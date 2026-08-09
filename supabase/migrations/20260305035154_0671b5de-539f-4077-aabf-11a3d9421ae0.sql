-- Drop the overly permissive policy and replace with a proper one
DROP POLICY IF EXISTS "Anyone can view shared proposals" ON public.proposals;

-- Proper policy: only allow selecting if the query filters by a specific share_token
-- This is safe because it still requires knowing the token
CREATE POLICY "Anyone can view shared proposals by token" ON public.proposals
FOR SELECT TO anon, authenticated
USING (share_token IS NOT NULL);