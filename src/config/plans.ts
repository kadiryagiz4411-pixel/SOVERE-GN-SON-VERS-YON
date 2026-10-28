/**
 * Lemon Squeezy plan + variant registry.
 * Dollar prices stay in src/config/pricing.ts — this file only maps checkout.
 *
 * Env (any alias works; first non-empty wins):
 *   VITE_STANDARD_MONTHLY_VARIANT_ID / VITE_LEMONSQUEEZY_STANDARD_MONTHLY_VARIANT_ID
 *   VITE_STANDARD_YEARLY_VARIANT_ID  / VITE_LEMONSQUEEZY_STANDARD_ANNUAL_VARIANT_ID
 *   …same pattern for PRO, ELITE, ENTERPRISE
 *   VITE_LEMONSQUEEZY_*_MONTHLY_URL / *_ANNUAL_URL
 *   VITE_LEMONSQUEEZY_TIER1_URL / TIER2 / TIER3 / VITE_APPSUMO_*_URL
 *   VITE_LEMONSQUEEZY_STORE_URL (default https://sovereignapp.lemonsqueezy.com)
 */

import {
  checkoutUrlFromVariant,
  getLemonStoreUrl,
  isBrokenCheckoutUrl,
  sanitizeCheckoutUrl,
} from '@/lib/lemonsqueezy';

export type BillingCycle = 'monthly' | 'yearly';
export type CheckoutPlanId = 'standard' | 'pro' | 'elite' | 'enterprise' | 'single_pass';

const env = (key: string): string => {
  const value = typeof import.meta !== 'undefined'
    ? String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim()
    : '';
  return value;
};

const firstEnv = (...keys: string[]): string => {
  for (const key of keys) {
    const value = env(key);
    if (value) return value;
  }
  return '';
};

export const LEMON_SQUEEZY_STORE_URL = getLemonStoreUrl();

/**
 * Canonical Lemon Squeezy variant IDs.
 * Env vars override these defaults when set.
 */
/**
 * Lemon Squeezy variant IDs mapped per plan + billing cycle.
 *
 * IMPORTANT: Numeric IDs (e.g. 2020873) are ONLY for the server-side
 * /api/billing/checkout endpoint which uses the LS API to mint a hosted
 * checkout session. They CANNOT be used as direct buy-path slugs
 * (/checkout/buy/nnnn 404s).
 *
 * Numeric defaults are stored as empty strings here so that
 * resolveCheckoutUrl() falls through silently to the UUID FALLBACK_CHECKOUT_URLS
 * or getLemonStoreUrl() without logging a console warning.
 *
 * To wire up the API checkout for Standard / Enterprise, set:
 *   VITE_STANDARD_MONTHLY_VARIANT_ID=2020873  (Vercel env only — not VITE_ prefix)
 *   VITE_ENTERPRISE_MONTHLY_VARIANT_ID=2020877
 * and pass them to CheckoutButton as lsVariantId — the component calls
 * /api/billing/checkout when it receives a numeric lsVariantId.
 */
export const LEMON_SQUEEZY_VARIANTS = {
  standard: {
    // Numeric API variant IDs intentionally stored as empty — they are API-only.
    // CheckoutButton.lsVariantId handles the API path when env vars are set.
    monthly: firstEnv(
      'VITE_STANDARD_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_STANDARD_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_STANDARD_VARIANT_ID',
      'VITE_LS_VARIANT_STANDARD_MONTHLY',
    ),
    yearly: firstEnv(
      'VITE_STANDARD_YEARLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_STANDARD_ANNUAL_VARIANT_ID',
      'VITE_LEMONSQUEEZY_STANDARD_YEARLY_VARIANT_ID',
      'VITE_LS_VARIANT_STANDARD_ANNUAL',
    ),
  },
  pro: {
    monthly: firstEnv(
      'VITE_PRO_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_PRO_VARIANT_ID',
      'VITE_LS_VARIANT_PRO_MONTHLY',
    ),
    yearly: firstEnv(
      'VITE_PRO_YEARLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID',
      'VITE_LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID',
      'VITE_LS_VARIANT_PRO_ANNUAL',
    ),
  },
  elite: {
    monthly: firstEnv(
      'VITE_ELITE_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ELITE_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ELITE_VARIANT_ID',
      'VITE_LS_VARIANT_ELITE_MONTHLY',
    ),
    yearly: firstEnv(
      'VITE_ELITE_YEARLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ELITE_ANNUAL_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ELITE_YEARLY_VARIANT_ID',
      'VITE_LS_VARIANT_ELITE_ANNUAL',
    ),
  },
  enterprise: {
    monthly: firstEnv(
      'VITE_ENTERPRISE_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ENTERPRISE_VARIANT_ID',
      'VITE_LS_VARIANT_ENTERPRISE_MONTHLY',
    ),
    yearly: firstEnv(
      'VITE_ENTERPRISE_YEARLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID',
      'VITE_LS_VARIANT_ENTERPRISE_ANNUAL',
    ),
  },
} as const;

/** Explicit variant IDs (UUID buy-slug or numeric LS variant id). */
export const STANDARD_MONTHLY_VARIANT_ID = LEMON_SQUEEZY_VARIANTS.standard.monthly;
export const STANDARD_YEARLY_VARIANT_ID = LEMON_SQUEEZY_VARIANTS.standard.yearly;
export const PRO_MONTHLY_VARIANT_ID = LEMON_SQUEEZY_VARIANTS.pro.monthly;
export const PRO_YEARLY_VARIANT_ID = LEMON_SQUEEZY_VARIANTS.pro.yearly;
export const ELITE_MONTHLY_VARIANT_ID = LEMON_SQUEEZY_VARIANTS.elite.monthly;
export const ELITE_YEARLY_VARIANT_ID = LEMON_SQUEEZY_VARIANTS.elite.yearly;
export const ENTERPRISE_MONTHLY_VARIANT_ID = LEMON_SQUEEZY_VARIANTS.enterprise.monthly;
export const ENTERPRISE_YEARLY_VARIANT_ID = LEMON_SQUEEZY_VARIANTS.enterprise.yearly;
export const SINGLE_PASS_VARIANT_ID = firstEnv(
  'VITE_SINGLE_PASS_VARIANT_ID',
  'VITE_LEMONSQUEEZY_ONETIME_PASS_VARIANT_ID',
  'VITE_LS_VARIANT_SINGLE_PASS',
);

export const LEMON_SQUEEZY_VARIANT_IDS = {
  STANDARD_MONTHLY_VARIANT_ID,
  STANDARD_YEARLY_VARIANT_ID,
  PRO_MONTHLY_VARIANT_ID,
  PRO_YEARLY_VARIANT_ID,
  ELITE_MONTHLY_VARIANT_ID,
  ELITE_YEARLY_VARIANT_ID,
  ENTERPRISE_MONTHLY_VARIANT_ID,
  ENTERPRISE_YEARLY_VARIANT_ID,
  SINGLE_PASS_VARIANT_ID,
} as const;

export const LEMON_SQUEEZY_CHECKOUT_URLS = {
  single_pass: firstEnv('VITE_LEMONSQUEEZY_ONETIME_PASS_URL'),
  standard: {
    monthly: firstEnv(
      'VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL',
      'VITE_LEMONSQUEEZY_TIER1_URL',
      'VITE_APPSUMO_TIER1_URL',
    ),
    yearly: firstEnv('VITE_LEMONSQUEEZY_STANDARD_ANNUAL_URL', 'VITE_LEMONSQUEEZY_STANDARD_YEARLY_URL'),
  },
  pro: {
    monthly: firstEnv(
      'VITE_LEMONSQUEEZY_PRO_MONTHLY_URL',
      'VITE_LEMONSQUEEZY_TIER2_URL',
      'VITE_APPSUMO_TIER2_URL',
    ),
    yearly: firstEnv('VITE_LEMONSQUEEZY_PRO_ANNUAL_URL', 'VITE_LEMONSQUEEZY_PRO_YEARLY_URL'),
  },
  elite: {
    monthly: firstEnv(
      'VITE_LEMONSQUEEZY_ELITE_MONTHLY_URL',
      'VITE_LEMONSQUEEZY_TIER3_URL',
    ),
    yearly: firstEnv('VITE_LEMONSQUEEZY_ELITE_ANNUAL_URL', 'VITE_LEMONSQUEEZY_ELITE_YEARLY_URL'),
  },
  enterprise: {
    monthly: firstEnv(
      'VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL',
      'VITE_APPSUMO_B2B_URL',
    ),
    yearly: firstEnv('VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_URL', 'VITE_LEMONSQUEEZY_ENTERPRISE_YEARLY_URL'),
  },
};

/**
 * Known working Lemon Squeezy buy slugs (UUID checkout IDs).
 * Used only when the matching env URL / variant ID is empty so Monthly
 * still opens the monthly product instead of falling through to '#'.
 */
/**
 * Known-good LS buy-slug UUID fallbacks for plans that have them.
 * ONLY include UUIDs that are real LS checkout slugs.
 * Do NOT invent or copy-paste UUIDs — a fake UUID 404s; the store URL never does.
 * Standard and Enterprise use the store as the safe href fallback;
 * CheckoutButton still mints a real checkout via /api/billing/checkout.
 */
/**
 * Canonical Lemon Squeezy checkout UUIDs — provided by the store owner.
 * These are the ONLY correct buy-path slugs for this account.
 * Do NOT modify these without a new URL from the LS dashboard.
 */
const FALLBACK_CHECKOUT_URLS: Partial<Record<CheckoutPlanId, { monthly?: string; yearly?: string; oneTime?: string }>> = {
  standard: {
    monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/38a01448-3041-4e6d-8744-31287b12148a',
    yearly:  'https://sovereignapp.lemonsqueezy.com/checkout/buy/ae00354b-bdc6-4f24-88b9-971ada805e59',
  },
  pro: {
    monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/c0ce34b3-8cd0-4554-9d06-f0de2fd2fec6',
    yearly:  'https://sovereignapp.lemonsqueezy.com/checkout/buy/b1be220d-f6b3-4b69-9808-0a08082f2fd5',
  },
  elite: {
    monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/ada6ee8b-8dfc-48a8-a613-b38464ae323b',
    yearly:  'https://sovereignapp.lemonsqueezy.com/checkout/buy/9fdfa0f4-2dc3-47ef-a4b1-f6be5e1c7532',
  },
  enterprise: {
    monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/6ecc3830-d895-41c1-8204-e584b37563f0',
    yearly:  'https://sovereignapp.lemonsqueezy.com/checkout/buy/5ad8c5b2-0061-4881-8402-8d110ec4b542',
  },
  single_pass: {
    oneTime: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/f3546a02-e784-4205-b319-d8324b9a1863',
  },
};

const VARIANT_BY_PLAN: Record<CheckoutPlanId, { monthly?: string; yearly?: string; oneTime?: string }> = {
  standard: LEMON_SQUEEZY_VARIANTS.standard,
  pro: LEMON_SQUEEZY_VARIANTS.pro,
  elite: LEMON_SQUEEZY_VARIANTS.elite,
  enterprise: LEMON_SQUEEZY_VARIANTS.enterprise,
  single_pass: {
    oneTime: SINGLE_PASS_VARIANT_ID,
  },
};

export function normalizeBillingCycle(cycle: BillingCycle | 'annual' | boolean | undefined): BillingCycle {
  if (cycle === true || cycle === 'yearly' || cycle === 'annual') return 'yearly';
  return 'monthly';
}

export function getVariantId(
  planId: CheckoutPlanId,
  cycle: BillingCycle | 'annual' | boolean = 'monthly',
): string {
  const row = VARIANT_BY_PLAN[planId];
  if (!row) return '';
  if (planId === 'single_pass') return row.oneTime ?? '';
  const billing = normalizeBillingCycle(cycle);
  return (billing === 'yearly' ? row.yearly : row.monthly) ?? '';
}

function urlFromVariantId(variantId: string): string {
  return checkoutUrlFromVariant(variantId);
}

/**
 * Convert a variant ID to a checkout URL WITHOUT logging a warning for numeric
 * IDs. Numeric variant IDs are API-only credentials used by /api/billing/checkout
 * to mint a hosted checkout session — they cannot be used as direct /buy/ slugs.
 *
 * Returns undefined instead of the store URL when the ID is numeric so that
 * callers can silently fall through to the next candidate.
 */
function urlFromVariantIdSilent(variantId: string): string | undefined {
  if (!variantId) return undefined;
  // Purely numeric → API-only, not a buy-path slug. Return undefined so the
  // caller falls through to the store URL without a console warning.
  if (/^\d+$/.test(variantId)) return undefined;
  // HTTP URLs pass through sanitization.
  if (/^https?:\/\//i.test(variantId)) return sanitizeCheckoutUrl(variantId);
  // UUID slug — convert to full checkout URL.
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (UUID_PATTERN.test(variantId)) {
    const url = `${getLemonStoreUrl()}/checkout/buy/${variantId}`;
    return isBrokenCheckoutUrl(url) ? undefined : url;
  }
  return undefined;
}

function firstValidCheckout(...candidates: Array<string | undefined | null>): string {
  for (const candidate of candidates) {
    if (candidate && !isBrokenCheckoutUrl(candidate)) {
      return sanitizeCheckoutUrl(candidate);
    }
  }
  return getLemonStoreUrl();
}

export function resolveCheckoutUrl(
  planId: CheckoutPlanId,
  cycle: BillingCycle | 'annual' | boolean = 'monthly',
): string {
  if (planId === 'single_pass') {
    return firstValidCheckout(
      LEMON_SQUEEZY_CHECKOUT_URLS.single_pass,
      FALLBACK_CHECKOUT_URLS.single_pass?.oneTime,
      urlFromVariantId(getVariantId('single_pass')),
    );
  }

  const billing = normalizeBillingCycle(cycle);
  const configured = LEMON_SQUEEZY_CHECKOUT_URLS[planId]?.[billing] ?? '';
  const uuidFallback = FALLBACK_CHECKOUT_URLS[planId]?.[billing];
  const variantId = getVariantId(planId, billing);

  // Use the silent variant: numeric IDs (Standard/Enterprise) fall through to
  // the store URL without a console warning. UUID IDs (Pro/Elite) produce a
  // valid checkout URL. If the env has a complete checkout URL set, that wins.
  return firstValidCheckout(configured, uuidFallback, urlFromVariantIdSilent(variantId));
}

export function describeCheckoutTarget(
  planId: CheckoutPlanId,
  cycle: BillingCycle | 'annual' | boolean = 'monthly',
) {
  const billing = planId === 'single_pass' ? 'one_time' : normalizeBillingCycle(cycle);
  return {
    planId,
    billingCycle: billing,
    variantId: getVariantId(planId, cycle),
    checkoutUrl: resolveCheckoutUrl(planId, cycle),
  };
}

/**
 * Resolve the Lemon Squeezy checkout URL for a plan + billing cycle.
 * Monthly always maps to the monthly variant — never the yearly one.
 */
export function createCheckout(
  planId: CheckoutPlanId,
  billingCycle: BillingCycle | 'annual' | boolean = 'monthly',
): string {
  if (planId !== 'single_pass' && !LEMON_SQUEEZY_VARIANTS[planId as keyof typeof LEMON_SQUEEZY_VARIANTS]) {
    console.error('[LemonSqueezy] createCheckout failed — unknown plan', { planId });
    return getLemonStoreUrl();
  }
  const cycle = normalizeBillingCycle(billingCycle);
  const target = describeCheckoutTarget(planId, cycle);
  return sanitizeCheckoutUrl(target.checkoutUrl);
}
