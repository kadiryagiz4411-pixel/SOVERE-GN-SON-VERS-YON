import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { GatedFeature } from '@/components/auth/TierGate';
import { useSession } from '@/contexts/SessionContext';
import type { AccessTier } from '@/hooks/useTierAccess';
import { useTierAccess } from '@/hooks/useTierAccess';

interface GatedAppPageProps {
  required: AccessTier;
  featureName: string;
  description?: string;
  children: ReactNode;
}

export function GatedAppPage({ required, featureName, description, children }: GatedAppPageProps) {
  const { user, creditsBalance, hasB2BAccess } = useSession();
  const { currentTier, planType } = useTierAccess();
  const isSuperAdmin = user?.email === 'kadiryagiz4411@gmail.com';
  const plan = isSuperAdmin || hasB2BAccess
    ? 'B2B_ENTERPRISE'
    : (currentTier === 'free' ? planType : currentTier);

  return (
    <AppShell
      user={user}
      plan={plan}
      creditsBalance={creditsBalance}
    >
      <GatedFeature required={required} featureName={featureName} description={description}>
        {children}
      </GatedFeature>
    </AppShell>
  );
}
