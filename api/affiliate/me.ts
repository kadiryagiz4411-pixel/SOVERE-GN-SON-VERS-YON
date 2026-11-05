import { json, preflight } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { firstEnv } from '../_lib/env.js';
import { adminHeaders, DEFAULT_AFFILIATE_PCT, normalizeAffiliateCode, supabaseAdminConfig } from '../_lib/affiliate.js';

export const config = { runtime: 'nodejs' };

async function callerUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const anon = firstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!token || !supabaseUrl || !anon) return null;
  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anon },
  });
  if (!res.ok) return null;
  const user = await res.json() as { id?: string; email?: string };
  return user.id ? { id: user.id, email: user.email } : null;
}

function makeCode(userId: string, email?: string) {
  const seed = `${userId}:${email || ''}`.slice(0, 24);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
  return `SOV${Math.abs(hash).toString(36).toUpperCase().slice(0, 8)}`;
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await callerUser(req);
  if (!user) return json({ error: 'Sign in required' }, 401);
  const { base, key } = supabaseAdminConfig();
  if (!base || !key) return json({ error: 'Affiliate ledger is not configured' }, 500);

  const existing = await fetch(`${base}/rest/v1/affiliate_partners?user_id=eq.${user.id}&limit=1`, {
    headers: adminHeaders(key),
  }).then((res) => res.json()).catch(() => []);
  let partner = Array.isArray(existing) ? existing[0] : null;

  if (!partner && req.method === 'POST') {
    const profile = await fetch(`${base}/rest/v1/profiles?or=(id.eq.${user.id},user_id.eq.${user.id})&select=referral_code&limit=1`, {
      headers: adminHeaders(key),
    }).then((res) => res.json()).catch(() => []);
    const fromProfile = normalizeAffiliateCode(Array.isArray(profile) ? profile[0]?.referral_code : '');
    const code = fromProfile || makeCode(user.id, user.email);
    const created = await fetch(`${base}/rest/v1/affiliate_partners`, {
      method: 'POST',
      headers: { ...adminHeaders(key), Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({
        user_id: user.id,
        code,
        commission_pct: DEFAULT_AFFILIATE_PCT,
        payout_mode: 'monthly_recurring',
        status: 'active',
      }),
    }).then((res) => res.json()).catch(() => []);
    partner = Array.isArray(created) ? created[0] : created;
  }

  if (!partner) {
    return json({
      partner: null,
      referralUrl: null,
      commissionPct: DEFAULT_AFFILIATE_PCT,
      commissions: [],
    });
  }

  const commissions = await fetch(
    `${base}/rest/v1/affiliate_commissions?partner_id=eq.${partner.id}&order=created_at.desc&limit=24`,
    { headers: adminHeaders(key) },
  ).then((res) => res.json()).catch(() => []);

  return json({
    partner,
    referralUrl: `https://sovereignapp.pro/ref?code=${encodeURIComponent(String(partner.code || ''))}`,
    commissionPct: Number(partner.commission_pct || DEFAULT_AFFILIATE_PCT),
    commissions: Array.isArray(commissions) ? commissions : [],
  });
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const POST = api.POST;
export default api;
