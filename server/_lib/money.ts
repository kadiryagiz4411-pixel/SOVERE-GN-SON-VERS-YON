export const ANNUAL_DISCOUNT_PERCENT = 20;

export const PLAN_PRICES_CENTS = {
  single_pass: { oneTime: 199 },
  standard: { monthly: 899, annual: 10799 },
  pro: { monthly: 1699, annual: 19799 },
  elite: { monthly: 4399, annual: 42299 },
  enterprise: { monthly: 17899, annual: 171839 },
} as const;

/** Prior annual totals still honored by webhooks for existing subscribers. */
export const LEGACY_PLAN_PRICES_CENTS = {
  elite: { annual: 53099 },
  enterprise: { annual: 215099 },
} as const;

export const SINGLE_PASS_CENTS = PLAN_PRICES_CENTS.single_pass.oneTime;
export const SINGLE_PASS_USD = SINGLE_PASS_CENTS / 100;

export function centsToUsd(cents: number): number {
  return Math.round(Number(cents) || 0) / 100;
}

export function planAmountCents(planId?: string, billingCycle?: string): number | undefined {
  const plan = String(planId || '').trim().toLowerCase();
  const yearly = /year|annual/.test(String(billingCycle || ''));
  if (/single.?pass|one.?pass|one.?time|onetime/.test(plan)) return SINGLE_PASS_CENTS;
  if (plan === 'standard' || plan === 'starter') {
    return yearly ? PLAN_PRICES_CENTS.standard.annual : PLAN_PRICES_CENTS.standard.monthly;
  }
  if (plan === 'pro') {
    return yearly ? PLAN_PRICES_CENTS.pro.annual : PLAN_PRICES_CENTS.pro.monthly;
  }
  if (plan === 'elite') {
    return yearly ? PLAN_PRICES_CENTS.elite.annual : PLAN_PRICES_CENTS.elite.monthly;
  }
  if (plan === 'enterprise' || plan === 'b2b_enterprise') {
    return yearly ? PLAN_PRICES_CENTS.enterprise.annual : PLAN_PRICES_CENTS.enterprise.monthly;
  }
  return undefined;
}
