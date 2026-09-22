import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePlan } from '@/contexts/PlanContext';

export function TrialCountdownBadge() {
  const { isSuperAdmin, isTrialActive, daysRemaining, b2bSubscriptionStatus } = usePlan();

  // Never show for SuperAdmin or active paid subscribers
  if (isSuperAdmin || b2bSubscriptionStatus === 'active') return null;

  // Trial has expired and user hasn't subscribed
  if (!isTrialActive && b2bSubscriptionStatus === 'canceled') {
    return (
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300"
      >
        B2B trial ended — subscribe
      </Link>
    );
  }

  // No active trial — nothing to show
  if (!isTrialActive) return null;

  const tone =
    daysRemaining >= 4
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-200'
      : daysRemaining >= 1
        ? 'border-orange-500/40 bg-orange-500/15 text-orange-200'
        : 'border-red-500/40 bg-red-500/15 text-red-300';

  return (
    <div className="inline-flex items-center gap-2">
      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', tone)}>
        <Zap className="w-3 h-3" />
        {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} left in B2B Trial
      </span>
      {daysRemaining <= 3 && (
        <Link
          to="/pricing"
          className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline"
        >
          Add Subscription
        </Link>
      )}
    </div>
  );
}
