/**
 * POST /api/billing/webhook
 * Lemon Squeezy subscription lifecycle → Supabase profiles + subscriptions.
 * Verifies the raw request body with HMAC-SHA256 (X-Signature).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { json, preflight } from '../_lib/cors.js';
import { env, firstEnv } from '../_lib/env.js';
import { lemonStoreId, lemonWebhookSecret, variantMap, type TierConfig } from '../_lib/lemonsqueezy.js';

export const config = { runtime: 'nodejs' };

function supabaseHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature) return false;
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const digestBuf = Buffer.from(digest, 'utf8');
  const signatureBuf = Buffer.from(signature.trim(), 'utf8');
  if (digestBuf.length !== signatureBuf.length) return false;
  try {
    return timingSafeEqual(digestBuf, signatureBuf);
  } catch {
    return false;
  }
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

async function upsertCanonicalSubscription(base: string, key: string, row: Record<string, unknown>, conflict = 'lemon_squeezy_id') {
  await fetch(`${base}/rest/v1/subscriptions?on_conflict=${conflict}`, {
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
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || req.headers.get('X-Signature') || '';
    const secret = lemonWebhookSecret();

    if (secret) {
      if (!verifySignature(rawBody, signature, secret)) {
        return json({ error: 'Invalid webhook signature' }, 401);
      }
    } else {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not configured — rejecting webhook');
      return json({ error: 'Webhook secret is not configured' }, 500);
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase admin is not configured' }, 500);

    const meta = (payload.meta ?? {}) as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
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
    const status = eventName === 'subscription_cancelled'
      ? 'cancelled'
      : String(attrs.status ?? 'active').toLowerCase();
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

    const storeId = String(attrs.store_id ?? lemonStoreId() ?? 'unknown');
    const orderId = String(
      attrs.order_id
        ?? (attrs.first_subscription_item as Record<string, unknown> | undefined)?.subscription_id
        ?? lsId
        ?? 'unknown',
    );

    const canonical = {
      user_id: userId,
      lemon_squeezy_id: lsId,
      order_id: orderId,
      store_id: storeId,
      customer_id: customerId || 'unknown',
      variant_id: variantId || '0',
      product_name: productName || planTier || 'Sovereign',
      status,
      renews_at: renewsAt,
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    };

    if (lsId) {
      await upsertSubscription(supabaseUrl, serviceKey, ledger);
      if (userId && (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'subscription_cancelled')) {
        await upsertCanonicalSubscription(supabaseUrl, serviceKey, canonical, 'user_id');
      } else {
        await upsertCanonicalSubscription(supabaseUrl, serviceKey, canonical, 'lemon_squeezy_id');
      }
    }

    if (!userId) {
      return json({ received: true, queued: true, event: eventName });
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

    return json({ received: true, event: eventName, userId, tier: planTier });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook processing error';
    console.error('Webhook processing error:', err);
    return json({ error: message }, 500);
  }
}
