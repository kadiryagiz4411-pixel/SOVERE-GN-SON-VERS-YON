/**
 * GET /api/extension/me
 * Resolves the signed-in user's B2C / B2B / admin workspace from Supabase.
 */
import { preflight, jsonNoStore } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { firstEnv } from '../_lib/env.js';

export const config = { runtime: 'nodejs', maxDuration: 15 };

const OWNER_EMAIL = 'kadiryagiz4411@gmail.com';

function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
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

    let profile: Record<string, unknown> = {};
    if (userId) {
      const selects = [
        'role,is_admin,b2b_access,plan_type,org_role,b2b_subscription_status,appsumo_tier',
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
        profile = asRecord(Array.isArray(rows) ? rows[0] : rows);
        if (Object.keys(profile).length) break;
      }
    }

    const role = String(profile.role || '').toLowerCase();
    const isAdmin = email === OWNER_EMAIL
      || role === 'admin'
      || profile.is_admin === true;
    const planType = String(profile.plan_type || '').toLowerCase();
    const b2bStatus = String(profile.b2b_subscription_status || '').toLowerCase();
    const hasB2BAccess = isAdmin
      || profile.b2b_access === true
      || b2bStatus === 'active'
      || planType.includes('enterprise')
      || planType.includes('b2b')
      || Number(profile.appsumo_tier || 0) >= 3;
    const workspace = isAdmin ? 'dual' : hasB2BAccess ? 'b2b' : 'b2c';

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
