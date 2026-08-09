-- Create pending_upgrades table for users who paid but haven't signed up yet
CREATE TABLE public.pending_upgrades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'elite')),
  sale_id TEXT,
  gumroad_data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for quick email lookup
CREATE INDEX idx_pending_upgrades_email ON public.pending_upgrades(email);
CREATE INDEX idx_pending_upgrades_processed ON public.pending_upgrades(processed);

-- Enable RLS
ALTER TABLE public.pending_upgrades ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (webhook uses service role)
-- No public policies needed as this is backend-only