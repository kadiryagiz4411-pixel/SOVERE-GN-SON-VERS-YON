/** Integer cents — never use floats for Polar / Stripe payloads. */
export const SINGLE_PASS_CENTS = 199;
export const SINGLE_PASS_USD = 1.99;

export const PLAN_PRICES_CENTS = {
  single_pass: { oneTime: 199 },
  standard: { monthly: 899, annual: 10799 },
  pro: { monthly: 1699, annual: 19799 },
  elite: { monthly: 4399, annual: 53099 },
  enterprise: { monthly: 17899, annual: 215099 },
} as const;

export const PLAN_PRICES_USD = {
  single_pass: { oneTime: 1.99 },
  standard: { monthly: 8.99, annual: 107.99 },
  pro: { monthly: 16.99, annual: 197.99 },
  elite: { monthly: 43.99, annual: 530.99 },
  enterprise: { monthly: 178.99, annual: 2150.99 },
} as const;

export function centsToUsd(cents: number): number {
  return Math.round(Number(cents) || 0) / 100;
}

export function usdToCents(usd: number): number {
  return Math.round((Number(usd) || 0) * 100);
}
