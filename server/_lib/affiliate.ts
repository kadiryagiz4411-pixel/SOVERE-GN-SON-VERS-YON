import { firstEnv, env } from './env.js';

export const DEFAULT_AFFILIATE_PCT = 30;

export function supabaseAdminConfig() {
  const base = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return { base, key };
}

export function adminHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

export function moneyUsd(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (Number.isInteger(n) && n >= 100) return Math.round(n) / 100;
  return Math.round(n * 100) / 100;
}

export function normalizeAffiliateCode(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
}

async function rest<T>(base: string, key: string, path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: { ...adminHeaders(key), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Supabase ${res.status}`);
  }
  if (res.status === 204) return null;
  return (await res.json().catch(() => null)) as T;
}

export async function findPartnerByCode(base: string, key: string, code: string) {
  const safe = normalizeAffiliateCode(code);
  if (!safe) return null;
  const rows = await rest<Array<Record<string, unknown>>>(
    base,
    key,
    `affiliate_partners?code=eq.${encodeURIComponent(safe)}&status=eq.active&limit=1`,
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function recordAffiliateClick(code: string, landingPath = '/', utmSource = '') {
  const { base, key } = supabaseAdminConfig();
  const safe = normalizeAffiliateCode(code);
  if (!base || !key || !safe) return false;
  const partner = await findPartnerByCode(base, key, safe);
  await rest(base, key, 'affiliate_clicks', {
    method: 'POST',
    body: JSON.stringify({
      code: safe,
      landing_path: String(landingPath || '/').slice(0, 240),
      utm_source: String(utmSource || '').slice(0, 80),
    }),
  });
  if (partner?.id) {
    await rest(base, key, `affiliate_partners?id=eq.${partner.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        total_clicks: Number(partner.total_clicks || 0) + 1,
        updated_at: new Date().toISOString(),
      }),
    });
  }
  return true;
}

export async function creditAffiliateCommission(input: {
  referredUserId: string;
  eventName: string;
  invoiceId?: string;
  subscriptionId?: string;
  invoiceUsd?: number;
}) {
  const { base, key } = supabaseAdminConfig();
  if (!base || !key || !input.referredUserId) return { credited: false, reason: 'missing-config' };

  const profiles = await rest<Array<{ referred_by?: string | null }>>(
    base,
    key,
    `profiles?or=(id.eq.${input.referredUserId},user_id.eq.${input.referredUserId})&select=referred_by&limit=1`,
  );
  const code = normalizeAffiliateCode(profiles?.[0]?.referred_by);
  if (!code) return { credited: false, reason: 'no-referrer' };

  const partner = await findPartnerByCode(base, key, code);
  if (!partner?.id) return { credited: false, reason: 'unknown-partner' };

  const invoiceUsd = moneyUsd(input.invoiceUsd);
  const pct = Number(partner.commission_pct || DEFAULT_AFFILIATE_PCT);
  const commissionUsd = Math.round(invoiceUsd * (pct / 100) * 100) / 100;
  const invoiceId = String(input.invoiceId || input.subscriptionId || `${input.eventName}-${Date.now()}`);

  try {
    await rest(base, key, 'affiliate_commissions', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        partner_id: partner.id,
        referred_user_id: input.referredUserId,
        ls_subscription_id: input.subscriptionId || null,
        ls_invoice_id: invoiceId,
        source_event: input.eventName,
        invoice_usd: invoiceUsd,
        commission_usd: commissionUsd,
        commission_pct: pct,
        period_start: new Date().toISOString().slice(0, 10),
        status: 'accrued',
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/duplicate|unique/i.test(message)) return { credited: false, reason: 'duplicate' };
    throw err;
  }

  await rest(base, key, `affiliate_partners?id=eq.${partner.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      total_paid_referrals: Number(partner.total_paid_referrals || 0) + 1,
      lifetime_commission_usd: Number(partner.lifetime_commission_usd || 0) + commissionUsd,
      updated_at: new Date().toISOString(),
    }),
  });

  return { credited: true, commissionUsd, pct, partnerId: partner.id };
}
