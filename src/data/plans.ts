/**
 * Canonical catalog of the four paid Sovereign subscription tiers.
 * Numeric ranks: Standard=1, Pro=2, Elite=3, Enterprise B2B=4.
 */
export type CatalogPlanId = 'standard' | 'pro' | 'elite' | 'enterprise';

export interface CatalogPlan {
  id: CatalogPlanId;
  name: string;
  price: { monthly: number; annualPerMonth: number; annualTotal: number };
  features: string[];
  tier: 1 | 2 | 3 | 4;
  badge?: string;
}

export const SUBSCRIPTION_PLANS: CatalogPlan[] = [
  {
    id: 'standard',
    name: 'Standard',
    tier: 1,
    price: { monthly: 12, annualPerMonth: 9, annualTotal: 108 },
    features: [
      'Up to 5 AI CV Optimizations/month',
      'Up to 3 Automated Cover Letters/month',
      'Standard Resume Templates',
      'Basic ATS Match Analysis',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tier: 2,
    badge: 'Most Popular',
    price: { monthly: 29, annualPerMonth: 22, annualTotal: 264 },
    features: [
      'Includes ALL Standard Plan capabilities',
      'UNLIMITED AI CV Optimizations',
      'UNLIMITED Automated Cover Letters',
      'Full Premium Templates Access',
      'Multi-Language Support (EN, DE, TR, ES, FR)',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tier: 3,
    badge: 'Strategy Mode',
    price: { monthly: 59, annualPerMonth: 45, annualTotal: 540 },
    features: [
      'Includes ALL Pro Plan capabilities',
      'Interactive AI Voice/Text Interview Simulator (ACTIVE)',
      'Freelance Pitch & Multi-Job Proposal Engine (ACTIVE)',
      'Priority High-Speed LLM Execution Queue (ACTIVE)',
      'Single-File Multi-CV & Multi-Job Ingestion Engine (ACTIVE)',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise B2B',
    tier: 4,
    badge: 'Enterprise / HR Teams',
    price: { monthly: 299, annualPerMonth: 239, annualTotal: 2868 },
    features: [
      'Includes ALL Elite Plan capabilities',
      'Batch Upload & Rank up to 3,000 CVs/month',
      'Organization Team Workspace (1 Owner + 5 HR Seats)',
      'AI Fraud, Fluff & Contradiction Detector',
      'Live Client Sharing Portal (/share/[id]) with Instant Approvals',
      'B2B Command Center & Persistent Sovereign Memory Bank',
    ],
  },
];

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
