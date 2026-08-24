/**
 * Lemon Squeezy plan + variant registry.
 * Dollar prices stay in src/config/pricing.ts — this file only maps checkout.
 *
 * Env (any alias works; first non-empty wins):
 *   VITE_STANDARD_MONTHLY_VARIANT_ID / VITE_LEMONSQUEEZY_STANDARD_MONTHLY_VARIANT_ID
 *   VITE_STANDARD_YEARLY_VARIANT_ID  / VITE_LEMONSQUEEZY_STANDARD_ANNUAL_VARIANT_ID
 *   …same pattern for PRO, ELITE, ENTERPRISE
 *   VITE_LEMONSQUEEZY_*_MONTHLY_URL / *_ANNUAL_URL
 *   VITE_LEMONSQUEEZY_STORE_URL (default https://sovereignapp.lemonsqueezy.com)
 */

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

export const LEMON_SQUEEZY_STORE_URL =
  firstEnv('VITE_LEMONSQUEEZY_STORE_URL') || 'https://sovereignapp.lemonsqueezy.com';

/**
 * Canonical Lemon Squeezy variant IDs.
 * Env vars override these defaults when set.
 */
export const LEMON_SQUEEZY_VARIANTS = {
  standard: {
    monthly: firstEnv(
      'VITE_STANDARD_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_STANDARD_MONTHLY_VARIANT_ID',
      'VITE_LS_VARIANT_STANDARD_MONTHLY',
    ) || '2020873',
    yearly: firstEnv(
      'VITE_STANDARD_YEARLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_STANDARD_ANNUAL_VARIANT_ID',
      'VITE_LEMONSQUEEZY_STANDARD_YEARLY_VARIANT_ID',
      'VITE_LS_VARIANT_STANDARD_ANNUAL',
    ) || '2020643',
  },
  pro: {
    monthly: firstEnv(
      'VITE_PRO_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID',
      'VITE_LS_VARIANT_PRO_MONTHLY',
    ) || '2020868',
    yearly: firstEnv(
      'VITE_PRO_YEARLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID',
      'VITE_LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID',
      'VITE_LS_VARIANT_PRO_ANNUAL',
    ) || '2020735',
  },
  elite: {
    monthly: firstEnv(
      'VITE_ELITE_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ELITE_MONTHLY_VARIANT_ID',
      'VITE_LS_VARIANT_ELITE_MONTHLY',
    ) || '2020866',
    yearly: firstEnv(
      'VITE_ELITE_YEARLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ELITE_ANNUAL_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ELITE_YEARLY_VARIANT_ID',
      'VITE_LS_VARIANT_ELITE_ANNUAL',
    ) || '2020838',
  },
  enterprise: {
    monthly: firstEnv(
      'VITE_ENTERPRISE_MONTHLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID',
      'VITE_LS_VARIANT_ENTERPRISE_MONTHLY',
    ) || '2020877',
    yearly: firstEnv(
      'VITE_ENTERPRISE_YEARLY_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_VARIANT_ID',
      'VITE_LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID',
      'VITE_LS_VARIANT_ENTERPRISE_ANNUAL',
    ) || '2020842',
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
    monthly: firstEnv('VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL'),
    yearly: firstEnv('VITE_LEMONSQUEEZY_STANDARD_ANNUAL_URL', 'VITE_LEMONSQUEEZY_STANDARD_YEARLY_URL'),
  },
  pro: {
    monthly: firstEnv('VITE_LEMONSQUEEZY_PRO_MONTHLY_URL'),
    yearly: firstEnv('VITE_LEMONSQUEEZY_PRO_ANNUAL_URL', 'VITE_LEMONSQUEEZY_PRO_YEARLY_URL'),
  },
  elite: {
    monthly: firstEnv('VITE_LEMONSQUEEZY_ELITE_MONTHLY_URL'),
    yearly: firstEnv('VITE_LEMONSQUEEZY_ELITE_ANNUAL_URL', 'VITE_LEMONSQUEEZY_ELITE_YEARLY_URL'),
  },
  enterprise: {
    monthly: firstEnv('VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL'),
    yearly: firstEnv('VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_URL', 'VITE_LEMONSQUEEZY_ENTERPRISE_YEARLY_URL'),
  },
};

/**
 * Known working Lemon Squeezy buy slugs (UUID checkout IDs).
 * Used only when the matching env URL / variant ID is empty so Monthly
 * still opens the monthly product instead of falling through to '#'.
 */
const FALLBACK_CHECKOUT_URLS: Partial<Record<CheckoutPlanId, { monthly?: string; yearly?: string; oneTime?: string }>> = {
  pro: {
    monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/1f8f86a3-ac49-4c41-ae25-4c8e03df1759',
    yearly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/f86e3532-79dc-4cab-9d74-ec98a443f8b9',
  },
  elite: {
    monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/ee871e14-95bd-46b3-afb8-2b73c66d54f1',
    yearly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/eef79c14-3371-444f-a171-8fcc00ebe411',
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
  if (!variantId) return '';
  if (variantId.startsWith('http')) return variantId;
  const store = LEMON_SQUEEZY_STORE_URL.replace(/\/$/, '');
  return `${store}/checkout/buy/${variantId}`;
}

export function resolveCheckoutUrl(
  planId: CheckoutPlanId,
  cycle: BillingCycle | 'annual' | boolean = 'monthly',
): string {
  if (planId === 'single_pass') {
    const direct = LEMON_SQUEEZY_CHECKOUT_URLS.single_pass;
    if (direct) return direct;
    const fromVariant = urlFromVariantId(getVariantId('single_pass'));
    if (fromVariant) return fromVariant;
    console.error('[LemonSqueezy] Missing checkout URL and variant ID', {
      planId: 'single_pass',
      billingCycle: 'one_time',
      expectedVariantKey: 'SINGLE_PASS_VARIANT_ID',
    });
    return '#';
  }

  const billing = normalizeBillingCycle(cycle);
  const configured = LEMON_SQUEEZY_CHECKOUT_URLS[planId]?.[billing] ?? '';
  if (configured) return configured;

  const variantId = getVariantId(planId, billing);
  const built = urlFromVariantId(variantId);
  if (built) return built;

  const fallback = FALLBACK_CHECKOUT_URLS[planId]?.[billing];
  if (fallback) return fallback;

  console.error('[LemonSqueezy] Missing checkout URL and variant ID', {
    planId,
    billingCycle: billing,
    expectedVariantKey: `${planId.toUpperCase()}_${billing === 'yearly' ? 'YEARLY' : 'MONTHLY'}_VARIANT_ID`,
  });
  return '#';
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
  const cycle = normalizeBillingCycle(billingCycle);
  const variantId = planId === 'single_pass'
    ? getVariantId(planId)
    : (LEMON_SQUEEZY_VARIANTS[planId as keyof typeof LEMON_SQUEEZY_VARIANTS]?.[cycle] ?? getVariantId(planId, cycle));
  const target = describeCheckoutTarget(planId, cycle);
  if (!target.checkoutUrl || target.checkoutUrl === '#') {
    console.error('[LemonSqueezy] createCheckout failed — missing variant ID or URL', { ...target, variantId });
  }
  return target.checkoutUrl;
}
