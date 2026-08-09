-- Add share_token to proposals for public sharing
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_proposals_share_token ON public.proposals(share_token) WHERE share_token IS NOT NULL;

-- Allow anyone to view proposals by share_token (public access)
CREATE POLICY "Anyone can view shared proposals" ON public.proposals
FOR SELECT TO anon, authenticated
USING (share_token IS NOT NULL AND share_token = share_token);