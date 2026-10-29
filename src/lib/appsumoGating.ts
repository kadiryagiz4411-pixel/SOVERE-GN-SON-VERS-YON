/**
 * AppSumo numeric tier gates.
 * Starter (1): ATS and single pitch. Pro (2): advanced match and priority queue. Agency (3): bulk pitch, knowledge base, BYOK.
 * Monthly credits stay 50 / 200 / 1000.
 */
import { APPSUMO_MONTHLY_CREDITS } from '@/config/appsumo';
import { readAppsumoLicense } from '@/lib/appsumoAccess';

export type AppSumoFeature =
  | 'ats_optimize'
  | 'single_pitch'
  | 'batch_proposals'
  | 'agency_knowledge'
  | 'byok_setup';

export const APPSUMO_STACK_LIMITS = {
  1: { monthlyCredits: APPSUMO_MONTHLY_CREDITS[1], label: 'AppSumo Starter' },
  2: { monthlyCredits: APPSUMO_MONTHLY_CREDITS[2], label: 'AppSumo Pro' },
  3: { monthlyCredits: APPSUMO_MONTHLY_CREDITS[3], label: 'AppSumo Agency' },
} as const;

export const MAX_APPSUMO_CODES = 3;

function saasFeatureRank(row: Record<string, unknown>): number {
  const raw = String(row.plan_type ?? row.subscription_tier ?? row.subscription_plan ?? '').toLowerCase();
  if (raw.includes('enterprise') || raw === 'b2b_enterprise' || raw === 'appsumo_b2b' || raw === 'appsumo_tier3') return 3;
  if (raw === 'elite' || raw === 'pro' || raw === 'appsumo_tier2') return 2;
  if (raw === 'standard' || raw === 'appsumo_tier1' || raw === 'starter') return 1;
  return 0;
}

export function numericAppSumoTier(row: Record<string, unknown> | null | undefined): number {
  if (!row) return 0;
  return Math.max(readAppsumoLicense(row).rank, saasFeatureRank(row));
}

export function minTierFor(feature: AppSumoFeature): number {
  switch (feature) {
    case 'ats_optimize':
    case 'single_pitch':
      return 1;
    case 'batch_proposals':
    case 'agency_knowledge':
    case 'byok_setup':
      return 3;
  }
}

export function assertFeatureAccess(appsumoTier: number, feature: AppSumoFeature): void {
  const need = minTierFor(feature);
  if (appsumoTier >= need) return;
  if (feature === 'batch_proposals') {
    throw new Error('Bulk pitch requires AppSumo Agency');
  }
  if (feature === 'agency_knowledge') {
    throw new Error('Agency lead tools require AppSumo Agency');
  }
  if (feature === 'byok_setup') {
    throw new Error('BYOK requires AppSumo Agency');
  }
  throw new Error('Requires AppSumo Starter or a paid plan');
}

export function canUseFeature(appsumoTier: number, feature: AppSumoFeature): boolean {
  return appsumoTier >= minTierFor(feature);
}
