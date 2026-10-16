-- Lemon Squeezy subscription ledger (written by /api/billing/webhook)

CREATE TABLE IF NOT EXISTS public.lemonsqueezy_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ls_subscription_id TEXT UNIQUE NOT NULL,
    ls_customer_id TEXT,
    ls_order_id TEXT,
    variant_id TEXT,
    product_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    plan_tier TEXT,
    billing_period TEXT,
    renews_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ls_subs_user ON public.lemonsqueezy_subscriptions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ls_subs_status ON public.lemonsqueezy_subscriptions (status);

ALTER TABLE public.lemonsqueezy_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own ls subscriptions" ON public.lemonsqueezy_subscriptions;
CREATE POLICY "Users read own ls subscriptions"
    ON public.lemonsqueezy_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Webhook writes go through the service role (bypasses RLS).
GRANT SELECT ON public.lemonsqueezy_subscriptions TO authenticated;
GRANT ALL ON public.lemonsqueezy_subscriptions TO service_role;
