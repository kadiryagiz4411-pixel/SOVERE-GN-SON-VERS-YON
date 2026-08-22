/**
 * AppSumoBadge — subtle social-proof badge for landing pages.
 * "AppSumo Special Lifetime Deal Available"
 */
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppSumoBadgeProps {
  className?: string;
  href?: string;
  /** 'full' shows the full badge; 'compact' is a small pill */
  variant?: 'full' | 'compact';
}

export function AppSumoBadge({
  className,
  href = 'https://appsumo.com/products/sovereign',
  variant = 'full',
}: AppSumoBadgeProps) {
  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  if (variant === 'compact') {
    return (
      <Wrapper
        {...(wrapperProps as any)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
          'bg-orange-500/10 border border-orange-500/30 text-orange-400',
          'hover:bg-orange-500/20 transition-colors',
          className,
        )}
      >
        {/* AppSumo logo-like icon */}
        <span className="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-[8px] font-black text-white leading-none select-none">
          A
        </span>
        AppSumo LTD
      </Wrapper>
    );
  }

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'inline-flex items-center gap-3 px-4 py-2.5 rounded-xl',
        'bg-orange-500/10 border border-orange-500/30',
        'hover:bg-orange-500/15 hover:border-orange-500/50 transition-all',
        'cursor-pointer group',
        className,
      )}
    >
      {/* AppSumo Icon */}
      <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
        <span className="text-white font-black text-sm select-none">A</span>
      </div>

      <div>
        <p className="text-xs font-semibold text-orange-400 leading-tight">
          AppSumo Special — Lifetime Deal
        </p>
        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
          50 AI credits/month · No subscription needed
        </p>
      </div>

      {href && (
        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400 transition-colors shrink-0 ml-1" />
      )}
    </Wrapper>
  );
}
