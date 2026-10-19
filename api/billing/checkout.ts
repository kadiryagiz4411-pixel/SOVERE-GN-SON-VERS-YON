/**
 * POST /api/billing/checkout
 * Creates a Lemon Squeezy hosted checkout and returns { checkoutUrl }.
 */
import { preflight, json } from '../_lib/cors.js';
import { firstEnv } from '../_lib/env.js';
import { lemonApiKey, lemonStoreId, resolveVariantId } from '../_lib/lemonsqueezy.js';

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

  try {
    const apiKey = lemonApiKey();
    const storeId = lemonStoreId();
    if (!apiKey || !storeId) {
      console.error('LemonSqueezy configuration missing: LEMONSQUEEZY_API_KEY or LEMONSQUEEZY_STORE_ID');
      return json({ error: 'LemonSqueezy billing is not configured in environment variables.' }, 500);
    }

    let body: {
      variantId?: string;
      userId?: string;
      email?: string;
      userEmail?: string;
      planId?: string;
      billingCycle?: string;
    };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const variantId = String(body.variantId ?? '').trim() || resolveVariantId(body.planId, body.billingCycle);
    if (!variantId || !/^\d+$/.test(variantId)) {
      return json({ error: 'variantId (numeric Lemon Squeezy variant) is required' }, 400);
    }

    const userId = await callerUserId(req, body.userId);
    const userEmail = body.userEmail || body.email;
    const origin = originFrom(req);
    const redirectUrl = `${origin}/dashboard?payment=success`;

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
              email: userEmail || undefined,
              custom: {
                user_id: userId,
                ...(body.planId ? { plan_id: body.planId } : {}),
                ...(body.billingCycle ? { billing_cycle: body.billingCycle } : {}),
              },
            },
            product_options: {
              redirect_url: redirectUrl,
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: String(storeId),
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: String(variantId),
              },
            },
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
      console.error('LemonSqueezy Checkout API Error: missing url', data);
      return json({ error: 'Checkout URL missing from Lemon Squeezy' }, 502);
    }

    return json({ checkoutUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Checkout handler exception:', err);
    return json({ error: message }, 500);
  }
}
