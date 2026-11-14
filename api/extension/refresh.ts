/**
 * POST /api/extension/refresh
 * Exchange a Supabase refresh_token so the extension stays signed in.
 */
import { jsonNoStore, preflightNoStore } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { firstEnv } from '../_lib/env.js';

export const config = { runtime: 'nodejs', maxDuration: 15 };

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflightNoStore();
  if (req.method !== 'POST') return jsonNoStore({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({})) as { refreshToken?: string; refresh_token?: string };
    const refreshToken = String(body.refreshToken || body.refresh_token || '').trim();
    const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
    const anon = firstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
    if (!supabaseUrl || !anon) return jsonNoStore({ error: 'Auth service not configured' }, 500);
    if (!refreshToken) return jsonNoStore({ error: 'Sign in on Sovereign to continue.' }, 401);

    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await res.json().catch(() => ({})) as {
      access_token?: string;
      refresh_token?: string;
      user?: { email?: string };
    };
    if (!res.ok || !data.access_token) {
      return jsonNoStore({ error: 'Sign in on Sovereign to continue.' }, 401);
    }
    return jsonNoStore({
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      email: data.user?.email || '',
    });
  } catch (err) {
    console.error('extension/refresh failed', err);
    return jsonNoStore({ error: 'Could not refresh your session. Please sign in again.' }, 500);
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const POST = api.POST;
export default api;
