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
  const { user, creditsBalance } = useSession();
  const { currentTier, planType } = useTierAccess();

  return (
    <AppShell
      user={user}
      plan={currentTier === 'free' ? planType : currentTier}
      creditsBalance={creditsBalance}
    >
      <GatedFeature required={required} featureName={featureName} description={description}>
        {children}
      </GatedFeature>
    </AppShell>
  );
}
