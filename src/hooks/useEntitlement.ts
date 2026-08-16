/**
 * useEntitlement — Per-feature access check hook.
 * Reads the current plan from PlanContext and checks against FEATURE_GATES.
 *
 * Usage:
 *   const { hasAccess, gate, requiredTier } = useEntitlement('MULTI_LANGUAGE_SUPPORT');
 */
import { useCallback, useState } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { canAccess, getGate, getRequiredTierFor, type FeatureKey, type PlanTier, type FeatureGate } from '@/lib/entitlements';

export interface EntitlementResult {
  /** True if the user's current plan grants access to this feature */
  hasAccess: boolean;
  /** The minimum tier required for this feature */
  requiredTier: PlanTier;
  /** The full gate descriptor */
  gate: FeatureGate | undefined;
  /** Whether plan data is still loading (show skeleton states) */
  isLoading: boolean;
  /** Current user tier */
  tier: PlanTier;
  /**
   * Call this to show the UpgradeModal for this feature.
   * Returns false immediately if the user already has access (so you can skip the modal).
   */
  requireAccess: () => boolean;
  /** Upgrade modal open state — toggle with requireAccess() / closeModal() */
  isUpgradeModalOpen: boolean;
  closeModal: () => void;
}

export function useEntitlement(featureKey: FeatureKey): EntitlementResult {
  const { tier, isLoading } = usePlan();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const gate = getGate(featureKey);
  const requiredTier = getRequiredTierFor(featureKey);
  const hasAccess = !isLoading && canAccess(tier, featureKey);

  const requireAccess = useCallback((): boolean => {
    if (hasAccess) return true;
    setIsUpgradeModalOpen(true);
    return false;
  }, [hasAccess]);

  const closeModal = useCallback(() => setIsUpgradeModalOpen(false), []);

  return {
    hasAccess,
    requiredTier,
    gate,
    isLoading,
    tier,
    requireAccess,
    isUpgradeModalOpen,
    closeModal,
  };
}

/**
 * Check multiple features at once.
 * Returns a map of featureKey → hasAccess boolean.
 */
export function useEntitlements(featureKeys: FeatureKey[]): Record<FeatureKey, boolean> {
  const { tier, isLoading } = usePlan();
  const result = {} as Record<FeatureKey, boolean>;
  for (const key of featureKeys) {
    result[key] = !isLoading && canAccess(tier, key);
  }
  return result;
}
