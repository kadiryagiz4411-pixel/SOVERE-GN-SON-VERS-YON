/**
 * Silent mapping for existing lifetime-plan rows in the database.
 * No purchase URLs, badges, or marketplace checkout.
 */

export const CHECKOUT_FALLBACK_URLS = {
  tier1: '/pricing',
  tier2: '/pricing',
  tier3: '/pricing',
} as const;

export const APPSUMO_PRODUCT_URLS = {
  tier1: '/pricing',
  tier2: '/pricing',
  tier3: '/pricing',
} as const;

export type AppsumoLtdId = 'appsumo_tier1' | 'appsumo_tier2' | 'appsumo_tier3';

export interface AppsumoLtdTier {
  id: AppsumoLtdId;
  planType: AppsumoLtdId | 'appsumo_b2b';
  numericTier: 1 | 2 | 3;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
  audience: string;
  extension: string;
  features: string[];
}

export const APPSUMO_MONTHLY_CREDITS = {
  1: 50,
  2: 200,
  3: 1000,
} as const;

export const APPSUMO_LTD_TIERS: AppsumoLtdTier[] = [
  {
    id: 'appsumo_tier1',
    planType: 'appsumo_tier1',
    numericTier: 1,
    label: 'Standard',
    priceUsd: 0,
    monthlyCredits: APPSUMO_MONTHLY_CREDITS[1],
    audience: 'Personal',
    extension: 'B2C',
    features: [],
  },
  {
    id: 'appsumo_tier2',
    planType: 'appsumo_tier2',
    numericTier: 2,
    label: 'Pro',
    priceUsd: 0,
    monthlyCredits: APPSUMO_MONTHLY_CREDITS[2],
    audience: 'Personal',
    extension: 'B2C',
    features: [],
  },
  {
    id: 'appsumo_tier3',
    planType: 'appsumo_b2b',
    numericTier: 3,
    label: 'Enterprise',
    priceUsd: 0,
    monthlyCredits: APPSUMO_MONTHLY_CREDITS[3],
    audience: 'Agency',
    extension: 'B2B',
    features: [],
  },
];

export const APPSUMO_CREDIT_EXHAUSTED_MESSAGE =
  'Monthly credits reached. Credits refresh next month, or upgrade for more.';

export function appsumoCreditsForNumericTier(tier: number): number {
  if (tier >= 3) return APPSUMO_MONTHLY_CREDITS[3];
  if (tier >= 2) return APPSUMO_MONTHLY_CREDITS[2];
  if (tier >= 1) return APPSUMO_MONTHLY_CREDITS[1];
  return 0;
}

export function appsumoLtdPriceLabel(_priceUsd: number): string {
  return 'Included in your plan';
}
