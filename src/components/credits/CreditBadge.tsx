import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CreditBadgeProps {
  balance: number;
  className?: string;
  to?: string;
  unlimited?: boolean;
}

export function CreditBadge({ balance, className, to = '/pricing', unlimited = false }: CreditBadgeProps) {
  if (unlimited) {
    return (
      <Link
        to={to}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0',
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          className,
        )}
        title="Tier 3 BYOK — credits are not deducted"
      >
        <Zap className="w-3.5 h-3.5" />
        UNLIMITED (BYOK Active)
      </Link>
    );
  }
  const tone =
    balance <= 0
      ? 'border-red-500/30 bg-red-500/10 text-red-400'
      : balance < 20
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0',
        tone,
        className,
      )}
      title="Credit balance — 20 credits per AI action"
    >
      <Zap className="w-3.5 h-3.5" />
      {balance.toLocaleString()} Credits
    </Link>
  );
}
