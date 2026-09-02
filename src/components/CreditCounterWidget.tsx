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
  const { hasBYOKAccess, isByokUnlimited } = useSession();
  const [status, setStatus] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const s = await fetchCreditStatus(userId);
    setStatus(s);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const unlimited = hasBYOKAccess || isByokUnlimited || Boolean(status?.isByokUnlimited);

  // Don't render for non-AppSumo / non-credit tiers
  if (!unlimited && (!status || (!status.subscriptionTier.startsWith('appsumo') && status.subscriptionTier === 'free'))) {
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
    if (!status) return null;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border',
          status.isExhausted
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : status.usagePct <= 20
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          className,
        )}
      >
        <Zap className="w-3 h-3" />
        {status.remainingCredits}/{status.monthlyLimit}
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

  if (!status) return null;

  /* ── Sidebar variant (desktop) ── */
  const barWidth = `${Math.min(100, Math.max(0, Math.round(status.usagePct)))}%`;

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
            <span className={cn('text-lg font-bold leading-none', status.colorClass)}>
              {status.remainingCredits}
            </span>
            <span className="text-xs text-muted-foreground mb-0.5">
              / {status.monthlyLimit} left
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            status.isExhausted   ? 'bg-red-500'
            : status.usagePct <= 20 ? 'bg-amber-500'
            : 'bg-emerald-500',
          )}
          style={{ width: barWidth }}
        />
      </div>

      {/* Reset info */}
      <p className="text-[10px] text-muted-foreground mt-1">
        {status.isExhausted
          ? `Resets in ${daysUntilReset(status.resetDate)}`
          : `${tierLabel(status.subscriptionTier)} · resets in ${daysUntilReset(status.resetDate)}`}
      </p>
    </div>
  );
}
