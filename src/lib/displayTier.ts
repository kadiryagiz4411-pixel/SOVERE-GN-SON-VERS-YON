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

  const appsumo = String(input.appsumoPlan ?? '').toLowerCase();
  const n = Number(input.appsumoTier ?? 0);
  if (appsumo === 'tier_3' || n >= 3) {
    return { id: 'tier_3', label: 'TIER 3 PRO', className: TIER3, isPaid: true };
  }
  if (appsumo === 'tier_2' || n >= 2) {
    return { id: 'tier_2', label: 'Tier 2', className: TIER2, isPaid: true };
  }
  if (appsumo === 'tier_1' || n >= 1) {
    return { id: 'tier_1', label: 'Tier 1', className: TIER1, isPaid: true };
  }

  if (input.hasB2BAccess) {
    return { id: 'enterprise', label: 'Enterprise B2B', className: TIER3, isPaid: true };
  }

  const raw = String(
    input.subscriptionTier || input.planType || input.subscriptionPlan || 'free',
  ).toLowerCase();

  if (raw.includes('enterprise') || raw.includes('b2b')) {
    return { id: 'enterprise', label: 'Enterprise B2B', className: TIER3, isPaid: true };
  }
  if (raw.includes('elite') || raw.includes('appsumo_tier3')) {
    return { id: 'elite', label: 'Elite', className: TIER3, isPaid: true };
  }
  if (raw === 'pro' || raw.includes('appsumo_tier2')) {
    return { id: 'pro', label: 'Pro', className: TIER2, isPaid: true };
  }
  if (raw === 'standard' || raw.includes('appsumo_tier1')) {
    return { id: 'standard', label: 'Standard', className: TIER1, isPaid: true };
  }

  return { id: 'free', label: 'Free', className: FREE, isPaid: false };
}
