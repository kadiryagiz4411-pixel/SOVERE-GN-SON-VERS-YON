/**
 * CreditCounterWidget
 * ──────────────────────────────────────────────────────────────────────────────
 * Displays the user's monthly AppSumo credit status.
 * Used in the AppShell sidebar (desktop) and mobile header.
 *
 * Variants:
 *   'badge'   — tiny inline pill (mobile header)
 *   'sidebar' — compact progress-bar block (desktop sidebar)
 */
import { useEffect, useState, useCallback } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { fetchCreditStatus, daysUntilReset, tierLabel, type CreditStatus } from '@/services/creditService';
import { cn } from '@/lib/utils';
import { useSession } from '@/contexts/SessionContext';

interface CreditCounterWidgetProps {
  userId: string | null;
  variant?: 'badge' | 'sidebar';
  className?: string;
}

export function CreditCounterWidget({
  userId,
  variant = 'sidebar',
  className,
}: CreditCounterWidgetProps) {
  const {
    hasBYOKAccess,
    isByokUnlimited,
    remainingCredits,
    monthlyCreditLimit,
    refreshCredits,
    appsumoTier,
    subscriptionTier,
  } = useSession();
  const [status, setStatus] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const shownRemaining = remainingCredits;
  const shownLimit = monthlyCreditLimit || status?.monthlyLimit || 400;
  const shownPct = shownLimit > 0 ? Math.min(100, Math.round((shownRemaining / shownLimit) * 100)) : 0;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const s = await fetchCreditStatus(userId);
    setStatus(s);
    // Pull the same row back into SessionContext so the header badge
    // and this card cannot drift onto different columns.
    await refreshCredits();
    setLoading(false);
  }, [userId, refreshCredits]);

  useEffect(() => { load(); }, [load]);

  const unlimited = hasBYOKAccess || isByokUnlimited || Boolean(status?.isByokUnlimited);

  const tierName = status?.subscriptionTier || subscriptionTier || 'free';
  const hasCreditPlan = appsumoTier >= 1 || tierName.startsWith('appsumo') || (tierName !== 'free' && tierName !== '');
  // Don't render for non-AppSumo / non-credit tiers
  if (!unlimited && !hasCreditPlan && shownRemaining <= 0) {
    return null;
  }

  /* ── Badge variant (mobile header) ── */
  if (variant === 'badge') {
    if (unlimited) {
      return (
        <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-400', className)}>
          <Zap className="w-3 h-3" />
          UNLIMITED (BYOK Active)
        </span>
      );
    }
    const badgeExhausted = shownRemaining <= 0;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border',
          badgeExhausted
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : shownPct <= 20
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          className,
        )}
      >
        <Zap className="w-3 h-3" />
        {shownRemaining}/{shownLimit}
      </span>
    );
  }

  if (unlimited) {
    return (
      <div className={cn('px-5 py-3 border-b border-border', className)}>
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Monthly Credits
          </span>
        </div>
        <span className="text-sm font-bold leading-none text-emerald-400">UNLIMITED (BYOK Active)</span>
      </div>
    );
  }

  /* ── Sidebar variant (desktop) ── */
  const barWidth = `${shownPct}%`;
  const exhausted = !unlimited && shownRemaining <= 0;

  return (
    <div className={cn('px-5 py-3 border-b border-border', className)}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Monthly Credits
          </span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Count */}
      <div className="flex items-end gap-1 mb-1">
        {status.isByokUnlimited ? (
          <span className="text-sm font-bold leading-none text-emerald-400">UNLIMITED (BYOK Active)</span>
        ) : (
          <>
            <span className={cn('text-lg font-bold leading-none', exhausted ? 'text-red-400' : shownPct <= 20 ? 'text-amber-400' : 'text-emerald-400')}>
              {shownRemaining}
            </span>
            <span className="text-xs text-muted-foreground mb-0.5">
              / {shownLimit} left
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            exhausted ? 'bg-red-500'
            : shownPct <= 20 ? 'bg-amber-500'
            : 'bg-emerald-500',
          )}
          style={{ width: barWidth }}
        />
      </div>

      {/* Reset info */}
      <p className="text-[10px] text-muted-foreground mt-1">
        {exhausted
          ? `Resets in ${daysUntilReset(status?.resetDate ?? null)}`
          : `${tierLabel(tierName)} · resets in ${daysUntilReset(status?.resetDate ?? null)}`}
      </p>
    </div>
  );
}
