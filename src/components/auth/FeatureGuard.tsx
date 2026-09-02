import { FeatureGate } from '@/components/entitlements/FeatureGate';
import { useSession } from '@/contexts/SessionContext';
import {
  canUseGuardFeature,
  getFeatureFlags,
  guardFeatureToKey,
  SUPERADMIN_EMAIL,
  type GuardFeature,
} from '@/lib/permissions';
import type { ReactNode } from 'react';

interface FeatureGuardProps {
  feature: GuardFeature;
  children: ReactNode;
  mode?: 'render' | 'click';
  lockedFallback?: ReactNode;
}

export function FeatureGuard({ feature, children, mode = 'render', lockedFallback }: FeatureGuardProps) {
  const { user, planType, subscriptionTier, appsumoTier } = useSession();
  const flags = getFeatureFlags({
    email: user?.email,
    user,
    planType,
    subscriptionTier,
    appsumoTier,
  });
  const allowed = user?.email === SUPERADMIN_EMAIL || canUseGuardFeature(feature, flags);

  if (allowed) return <>{children}</>;

  return (
    <FeatureGate featureKey={guardFeatureToKey(feature)} mode={mode} lockedFallback={lockedFallback}>
      {children}
    </FeatureGate>
  );
}
