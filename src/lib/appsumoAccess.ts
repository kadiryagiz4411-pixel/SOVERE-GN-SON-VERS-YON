/**
 * AppSumo license → product tier, monthly credits, and feature rank.
 * A bare appsumo_tier of 1 is not a license: standard rows were backfilled to that value.
 * Credits stay 50 / 200 / 1000.
 */
import { APPSUMO_MONTHLY_CREDITS } from '@/config/appsumo';
import { hasActiveAppSumoLicense } from '@/lib/displayTier';

export type AppsumoProductTier = 'starter' | 'pro' | 'agency';

export interface AppsumoLicenseGate {
  licensed: boolean;
  rank: 0 | 1 | 2 | 3;
  planTier: AppsumoProductTier | null;
  credits: number;
  /** Plan string the entitlement engine already understands. */
  gatePlan: string;
}

const EMPTY: AppsumoLicenseGate = {
  licensed: false,
  rank: 0,
  planTier: null,
  credits: 0,
  gatePlan: 'free',
};

function rankFromAppsumoLabel(value: unknown): 0 | 1 | 2 | 3 {
  const v = String(value ?? '').trim().toLowerCase().replace(/[\s-]/g, '_');
  if (!v || ['free', 'unlimited', 'standard', 'pro', 'elite', 'enterprise', 'none'].includes(v)) return 0;
  if (['agency', 'b2b', 'tier_3', 'tier3', 'appsumo_tier3', 'appsumo_b2b'].includes(v)) return 3;
  if (['tier_2', 'tier2', 'appsumo_tier2'].includes(v)) return 2;
  if (['starter', 'tier_1', 'tier1', 'appsumo_tier1'].includes(v)) return 1;
  return 0;
}

function rankFromPlanTierColumn(value: unknown): 0 | 1 | 2 | 3 {
  const v = String(value ?? '').trim().toLowerCase().replace(/[\s-]/g, '_');
  if (v === 'agency' || v === 'b2b') return 3;
  if (v === 'pro') return 2;
  if (v === 'starter') return 1;
  return rankFromAppsumoLabel(v);
}

export function creditsForAppsumoRank(rank: number): number {
  if (rank >= 3) return APPSUMO_MONTHLY_CREDITS[3];
  if (rank >= 2) return APPSUMO_MONTHLY_CREDITS[2];
  if (rank >= 1) return APPSUMO_MONTHLY_CREDITS[1];
  return 0;
}

export function productTierForRank(rank: number): AppsumoProductTier | null {
  if (rank >= 3) return 'agency';
  if (rank >= 2) return 'pro';
  if (rank >= 1) return 'starter';
  return null;
}

export function gatePlanForRank(rank: number): string {
  if (rank >= 3) return 'appsumo_b2b';
  if (rank >= 2) return 'appsumo_tier2';
  if (rank >= 1) return 'appsumo_tier1';
  return 'free';
}

export function readAppsumoLicense(row: Record<string, unknown> | null | undefined): AppsumoLicenseGate {
  if (!row) return EMPTY;

  const planTierRank = rankFromPlanTierColumn(row.plan_tier);
  const legacyRank = rankFromAppsumoLabel(row.tier);
  const storedRank = Math.max(
    rankFromAppsumoLabel(row.subscription_tier),
    rankFromAppsumoLabel(row.plan_type),
    rankFromAppsumoLabel(row.subscription_plan),
  ) as 0 | 1 | 2 | 3;

  const licensedSignal = hasActiveAppSumoLicense({
    isAppsumo: row.is_appsumo === true || row.is_appsumo_user === true,
    appsumoLicenseKey: String(row.appsumo_license_key ?? row.appsumo_code ?? ''),
    appsumoCodesCount: Number(row.appsumo_codes_count ?? 0),
    appsumoPlan: String(row.appsumo_plan ?? ''),
    planType: String(row.plan_type ?? ''),
    subscriptionPlan: String(row.subscription_plan ?? ''),
    subscriptionTier: String(row.subscription_tier ?? ''),
  }) || planTierRank > 0 || legacyRank > 0 || storedRank > 0;

  if (!licensedSignal) return EMPTY;

  const numeric = Number(row.appsumo_tier ?? 0);
  const numericRank: 0 | 1 | 2 | 3 = numeric >= 3 ? 3 : numeric >= 2 ? 2 : numeric >= 1 ? 1 : 0;
  const rank = Math.max(planTierRank, legacyRank, storedRank, numericRank) as 0 | 1 | 2 | 3;
  if (rank < 1) return EMPTY;

  return {
    licensed: true,
    rank,
    planTier: productTierForRank(rank),
    credits: creditsForAppsumoRank(rank),
    gatePlan: gatePlanForRank(rank),
  };
}
