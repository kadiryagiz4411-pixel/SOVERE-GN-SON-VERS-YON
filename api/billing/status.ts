/**
 * GET /api/billing/status
 * Post-checkout polling: plan + pass credits after Polar/LS webhooks settle.
 */
import { json, preflight } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { firstEnv } from '../_lib/env.js';
import { asRecord, fetchPolarCheckout } from '../_lib/polar.js';
import { readEntitlements } from '../_lib/billingFulfill.js';

export const config = { runtime: 'nodejs', maxDuration: 15 };

function bearerToken(req: Request): string {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

async function callerUser(req: Request): Promise<{ id: string; email: string } | null> {
  const token = bearerToken(req);
  const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  const anon = firstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!token || !supabaseUrl || !anon) return null;
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anon },
  });
  if (!res.ok) return null;
  const user = asRecord(await res.json());
  const id = String(user.id || '');
  if (!id) return null;
  return { id, email: String(user.email || '').trim().toLowerCase() };
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const url = new URL(req.url);
    const checkoutId = url.searchParams.get('checkout_id') || url.searchParams.get('checkoutId') || '';
    const user = await callerUser(req);

    let polarStatus = '';
    if (checkoutId) {
      const checkout = await fetchPolarCheckout(checkoutId);
      polarStatus = String(asRecord(checkout).status || '');
    }

    if (!user) {
      const succeeded = /succeed|confirm|paid|complete/i.test(polarStatus);
      return json({
        activating: !succeeded,
        ready: succeeded,
        signedIn: false,
        polarStatus: polarStatus || null,
        message: succeeded
          ? 'Payment received. Sign in with the same email to activate your pass.'
          : 'Activating your pass...',
      });
    }

    const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/$/, '');
    const anon = firstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
    if (supabaseUrl && anon) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/claim_pending_pass_grants`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${bearerToken(req)}`,
            apikey: anon,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id_input: user.id, email_input: user.email || null }),
        });
      } catch {
        /* claim is best-effort during poll */
      }
    }

    const entitlements = await readEntitlements(user.id);
    const pass = entitlements?.singlePassCredits ?? 0;
    const remaining = entitlements?.remainingCredits ?? 0;
    const plan = String(entitlements?.planType || 'free').toLowerCase();
    const paid = plan !== 'free' && plan !== '' && plan !== 'none' && plan !== 'trial';
    const ready = pass > 0 || remaining > 0 || paid;
    const polarPaid = /succeed|confirm|paid|complete/i.test(polarStatus);

    return json({
      activating: !ready,
      ready,
      signedIn: true,
      planType: entitlements?.planType || 'free',
      remainingCredits: remaining,
      singlePassCredits: pass,
      subscriptionStatus: entitlements?.subscriptionStatus || 'active',
      polarStatus: polarStatus || null,
      polarPaid,
      message: ready ? 'Your pass is active.' : 'Activating your pass...',
    });
  } catch (err) {
    console.error('[billing/status]', err);
    return json({ activating: true, ready: false, message: 'Activating your pass...' }, 200);
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
