import { OWNER_EMAIL, isOwnerEmail, isSuperAdminUser } from '@/lib/superadmin';
import { createCheckout } from '@/config/plans';

export type B2BSubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
export type AppsumoPlanEnum = 'none' | 'tier_1' | 'tier_2' | 'tier_3';

export const B2B_ENTERPRISE_ROUTES = [
  '/batch-upload',
  '/team',
  '/talent-pool',
  '/organization',
  '/b2b',
  '/b2b/talent-pool',
] as const;

export const APPSUMO_UPSELL_DISMISS_KEY = 'sovereign.appsumo.upsell.hiddenUntil';

export function enterpriseCheckoutUrl(): string {
  const yearly = createCheckout('enterprise', 'yearly');
  if (yearly && yearly !== '#') return yearly;
  return createCheckout('enterprise', 'monthly');
}

export function toAppsumoPlanEnum(
  rawPlan: string | null | undefined,
  numericTier: number | null | undefined,
): AppsumoPlanEnum {
  const label = (rawPlan ?? '').trim();
  if (label === 'tier_1' || label === 'tier_2' || label === 'tier_3' || label === 'none') {
    return label;
  }
  const n = Number(numericTier ?? 0);
  if (n >= 3) return 'tier_3';
  if (n >= 2) return 'tier_2';
  if (n >= 1) return 'tier_1';
  return 'none';
}

export function isAppsumoLtdUser(plan: AppsumoPlanEnum): boolean {
  return plan === 'tier_1' || plan === 'tier_2' || plan === 'tier_3';
}

export function trialDaysRemaining(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export function isTrialWindowOpen(
  isTrialActive: boolean | null | undefined,
  trialEndsAt: string | null | undefined,
): boolean {
  if (!isTrialActive || !trialEndsAt) return false;
  return Date.now() < new Date(trialEndsAt).getTime();
}

export type TrialProfileSlice = {
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  is_trial_active?: boolean | null;
  has_used_trial?: boolean | null;
  trial_claimed?: boolean | null;
  b2b_subscription_status?: string | null;
  appsumo_plan?: string | null;
  appsumo_tier?: number | null;
  plan_type?: string | null;
  subscription_plan?: string | null;
};

export function resolveB2BAccess(input: {
  email?: string | null;
  user?: { email?: string | null } | null;
  profile?: TrialProfileSlice | null;
}): {
  isSuperAdmin: boolean;
  b2bStatus: B2BSubscriptionStatus;
  appsumoPlan: AppsumoPlanEnum;
  isTrialActive: boolean;
  hasUsedTrial: boolean;
  daysRemaining: number;
  hasEnterpriseAccess: boolean;
  trialExpiredUnpaid: boolean;
} {
  const isSuperAdmin =
    input.user?.email === OWNER_EMAIL ||
    isOwnerEmail(input.email) ||
    isSuperAdminUser(input.user);

  const statusRaw = (input.profile?.b2b_subscription_status ?? 'none') as string;
  const b2bStatus: B2BSubscriptionStatus =
    statusRaw === 'trialing' ||
    statusRaw === 'active' ||
    statusRaw === 'past_due' ||
    statusRaw === 'canceled'
      ? statusRaw
      : 'none';

  const appsumoPlan = toAppsumoPlanEnum(input.profile?.appsumo_plan, input.profile?.appsumo_tier);
  const liveTrial = isTrialWindowOpen(Boolean(input.profile?.is_trial_active), input.profile?.trial_ends_at);
  const paid = b2bStatus === 'active';
  const hasUsedTrial = Boolean(input.profile?.has_used_trial || input.profile?.trial_claimed);
  const daysRemaining = isSuperAdmin
    ? 999
    : liveTrial
      ? trialDaysRemaining(input.profile?.trial_ends_at)
      : 0;

  const hasEnterpriseAccess = isSuperAdmin || paid || liveTrial;
  const trialExpiredUnpaid =
    !isSuperAdmin &&
    !paid &&
    hasUsedTrial &&
    !liveTrial;

  return {
    isSuperAdmin,
    b2bStatus: isSuperAdmin ? 'active' : b2bStatus,
    appsumoPlan,
    isTrialActive: isSuperAdmin ? true : liveTrial,
    hasUsedTrial: isSuperAdmin ? false : hasUsedTrial,
    daysRemaining,
    hasEnterpriseAccess,
    trialExpiredUnpaid,
  };
}

export function fallbackPlanAfterTrial(profile?: TrialProfileSlice | null): string {
  const appsumo = toAppsumoPlanEnum(profile?.appsumo_plan, profile?.appsumo_tier);
  if (appsumo === 'tier_3') return 'elite';
  if (appsumo === 'tier_2') return 'pro';
  if (appsumo === 'tier_1') return 'standard';
  const raw = String(profile?.plan_type ?? profile?.subscription_plan ?? 'free');
  if (raw === 'B2B_ENTERPRISE' || raw === 'enterprise') return 'free';
  return raw || 'free';
}

export function isB2BEnterprisePath(pathname: string): boolean {
  return B2B_ENTERPRISE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
