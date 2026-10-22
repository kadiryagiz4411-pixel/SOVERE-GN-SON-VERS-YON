import { isPaidPlan } from '@/lib/plans';
import { isAppsumoLtdUser, toAppsumoPlanEnum } from '@/lib/b2bTrial';
import { isOwnerEmail } from '@/lib/superadmin';

export type PaywallKind = 'none' | 'saas_upgrade' | 'saas_renew' | 'appsumo_credits';

export interface PaywallInput {
  isOwner?: boolean;
  isUnlimited?: boolean;
  appsumoTier?: number | null;
  appsumoPlan?: string | null;
  planType?: string | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  b2bSubscriptionStatus?: string | null;
  remainingCredits?: number | null;
  isTrialActive?: boolean | null;
  trialEndsAt?: string | null;
}

const EXPIRED_STATUSES = new Set([
  'canceled',
  'cancelled',
  'expired',
  'past_due',
  'unpaid',
  'paused',
]);

export function isAppsumoLifetimeUser(input: PaywallInput): boolean {
  if (Number(input.appsumoTier ?? 0) >= 1) return true;
  const appsumo = toAppsumoPlanEnum(input.appsumoPlan, input.appsumoTier);
  if (isAppsumoLtdUser(appsumo)) return true;
  const blob = `${input.appsumoPlan || ''} ${input.subscriptionTier || ''} ${input.planType || ''}`.toLowerCase();
  return blob.includes('appsumo');
}

export function isSaasBillingExpired(input: PaywallInput): boolean {
  const status = String(input.subscriptionStatus || '').toLowerCase();
  if (EXPIRED_STATUSES.has(status)) return true;
  const b2b = String(input.b2bSubscriptionStatus || '').toLowerCase();
  if (EXPIRED_STATUSES.has(b2b) && !isAppsumoLifetimeUser(input)) return true;
  if (input.isTrialActive === false && input.trialEndsAt) {
    const end = new Date(input.trialEndsAt).getTime();
    if (!Number.isNaN(end) && Date.now() >= end && !isPaidPlan(String(input.planType || input.subscriptionTier || ''))) {
      return true;
    }
  }
  return false;
}

export function resolvePaywall(input: PaywallInput): { kind: PaywallKind; cta: 'upgrade' | 'renew' } {
  if (input.isOwner || input.isUnlimited) {
    return { kind: 'none', cta: 'upgrade' };
  }

  const remaining = Number(input.remainingCredits ?? 0);

  // Lifetime deals never hard-lock. Credits refresh monthly; prompt only at 0.
  if (isAppsumoLifetimeUser(input)) {
    if (remaining <= 0) return { kind: 'appsumo_credits', cta: 'upgrade' };
    return { kind: 'none', cta: 'upgrade' };
  }

  if (isSaasBillingExpired(input)) {
    return { kind: 'saas_renew', cta: 'renew' };
  }

  if (remaining <= 0) {
    return { kind: 'saas_upgrade', cta: 'upgrade' };
  }

  return { kind: 'none', cta: 'upgrade' };
}

/** Auto-lock overlay for paid SaaS that expired or depleted — not for free browsers. */
export function shouldAutoLockPaywall(input: PaywallInput): boolean {
  if (input.isOwner || input.isUnlimited || isAppsumoLifetimeUser(input)) return false;
  const plan = String(input.planType || input.subscriptionTier || '');
  if (!isPaidPlan(plan)) return isSaasBillingExpired(input);
  const resolved = resolvePaywall(input);
  return resolved.kind === 'saas_renew' || resolved.kind === 'saas_upgrade';
}

export function shouldBlockGeneration(input: PaywallInput): boolean {
  return resolvePaywall(input).kind !== 'none';
}

export function paywallFromSession(session: PaywallInput & { user?: { email?: string | null } | null }): {
  kind: PaywallKind;
  cta: 'upgrade' | 'renew';
} {
  return resolvePaywall({
    ...session,
    isOwner: session.isOwner || isOwnerEmail(session.user?.email),
    isUnlimited: Boolean(session.isUnlimited || session.isOwner),
  });
}
