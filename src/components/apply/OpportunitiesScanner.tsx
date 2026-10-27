import type { ComponentType, SVGProps } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OPPORTUNITY_PLATFORMS, resolveOpportunityHref, type OpportunityPlatform } from '@/lib/opportunities';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function SafeIcon({ icon: Icon, className }: { icon?: IconComponent; className?: string }) {
  if (!Icon) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      </svg>
    );
  }
  return <Icon className={className} />;
}

interface OpportunitiesScannerProps {
  platform: 'All' | OpportunityPlatform;
  onPlatformChange: (platform: 'All' | OpportunityPlatform) => void;
  scanning: boolean;
  onScan: () => void | Promise<void>;
  scanLabel: string;
  scanningLabel: string;
  creditLabel: string;
  disabled?: boolean;
  counts?: Partial<Record<'All' | OpportunityPlatform, number>>;
  /** @deprecated Refresh is merged into the scan action — prop is accepted but not rendered. */
  onRefresh?: () => void | Promise<void>;
  /** @deprecated Label ignored — merged into scan button. */
  refreshLabel?: string;
  /** @deprecated State ignored — unified with scanning. */
  refreshing?: boolean;
}

const PLATFORM_TONE: Record<string, string> = {
  All: 'border-amber-500/40 text-amber-200',
  Fiverr: 'border-emerald-500/40 text-emerald-300',
  Upwork: 'border-green-500/40 text-green-300',
  Freelancer: 'border-sky-500/40 text-sky-300',
  LinkedIn: 'border-blue-500/40 text-blue-300',
};

export function OpportunityJobLink({
  url,
  platform,
  title,
  label = 'View / Apply on Platform ↗',
  className,
}: {
  url?: string | null;
  platform?: string;
  title?: string;
  label?: string;
  className?: string;
}) {
  const href = resolveOpportunityHref(platform || 'Upwork', url, title);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-[0_0_0_1px_rgba(16,185,129,0.35)]',
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}

export function OpportunitiesScanner({
  platform,
  onPlatformChange,
  scanning,
  onScan,
  scanLabel,
  scanningLabel,
  creditLabel,
  disabled,
  counts,
}: OpportunitiesScannerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Single merged Scan + Refresh action button */}
      <Button
        onClick={() => {
          void Promise.resolve(onScan()).catch(() => undefined);
        }}
        disabled={scanning || disabled}
        className="bg-gradient-to-r from-amber-500 to-primary text-primary-foreground gap-2"
      >
        {scanning
          ? <SafeIcon icon={Loader2} className="w-4 h-4 animate-spin" />
          : <SafeIcon icon={Sparkles} className="w-4 h-4" />}
        {scanning ? scanningLabel : scanLabel}
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-black/20 bg-black/10">{creditLabel}</span>
      </Button>
      <div className="flex flex-wrap gap-1">
        {OPPORTUNITY_PLATFORMS.map((name) => {
          const active = platform === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onPlatformChange(name)}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                active ? `bg-white/10 ${PLATFORM_TONE[name]}` : 'border-white/10 text-muted-foreground hover:text-foreground',
              )}
            >
              {name}
              {typeof counts?.[name] === 'number' ? (
                <span className="ml-1 opacity-70">{counts[name]}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
