/**
 * ProposalCard.tsx — Ranked job opportunity card for Module B.
 */

import { Star, Briefcase, DollarSign, Zap, Copy, ExternalLink } from 'lucide-react';
import { resolveUpworkJobUrl, upworkSearchUrl } from '@/lib/upwork';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RankedJob, JobFit } from '@/lib/schemas/job';

interface ProposalCardProps {
  job: RankedJob;
  onInjectProposal: (job: RankedJob) => void;
  injecting?: boolean;
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-[0_0_14px_rgba(251,191,36,0.6)]',
  2: 'bg-gradient-to-br from-slate-300 to-slate-500 text-black shadow-[0_0_10px_rgba(203,213,225,0.4)]',
  3: 'bg-gradient-to-br from-orange-600 to-amber-700 text-white shadow-[0_0_10px_rgba(234,88,12,0.4)]',
};

const FIT_CHIP: Record<JobFit, string> = {
  'Must Apply':   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Strong Match': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Worth a Look': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Skip:           'bg-red-500/15 text-red-400 border-red-500/30',
};

function scoreColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 55) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(score: number) {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 55) return 'bg-amber-500';
  return 'bg-red-500';
}

function JobAvatar({ title }: { title: string }) {
  const initials = title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-sm">
      {initials || <Briefcase className="w-4 h-4" />}
    </div>
  );
}

export function ProposalCard({ job, onInjectProposal, injecting }: ProposalCardProps) {
  const rankStyle = RANK_STYLES[job.rankPosition] ?? 'bg-muted text-muted-foreground';
  const topCard = job.rankPosition <= 3;

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
      topCard ? 'border-primary/30 shadow-[0_0_20px_rgba(212,175,55,0.08)]' : 'border-border',
    )}>
      {topCard && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
      )}

      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <JobAvatar title={job.title} />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate text-sm leading-tight">{job.title}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{job.clientName || 'Client'}</p>
          </div>
        </div>
        <div className={cn('shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold', rankStyle)}>
          #{job.rankPosition}
        </div>
      </div>

      <div className="px-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {job.budget && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> {job.budget}
          </span>
        )}
      </div>

      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Win Probability</span>
          <span className={cn('text-sm font-bold', scoreColor(job.compatibilityScore))}>{job.compatibilityScore}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full', scoreBg(job.compatibilityScore))} style={{ width: `${job.compatibilityScore}%` }} />
        </div>
      </div>

      <div className="px-4 mt-2">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', FIT_CHIP[job.recommendation])}>
          {job.rankPosition === 1 && <Star className="w-2.5 h-2.5" />}
          {job.recommendation}
        </span>
      </div>

      {job.whyApply && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-500/8 border border-amber-500/20 p-3">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest mb-1">Why Apply to This Job?</p>
          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{job.whyApply}</p>
        </div>
      )}

      {job.keyFits?.length > 0 && (
        <div className="px-4 mt-3 flex flex-wrap gap-1">
          {job.keyFits.slice(0, 3).map((s, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              {s}
            </span>
          ))}
        </div>
      )}

      {job.skills?.length > 0 && (
        <div className="px-4 mt-3 flex flex-wrap gap-1">
          {job.skills.slice(0, 6).map((skill, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{skill}</Badge>
          ))}
        </div>
      )}

      {job.generatedProposal && (
        <div className="mx-4 mt-3 rounded-xl bg-muted/40 border border-border p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Inject Payload</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{job.generatedProposal}</p>
        </div>
      )}

      <div className="mt-auto p-4 pt-3 flex gap-2 border-t border-border/60 mt-4">
        <a
          href={/https?:\/\//i.test(job.rawContent || '') ? resolveUpworkJobUrl(job.rawContent) : upworkSearchUrl(job.title)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
        >
          View on Upwork
          <ExternalLink className="w-3 h-3" />
        </a>
        <Button
          size="sm"
          variant="gold"
          className="flex-1 h-8 text-xs gap-1"
          disabled={injecting}
          onClick={() => onInjectProposal(job)}
        >
          <Zap className="w-3 h-3" /> Inject Proposal
        </Button>
        {job.autoFillPayload && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => void navigator.clipboard.writeText(job.autoFillPayload || '')}
          >
            <Copy className="w-3 h-3" /> Copy
          </Button>
        )}
      </div>
    </div>
  );
}

export default ProposalCard;
