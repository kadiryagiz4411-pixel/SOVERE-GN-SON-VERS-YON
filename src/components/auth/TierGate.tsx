import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Crown, Building2, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIER_LABELS, type AccessTier, useTierAccess } from '@/hooks/useTierAccess';
import { useSession } from '@/contexts/SessionContext';

interface TierGateProps {
  open?: boolean;
  onClose?: () => void;
  featureName: string;
  requiredTier: AccessTier;
  description?: string;
  /** page = banner + modal overlay; modal = dialog only; banner = inline card */
  variant?: 'page' | 'modal' | 'banner';
}

const TIER_STYLE: Record<AccessTier, { badge: string; accent: string; icon: ReactNode }> = {
  standard: {
    badge: 'bg-slate-600/30 text-slate-200 border-slate-500/40',
    accent: 'text-slate-200',
    icon: <Lock className="w-5 h-5" />,
  },
  pro: {
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    accent: 'text-violet-300',
    icon: <Lock className="w-5 h-5" />,
  },
  elite: {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accent: 'text-amber-300',
    icon: <Crown className="w-5 h-5" />,
  },
  enterprise: {
    badge: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
    accent: 'text-yellow-300',
    icon: <Building2 className="w-5 h-5" />,
  },
};

export function TierLockBadge({ required }: { required: AccessTier }) {
  const style = TIER_STYLE[required];
  return (
    <span
      className={cn(
        'ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap',
        style.badge,
      )}
    >
      🔒 {TIER_LABELS[required]}
    </span>
  );
}

export function TierGateBanner({
  featureName,
  requiredTier,
  description,
}: Pick<TierGateProps, 'featureName' | 'requiredTier' | 'description'>) {
  const style = TIER_STYLE[requiredTier];
  const label = TIER_LABELS[requiredTier];

  return (
    <div className="mx-6 mt-6 rounded-2xl border border-dashed border-amber-500/30 bg-card/80 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border shrink-0', style.badge)}>
          <Lock className={cn('w-5 h-5', style.accent)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">{featureName}</h2>
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', style.badge)}>
              🔒 {label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {description ?? `This feature requires the ${label} plan or higher.`}
          </p>
        </div>
        <Link
          to="/pricing"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shrink-0"
        >
          Upgrade to {label}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export function TierGate({
  open = true,
  onClose,
  featureName,
  requiredTier,
  description,
  variant = 'modal',
}: TierGateProps) {
  const style = TIER_STYLE[requiredTier];
  const label = TIER_LABELS[requiredTier];

  if (variant === 'banner') {
    return <TierGateBanner featureName={featureName} requiredTier={requiredTier} description={description} />;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tier-gate-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border', style.badge)}>
              {style.icon}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <h2 id="tier-gate-title" className="mt-4 text-xl font-semibold text-foreground">
            {featureName}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {description ?? `Unlock this module by upgrading to ${label}.`}
          </p>
          <div className="mt-4">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', style.badge)}>
              🔒 Required: {label}
            </span>
          </div>
          <Link
            to="/pricing"
            onClick={onClose}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold"
          >
            Upgrade to {label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface GatedPageProps {
  required: AccessTier;
  featureName: string;
  description?: string;
  children: ReactNode;
}

/** Page wrapper: shows children when allowed, otherwise banner + lock modal. */
export function GatedFeature({ required, featureName, description, children }: GatedPageProps) {
  const { user } = useSession();
  const access = useTierAccess(required);
  const [modalOpen, setModalOpen] = useState(true);
  const isSuperAdmin = user?.email === 'kadiryagiz4411@gmail.com';

  if (isSuperAdmin || access.isLoading) {
    return <>{children}</>;
  }

  if (access.hasAccess) {
    return <>{children}</>;
  }

  return (
    <>
      <TierGateBanner featureName={featureName} requiredTier={required} description={description} />
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">{children}</div>
      <TierGate
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        featureName={featureName}
        requiredTier={required}
        description={description}
      />
    </>
  );
}
