/**
 * Tier permission hook (RBAC).
 * Hierarchy: standard (1) < pro (2) < elite (3) < enterprise (4)
 *
 * Existing entitlements.ts / useEntitlement remain in place.
 * This hook is the canonical check for the new Elite / Enterprise modules.
 */
import { useCallback, useMemo, useState } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { useSession } from '@/contexts/SessionContext';
import { planTypeToTier, type PlanTier } from '@/lib/entitlements';

export type AccessTier = 'standard' | 'pro' | 'elite' | 'enterprise';

export const TIER_HIERARCHY: Record<AccessTier, number> = {
  standard: 1,
  pro: 2,
  elite: 3,
  enterprise: 4,
};

export const TIER_LABELS: Record<AccessTier, string> = {
  standard: 'Standard',
  pro: 'Pro',
  elite: 'Elite',
  enterprise: 'Enterprise',
};

const PLAN_TO_ACCESS: Record<string, AccessTier | 'free'> = {
  free: 'free',
  single_pass: 'free',
  standard: 'standard',
  appsumo_tier1: 'standard',
  pro: 'pro',
  appsumo_tier2: 'pro',
  elite: 'elite',
  enterprise: 'enterprise',
  B2B_ENTERPRISE: 'enterprise',
  appsumo_b2b: 'enterprise',
  appsumo_tier3: 'enterprise',
  enterprise_b2b: 'enterprise',
  enterprise_plus: 'enterprise',
  staffing_agency: 'enterprise',
};

export function accessLevel(tier: AccessTier | 'free' | string | null | undefined): number {
  if (!tier) return 0;
  const key = String(tier).trim();
  if (key in TIER_HIERARCHY) return TIER_HIERARCHY[key as AccessTier];
  const mapped = PLAN_TO_ACCESS[key] ?? PLAN_TO_ACCESS[key.toLowerCase()];
  if (mapped && mapped !== 'free' && mapped in TIER_HIERARCHY) {
    return TIER_HIERARCHY[mapped];
  }
  return 0;
}

export function resolveAccessTier(
  ...rawValues: Array<string | null | undefined>
): AccessTier | 'free' {
  let best: AccessTier | 'free' = 'free';
  let bestLevel = 0;
  for (const raw of rawValues) {
    if (!raw) continue;
    const mapped = PLAN_TO_ACCESS[raw] ?? PLAN_TO_ACCESS[raw.toLowerCase()] ?? 'free';
    const level = mapped === 'free' ? 0 : TIER_HIERARCHY[mapped];
    if (level > bestLevel) {
      best = mapped;
      bestLevel = level;
    }
  }
  return best;
}

export function canAccessTier(
  current: AccessTier | 'free' | string | null | undefined,
  required: AccessTier,
): boolean {
  return accessLevel(current) >= TIER_HIERARCHY[required];
}

export interface TierAccessResult {
  currentTier: AccessTier | 'free';
  currentLevel: number;
  requiredTier: AccessTier | null;
  requiredLevel: number;
  hasAccess: boolean;
  isLoading: boolean;
  planType: string;
  subscriptionTier: string;
  canAccess: (required: AccessTier) => boolean;
  requireAccess: (required?: AccessTier) => boolean;
  isLockModalOpen: boolean;
  openLockModal: () => void;
  closeLockModal: () => void;
  requiredLabel: string;
}

export function useTierAccess(required?: AccessTier): TierAccessResult {
  const { tier, planType, isLoading } = usePlan();
  const { subscriptionPlan, subscriptionTier, appsumoTier } = useSession();
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  const appsumoPlan =
    appsumoTier >= 3 ? 'appsumo_tier3' : appsumoTier === 2 ? 'appsumo_tier2' : appsumoTier === 1 ? 'appsumo_tier1' : null;

  const currentTier = useMemo(
    () => resolveAccessTier(planType, subscriptionTier, subscriptionPlan, appsumoPlan, tier as PlanTier),
    [planType, subscriptionTier, subscriptionPlan, appsumoPlan, tier],
  );

  const currentLevel = accessLevel(currentTier);
  const requiredLevel = required ? TIER_HIERARCHY[required] : 0;
  const hasAccess = !required || currentLevel >= requiredLevel;

  const canAccessFn = useCallback(
    (need: AccessTier) => currentLevel >= TIER_HIERARCHY[need],
    [currentLevel],
  );

  const requireAccess = useCallback(
    (need?: AccessTier) => {
      const target = need ?? required;
      if (!target) return true;
      if (currentLevel >= TIER_HIERARCHY[target]) return true;
      setIsLockModalOpen(true);
      return false;
    },
    [currentLevel, required],
  );

  return {
    currentTier,
    currentLevel,
    requiredTier: required ?? null,
    requiredLevel,
    hasAccess: !isLoading && hasAccess,
    isLoading,
    planType: planType || subscriptionPlan || 'free',
    subscriptionTier: subscriptionTier || planType || 'free',
    canAccess: canAccessFn,
    requireAccess,
    isLockModalOpen,
    openLockModal: () => setIsLockModalOpen(true),
    closeLockModal: () => setIsLockModalOpen(false),
    requiredLabel: required ? TIER_LABELS[required] : '',
  };
}

export function planTierToAccess(tier: PlanTier): AccessTier | 'free' {
  return resolveAccessTier(planTypeToTier(tier));
}
