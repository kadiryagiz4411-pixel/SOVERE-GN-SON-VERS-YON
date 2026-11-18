import { createHmac, timingSafeEqual } from 'node:crypto';
import { firstEnv } from './env.js';
import { SINGLE_PASS_CENTS } from './money.js';
import type { BillingPeriod, PlanTier } from './lemonsqueezy.js';

export function polarAccessToken(): string {
  return firstEnv('POLAR_ACCESS_TOKEN', 'POLAR_API_KEY');
}

export function polarWebhookSecret(): string {
  return firstEnv('POLAR_WEBHOOK_SECRET');
}

export function polarApiBase(): string {
  const env = firstEnv('POLAR_SERVER', 'POLAR_ENVIRONMENT').toLowerCase();
  const sandbox = env === 'sandbox' || env === 'sandbox-api';
  return (firstEnv('POLAR_API_BASE') || (sandbox
    ? 'https://sandbox-api.polar.sh/v1'
    : 'https://api.polar.sh/v1'
  )).replace(/\/$/, '');
}

export function polarConfigured(): boolean {
  return Boolean(polarAccessToken());
}

export function polarProductId(planId?: string, billingCycle?: string): string {
  const plan = String(planId || '').trim().toLowerCase();
  const yearly = /year|annual/.test(String(billingCycle || ''));
  if (plan === 'single_pass' || plan === 'one_pass' || plan === 'onetime' || plan === 'one_time') {
    return firstEnv('POLAR_PRODUCT_SINGLE_PASS', 'POLAR_PRODUCT_ONE_PASS', 'POLAR_PRODUCT_PASS');
  }
  const table: Record<string, [string, string]> = {
    standard: ['POLAR_PRODUCT_STANDARD_MONTHLY', 'POLAR_PRODUCT_STANDARD_ANNUAL'],
    starter: ['POLAR_PRODUCT_STANDARD_MONTHLY', 'POLAR_PRODUCT_STANDARD_ANNUAL'],
    pro: ['POLAR_PRODUCT_PRO_MONTHLY', 'POLAR_PRODUCT_PRO_ANNUAL'],
    elite: ['POLAR_PRODUCT_ELITE_MONTHLY', 'POLAR_PRODUCT_ELITE_ANNUAL'],
    enterprise: ['POLAR_PRODUCT_ENTERPRISE_MONTHLY', 'POLAR_PRODUCT_ENTERPRISE_ANNUAL'],
    b2b_enterprise: ['POLAR_PRODUCT_ENTERPRISE_MONTHLY', 'POLAR_PRODUCT_ENTERPRISE_ANNUAL'],
  };
  const keys = table[plan];
  if (!keys) return '';
  return firstEnv(yearly ? keys[1] : keys[0], keys[0], keys[1]);
}

export function isPolarWebhook(req: Request): boolean {
  return Boolean(
    (req.headers.get('webhook-id') || req.headers.get('Webhook-Id'))
    && (req.headers.get('webhook-signature') || req.headers.get('Webhook-Signature')),
  );
}

function secretBytes(secret: string): Buffer {
  if (secret.startsWith('whsec_')) {
    return Buffer.from(secret.slice('whsec_'.length), 'base64');
  }
  return Buffer.from(secret, 'utf8');
}

/** Standard Webhooks (Polar): HMAC-SHA256 of `{id}.{timestamp}.{body}`. */
export function verifyPolarSignature(rawBody: string, req: Request, secret: string): boolean {
  if (!secret) return false;
  const id = req.headers.get('webhook-id') || req.headers.get('Webhook-Id') || '';
  const ts = req.headers.get('webhook-timestamp') || req.headers.get('Webhook-Timestamp') || '';
  const header = req.headers.get('webhook-signature') || req.headers.get('Webhook-Signature') || '';
  if (!id || !ts || !header) return false;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  if (Math.abs(Date.now() / 1000 - tsNum) > 5 * 60) return false;

  const expected = createHmac('sha256', secretBytes(secret))
    .update(`${id}.${ts}.${rawBody}`)
    .digest('base64');
  const expectedBuf = Buffer.from(expected);

  for (const part of header.split(/\s+/)) {
    const comma = part.indexOf(',');
    if (comma < 0) continue;
    const ver = part.slice(0, comma);
    const val = part.slice(comma + 1);
    if (ver !== 'v1' || !val) continue;
    const got = Buffer.from(val);
    if (got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf)) return true;
  }
  return false;
}

export function planFromPolarProduct(productId: string, productName: string, amountCents?: number): { tier: PlanTier; period: BillingPeriod } | null {
  const id = String(productId || '').trim();
  const pairs: Array<[string, { tier: PlanTier; period: BillingPeriod }]> = [
    [firstEnv('POLAR_PRODUCT_SINGLE_PASS', 'POLAR_PRODUCT_ONE_PASS', 'POLAR_PRODUCT_PASS'), { tier: 'single_pass', period: 'once' }],
    [firstEnv('POLAR_PRODUCT_STANDARD_MONTHLY'), { tier: 'standard', period: 'monthly' }],
    [firstEnv('POLAR_PRODUCT_STANDARD_ANNUAL'), { tier: 'standard', period: 'yearly' }],
    [firstEnv('POLAR_PRODUCT_PRO_MONTHLY'), { tier: 'pro', period: 'monthly' }],
    [firstEnv('POLAR_PRODUCT_PRO_ANNUAL'), { tier: 'pro', period: 'yearly' }],
    [firstEnv('POLAR_PRODUCT_ELITE_MONTHLY'), { tier: 'elite', period: 'monthly' }],
    [firstEnv('POLAR_PRODUCT_ELITE_ANNUAL'), { tier: 'elite', period: 'yearly' }],
    [firstEnv('POLAR_PRODUCT_ENTERPRISE_MONTHLY'), { tier: 'B2B_ENTERPRISE', period: 'monthly' }],
    [firstEnv('POLAR_PRODUCT_ENTERPRISE_ANNUAL'), { tier: 'B2B_ENTERPRISE', period: 'yearly' }],
  ];
  for (const [envId, cfg] of pairs) {
    if (envId && id && envId === id) return cfg;
  }
  const blob = String(productName || '').toLowerCase();
  const yearly = /year|annual/.test(blob);
  const period: BillingPeriod = yearly ? 'yearly' : (/pass|one.?time|single/.test(blob) ? 'once' : 'monthly');
  if (/enterprise|agency|b2b/.test(blob)) return { tier: 'B2B_ENTERPRISE', period: yearly ? 'yearly' : 'monthly' };
  if (/elite/.test(blob)) return { tier: 'elite', period: yearly ? 'yearly' : 'monthly' };
  if (/\bpro\b/.test(blob)) return { tier: 'pro', period: yearly ? 'yearly' : 'monthly' };
  if (/standard|starter/.test(blob)) return { tier: 'standard', period: yearly ? 'yearly' : 'monthly' };
  if (/single|one.?pass|pass/.test(blob)) return { tier: 'single_pass', period: 'once' };
  if (amountCents === SINGLE_PASS_CENTS) return { tier: 'single_pass', period: 'once' };
  return null;
}

export async function createPolarCheckout(opts: {
  productId: string;
  successUrl: string;
  email?: string;
  userId?: string;
  planId?: string;
  billingCycle?: string;
  referredBy?: string;
  guestId?: string;
}): Promise<{ url: string; id: string } | { error: string; status: number }> {
  const token = polarAccessToken();
  if (!token) return { error: 'Polar billing is not configured.', status: 500 };
  const metadata: Record<string, string> = {};
  if (opts.userId) metadata.user_id = opts.userId;
  if (opts.email) metadata.email = opts.email;
  if (opts.planId) metadata.plan_id = opts.planId;
  if (opts.billingCycle) metadata.billing_cycle = opts.billingCycle;
  if (opts.referredBy) metadata.referred_by = opts.referredBy.slice(0, 32);
  if (opts.guestId) metadata.guest_id = opts.guestId.slice(0, 64);
  if (opts.planId && /single.?pass|one.?pass|one.?time/.test(opts.planId)) {
    metadata.amount_cents = String(SINGLE_PASS_CENTS);
  }

  const body: Record<string, unknown> = {
    products: [opts.productId],
    success_url: opts.successUrl,
    metadata,
  };
  if (opts.email) body.customer_email = opts.email;
  if (opts.userId) body.external_customer_id = opts.userId;

  const res = await fetch(`${polarApiBase()}/checkouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    const detail = String(
      (data.error as { detail?: string } | undefined)?.detail
      || data.detail
      || data.message
      || 'Could not create Polar checkout',
    );
    console.error('[polar] checkout failed', res.status, data);
    return { error: detail, status: res.status >= 400 ? res.status : 502 };
  }
  const url = String(data.url || (data as { checkout_url?: string }).checkout_url || '');
  const id = String(data.id || '');
  if (!url) return { error: 'Polar checkout URL missing', status: 502 };
  return { url, id };
}

export async function fetchPolarCheckout(checkoutId: string): Promise<Record<string, unknown> | null> {
  const token = polarAccessToken();
  if (!token || !checkoutId) return null;
  const res = await fetch(`${polarApiBase()}/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null) as Record<string, unknown> | null;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
