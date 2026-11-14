import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { env, firstEnv } from './env.js';

export const GUEST_ACTION_LIMIT = 2;
const COOKIE = 'sovereign_guest';

function secret(): string {
  return firstEnv('GUEST_QUOTA_SECRET', 'SUPABASE_SERVICE_ROLE_KEY') || env('OPENAI_API_KEY') || 'sovereign-guest';
}

function sign(id: string, used: number): string {
  return createHmac('sha256', secret()).update(`${id}.${used}`).digest('hex').slice(0, 32);
}

export function hasBearer(req: Request): boolean {
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  return /^Bearer\s+\S{20,}/i.test(header);
}

function parseCookie(req: Request): { id: string; used: number } | null {
  const raw = req.headers.get('cookie') || '';
  const match = raw.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(COOKIE.length + 1));
  const [id, usedStr, sig] = value.split('.');
  if (!id || !usedStr || !sig) return null;
  const used = Number(usedStr);
  if (!Number.isFinite(used) || used < 0) return null;
  const expected = sign(id, used);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { id, used };
}

function cookieHeader(id: string, used: number, secure: boolean): string {
  const token = `${id}.${used}.${sign(id, used)}`;
  return [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${60 * 60 * 24 * 400}`,
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

export function inspectGuestQuota(req: Request): {
  authed: boolean;
  allowed: boolean;
  id: string;
  used: number;
  remaining: number;
} {
  if (hasBearer(req)) {
    return { authed: true, allowed: true, id: '', used: 0, remaining: GUEST_ACTION_LIMIT };
  }
  const existing = parseCookie(req);
  const headerId = String(req.headers.get('x-sovereign-guest') || '').trim();
  const id = existing?.id || headerId || randomUUID();
  const used = existing?.used ?? 0;
  return {
    authed: false,
    allowed: used < GUEST_ACTION_LIMIT,
    id,
    used,
    remaining: Math.max(0, GUEST_ACTION_LIMIT - used),
  };
}

export function guestLimitPayload(quota: ReturnType<typeof inspectGuestQuota>) {
  return {
    error: 'guest_limit',
    gate: true,
    guestUsed: quota.used,
    guestRemaining: 0,
    message: 'You used your 2 free generations. Sign in to continue.',
  };
}

export function guestSuccessHeaders(req: Request, quota: ReturnType<typeof inspectGuestQuota>): Record<string, string> {
  if (quota.authed) return {};
  const used = Math.min(GUEST_ACTION_LIMIT, quota.used + 1);
  const secure = !String(req.headers.get('host') || '').includes('localhost');
  return { 'Set-Cookie': cookieHeader(quota.id, used, secure) };
}

export function guestPeekHeaders(req: Request, quota: ReturnType<typeof inspectGuestQuota>): Record<string, string> {
  if (quota.authed || !quota.id) return {};
  const secure = !String(req.headers.get('host') || '').includes('localhost');
  return { 'Set-Cookie': cookieHeader(quota.id, quota.used, secure) };
}

/** Clone a Response so Set-Cookie can be attached even when headers are immutable. */
export function withGuestHeaders(res: Response, extra: Record<string, string>): Response {
  if (!extra || Object.keys(extra).length === 0) return res;
  const headers = new Headers(res.headers);
  Object.entries(extra).forEach(([key, value]) => headers.set(key, value));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
