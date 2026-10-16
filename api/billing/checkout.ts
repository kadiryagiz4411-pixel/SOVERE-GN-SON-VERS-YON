/**
 * POST /api/billing/checkout
 * Creates a Lemon Squeezy hosted checkout and returns { checkoutUrl }.
 */
import { preflight, json } from '../_lib/cors';
import { env, firstEnv } from '../_lib/env';

export const config = { runtime: 'edge' };

const LS_API = 'https://api.lemonsqueezy.com/v1/checkouts';

function originFrom(req: Request): string {
  const url = new URL(req.url);
  const forwarded = req.headers.get('x-forwarded-proto');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const proto = forwarded || url.protocol.replace(':', '') || 'https';
  return `${proto}://${host}`;
}

async function callerUserId(req: Request, bodyUserId?: string): Promise<string | undefined> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const anon = firstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (token && supabaseUrl && anon) {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (res.ok) {
      const user = await res.json() as { id?: string };
      if (user.id) return user.id;
    }
  }
  return bodyUserId || undefined;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = env('LEMONSQUEEZY_API_KEY');
  const storeId = env('LEMONSQUEEZY_STORE_ID');
  if (!apiKey || !storeId) {
    return json({ error: 'Lemon Squeezy is not configured on the server.' }, 500);
  }

  let body: {
    variantId?: string;
    userId?: string;
    email?: string;
    planId?: string;
    billingCycle?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const variantId = String(body.variantId ?? '').trim();
  if (!variantId || !/^\d+$/.test(variantId)) {
    return json({ error: 'variantId (numeric Lemon Squeezy variant) is required' }, 400);
  }

  const userId = await callerUserId(req, body.userId);
  const origin = originFrom(req);
  const redirectUrl = `${origin}/dashboard?payment=success`;

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_options: { embed: false, media: true, logo: true },
        checkout_data: {
          ...(body.email ? { email: body.email } : {}),
          custom: {
            ...(userId ? { user_id: userId } : {}),
            ...(body.planId ? { plan_id: body.planId } : {}),
            ...(body.billingCycle ? { billing_cycle: body.billingCycle } : {}),
          },
        },
        product_options: {
          redirect_url: redirectUrl,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: variantId } },
      },
    },
  };

  const lsRes = await fetch(LS_API, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const lsJson = await lsRes.json().catch(() => ({})) as {
    data?: { attributes?: { url?: string } };
    errors?: Array<{ detail?: string }>;
  };

  if (!lsRes.ok) {
    const detail = lsJson.errors?.[0]?.detail || `Lemon Squeezy ${lsRes.status}`;
    console.error('[billing/checkout]', detail);
    return json({ error: detail }, 502);
  }

  const checkoutUrl = lsJson.data?.attributes?.url;
  if (!checkoutUrl) return json({ error: 'Checkout URL missing from Lemon Squeezy' }, 502);

  return json({ checkoutUrl });
}
