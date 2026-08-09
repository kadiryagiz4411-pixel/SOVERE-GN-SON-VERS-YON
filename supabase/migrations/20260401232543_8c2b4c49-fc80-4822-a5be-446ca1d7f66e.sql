ALTER TABLE public.pending_upgrades ADD COLUMN IF NOT EXISTS payment_data JSONB;

UPDATE public.pending_upgrades
SET payment_data = COALESCE(payment_data, gumroad_data)
WHERE gumroad_data IS NOT NULL;

ALTER TABLE public.pending_upgrades DROP COLUMN IF EXISTS gumroad_data;