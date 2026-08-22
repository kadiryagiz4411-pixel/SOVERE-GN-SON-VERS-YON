/**
 * PricingModal.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * In-app upgrade modal showcasing all 3 AppSumo Lifetime Deal tiers.
 *
 * Usage:
 *   <PricingModal open={show} onClose={() => setShow(false)} highlightTier="appsumo_tier2" />
 *
 * Features:
 *  - Tier cards: Tier 1 ($49), Tier 2 ($99), B2B Tier ($149)
 *  - Highlighted features per tier (bolded)
 *  - CTA button → Lemon Squeezy / AppSumo checkout URL from env vars
 *  - "Already have a code?" → navigate to /redeem
 *  - Fully keyboard-accessible (Escape closes)
 */
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Zap, Users, Sparkles, Star, ExternalLink, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APPSUMO_TIER_CONFIGS, type AppSumoTierConfig } from '@/utils/tierPermissions';

// ─── Tier card ────────────────────────────────────────────────────────────────

function TierCard({
  cfg,
  isHighlighted,
  currentTier,
}: {
  cfg: AppSumoTierConfig;
  isHighlighted: boolean;
  currentTier?: string;
}) {
  const isCurrent = currentTier === cfg.tier;
  const Icon = cfg.tier === 'appsumo_b2b' ? Users
             : cfg.tier === 'appsumo_tier2' ? Sparkles
             : Zap;

  const openCheckout = () => {
    if (!cfg.checkoutUrl || cfg.checkoutUrl === '#') return;
    if ((window as any).LemonSqueezy?.Url?.Open) {
      (window as any).LemonSqueezy.Url.Open(cfg.checkoutUrl);
    } else {
      window.open(cfg.checkoutUrl, '_blank', 'noopener');
    }
  };

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-5 transition-all',
        isHighlighted
          ? [cfg.borderColor, cfg.bgColor, 'ring-1', cfg.borderColor.replace('border-', 'ring-')]
          : 'border-border bg-card hover:border-border/80',
      )}
    >
      {/* Popular badge */}
      {cfg.tier === 'appsumo_tier2' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-violet-600 text-white shadow">
            MOST POPULAR
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
          cfg.bgColor, cfg.borderColor)}>
          <Icon className={cn('w-5 h-5', cfg.color)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className={cn('text-base font-bold', cfg.color)}>{cfg.label}</p>
            <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-semibold', cfg.color, cfg.borderColor)}>
              {cfg.badge}
            </span>
          </div>
          <p className="text-2xl font-black text-foreground mt-0.5">
            ${cfg.price}
            <span className="text-sm font-normal text-muted-foreground ml-1">one-time</span>
          </p>
        </div>
      </div>

      {/* Credits pill */}
      <div className={cn('inline-flex items-center self-start gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border mb-4', cfg.bgColor, cfg.color, cfg.borderColor)}>
        <Zap className="w-3 h-3" />
        {cfg.credits.toLocaleString()} credits / month (lifetime)
      </div>

      {/* Feature list */}
      <ul className="space-y-2 flex-1 mb-5">
        {cfg.features.map(f => {
          const isHighlightedFeature = cfg.highlighted?.includes(f);
          return (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className={cn('w-4 h-4 shrink-0 mt-0.5', isHighlightedFeature ? cfg.color : 'text-muted-foreground')} />
              <span className={isHighlightedFeature ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                {f}
              </span>
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div className={cn('w-full py-2.5 rounded-xl text-sm font-semibold text-center border', cfg.color, cfg.borderColor, cfg.bgColor)}>
          Current Plan
        </div>
      ) : (
        <button
          onClick={openCheckout}
          disabled={!cfg.checkoutUrl || cfg.checkoutUrl === '#'}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            cfg.tier === 'appsumo_b2b'
              ? 'bg-amber-500 hover:bg-amber-600 text-black'
              : cfg.tier === 'appsumo_tier2'
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white',
          )}
        >
          Get {cfg.label} on AppSumo
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  /** Tier to visually highlight (ring border) */
  highlightTier?: string;
  /** User's current tier to show "Current Plan" state */
  currentTier?: string;
}

export function PricingModal({ open, onClose, highlightTier, currentTier }: PricingModalProps) {
  const navigate = useNavigate();

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-border bg-background shadow-2xl overflow-hidden mb-8">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* AppSumo logo */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm select-none">A</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-400">AppSumo Lifetime Deal</p>
              <p className="text-[10px] text-muted-foreground">One-time purchase. Yours forever.</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground">Unlock Sovereign — Lifetime Access</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the tier that fits your workflow. No subscriptions. No renewals.
          </p>
        </div>

        {/* Tier cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {APPSUMO_TIER_CONFIGS.map(cfg => (
            <TierCard
              key={cfg.tier}
              cfg={cfg}
              isHighlighted={
                highlightTier === cfg.tier ||
                (cfg.tier === 'appsumo_tier2' && !highlightTier)
              }
              currentTier={currentTier}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 text-orange-400" />
            <span>
              Stacking supported — redeem multiple codes to stack credits or upgrade tiers.
            </span>
          </div>
          <button
            onClick={() => { onClose(); navigate('/redeem'); }}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
          >
            <Ticket className="w-3.5 h-3.5" />
            Already have a code? Activate it here
          </button>
        </div>
      </div>
    </div>
  );
}

export default PricingModal;
