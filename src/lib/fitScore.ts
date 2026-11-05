import { computeMonsterScore } from '@/lib/monsterScore';
import { extractRequiredSkills, scoreOpportunity } from '@/lib/matchScore';

export const FIT_PANIC_THRESHOLD = 50;

export interface FitScoreResult {
  score: number;
  keyword: number;
  hooks: number;
  format: number;
  matched: string[];
  missing: string[];
  panic: boolean;
  warning: string;
  summary: string;
}

export function evaluateFitScore(jobText: string, proposalText: string): FitScoreResult {
  const job = String(jobText || '').trim();
  const proposal = String(proposalText || '').trim();
  const listed = extractRequiredSkills(proposal, []);
  const match = scoreOpportunity(
    { skills: listed.length ? listed : ['freelance', 'general'] },
    '',
    job,
    '',
    listed,
    { depth: 'deep' },
  );
  const monster = computeMonsterScore({
    jobText: job,
    proposalText: proposal,
    listedSkills: listed,
    profile: { skills: listed },
  });
  const score = Math.max(0, Math.min(100, Math.round(monster.score * 0.7 + match.matchScore * 0.3)));
  const panic = score < FIT_PANIC_THRESHOLD;
  return {
    score,
    keyword: monster.keyword,
    hooks: monster.hooks,
    format: monster.format,
    matched: match.matchedSkills.slice(0, 6),
    missing: match.missingSkills.slice(0, 6),
    panic,
    warning: panic
      ? `Fit Score: ${score}% – High rejection risk. Clients filter this out instantly.`
      : `Fit Score: ${score}% — this draft can still be tightened before you send it.`,
    summary: panic
      ? 'The brief and this proposal barely overlap. A client scanning the first screen will skip it.'
      : 'There is usable overlap. Sovereign can still rewrite the opener so it leads with a first-week result.',
  };
}
