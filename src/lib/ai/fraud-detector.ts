/**
 * AI Fraud, Fluff & Contradiction Detector.
 * Scores resumes for timeline issues, AI fluff, and skill contradictions.
 */
import {
  analyzeTextLocally,
  interpretAuthenticityVerdict,
  interpretFluffScore,
  type AuthenticityVerdict,
  type FraudSignal,
  type PreSubmissionReport,
} from '@/services/b2b/fraudDetector';

export type { AuthenticityVerdict, FraudSignal, PreSubmissionReport };
export { interpretAuthenticityVerdict, interpretFluffScore };

export interface TrustIntegrityReport {
  trustScore: number;
  authenticity: AuthenticityVerdict;
  warnings: string[];
  signals: FraudSignal[];
  fluffHits: string[];
  overlappingRoles: Array<{ a: string; b: string }>;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function parseRanges(text: string): Array<{ start: number; end: number; label: string }> {
  const ranges: Array<{ start: number; end: number; label: string }> = [];
  const re = /([A-Za-z]{3,9})?\s?(20\d{2})\s?[-–to]+\s?([A-Za-z]{3,9}|Present|Current)?\s?(20\d{2})?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const sm = MONTHS[(m[1] ?? 'jan').toLowerCase()] ?? 0;
    const sy = Number(m[2]);
    const present = /present|current/i.test(m[3] ?? '');
    const em = present ? new Date().getMonth() : (MONTHS[(m[3] ?? 'dec').toLowerCase()] ?? 11);
    const ey = present ? new Date().getFullYear() : Number(m[4] || m[2]);
    ranges.push({
      start: sy * 12 + sm,
      end: ey * 12 + em,
      label: m[0].trim(),
    });
  }
  return ranges;
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end && !(a.start === b.start && a.end === b.end);
}

const SKILL_CONTRADICTIONS: Array<[RegExp, RegExp, string]> = [
  [/senior|principal|staff|lead/i, /\b(intern|junior|entry[- ]level)\b/i, 'Seniority title conflicts with junior/intern language.'],
  [/\b10\+?\s+years\b/i, /\b(202[3-6]|graduat)/i, 'Claimed decade of experience conflicts with recent-grad signals.'],
  [/\bexpert\b.*\b(react|python|java)\b/i, /\bno (production|professional) experience/i, 'Expert claim conflicts with no production experience.'],
];

export function detectFraudAndFluff(cvText: string): TrustIntegrityReport {
  const base = analyzeTextLocally(cvText);
  const warnings: string[] = [...base.signals.map((s) => s.message)];
  const fluffHits: string[] = [];
  const overlappingRoles: Array<{ a: string; b: string }> = [];

  const ranges = parseRanges(cvText);
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (overlaps(ranges[i], ranges[j])) {
        overlappingRoles.push({ a: ranges[i].label, b: ranges[j].label });
        warnings.push(`Overlapping dates: ${ranges[i].label} vs ${ranges[j].label}`);
      }
    }
  }

  for (const [a, b, msg] of SKILL_CONTRADICTIONS) {
    if (a.test(cvText) && b.test(cvText)) warnings.push(msg);
  }

  const penalty = warnings.length * 8 + overlappingRoles.length * 12 + (base.overall_risk === 'high' ? 25 : base.overall_risk === 'medium' ? 12 : 0);
  const trustScore = Math.max(5, Math.min(99, 92 - penalty));
  const authenticity: AuthenticityVerdict =
    trustScore >= 75 ? 'AUTHENTIC' : trustScore >= 50 ? 'SUSPICIOUS' : 'HIGH_RISK';

  return {
    trustScore,
    authenticity,
    warnings: Array.from(new Set(warnings)),
    signals: base.signals,
    fluffHits,
    overlappingRoles,
  };
}
