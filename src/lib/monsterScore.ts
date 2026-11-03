import { scoreOpportunity, skillsForMatching, type MatchProfile } from '@/lib/matchScore';

const HOOK_MARKS = [
  /first[- ]week/i,
  /i (will|already|just)/i,
  /delivered|shipped|launched/i,
  /pain point|bottleneck/i,
  /without waiting/i,
  /concrete|measurable/i,
];

export const MONSTER_APP_URL = 'https://sovereignapp.pro';

export function formattingStrength(text: string): number {
  const body = String(text || '').trim();
  if (body.length < 40) return 20;
  const lines = body.split(/\n+/).filter((line) => line.trim().length > 0);
  const paras = body.split(/\n{2,}/).length;
  const avg = body.length / Math.max(lines.length, 1);
  const tight = avg > 40 && avg < 220 ? 88 : avg < 40 ? 48 : 62;
  const structure = Math.min(90, 40 + paras * 8 + Math.min(lines.length, 8) * 4);
  return Math.round((tight + structure) / 2);
}

export function hookStrength(text: string): number {
  const body = String(text || '');
  if (body.length < 20) return 18;
  const hits = HOOK_MARKS.filter((mark) => mark.test(body)).length;
  return Math.max(24, Math.min(96, 28 + hits * 14));
}

export function computeMonsterScore(input: {
  jobText?: string;
  jobTitle?: string;
  proposalText?: string;
  profile?: MatchProfile | null;
  listedSkills?: string[];
}): { score: number; keyword: number; hooks: number; format: number } {
  const job = String(input.jobText || '');
  const proposal = String(input.proposalText || '');
  const profile = input.profile || { skills: skillsForMatching(input.profile) };
  const match = scoreOpportunity(
    profile,
    input.jobTitle || '',
    job || proposal,
    '',
    input.listedSkills || [],
  );
  const keyword = match.matchScore;
  const hooks = hookStrength(proposal || job);
  const format = formattingStrength(proposal || job);
  const score = Math.max(0, Math.min(99, Math.round(keyword * 0.62 + hooks * 0.22 + format * 0.16)));
  return { score, keyword, hooks, format };
}

export function monsterTweetUrl(score: number): string {
  const safe = Math.max(0, Math.min(99, Math.round(Number(score) || 0)));
  const text = `Sovereign fit score: ${safe}/100. ${MONSTER_APP_URL} #Sovereign`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function openMonsterTweet(score: number): void {
  try {
    window.open(monsterTweetUrl(score), '_blank', 'noopener,noreferrer');
  } catch {
    /* popup blocked — caller can ignore */
  }
}
