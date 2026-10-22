/**
 * GET /api/extension/me
 * Resolves the signed-in user's B2C / B2B / admin workspace from Supabase.
 * AppSumo lifetime users are gated by monthly credits, never by SaaS subscription status.
 */
import { preflight, jsonNoStore } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { firstEnv } from '../_lib/env.js';

export const config = { runtime: 'nodejs', maxDuration: 15 };

const OWNER_EMAIL = 'kadiryagiz4411@gmail.com';
const APPSUMO_ZERO_MESSAGE =
  'Monthly AppSumo credits reached. Credits will automatically refresh next month or upgrade your AppSumo Tier for more credits.';

function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function isAppsumoUser(profile: Record<string, unknown>): boolean {
  if (Number(profile.appsumo_tier || 0) >= 1) return true;
  if (Number(profile.appsumo_codes_count || 0) >= 1) return true;
  const blob = `${profile.appsumo_plan || ''} ${profile.plan_type || ''} ${profile.subscription_tier || ''}`.toLowerCase();
  return blob.includes('appsumo');
}

async function fetchProfile(
  supabaseUrl: string,
  anon: string,
  token: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const selects = [
    'role,is_admin,b2b_access,plan_type,org_role,b2b_subscription_status,appsumo_tier,appsumo_plan,appsumo_codes_count,remaining_credits,credits_remaining,monthly_credit_limit,subscription_status,subscription_tier',
    'role,is_admin,b2b_access,plan_type,org_role,b2b_subscription_status,appsumo_tier,remaining_credits,monthly_credit_limit,subscription_status',
    'b2b_access,plan_type,b2b_subscription_status,appsumo_tier',
    'plan_type',
  ];
  for (const select of selects) {
    const qs = new URLSearchParams({
      select,
      or: `(id.eq.${userId},user_id.eq.${userId})`,
      limit: '1',
    });
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?${qs.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        Accept: 'application/json',
      },
    });
    if (!profileRes.ok) continue;
    const rows = await profileRes.json().catch(() => []);
    const profile = asRecord(Array.isArray(rows) ? rows[0] : rows);
    if (Object.keys(profile).length) return profile;
  }
  return {};
}

async function refreshCreditsIfDue(
  supabaseUrl: string,
  anon: string,
  token: string,
  userId: string,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/reset_monthly_credits_if_due`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id_input: userId }),
    });
  } catch {
    /* lazy reset is best-effort */
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS' || req.headers.get('access-control-request-method')) {
    return preflight();
  }
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
    return jsonNoStore({ error: 'Method not allowed' }, 405);
  }

  const token = bearerToken(req);
  const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  const anon = firstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!supabaseUrl || !anon) {
    return jsonNoStore({ error: 'Auth service not configured on server' }, 500);
  }
  if (!token) {
    return jsonNoStore({
      success: true,
      signedIn: false,
      email: '',
      role: 'individual',
      is_admin: false,
      isAdmin: false,
      b2b_access: false,
      hasB2BAccess: false,
      is_appsumo_user: false,
      remainingCredits: 0,
      monthlyCreditLimit: 0,
      workspace: 'b2c',
    });
  }

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!userRes.ok) {
      return jsonNoStore({ success: false, signedIn: false, error: 'Sign in on Sovereign to unlock your plan.' }, 401);
    }
    const user = asRecord(await userRes.json());
    const userId = String(user.id || '');
    const email = String(user.email || '').trim().toLowerCase();

    if (userId) {
      await refreshCreditsIfDue(supabaseUrl, anon, token, userId);
    }
    const profile = userId ? await fetchProfile(supabaseUrl, anon, token, userId) : {};

    const role = String(profile.role || '').toLowerCase();
    const isAdmin = email === OWNER_EMAIL
      || role === 'admin'
      || profile.is_admin === true;
    const planType = String(profile.plan_type || '').toLowerCase();
    const b2bStatus = String(profile.b2b_subscription_status || '').toLowerCase();
    const appsumo = isAdmin || isAppsumoUser(profile);
    const remainingCredits = Number(
      profile.credits_remaining ?? profile.remaining_credits ?? 0,
    );
    const monthlyCreditLimit = Number(profile.monthly_credit_limit ?? 0);
    const subscriptionStatus = String(profile.subscription_status || 'active').toLowerCase();
    const hasB2BAccess = isAdmin
      || profile.b2b_access === true
      || b2bStatus === 'active'
      || planType.includes('enterprise')
      || planType.includes('b2b')
      || Number(profile.appsumo_tier || 0) >= 3;
    const workspace = isAdmin ? 'dual' : hasB2BAccess ? 'b2b' : 'b2c';
    const saasExpired = !appsumo && ['canceled', 'cancelled', 'expired', 'past_due', 'unpaid', 'paused'].includes(subscriptionStatus);
    const creditsDepleted = !isAdmin && remainingCredits <= 0;
    const canGenerate = isAdmin || (appsumo ? remainingCredits > 0 : !saasExpired && remainingCredits > 0);

    return jsonNoStore({
      success: true,
      signedIn: true,
      email,
      userId,
      role: isAdmin ? 'admin' : hasB2BAccess ? 'b2b' : 'individual',
      is_admin: isAdmin,
      isAdmin,
      b2b_access: hasB2BAccess,
      hasB2BAccess,
      planType: planType || 'free',
      workspace,
      is_appsumo_user: appsumo,
      isAppsumoUser: appsumo,
      appsumo_tier: Number(profile.appsumo_tier || 0),
      remainingCredits,
      monthlyCreditLimit,
      subscriptionStatus: appsumo ? 'lifetime' : subscriptionStatus,
      canGenerate,
      creditsDepleted,
      saasExpired,
      creditPrompt: appsumo && creditsDepleted ? APPSUMO_ZERO_MESSAGE : null,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('extension/me failed:', err?.message || error);
    return jsonNoStore({ success: false, error: 'Could not resolve your plan.' }, 500);
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
