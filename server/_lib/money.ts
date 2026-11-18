export const SINGLE_PASS_CENTS = 199;
export const SINGLE_PASS_USD = 1.99;

export const PLAN_PRICES_CENTS = {
  single_pass: { oneTime: 199 },
  standard: { monthly: 899, annual: 10799 },
  pro: { monthly: 1699, annual: 19799 },
  elite: { monthly: 4399, annual: 53099 },
  enterprise: { monthly: 17899, annual: 215099 },
} as const;
