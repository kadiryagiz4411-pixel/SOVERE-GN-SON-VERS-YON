/**
 * CandidateCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card displaying a single ranked candidate's evaluation summary.
 * Used inside CandidateGrid ordered from #1 to #N.
 */

import { Star, MapPin, Briefcase, Mail, ExternalLink, Calendar, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RankedCandidate, Recommendation } from '@/lib/schemas/candidate';
import type { DecisionStatus } from '@/lib/sharing/shareLinks';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateCardProps {
  candidate: RankedCandidate;
  onViewFull?: (candidate: RankedCandidate) => void;
  onScheduleInterview?: (candidate: RankedCandidate) => void;
  onApprove?: (candidate: RankedCandidate) => void;
  onReject?: (candidate: RankedCandidate) => void;
  clientMode?: boolean;
  decision?: DecisionStatus;
}

// ─── Rank badge styles ────────────────────────────────────────────────────────

const RANK_STYLES: Record<number, string> = {
  1: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-[0_0_14px_rgba(251,191,36,0.6)]',
  2: 'bg-gradient-to-br from-slate-300 to-slate-500 text-black shadow-[0_0_10px_rgba(203,213,225,0.4)]',
  3: 'bg-gradient-to-br from-orange-600 to-amber-700 text-white shadow-[0_0_10px_rgba(234,88,12,0.4)]',
};

const defaultRankStyle = 'bg-muted text-muted-foreground';

// ─── Recommendation chip ─────────────────────────────────────────────────────

const REC_CHIP: Record<Recommendation, string> = {
  'Top Pick':        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Strong Fit':      'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Moderate Fit':    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Not Recommended': 'bg-red-500/15 text-red-400 border-red-500/30',
};

// ─── Score color ──────────────────────────────────────────────────────────────

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

// ─── Avatar ───────────────────────────────────────────────────────────────────

function CandidateAvatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl?: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const s = size === 'md' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={cn('rounded-full object-cover shrink-0', s)} />;
  }
  return (
    <div className={cn('rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0', s)}>
      {initials || '?'}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CandidateCard({
  candidate,
  onViewFull,
  onScheduleInterview,
  onApprove,
  onReject,
  clientMode = false,
  decision = 'PENDING',
}: CandidateCardProps) {
  const { rankPosition, overallScore, recommendation, fullName, title, location, experienceYears, photoUrl, email, skills, whyThisCandidate, keyStrengths } = candidate;

  const rankStyle = RANK_STYLES[rankPosition] ?? defaultRankStyle;
  const topCard   = rankPosition <= 3;

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
      topCard ? 'border-primary/30 shadow-[0_0_20px_rgba(212,175,55,0.08)]' : 'border-border',
    )}>
      {/* Top gradient strip for top-3 */}
      {topCard && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
      )}

      {/* Header row: avatar + rank badge */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <CandidateAvatar name={fullName} photoUrl={photoUrl} />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate text-sm leading-tight">{fullName}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{title || 'Professional'}</p>
          </div>
        </div>

        {/* Rank badge */}
        <div className={cn('shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold', rankStyle)}>
          #{rankPosition}
        </div>
      </div>

      {/* Meta row */}
      <div className="px-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" /> {location}
          </span>
        )}
        {experienceYears > 0 && (
          <span className="flex items-center gap-1">
            <Briefcase className="w-3 h-3 shrink-0" /> {experienceYears}y exp
          </span>
        )}
        {email && (
          <span className="flex items-center gap-1 truncate max-w-[140px]">
            <Mail className="w-3 h-3 shrink-0" /> {email}
          </span>
        )}
      </div>

      {/* Score bar */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Match Score</span>
          <span className={cn('text-sm font-bold', scoreColor(overallScore))}>{overallScore}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', scoreBg(overallScore))} style={{ width: `${overallScore}%` }} />
        </div>
      </div>

      {/* Recommendation chip */}
      <div className="px-4 mt-2">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', REC_CHIP[recommendation])}>
          {rankPosition === 1 && <Star className="w-2.5 h-2.5" />}
          {recommendation}
        </span>
      </div>

      {/* "Why this candidate?" callout */}
      {whyThisCandidate && (
        <div className="mx-4 mt-3 rounded-xl bg-indigo-500/8 border border-indigo-500/20 p-3">
          <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">Why This Candidate?</p>
          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{whyThisCandidate}</p>
        </div>
      )}

      {/* Key strengths */}
      {keyStrengths && keyStrengths.length > 0 && (
        <div className="px-4 mt-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Strengths</p>
          <div className="flex flex-wrap gap-1">
            {keyStrengths.slice(0, 3).map((s, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skill badges */}
      {skills && skills.length > 0 && (
        <div className="px-4 mt-3">
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 6).map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                {skill}
              </Badge>
            ))}
            {skills.length > 6 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                +{skills.length - 6}
              </Badge>
            )}
          </div>
        </div>
      )}

      {clientMode && decision !== 'PENDING' && (
        <div className={cn(
          'mx-4 mt-3 text-center text-[11px] font-semibold py-1 rounded-lg',
          decision === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
        )}>
          {decision === 'APPROVED' ? 'Approved for interview' : 'Rejected'}
        </div>
      )}

      {/* Action footer */}
      <div className="mt-auto p-4 pt-3 flex gap-2 border-t border-border/60 mt-4">
        {clientMode ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              disabled={decision === 'APPROVED'}
              onClick={() => onApprove?.(candidate)}
            >
              <Check className="w-3 h-3" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
              disabled={decision === 'REJECTED'}
              onClick={() => onReject?.(candidate)}
            >
              <X className="w-3 h-3" /> Reject
            </Button>
          </>
        ) : (
          <>
            {onViewFull && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs gap-1"
                onClick={() => onViewFull(candidate)}
              >
                <ExternalLink className="w-3 h-3" /> View Full CV
              </Button>
            )}
            {onScheduleInterview && (
              <Button
                size="sm"
                variant="gold"
                className="flex-1 h-8 text-xs gap-1"
                onClick={() => onScheduleInterview(candidate)}
              >
                <Calendar className="w-3 h-3" /> Schedule Interview
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { CandidateAvatar };
export default CandidateCard;
