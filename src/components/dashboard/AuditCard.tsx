/**
 * AuditCard — technical diagnostics. No rank, no job-fit score.
 */

import { CandidateAvatar } from '@/components/dashboard/CandidateCard';
import { Badge } from '@/components/ui/badge';
import type { TechnicalAudit } from '@/lib/ai/technicalAudit';

function Radar({ metrics }: { metrics: TechnicalAudit['radar'] }) {
  const keys = ['skillDepth', 'trajectory', 'verification', 'seniority', 'clarity'] as const;
  const labels = ['Skills', 'Trajectory', 'Verify', 'Seniority', 'Clarity'];
  const cx = 70;
  const cy = 70;
  const r = 52;
  const pts = keys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
    const mag = metrics[k] / 100;
    return [cx + r * mag * Math.cos(angle), cy + r * mag * Math.sin(angle)];
  });
  const poly = pts.map(p => p.join(',')).join(' ');
  const ring = keys.map((_, i) => {
    const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 140 140" className="w-36 h-36 mx-auto">
      <polygon points={ring} fill="none" stroke="currentColor" className="text-border" strokeWidth="1" />
      <polygon points={poly} fill="rgba(99,102,241,0.25)" stroke="rgb(129,140,248)" strokeWidth="1.5" />
      {labels.map((label, i) => {
        const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
        const x = cx + (r + 14) * Math.cos(angle);
        const y = cy + (r + 14) * Math.sin(angle);
        return (
          <text key={label} x={x} y={y} textAnchor="middle" fontSize="7" fill="currentColor" className="text-muted-foreground">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function AuditCard({ audit }: { audit: TechnicalAudit }) {
  const { candidate, radar, skillBreakdown, missingPrerequisites, trajectoryNotes, verificationFlags, summary } = audit;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <CandidateAvatar name={candidate.fullName} photoUrl={candidate.photoUrl} />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{candidate.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{candidate.title || 'Skill audit'}</p>
        </div>
      </div>
      <Radar metrics={radar} />
      <p className="text-xs text-foreground/80 leading-relaxed">{summary}</p>
      <div className="flex flex-wrap gap-1">
        {skillBreakdown.slice(0, 8).map(s => (
          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
        ))}
      </div>
      {missingPrerequisites.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold mb-1">Missing prerequisites</p>
          <p className="text-xs text-muted-foreground">{missingPrerequisites.join(', ')}</p>
        </div>
      )}
      {trajectoryNotes.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {trajectoryNotes.slice(0, 4).map((n, i) => <li key={i}>· {n}</li>)}
        </ul>
      )}
      {verificationFlags.length > 0 && (
        <p className="text-[11px] text-amber-400">{verificationFlags.slice(0, 2).join(' · ')}</p>
      )}
    </div>
  );
}
