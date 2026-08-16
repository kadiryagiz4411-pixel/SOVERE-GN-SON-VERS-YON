/**
 * UpgradeModal — Context-aware "Upgrade Required" overlay.
 * Shows the locked feature, the minimum required tier, pricing, and
 * top features of the required plan. CTA navigates to /settings/billing.
 */
import { useNavigate } from 'react-router-dom';
import { X, Lock, Check, ArrowRight, Zap, Crown, Building2, Star, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type FeatureKey, type PlanTier,
  getGate, TIER_META,
} from '@/lib/entitlements';

// ─── Tier icon map ─────────────────────────────────────────────────────────────

const TIER_ICONS: Record<PlanTier, React.ReactNode> = {
  free:        <Zap className="w-5 h-5" />,
  single_pass: <Ticket className="w-5 h-5" />,
  standard:    <Star className="w-5 h-5" />,
  pro:         <Zap className="w-5 h-5" />,
  elite:       <Crown className="w-5 h-5" />,
  enterprise:  <Building2 className="w-5 h-5" />,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface UpgradeModalProps {
  open: boolean;
  featureKey: FeatureKey;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function UpgradeModal({ open, featureKey, onClose }: UpgradeModalProps) {
  const navigate = useNavigate();
  const gate = getGate(featureKey);

  if (!open || !gate) return null;

  const requiredTier = gate.minTier;
  const meta = TIER_META[requiredTier];

  const handleUpgrade = () => {
    onClose();
    navigate('/settings/billing');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        className={cn(
          "relative w-full max-w-md bg-slate-900 rounded-2xl border shadow-2xl shadow-black/60 overflow-hidden",
          meta.borderClass
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient strip */}
        <div className={cn("bg-gradient-to-br p-6 pb-5", meta.bgClass)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Lock badge */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center border",
                meta.borderClass,
                "bg-slate-900/60"
              )}>
                <Lock className={cn("w-5 h-5", meta.accentClass)} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
                  Upgrade Required
                </p>
                <h2 className="text-base font-bold text-slate-100 leading-tight">
                  {gate.title}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors -mt-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            {gate.description}
          </p>
        </div>

        {/* Required plan info */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("", meta.accentClass)}>
                {TIER_ICONS[requiredTier]}
              </span>
              <span className={cn("font-bold text-base", meta.accentClass)}>
                {meta.label}
              </span>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                meta.badgeClass
              )}>
                Required
              </span>
            </div>
            <div className="text-right">
              <p className={cn("text-xl font-black", meta.accentClass)}>
                ${meta.priceMonthly}
                <span className="text-slate-500 text-sm font-normal">/mo</span>
              </p>
              {meta.priceAnnual < meta.priceMonthly && (
                <p className="text-xs text-emerald-400">
                  ${meta.priceAnnual}/mo billed annually
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Feature list */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            What you unlock
          </p>
          <ul className="space-y-2.5">
            {meta.topFeatures.map((feat, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Check className={cn("w-4 h-4 mt-0.5 shrink-0", meta.accentClass)} />
                <span className="text-sm text-slate-300">{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade hint */}
        <div className="px-6 pb-2">
          <p className="text-xs text-slate-600">{gate.upgradeHint}</p>
        </div>

        {/* CTAs */}
        <div className="px-6 pb-6 pt-2 space-y-2.5">
          <button
            onClick={handleUpgrade}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all",
              requiredTier === 'enterprise'
                ? "bg-gradient-to-r from-yellow-700 via-amber-600 to-yellow-500 hover:from-yellow-600 hover:to-amber-500 text-slate-950 shadow-lg shadow-yellow-600/25"
                : requiredTier === 'elite'
                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-600/25"
                : requiredTier === 'pro'
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30"
                : "bg-slate-700 hover:bg-slate-600 text-slate-100"
            )}
          >
            {TIER_ICONS[requiredTier]}
            View {meta.label} Plans
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Trust footer */}
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-slate-700">
            7-day money-back guarantee · Secure checkout by Lemon Squeezy
          </p>
        </div>
      </div>
    </div>
  );
}
