/**
 * AppSumo Lifetime Deal matrix — monetary prices and monthly credit quotas.
 * Recurring SaaS prices live in src/config/pricing.ts and must stay untouched.
 */

function appsumoEnv(key: string): string {
  try {
    return String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim();
  } catch {
    return '';
  }
}

/**
 * AppSumo.com product listing URLs — these are where users BUY the LTD.
 * They are NOT LemonSqueezy checkout URLs.
 *
 * Override with env vars (e.g. VITE_APPSUMO_TIER1_PRODUCT_URL) when the
 * exact per-tier product slugs are known. The hardcoded defaults land on the
 * canonical AppSumo product page so users can see and select any tier there.
 */
export const APPSUMO_PRODUCT_URLS = {
  tier1: appsumoEnv('VITE_APPSUMO_TIER1_PRODUCT_URL') || 'https://appsumo.com/products/sovereign-starter',
  tier2: appsumoEnv('VITE_APPSUMO_TIER2_PRODUCT_URL') || 'https://appsumo.com/products/sovereign-pro',
  tier3: appsumoEnv('VITE_APPSUMO_TIER3_PRODUCT_URL') || 'https://appsumo.com/products/sovereign-agency',
} as const;

export type AppsumoLtdId = 'appsumo_tier1' | 'appsumo_tier2' | 'appsumo_tier3';

export interface AppsumoLtdTier {
  id: AppsumoLtdId;
  /** Canonical DB plan_type / subscription_tier */
  planType: AppsumoLtdId | 'appsumo_b2b';
  numericTier: 1 | 2 | 3;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
  audience: string;
  extension: string;
  features: string[];
}

/** Keep existing AppSumo monthly quotas. Do not invent new credit numbers. */
export const APPSUMO_MONTHLY_CREDITS = {
  1: 50,
  2: 200,
  3: 1000,
} as const;

/**
 * Lemon Squeezy checkout URLs for NEW AppSumo purchases on sovereignapp.pro.
 * These are LS-hosted checkout pages (not the AppSumo marketplace itself).
 */
export const APPSUMO_LS_CHECKOUT_URLS = {
  tier1: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/1b6e35ec-fba6-441f-8b9a-7ac90d5fa4c2',
  tier2: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/6c9a1e9f-3870-49b2-a248-092a20718e48',
  tier3: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/9075cf3d-2e73-4c22-b200-3b8db0c91e02',
} as const;

export const APPSUMO_LTD_TIERS: AppsumoLtdTier[] = [
  {
    id: 'appsumo_tier1',
    planType: 'appsumo_tier1',
    numericTier: 1,
    label: 'Starter',
    priceUsd: 59,
    monthlyCredits: APPSUMO_MONTHLY_CREDITS[1],
    audience: 'Individual freelancers & job seekers',
    extension: 'B2C Mode — included while monthly credits remain',
    features: [
      `${APPSUMO_MONTHLY_CREDITS[1]} AI credits / month (lifetime)`,
      'CV & proposal generation',
      'Chrome extension access (B2C Mode)',
      'ATS gap analysis & match score',
      'Credits auto-refresh every month',
    ],
  },
  {
    id: 'appsumo_tier2',
    planType: 'appsumo_tier2',
    numericTier: 2,
    label: 'Pro',
    priceUsd: 139,
    monthlyCredits: APPSUMO_MONTHLY_CREDITS[2],
    audience: 'Active job applicants & power users',
    extension: 'B2C Mode with priority generation',
    features: [
      `${APPSUMO_MONTHLY_CREDITS[2]} AI credits / month (lifetime)`,
      'Everything in Starter',
      'Advanced match scoring & analytics',
      'Chrome extension (B2C, priority queue)',
      'Company DNA decoder & recruiter hook',
      'Credits auto-refresh every month',
    ],
  },
  {
    id: 'appsumo_tier3',
    planType: 'appsumo_b2b',
    numericTier: 3,
    label: 'B2B / Agency',
    priceUsd: 249,
    monthlyCredits: APPSUMO_MONTHLY_CREDITS[3],
    audience: 'Agencies, team acquisition & B2B lead generation',
    extension: 'Full B2B + B2C extension — agency lead extraction & bulk pitch',
    features: [
      `${APPSUMO_MONTHLY_CREDITS[3].toLocaleString()} AI credits / month (lifetime)`,
      'Everything in Pro',
      'Full B2B + B2C Chrome extension',
      'Agency lead extraction & bulk pitch generation',
      'Bulk CV screening & ranked applicant table',
      'Credits auto-refresh every month',
    ],
  },
];

export const APPSUMO_CREDIT_EXHAUSTED_MESSAGE =
  'Monthly AppSumo credits reached. Credits will automatically refresh next month or upgrade your AppSumo Tier for more credits.';

export function appsumoCreditsForNumericTier(tier: number): number {
  if (tier >= 3) return APPSUMO_MONTHLY_CREDITS[3];
  if (tier >= 2) return APPSUMO_MONTHLY_CREDITS[2];
  if (tier >= 1) return APPSUMO_MONTHLY_CREDITS[1];
  return 0;
}

export function appsumoLtdPriceLabel(priceUsd: number): string {
  return `$${priceUsd} Lifetime Deal`;
}
