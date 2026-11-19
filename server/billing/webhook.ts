/**
 * POST /api/billing/webhook
 * Polar.sh subscription lifecycle → Supabase profiles + subscriptions.
 */
import { json, preflight } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import type { PlanTier } from '../_lib/billingTypes.js';
import {
  asRecord,
  isPolarWebhook,
  planFromPolarProduct,
  polarWebhookSecret,
  verifyPolarSignature,
} from '../_lib/polar.js';
import { fulfillPurchase } from '../_lib/billingFulfill.js';

export const config = { runtime: 'nodejs' };

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

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const rawBody = await req.text();
    if (isPolarWebhook(req)) {
      return handlePolarWebhook(req, rawBody);
    }
    return json({ error: 'Unauthorized' }, 401);
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
