export type PlanTier = 'single_pass' | 'standard' | 'pro' | 'elite' | 'B2B_ENTERPRISE' | 'free';
export type BillingPeriod = 'monthly' | 'yearly' | 'once';

export interface TierConfig {
  tier: PlanTier;
  period: BillingPeriod;
}
