/**
 * FeatureGate — Declarative feature access enforcement component.
 *
 * Usage patterns:
 *
 * 1. Render-gate (replaces children with a locked placeholder):
 *    <FeatureGate featureKey="PREMIUM_TEMPLATES">
 *      <TemplateGrid />
 *    </FeatureGate>
 *
 * 2. Click-gate (wraps children, blocks clicks and opens upgrade modal):
 *    <FeatureGate featureKey="ATS_KEYWORD_INJECTOR" mode="click">
 *      <Button>Run ATS Scan</Button>
 *    </FeatureGate>
 *
 * 3. Custom locked state:
 *    <FeatureGate featureKey="AI_INTERVIEW_SIMULATOR" lockedFallback={<MyLockedUI />}>
 *      <InterviewSimulator />
 *    </FeatureGate>
 */
import { type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEntitlement } from '@/hooks/useEntitlement';
import { UpgradeModal } from './UpgradeModal';
import { TIER_META, getGate, type FeatureKey } from '@/lib/entitlements';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface FeatureGateProps {
  featureKey: FeatureKey;
  children: ReactNode;
  /**
   * "render" (default): replaces children with a locked card if no access.
   * "click": wraps children in an overlay that intercepts clicks.
   */
  mode?: 'render' | 'click';
  /** Custom locked state — overrides the default locked card in "render" mode */
  lockedFallback?: ReactNode;
  /** Custom className on the click-gate wrapper div */
  className?: string;
}

// ─── Default locked card ───────────────────────────────────────────────────────

function LockedCard({
  featureKey, onUnlock,
}: {
  featureKey: FeatureKey;
  onUnlock: () => void;
}) {
  const gate = getGate(featureKey);
  const requiredTier = gate?.minTier ?? 'pro';
  const meta = TIER_META[requiredTier];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-dashed cursor-pointer group",
        "bg-slate-900/60 hover:bg-slate-800/60 transition-all",
        meta.borderClass
      )}
      onClick={onUnlock}
      role="button"
      aria-label={`Unlock ${gate?.title ?? featureKey}`}
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center border",
        "bg-slate-800 group-hover:scale-110 transition-transform",
        meta.borderClass
      )}>
        <Lock className={cn("w-5 h-5", meta.accentClass)} />
      </div>

      <div className="text-center">
        <p className="font-semibold text-slate-200 text-sm">{gate?.title ?? 'Locked Feature'}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Requires{' '}
          <span className={cn("font-semibold", meta.accentClass)}>{meta.label}</span>
          {' '}— ${meta.priceMonthly}/mo
        </p>
      </div>

      <span className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
        meta.badgeClass
      )}>
        <Lock className="w-3 h-3" />
        Upgrade to Unlock
      </span>
    </div>
  );
}

// ─── Click-gate overlay ────────────────────────────────────────────────────────

function ClickGateWrapper({
  featureKey, children, onUnlock, className,
}: {
  featureKey: FeatureKey;
  children: ReactNode;
  onUnlock: () => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div
        className="absolute inset-0 cursor-not-allowed flex items-center justify-center"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onUnlock(); }}
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-lg text-xs font-semibold text-slate-300">
          <Lock className="w-3 h-3" />
          Upgrade to unlock
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function FeatureGate({
  featureKey,
  children,
  mode = 'render',
  lockedFallback,
  className,
}: FeatureGateProps) {
  const {
    hasAccess, isLoading,
    requireAccess, isUpgradeModalOpen, closeModal,
  } = useEntitlement(featureKey);

  // While plan is loading, render children transparently (avoids flash of locked state)
  if (isLoading) {
    return <>{children}</>;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // ── Locked path ──────────────────────────────────────────────────────────────
  return (
    <>
      {mode === 'click' ? (
        <ClickGateWrapper
          featureKey={featureKey}
          onUnlock={requireAccess}
          className={className}
        >
          {children}
        </ClickGateWrapper>
      ) : (
        lockedFallback ?? (
          <LockedCard
            featureKey={featureKey}
            onUnlock={requireAccess}
          />
        )
      )}

      <UpgradeModal
        open={isUpgradeModalOpen}
        featureKey={featureKey}
        onClose={closeModal}
      />
    </>
  );
}

// ─── Convenience: GatedButton (click-gate a single button) ────────────────────

interface GatedButtonProps {
  featureKey: FeatureKey;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function GatedButton({
  featureKey, children, onClick, className, disabled,
}: GatedButtonProps) {
  const { hasAccess, requireAccess, isUpgradeModalOpen, closeModal } = useEntitlement(featureKey);

  const handleClick = () => {
    if (!requireAccess()) return;
    onClick?.();
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn("relative", !hasAccess && "opacity-75", className)}
      >
        {!hasAccess && (
          <Lock className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        )}
        {children}
      </button>

      <UpgradeModal
        open={isUpgradeModalOpen}
        featureKey={featureKey}
        onClose={closeModal}
      />
    </>
  );
}
