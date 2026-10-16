import brandLogo from '@/assets/brand-logo.png';
import { cn } from '@/lib/utils';

type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const MARK: Record<BrandLogoSize, string> = {
  xs: 'h-7 w-7 rounded-lg',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-12 w-12 rounded-xl',
  xl: 'h-20 w-20 rounded-2xl',
};

const WORD: Record<BrandLogoSize, string> = {
  xs: 'text-sm font-semibold',
  sm: 'text-base font-semibold',
  md: 'text-lg font-semibold',
  lg: 'text-2xl font-bold',
  xl: 'text-2xl font-semibold',
};

export interface BrandLogoProps {
  size?: BrandLogoSize;
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}

/** Official Sovereign mark on a black plate, with optional wordmark. */
export function BrandLogo({
  size = 'md',
  showWordmark = true,
  className,
  markClassName,
  wordmarkClassName,
}: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 min-w-0', className)}>
      <span
        className={cn(
          'relative shrink-0 overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_0_18px_-8px_rgba(212,175,55,0.55)]',
          MARK[size],
          markClassName,
        )}
      >
        <img
          src={brandLogo}
          alt=""
          className="h-full w-full object-contain object-center"
          draggable={false}
        />
      </span>
      {showWordmark && (
        <span className={cn('tracking-tight text-foreground truncate', WORD[size], wordmarkClassName)}>
          Sovereign
        </span>
      )}
    </span>
  );
}

export default BrandLogo;
