/**
 * AppSumo numeric tier gates (0 none, 1 ATS, 2 batch/KB, 3 BYOK unlimited).
 */
export type AppSumoFeature =
  | 'ats_optimize'
  | 'single_pitch'
  | 'batch_proposals'
  | 'agency_knowledge'
  | 'byok_setup';

export const APPSUMO_STACK_LIMITS = {
  1: { monthlyCredits: 100, label: 'Tier 1' },
  2: { monthlyCredits: 300, label: 'Tier 2' },
  3: { monthlyCredits: 999999, label: 'Tier 3 · Unlimited BYOK' },
} as const;

export const MAX_APPSUMO_CODES = 3;

export function numericAppSumoTier(row: Record<string, unknown> | null | undefined): number {
  if (!row) return 0;
  const explicit = Number(row.appsumo_tier ?? 0);
  if (explicit >= 1) return Math.min(3, explicit);
  const count = Number(row.appsumo_codes_count ?? 0);
  if (count >= 3) return 3;
  if (count === 2) return 2;
  if (count === 1) return 1;
  const tier = String(row.subscription_tier ?? row.plan_type ?? '');
  if (['appsumo_tier3', 'appsumo_b2b', 'enterprise', 'B2B_ENTERPRISE'].includes(tier)) return 3;
  if (['appsumo_tier2', 'pro', 'elite'].includes(tier)) return 2;
  if (['appsumo_tier1', 'standard'].includes(tier)) return 1;
  return 0;
}

export function minTierFor(feature: AppSumoFeature): number {
  switch (feature) {
    case 'ats_optimize':
    case 'single_pitch':
      return 1;
    case 'batch_proposals':
    case 'agency_knowledge':
      return 2;
    case 'byok_setup':
      return 3;
  }
}

export function assertFeatureAccess(appsumoTier: number, feature: AppSumoFeature): void {
  const need = minTierFor(feature);
  if (appsumoTier >= need) return;
  if (feature === 'batch_proposals') {
    throw new Error('Requires Tier 2 or higher');
  }
  if (feature === 'agency_knowledge') {
    throw new Error('Agency Knowledge Base requires Tier 2 or higher');
  }
  if (feature === 'byok_setup') {
    throw new Error('BYOK requires Tier 3 (3 stacked AppSumo codes)');
  }
  throw new Error('Requires AppSumo Tier 1 or a paid plan');
}

export function canUseFeature(appsumoTier: number, feature: AppSumoFeature): boolean {
  return appsumoTier >= minTierFor(feature);
}
