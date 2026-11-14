import { guestRemainingLabel } from '@/lib/guestMode';
import { cn } from '@/lib/utils';

export function GuestRemainingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-amber-200',
        className,
      )}
    >
      {guestRemainingLabel()}
    </span>
  );
}
