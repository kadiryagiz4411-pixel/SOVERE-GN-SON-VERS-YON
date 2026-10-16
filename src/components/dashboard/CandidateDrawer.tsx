/**
 * CandidateDrawer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-over detail panel for a single ranked candidate.
 * Opens from CandidateCard "View Full CV" button.
 */

import { X, MapPin, Briefcase, Mail, GraduationCap, Star, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RankedCandidate, Recommendation } from '@/lib/schemas/candidate';
import { CandidateAvatar } from './CandidateCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateDrawerProps {
  candidate:  RankedCandidate | null;
  open:       boolean;
  onClose:    () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REC_COLORS: Record<Recommendation, string> = {
  'Top Pick':        'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'Strong Fit':      'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'Moderate Fit':    'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'Not Recommended': 'text-red-400 bg-red-500/10 border-red-500/30',
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-blue-500' : score >= 55 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 85 ? 'text-emerald-400' : score >= 70 ? 'text-blue-400' : score >= 55 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Overall Match Score</span>
        <span className={cn('font-bold', textColor)}>{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CandidateDrawer({ candidate, open, onClose }: CandidateDrawerProps) {
  if (!candidate) return null;

  const {
    fullName, title, email, location, experienceYears, photoUrl,
    summary, skills, education, workHistory,
    rankPosition, overallScore, recommendation, whyThisCandidate, keyStrengths, missingSkills,
    rawContent,
  } = candidate;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        'fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <CandidateAvatar name={fullName} photoUrl={photoUrl} />
            <div>
              <p className="font-bold text-foreground">{fullName}</p>
              <p className="text-sm text-muted-foreground">{title || 'Professional'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
              #{rankPosition}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
              {experienceYears > 0 && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{experienceYears} years exp</span>}
              {email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{email}</span>}
            </div>

            {/* Score + recommendation */}
            <div className="space-y-3">
              <ScoreBar score={overallScore} />
              <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', REC_COLORS[recommendation])}>
                {rankPosition === 1 && <Star className="w-3 h-3" />}
                {recommendation}
              </span>
            </div>

            {/* Why this candidate */}
            {whyThisCandidate && (
              <div className="rounded-xl bg-indigo-500/8 border border-indigo-500/20 p-4">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Why This Candidate?</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{whyThisCandidate}</p>
              </div>
            )}

            {/* Strengths & gaps */}
            <div className="grid grid-cols-2 gap-4">
              {keyStrengths?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" /> Strengths
                  </p>
                  <ul className="space-y-1">
                    {keyStrengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-400">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {missingSkills?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> Gaps
                  </p>
                  <ul className="space-y-1">
                    {missingSkills.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Summary */}
            {summary && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Summary</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Work History */}
            {workHistory && workHistory.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Work History</p>
                <div className="space-y-3">
                  {workHistory.map((w, i) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-3 py-0.5">
                      <p className="font-medium text-sm text-foreground">{w.role}</p>
                      <p className="text-xs text-muted-foreground">{w.company} · {w.period}</p>
                      {w.highlights?.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {w.highlights.map((h, j) => (
                            <li key={j} className="text-xs text-foreground/60 flex items-start gap-1">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />{h}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {skills && skills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {education && (
              <div className="flex items-start gap-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Education</p>
                  <p className="text-sm text-foreground/80">{education}</p>
                </div>
              </div>
            )}

            {/* Raw CV excerpt */}
            {rawContent && rawContent.length > 50 && (
              <details className="group">
                <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors">
                  Raw CV Extract
                </summary>
                <pre className="mt-2 text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {rawContent.slice(0, 1500)}{rawContent.length > 1500 ? '…' : ''}
                </pre>
              </details>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  );
}

export default CandidateDrawer;
