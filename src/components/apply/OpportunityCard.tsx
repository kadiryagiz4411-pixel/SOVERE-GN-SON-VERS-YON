import type { ReactNode } from 'react';
import { Check, ChevronDown, Ban, Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface OpportunityItem {
  id: string;
  job_title: string;
  company: string;
  platform: string;
  budget: string;
  job_description: string;
  match_score: number;
  acceptance_probability: number;
  match_reasoning: string[];
  rejection_reason: string | null;
  generated_proposal: string;
  status: string;
  skills_matched: string[];
  competition_level: string;
  urgency: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  Upwork: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Fiverr: 'bg-green-500/15 text-green-300 border-green-500/30',
  LinkedIn: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Toptal: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

function scoreTone(s: number) {
  if (s >= 90) return 'text-emerald-300';
  if (s >= 70) return 'text-sky-300';
  if (s >= 45) return 'text-amber-300';
  return 'text-rose-300';
}

interface OpportunityCardProps {
  item: OpportunityItem;
  expanded: boolean;
  selected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  whyThisLabel: string;
  doNotApplyLabel: string;
  jobDescLabel: string;
  acceptLabel: string;
  children?: ReactNode;
}

export function OpportunityCard({
  item,
  expanded,
  selected,
  onToggleExpand,
  onToggleSelect,
  whyThisLabel,
  doNotApplyLabel,
  jobDescLabel,
  acceptLabel,
  children,
}: OpportunityCardProps) {
  const isRejected = Boolean(item.rejection_reason);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-slate-900/60 backdrop-blur-md transition-all duration-300',
        'hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10',
        isRejected ? 'border-rose-500/20' : 'border-white/10',
      )}
    >
      <div className="p-4 cursor-pointer" onClick={onToggleExpand} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); } }}
      >
        <div className="flex items-start gap-3">
          {item.status !== 'applied' && !isRejected ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              className={cn(
                'mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all active:scale-[0.98]',
                selected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20',
              )}
            >
              {selected ? <Check className="w-3 h-3 text-white" /> : null}
            </button>
          ) : null}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', PLATFORM_COLORS[item.platform] || 'bg-white/5 text-slate-400 border-white/10')}>
                {item.platform}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/5 text-slate-300">
                {item.urgency}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/5 text-slate-400">
                <Users className="w-3 h-3 inline mr-0.5" /> {item.competition_level}
              </span>
              {item.status === 'applied' ? <Badge className="bg-sky-500/20 text-sky-300 text-[10px]">Applied</Badge> : null}
              {item.status === 'approved' ? <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">Approved</Badge> : null}
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-white/90 truncate">{item.job_title}</h3>
            <p className="text-xs text-slate-400">{item.company} • {item.budget}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <div className="flex flex-col items-center min-w-[58px] rounded-xl p-2 bg-white/5 border border-white/10">
              <span className={cn('text-lg font-bold tracking-tight', scoreTone(item.match_score))}>{item.match_score}%</span>
              <span className="text-[8px] text-slate-400 uppercase">Match</span>
            </div>
            <div className="flex flex-col items-center min-w-[58px] rounded-xl p-2 bg-white/5 border border-white/10">
              <span className={cn('text-lg font-bold tracking-tight', scoreTone(item.acceptance_probability))}>{item.acceptance_probability}%</span>
              <span className="text-[8px] text-slate-400 uppercase">{acceptLabel}</span>
            </div>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
        </div>

        {isRejected ? (
          <div className="mt-3 flex items-start gap-2 bg-rose-500/10 rounded-lg p-3">
            <Ban className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-rose-300 uppercase">{doNotApplyLabel}</span>
              <p className="text-xs text-rose-200/80 mt-0.5">{item.rejection_reason}</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {(item.skills_matched ?? []).slice(0, 5).map((skill) => (
            <span key={`${item.id}-${skill}`} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-white/10 px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase mb-1">{jobDescLabel}</h4>
            <p className="text-sm text-slate-200/80 whitespace-pre-line">{item.job_description}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-amber-400 uppercase mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {whyThisLabel}
            </h4>
            <ul className="space-y-1">
              {(item.match_reasoning ?? []).map((reason) => (
                <li key={`${item.id}-${reason}`} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">◆</span> {reason}
                </li>
              ))}
            </ul>
          </div>
          {children}
        </div>
      ) : null}
    </div>
  );
}
