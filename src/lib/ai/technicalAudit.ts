/**
 * technicalAudit.ts — Deep skill/gap diagnostics. No job-fit ranking.
 */

import type { CandidateProfile } from '@/lib/schemas/candidate';
import { sanitizeAiText, sanitizeList } from '@/lib/ai/sanitizer';
import { analyzeTextLocally } from '@/services/b2b/fraudDetector';

export interface RadarMetrics {
  skillDepth: number;
  trajectory: number;
  verification: number;
  seniority: number;
  clarity: number;
}

export interface TechnicalAudit {
  candidate: CandidateProfile;
  radar: RadarMetrics;
  skillBreakdown: string[];
  missingPrerequisites: string[];
  trajectoryNotes: string[];
  verificationFlags: string[];
  summary: string;
}

const CORE_STACK = [
  'typescript', 'javascript', 'react', 'node', 'python', 'sql', 'aws', 'docker',
  'kubernetes', 'java', 'go', 'system design', 'testing', 'ci/cd',
];

function clamp(n: number) {
  return Math.max(5, Math.min(98, Math.round(n)));
}

export function auditCandidate(candidate: CandidateProfile): TechnicalAudit {
  const text = `${candidate.summary}\n${candidate.rawContent}\n${candidate.skills.join(' ')}`.toLowerCase();
  const fluff = analyzeTextLocally(candidate.rawContent || candidate.summary || '');

  const skillHits = CORE_STACK.filter(s => text.includes(s));
  const skillDepth = clamp(30 + skillHits.length * 8 + Math.min(20, candidate.skills.length * 2));
  const trajectory = clamp(25 + (candidate.workHistory?.length ?? 0) * 12 + candidate.experienceYears * 3);
  const verification = clamp(80 - fluff.signals.length * 10);
  const seniority = clamp(20 + candidate.experienceYears * 6 + (/lead|principal|staff|director|head/i.test(candidate.title) ? 18 : 0));
  const clarity = clamp((candidate.summary?.length ?? 0) > 80 ? 72 : 40);

  const missing = CORE_STACK.filter(s => !text.includes(s)).slice(0, 5);

  const trajectoryNotes = (candidate.workHistory ?? []).map(w =>
    sanitizeAiText(`${w.role} @ ${w.company} (${w.period})`),
  );

  const verificationFlags = fluff.signals.map(s => sanitizeAiText(s.message || s.type)).filter(Boolean);

  const summary = sanitizeAiText(
    `${candidate.fullName} shows ${candidate.experienceYears || 0} years on record, ${skillHits.length} core stack hits, and ${fluff.signals.length} verification flags. This is a skill audit — not a hiring rank.`,
  );

  return {
    candidate,
    radar: { skillDepth, trajectory, verification, seniority, clarity },
    skillBreakdown: sanitizeList(skillHits.length ? skillHits : candidate.skills.slice(0, 8)),
    missingPrerequisites: missing,
    trajectoryNotes,
    verificationFlags,
    summary,
  };
}

export function auditCandidates(candidates: CandidateProfile[]): TechnicalAudit[] {
  return candidates.map(auditCandidate);
}
