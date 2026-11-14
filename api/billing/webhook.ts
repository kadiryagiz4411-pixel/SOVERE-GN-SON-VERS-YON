/**
 * POST /api/billing/webhook
 * Lemon Squeezy subscription lifecycle → Supabase profiles + subscriptions.
 * Verifies the raw request body with HMAC-SHA256 (X-Signature).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { json, preflight } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { env, firstEnv } from '../_lib/env.js';
import { lemonStoreId, lemonWebhookSecret, variantMap, type PlanTier, type TierConfig } from '../_lib/lemonsqueezy.js';
import { creditAffiliateCommission, moneyUsd } from '../_lib/affiliate.js';
import {
  asRecord,
  isPolarWebhook,
  planFromPolarProduct,
  polarWebhookSecret,
  verifyPolarSignature,
} from '../_lib/polar.js';
import { fulfillPurchase } from '../_lib/billingFulfill.js';

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
  if (s.includes('single') || s.includes('pass') || s.includes('one')) {
    return { tier: 'single_pass', period: 'once' };
  }
  return null;
}

async function handlePolarWebhook(req: Request, rawBody: string): Promise<Response> {
  const secret = polarWebhookSecret();
  if (!secret || !verifyPolarSignature(rawBody, req, secret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const type = String(payload.type || payload.event || '');
  const data = asRecord(payload.data);
  const customer = asRecord(data.customer);
  const product = asRecord(data.product);
  const metadata = asRecord(data.metadata);
  const checkout = asRecord(data.checkout);
  const checkoutMeta = asRecord(checkout.metadata);
  const webhookId = String(req.headers.get('webhook-id') || payload.id || data.id || '');
  const checkoutId = String(data.checkout_id || checkout.id || metadata.checkout_id || '');
  const orderId = String(data.order_id || (type === 'order.created' ? data.id : '') || '');
  const eventId = (type === 'order.created' || type === 'checkout.updated')
    ? `polar-pass:${checkoutId || orderId || webhookId}`
    : webhookId;
  const email = String(
    customer.email
    || data.customer_email
    || metadata.email
    || checkoutMeta.email
    || '',
  ).trim().toLowerCase();
  const userId = String(
    metadata.user_id
    || checkoutMeta.user_id
    || customer.external_id
    || data.external_customer_id
    || '',
  ).trim() || null;
  const productId = String(data.product_id || product.id || data.product_price_id || '');
  const productName = String(product.name || data.product_name || metadata.plan_id || '');
  const amount = Number(data.amount ?? data.net_amount ?? product.price_amount ?? 0);
  const mapped = planFromPolarProduct(productId, productName, Number.isFinite(amount) ? amount : undefined);
  const planFromMeta = String(metadata.plan_id || checkoutMeta.plan_id || '').toLowerCase();
  const metaPlan: PlanTier | null = planFromMeta.includes('pass')
    ? 'single_pass'
    : planFromMeta === 'standard' || planFromMeta === 'starter'
      ? 'standard'
      : planFromMeta === 'pro'
        ? 'pro'
        : planFromMeta === 'elite'
          ? 'elite'
          : planFromMeta.includes('enterprise')
            ? 'B2B_ENTERPRISE'
            : null;
  const plan: PlanTier | null = mapped?.tier || metaPlan;
  const period = mapped?.period || (plan === 'single_pass' ? 'once' : 'monthly');
  const status = String(data.status || '').toLowerCase();
  const terminal = type.includes('canceled')
    || type.includes('revoked')
    || ['canceled', 'cancelled', 'revoked', 'unpaid', 'expired'].includes(status);
  const paidCheckout = type === 'checkout.updated' && /succeed|confirm|paid|complete/i.test(status);
  const fulfillable = type === 'order.created'
    || type === 'subscription.created'
    || (type === 'subscription.updated' && !terminal)
    || paidCheckout;

  if (!fulfillable && !terminal) {
    return json({ received: true, ignored: type, eventId });
  }
  if (!plan) {
    return json({ received: true, ignored: type, reason: 'unmapped_product', eventId });
  }

  try {
    const result = await fulfillPurchase({
      provider: 'polar',
      eventId: eventId || `polar-${Date.now()}`,
      eventType: type,
      userId,
      email,
      plan,
      period,
      customerId: String(customer.id || data.customer_id || '') || null,
      subscriptionId: String(data.id || '') || null,
      terminal,
    });
    return json({ received: true, event: type, ...result });
  } catch (err) {
    console.error('[polar webhook] fulfill failed', err);
    return json({ error: 'Webhook processing error' }, 500);
  }
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

async function isAppsumoLifetime(base: string, key: string, userId: string): Promise<boolean> {
  const qs = new URLSearchParams({
    select: 'appsumo_tier,appsumo_plan,appsumo_codes_count,plan_type,subscription_tier',
    or: `(id.eq.${userId},user_id.eq.${userId})`,
    limit: '1',
  });
  const res = await fetch(`${base}/rest/v1/profiles?${qs.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) return false;
  const rows = await res.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row || typeof row !== 'object') return false;
  const profile = row as Record<string, unknown>;
  if (Number(profile.appsumo_tier || 0) >= 1) return true;
  if (Number(profile.appsumo_codes_count || 0) >= 1) return true;
  const blob = `${profile.appsumo_plan || ''} ${profile.plan_type || ''} ${profile.subscription_tier || ''}`.toLowerCase();
  return blob.includes('appsumo');
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const rawBody = await req.text();
    if (isPolarWebhook(req)) {
      return handlePolarWebhook(req, rawBody);
    }

    const signature = req.headers.get('x-signature') || req.headers.get('X-Signature') || '';
    const secret = lemonWebhookSecret();
    if (!secret || !signature || !verifySignature(rawBody, signature, secret)) {
      return json({ error: 'Unauthorized' }, 401);
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
    const rawStatus = String(attrs.status ?? 'active').toLowerCase();
    const status = eventName === 'subscription_cancelled'
      ? 'cancelled'
      : eventName === 'subscription_expired'
        ? 'expired'
        : rawStatus;
    const terminal = eventName === 'subscription_cancelled'
      || eventName === 'subscription_expired'
      || ['cancelled', 'canceled', 'expired', 'unpaid', 'past_due', 'paused'].includes(status);
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
      if (userId && (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'subscription_cancelled' || eventName === 'subscription_expired')) {
        await upsertCanonicalSubscription(supabaseUrl, serviceKey, canonical, 'user_id');
      } else {
        await upsertCanonicalSubscription(supabaseUrl, serviceKey, canonical, 'lemon_squeezy_id');
      }
    }

    const lsEventId = `${eventName}:${lsId || variantId || Date.now()}`;
    if (planTier === 'single_pass' && eventName !== 'order_refunded') {
      const passEmail = String(attrs.user_email || attrs.customer_email || custom.email || '').trim().toLowerCase();
      const passResult = await fulfillPurchase({
        provider: 'lemonsqueezy',
        eventId: lsEventId,
        eventType: eventName || 'order_created',
        userId,
        email: passEmail,
        plan: 'single_pass',
        period: 'once',
        customerId,
        subscriptionId: lsId || null,
        terminal: eventName === 'order_refunded',
      });
      return json({ received: true, event: eventName, ...passResult });
    }

    if (!userId) {
      const guestEmail = String(attrs.user_email || attrs.customer_email || custom.email || '').trim().toLowerCase();
      if (guestEmail && planTier && planTier !== 'free') {
        const queued = await fulfillPurchase({
          provider: 'lemonsqueezy',
          eventId: lsEventId,
          eventType: eventName || 'unknown',
          email: guestEmail,
          plan: planTier,
          period: billingPeriod,
          customerId,
          subscriptionId: lsId || null,
        });
        return json({ received: true, queued: true, event: eventName, ...queued });
      }
      return json({ received: true, queued: true, event: eventName });
    }

    const agency = planTier === 'B2B_ENTERPRISE';

    if (!terminal && (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'order_created')) {
      if (planTier && planTier !== 'free') {
        await updateProfile(supabaseUrl, serviceKey, userId, {
          plan_type: planTier,
          subscription_plan: planTier,
          subscription_status: status === 'on_trial' ? 'active' : (status || 'active'),
          subscription_tier: agency ? 'enterprise' : planTier,
          billing_period: billingPeriod === 'once' ? null : billingPeriod,
          ls_subscription_id: lsId || undefined,
          ls_customer_id: customerId,
          subscription_expires_at: endsAt || renewsAt,
          subscription_paused_at: null,
          ...(agency ? { b2b_access: true, b2b_subscription_status: 'active', is_trial_active: false } : {}),
        });
      }
    }

    const paymentEvent = eventName === 'subscription_payment_success'
      || eventName === 'subscription_created'
      || eventName === 'order_created';
    if (userId && paymentEvent && !terminal) {
      const invoiceUsd = moneyUsd(
        attrs.total
        ?? attrs.subtotal
        ?? (attrs.first_order_item as Record<string, unknown> | undefined)?.price
        ?? 0,
      );
      try {
        await creditAffiliateCommission({
          referredUserId: userId,
          eventName,
          invoiceId: String(attrs.invoice_id ?? orderId ?? lsId),
          subscriptionId: lsId,
          invoiceUsd,
        });
      } catch (err) {
        console.error('[affiliate] commission hook failed', err);
      }
    }

    if (terminal) {
      const nextStatus = eventName === 'subscription_expired' || status === 'expired'
        ? 'expired'
        : status === 'past_due'
          ? 'past_due'
          : status === 'paused'
            ? 'paused'
            : status === 'unpaid'
              ? 'unpaid'
              : 'canceled';
      if (!(await isAppsumoLifetime(supabaseUrl, serviceKey, userId))) {
        await updateProfile(supabaseUrl, serviceKey, userId, {
          subscription_status: nextStatus,
          ls_subscription_id: lsId || undefined,
          ls_customer_id: customerId,
          ...(agency ? { b2b_access: false, b2b_subscription_status: nextStatus === 'expired' ? 'expired' : 'canceled' } : {}),
        });
      }
      if (lsId) {
        await upsertSubscription(supabaseUrl, serviceKey, {
          ...ledger,
          status: nextStatus === 'canceled' ? 'cancelled' : nextStatus,
          cancelled_at: nextStatus === 'canceled' ? new Date().toISOString() : ledger.cancelled_at,
        });
      }
    }

    return json({ received: true, event: eventName, userId, tier: planTier });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook processing error';
    console.error('Webhook processing error:', err);
    return json({ error: message }, 500);
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
