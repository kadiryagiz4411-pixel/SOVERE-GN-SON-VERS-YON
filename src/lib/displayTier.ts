export type DisplayTierId =
  | 'superadmin'
  | 'enterprise'
  | 'tier_3'
  | 'tier_2'
  | 'tier_1'
  | 'elite'
  | 'pro'
  | 'standard'
  | 'free';

export interface DisplayTier {
  id: DisplayTierId;
  label: string;
  className: string;
  isPaid: boolean;
}

const TIER3 =
  'bg-gradient-to-r from-violet-500/30 to-amber-400/30 text-amber-200 border border-amber-400/40 shadow-[0_0_20px_-8px_rgba(251,191,36,0.55)]';
const TIER2 = 'bg-violet-500/20 text-violet-200 border border-violet-400/30';
const TIER1 = 'bg-sky-500/15 text-sky-200 border border-sky-400/25';
const FREE = 'bg-white/5 text-slate-400 border border-white/10';

const UNPAID = new Set(['', 'free', 'none', 'basic', 'null', 'undefined', '0']);

/** Skip placeholder "free" so a later paid `plan_type` is not shadowed. */
export function firstPaidPlanLabel(...values: Array<unknown>): string {
  const paid = values
    .map((v) => String(v ?? '').trim().toLowerCase())
    .find((v) => v && !UNPAID.has(v));
  return paid ?? 'free';
}

export function resolveDisplayTier(input: {
  isSuperAdmin?: boolean;
  hasB2BAccess?: boolean;
  appsumoPlan?: string | null;
  appsumoTier?: number | null;
  planType?: string | null;
  subscriptionPlan?: string | null;
  subscriptionTier?: string | null;
}): DisplayTier {
  if (input.isSuperAdmin) {
    return { id: 'superadmin', label: 'UNLIMITED', className: TIER3, isPaid: true };
  }

  const appsumo = String(input.appsumoPlan ?? '').toLowerCase().replace(/[\s-]/g, '_');
  const n = Number(input.appsumoTier ?? 0);
  const appsumoLooksTier3 = appsumo === 'tier_3' || appsumo.includes('tier3') || appsumo.includes('tier_3');
  const appsumoLooksTier2 = appsumo === 'tier_2' || appsumo.includes('tier2') || appsumo.includes('tier_2');
  const appsumoLooksTier1 = appsumo === 'tier_1' || appsumo.includes('tier1') || appsumo.includes('tier_1');

  if (appsumoLooksTier3 || n >= 3) {
    return { id: 'tier_3', label: 'Tier 3', className: TIER3, isPaid: true };
  }
  if (appsumoLooksTier2 || n >= 2) {
    return { id: 'tier_2', label: 'Tier 2', className: TIER2, isPaid: true };
  }
  if (appsumoLooksTier1 || n >= 1) {
    return { id: 'tier_1', label: 'Tier 1', className: TIER1, isPaid: true };
  }

  if (input.hasB2BAccess) {
    return { id: 'enterprise', label: 'Enterprise B2B', className: TIER3, isPaid: true };
  }

  const raw = firstPaidPlanLabel(
    input.planType,
    input.subscriptionPlan,
    input.subscriptionTier,
  );

  if (raw.includes('enterprise') || raw.includes('b2b')) {
    return { id: 'enterprise', label: 'Enterprise B2B', className: TIER3, isPaid: true };
  }
  if (raw.includes('elite') || raw.includes('appsumo_tier3') || raw.includes('tier_3') || raw.includes('tier3')) {
    return { id: 'tier_3', label: 'Tier 3', className: TIER3, isPaid: true };
  }
  if (raw === 'pro' || raw.includes('appsumo_tier2') || raw.includes('tier_2') || raw.includes('tier2')) {
    return { id: 'tier_2', label: 'Tier 2', className: TIER2, isPaid: true };
  }
  if (raw === 'standard' || raw.includes('appsumo_tier1') || raw.includes('tier_1') || raw.includes('tier1')) {
    return { id: 'tier_1', label: 'Tier 1', className: TIER1, isPaid: true };
  }

  return { id: 'free', label: 'Free', className: FREE, isPaid: false };
}
