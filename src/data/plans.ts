/**
 * Canonical catalog of the four paid Sovereign subscription tiers.
 * Numeric ranks: Standard=1, Pro=2, Elite=3, Enterprise B2B=4.
 */
import { PLAN_PRICES_CENTS, PLAN_PRICES_USD, annualPerMonthUsd } from '@/config/money';
import { PRICING_TIERS, type PricingTier } from '@/config/pricing';

export type CatalogPlanId = 'standard' | 'pro' | 'elite' | 'enterprise';

export interface CatalogPlan {
  id: CatalogPlanId;
  name: string;
  price: { monthly: number; annualPerMonth: number; annualTotal: number };
  features: string[];
  tier: 1 | 2 | 3 | 4;
  badge?: string;
}

const TIER_NUMBER: Record<CatalogPlanId, 1 | 2 | 3 | 4> = {
  standard: 1,
  pro: 2,
  elite: 3,
  enterprise: 4,
};

function toCatalog(tier: PricingTier): CatalogPlan | null {
  if (tier.id !== 'standard' && tier.id !== 'pro' && tier.id !== 'elite' && tier.id !== 'enterprise') {
    return null;
  }
  const id = tier.id;
  return {
    id,
    name: tier.name,
    tier: TIER_NUMBER[id],
    badge: tier.badge,
    price: {
      monthly: PLAN_PRICES_USD[id].monthly,
      annualPerMonth: annualPerMonthUsd(PLAN_PRICES_CENTS[id].annual),
      annualTotal: PLAN_PRICES_USD[id].annual,
    },
    features: [...tier.features],
  };
}

export const SUBSCRIPTION_PLANS: CatalogPlan[] = PRICING_TIERS
  .map(toCatalog)
  .filter((plan): plan is CatalogPlan => Boolean(plan));

export function getCatalogPlan(id: string | null | undefined): CatalogPlan | undefined {
  if (!id) return undefined;
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}

export function numericTierFromPlanType(planType: string | null | undefined): 0 | 1 | 2 | 3 | 4 {
  const raw = (planType ?? '').trim();
  if (raw === 'enterprise' || raw === 'B2B_ENTERPRISE') return 4;
  if (raw === 'elite' || raw === 'appsumo_b2b' || raw === 'appsumo_tier3') return 3;
  if (raw === 'pro' || raw === 'appsumo_tier2') return 2;
  if (raw === 'standard' || raw === 'appsumo_tier1' || raw === 'single_pass') return 1;
  return 0;
}
