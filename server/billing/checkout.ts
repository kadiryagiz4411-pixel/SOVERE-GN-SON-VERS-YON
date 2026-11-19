/**
 * POST /api/billing/checkout
 * Polar.sh hosted checkout (Stripe-backed merchant of record).
 * Polar product/price IDs map each plan. Amounts come from server/_lib/money.ts.
 */
import { preflight, json } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { firstEnv } from '../_lib/env.js';
import { createPolarCheckout, polarConfigured, polarProductId } from '../_lib/polar.js';
import { SINGLE_PASS_USD, planAmountCents } from '../_lib/money.js';

export const config = { runtime: 'nodejs', maxDuration: 30 };

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

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    let body: {
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

    if (!polarConfigured()) {
      return json({ error: 'Checkout is not configured. Set POLAR_ACCESS_TOKEN and Polar product IDs.' }, 503);
    }
    if (!polarProduct) {
      return json({ error: 'No Polar product is mapped for this plan. Set POLAR_PRODUCT_* env vars.' }, 500);
    }

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
      return json({
        checkoutUrl: polar.url,
        url: polar.url,
        checkoutId: polar.id,
        provider: 'polar',
        amountCents: planAmountCents(planId, billingCycle),
        ...(isSinglePass(planId) ? { description: `Single Pass: one tailored CV and job match report. $${SINGLE_PASS_USD.toFixed(2)}, no subscription.` } : {}),
      });
    }
    console.error('[checkout] Polar failed', polar.error);
    return json({ error: polar.error || 'Checkout is temporarily unavailable. Please try again.' }, 502);
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
