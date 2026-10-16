/**
 * POST /api/billing/webhook
 * Lemon Squeezy subscription lifecycle → Supabase profiles + lemonsqueezy_subscriptions.
 */
import { json } from '../_lib/cors';
import { env, firstEnv } from '../_lib/env';

export const config = { runtime: 'edge' };

type PlanTier = 'single_pass' | 'standard' | 'pro' | 'elite' | 'B2B_ENTERPRISE' | 'free';

interface TierConfig {
  tier: PlanTier;
  period: 'monthly' | 'yearly' | 'once';
}

function supabaseHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(signed)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hex.length; i++) mismatch |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return mismatch === 0;
}

function variantMap(): Map<string, TierConfig> {
  const map = new Map<string, TierConfig>();
  const put = (keys: string[], cfg: TierConfig) => {
    const id = firstEnv(...keys);
    if (id) map.set(id, cfg);
  };
  put(['LS_VARIANT_STANDARD_MONTHLY', 'VITE_STANDARD_MONTHLY_VARIANT_ID', 'NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID', 'VITE_LEMONSQUEEZY_STANDARD_VARIANT_ID'], { tier: 'standard', period: 'monthly' });
  put(['LS_VARIANT_STANDARD_ANNUAL', 'VITE_STANDARD_YEARLY_VARIANT_ID'], { tier: 'standard', period: 'yearly' });
  put(['LS_VARIANT_PRO_MONTHLY', 'VITE_PRO_MONTHLY_VARIANT_ID', 'NEXT_PUBLIC_LEMONSQUEEZY_PRO_VARIANT_ID', 'VITE_LEMONSQUEEZY_PRO_VARIANT_ID'], { tier: 'pro', period: 'monthly' });
  put(['LS_VARIANT_PRO_ANNUAL', 'VITE_PRO_YEARLY_VARIANT_ID'], { tier: 'pro', period: 'yearly' });
  put(['LS_VARIANT_ELITE_MONTHLY', 'VITE_ELITE_MONTHLY_VARIANT_ID', 'NEXT_PUBLIC_LEMONSQUEEZY_ELITE_VARIANT_ID', 'VITE_LEMONSQUEEZY_ELITE_VARIANT_ID'], { tier: 'elite', period: 'monthly' });
  put(['LS_VARIANT_ELITE_ANNUAL', 'VITE_ELITE_YEARLY_VARIANT_ID'], { tier: 'elite', period: 'yearly' });
  put(['LS_VARIANT_ENTERPRISE_MONTHLY', 'VITE_ENTERPRISE_MONTHLY_VARIANT_ID', 'NEXT_PUBLIC_LEMONSQUEEZY_ENTERPRISE_VARIANT_ID', 'VITE_LEMONSQUEEZY_ENTERPRISE_VARIANT_ID'], { tier: 'B2B_ENTERPRISE', period: 'monthly' });
  put(['LS_VARIANT_ENTERPRISE_ANNUAL', 'VITE_ENTERPRISE_YEARLY_VARIANT_ID'], { tier: 'B2B_ENTERPRISE', period: 'yearly' });
  // Known production defaults (numeric LS variant IDs)
  if (!map.has('2020873')) map.set('2020873', { tier: 'standard', period: 'monthly' });
  if (!map.has('2020643')) map.set('2020643', { tier: 'standard', period: 'yearly' });
  if (!map.has('2020868')) map.set('2020868', { tier: 'pro', period: 'monthly' });
  if (!map.has('2020735')) map.set('2020735', { tier: 'pro', period: 'yearly' });
  if (!map.has('2020866')) map.set('2020866', { tier: 'elite', period: 'monthly' });
  if (!map.has('2020838')) map.set('2020838', { tier: 'elite', period: 'yearly' });
  if (!map.has('2020877')) map.set('2020877', { tier: 'B2B_ENTERPRISE', period: 'monthly' });
  if (!map.has('2020842')) map.set('2020842', { tier: 'B2B_ENTERPRISE', period: 'yearly' });
  return map;
}

function tierFromNames(productName: string, variantName: string): TierConfig | null {
  const s = `${productName} ${variantName}`.toLowerCase();
  const period: TierConfig['period'] =
    s.includes('annual') || s.includes('yearly') || s.includes('year') ? 'yearly' : 'monthly';
  if (s.includes('enterprise') || s.includes('agency') || s.includes('b2b')) {
    return { tier: 'B2B_ENTERPRISE', period };
  }
  if (s.includes('elite')) return { tier: 'elite', period };
  if (s.includes('pro')) return { tier: 'pro', period };
  if (s.includes('standard')) return { tier: 'standard', period };
  return null;
}

async function adminGetUser(base: string, key: string, userId: string): Promise<boolean> {
  const res = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.ok;
}

async function upsertSubscription(base: string, key: string, row: Record<string, unknown>) {
  await fetch(`${base}/rest/v1/lemonsqueezy_subscriptions?on_conflict=ls_subscription_id`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(key),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
}

async function updateProfile(base: string, key: string, userId: string, patch: Record<string, unknown>) {
  await fetch(`${base}/rest/v1/profiles?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: supabaseHeaders(key),
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const rawBody = await req.text();
  const secret = env('LEMONSQUEEZY_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'Webhook secret is not configured' }, 500);
  const valid = await verifySignature(rawBody, req.headers.get('x-signature'), secret);
  if (!valid) return json({ error: 'Unauthorized' }, 401);

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase admin is not configured' }, 500);

  const meta = (event.meta ?? {}) as Record<string, unknown>;
  const data = (event.data ?? {}) as Record<string, unknown>;
  const attrs = (data.attributes ?? {}) as Record<string, unknown>;
  const custom = (meta.custom_data ?? {}) as Record<string, unknown>;
  const eventName = String(meta.event_name ?? '');
  const lsId = String(data.id ?? '');
  const variantId = String(
    (attrs.variant_id as string | number | undefined)
      ?? ((attrs.first_order_item as Record<string, unknown> | undefined)?.variant_id ?? '')
      ?? '',
  );
  const productName = String(attrs.product_name ?? (attrs.first_order_item as Record<string, unknown> | undefined)?.product_name ?? '');
  const variantName = String(attrs.variant_name ?? (attrs.first_order_item as Record<string, unknown> | undefined)?.variant_name ?? '');
  const status = String(attrs.status ?? 'active').toLowerCase();
  const customerId = attrs.customer_id != null ? String(attrs.customer_id) : null;
  const renewsAt = (attrs.renews_at as string | null) ?? null;
  const endsAt = (attrs.ends_at as string | null) ?? null;
  const customUserId = String(custom.user_id ?? '').trim();

  let userId: string | null = customUserId || null;
  if (userId) {
    const exists = await adminGetUser(supabaseUrl, serviceKey, userId);
    if (!exists) userId = null;
  }

  const cfg = variantMap().get(variantId) ?? tierFromNames(productName, variantName);
  const planTier = cfg?.tier ?? null;
  const billingPeriod = cfg?.period ?? null;

  const ledger = {
    user_id: userId,
    ls_subscription_id: lsId || `evt-${Date.now()}`,
    ls_customer_id: customerId,
    variant_id: variantId || null,
    product_id: attrs.product_id != null ? String(attrs.product_id) : null,
    status,
    plan_tier: planTier,
    billing_period: billingPeriod,
    renews_at: renewsAt,
    ends_at: endsAt,
    cancelled_at: eventName === 'subscription_cancelled' ? new Date().toISOString() : null,
    payload: { event: eventName, variant_id: variantId },
    updated_at: new Date().toISOString(),
  };

  if (lsId) await upsertSubscription(supabaseUrl, serviceKey, ledger);

  if (!userId) {
    return json({ success: true, queued: true, event: eventName });
  }

  if (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'order_created') {
    if (planTier && planTier !== 'free' && status !== 'cancelled' && status !== 'expired') {
      await updateProfile(supabaseUrl, serviceKey, userId, {
        plan_type: planTier,
        subscription_plan: planTier,
        subscription_status: status === 'on_trial' ? 'active' : (status || 'active'),
        subscription_tier: planTier === 'B2B_ENTERPRISE' ? 'enterprise' : planTier,
        billing_period: billingPeriod === 'once' ? null : billingPeriod,
        ls_subscription_id: lsId || undefined,
        ls_customer_id: customerId,
        subscription_expires_at: endsAt || renewsAt,
        subscription_paused_at: null,
        ...(planTier === 'B2B_ENTERPRISE' ? { b2b_subscription_status: 'active', is_trial_active: false } : {}),
      });
    }
  }

  if (eventName === 'subscription_cancelled') {
    await updateProfile(supabaseUrl, serviceKey, userId, {
      subscription_status: 'canceled',
      ls_subscription_id: lsId || undefined,
      ls_customer_id: customerId,
      b2b_subscription_status: planTier === 'B2B_ENTERPRISE' ? 'canceled' : undefined,
    });
    await upsertSubscription(supabaseUrl, serviceKey, {
      ...ledger,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    });
  }

  return json({ success: true, event: eventName, userId, tier: planTier });
}
