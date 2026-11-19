/**
 * POST /api/billing/checkout
 * Polar.sh hosted checkout first (when configured), Lemon Squeezy fallback.
 * Polar product/price IDs map each plan. Amounts come from server/_lib/money.ts.
 */
import { preflight, json } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { firstEnv } from '../_lib/env.js';
import { lemonApiKey, lemonStoreId, resolveVariantId } from '../_lib/lemonsqueezy.js';
import { createPolarCheckout, polarConfigured, polarProductId } from '../_lib/polar.js';
import { SINGLE_PASS_USD, planAmountCents } from '../_lib/money.js';

export const config = { runtime: 'nodejs', maxDuration: 30 };

const LS_API = 'https://api.lemonsqueezy.com/v1/checkouts';

function originFrom(req: Request): string {
  const url = new URL(req.url);
  let host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host).split(',')[0].trim();
  if (host === 'www.sovereignapp.pro') host = 'sovereignapp.pro';
  const proto = host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https';
  return `${proto}://${host}`;
}

function isSinglePass(planId?: string): boolean {
  return /single.?pass|one.?pass|one.?time/.test(String(planId || '').toLowerCase());
}

async function callerIdentity(req: Request, bodyUserId?: string, bodyEmail?: string): Promise<{ userId?: string; email?: string }> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const anon = firstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (token && supabaseUrl && anon) {
    try {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: anon },
      });
      if (res.ok) {
        const user = await res.json() as { id?: string; email?: string };
        return {
          userId: user.id || bodyUserId || undefined,
          email: (user.email || bodyEmail || '').trim().toLowerCase() || undefined,
        };
      }
    } catch (err) {
      console.error('[checkout] auth lookup failed', err);
    }
  }
  return {
    userId: bodyUserId || undefined,
    email: (bodyEmail || '').trim().toLowerCase() || undefined,
  };
}

async function lemonCheckout(opts: {
  variantId: string;
  userId?: string;
  userEmail?: string;
  planId?: string;
  billingCycle?: string;
  referredBy?: string;
  guestId?: string;
  origin: string;
}): Promise<Response> {
  const apiKey = lemonApiKey();
  const storeId = lemonStoreId();
  if (!apiKey || !storeId) {
    return json({ error: 'Billing is not configured.' }, 500);
  }
  const redirectUrl = `${opts.origin}/dashboard?payment=success`;
  try {
    const response = await fetch(LS_API, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_options: { embed: false, media: true, logo: true },
            checkout_data: {
              email: opts.userEmail || undefined,
              custom: {
                user_id: opts.userId,
                email: opts.userEmail,
                amount_cents: planAmountCents(opts.planId, opts.billingCycle),
                guest_id: opts.guestId,
                ...(opts.planId ? { plan_id: opts.planId } : {}),
                ...(opts.billingCycle ? { billing_cycle: opts.billingCycle } : {}),
                ...(opts.referredBy ? { referred_by: String(opts.referredBy).slice(0, 32) } : {}),
              },
            },
            product_options: {
              redirect_url: redirectUrl,
              description: isSinglePass(opts.planId)
                ? `Single Pass: one tailored CV and job match report. $${SINGLE_PASS_USD.toFixed(2)}, no subscription.`
                : undefined,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: String(storeId) } },
            variant: { data: { type: 'variants', id: String(opts.variantId) } },
          },
        },
      }),
    });

    const data = await response.json().catch(() => ({})) as {
      data?: { attributes?: { url?: string } };
      errors?: Array<{ detail?: string }>;
    };

    if (!response.ok) {
      console.error('LemonSqueezy Checkout API Error:', data);
      return json({ error: data.errors?.[0]?.detail || 'Checkout error' }, response.status || 502);
    }

    const checkoutUrl = data.data?.attributes?.url;
    if (!checkoutUrl) {
      return json({ error: 'Checkout URL missing from Lemon Squeezy' }, 502);
    }
    return json({ checkoutUrl, provider: 'lemonsqueezy' });
  } catch (err) {
    console.error('Lemon checkout exception:', err);
    return json({ error: 'Could not start checkout. Please try again.' }, 500);
  }
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    let body: {
      variantId?: string;
      userId?: string;
      email?: string;
      userEmail?: string;
      planId?: string;
      billingCycle?: string;
      referredBy?: string;
      guestId?: string;
    };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const identity = await callerIdentity(req, body.userId, body.userEmail || body.email);
    const origin = originFrom(req);
    const planId = String(body.planId || '').trim();
    const billingCycle = isSinglePass(planId) ? 'once' : String(body.billingCycle || 'monthly');
    const polarProduct = polarProductId(planId || (isSinglePass(planId) ? 'single_pass' : ''), billingCycle);

    if (polarConfigured() && polarProduct) {
      const successUrl = `${origin}/dashboard?payment=success&checkout_id={CHECKOUT_ID}&kind=${encodeURIComponent(planId || 'single_pass')}`;
      const polar = await createPolarCheckout({
        productId: polarProduct,
        successUrl,
        email: identity.email,
        userId: identity.userId,
        planId: planId || undefined,
        billingCycle,
        referredBy: body.referredBy,
        guestId: body.guestId,
      });
      if ('url' in polar) {
        return json({ checkoutUrl: polar.url, checkoutId: polar.id, provider: 'polar', amountCents: planAmountCents(planId, billingCycle) });
      }
      console.warn('[checkout] Polar failed, falling back to Lemon Squeezy', polar.error);
    }

    const variantId = String(body.variantId ?? '').trim() || resolveVariantId(body.planId, body.billingCycle);
    if (!variantId || !/^\d+$/.test(variantId)) {
      if (isSinglePass(planId) && !polarConfigured()) {
        return json({ error: 'Single Pass checkout is not configured. Set POLAR_ACCESS_TOKEN and POLAR_PRODUCT_SINGLE_PASS, or a Lemon Squeezy variant.' }, 500);
      }
      return json({ error: 'variantId (numeric Lemon Squeezy variant) is required' }, 400);
    }

    return lemonCheckout({
      variantId,
      userId: identity.userId,
      userEmail: identity.email,
      planId: planId || undefined,
      billingCycle,
      referredBy: body.referredBy,
      guestId: body.guestId,
      origin,
    });
  } catch (err: unknown) {
    console.error('Checkout handler exception:', err);
    return json({ error: 'Could not start checkout. Please try again.' }, 500);
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
