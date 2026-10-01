import { cn } from '@/lib/utils';
import type { DisplayTier } from '@/lib/displayTier';

export function TierBadge({ tier, className }: { tier: DisplayTier; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-tight uppercase',
        tier.className,
        className,
      )}
    >
      {tier.label}
    </span>
  );
}
