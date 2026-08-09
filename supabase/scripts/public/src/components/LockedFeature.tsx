import { useState, ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { FeatureUpgradeModal } from './FeatureUpgradeModal';
import { canAccessFeature, PlanLimits } from '@/lib/plans';

interface LockedFeatureProps {
  children: ReactNode;
  feature: keyof Omit<PlanLimits, 'dailyProposals' | 'dailyDownloads' | 'dailyCVGenerations'>;
  featureName: string;
  currentPlan: string;
  className?: string;
  showLockIcon?: boolean;
}

export const LockedFeature = ({
  children,
  feature,
  featureName,
  currentPlan,
  className = '',
  showLockIcon = true,
}: LockedFeatureProps) => {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const hasAccess = canAccessFeature(currentPlan, feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={`relative cursor-pointer group ${className}`}
        onClick={() => setShowUpgrade(true)}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-card/40 backdrop-blur-md rounded-lg flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex items-center gap-2 text-primary font-medium text-sm">
            <Lock className="w-4 h-4" />
            <span>Click to unlock</span>
          </div>
        </div>
        
        {/* Lock badge */}
        {showLockIcon && (
          <div className="absolute top-2 right-2 z-20">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        )}
        
        {/* Content with reduced opacity */}
        <div className="opacity-40 pointer-events-none filter blur-[2px]">
          {children}
        </div>
      </div>

      <FeatureUpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={currentPlan}
        feature={feature}
        featureName={featureName}
      />
    </>
  );
};

// Simple locked button component
interface LockedButtonProps {
  onClick?: () => void;
  currentPlan: string;
  feature: keyof Omit<PlanLimits, 'dailyProposals' | 'dailyDownloads' | 'dailyCVGenerations'>;
  featureName: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle';
}

export const LockedButton = ({
  onClick,
  currentPlan,
  feature,
  featureName,
  children,
  className = '',
  variant = 'default',
}: LockedButtonProps) => {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const hasAccess = canAccessFeature(currentPlan, feature);

  const handleClick = () => {
    if (hasAccess && onClick) {
      onClick();
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 ${
          !hasAccess ? 'text-muted-foreground' : ''
        } ${className}`}
      >
        {!hasAccess && <Lock className="w-3.5 h-3.5" />}
        {children}
      </button>

      <FeatureUpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={currentPlan}
        feature={feature}
        featureName={featureName}
      />
    </>
  );
};
