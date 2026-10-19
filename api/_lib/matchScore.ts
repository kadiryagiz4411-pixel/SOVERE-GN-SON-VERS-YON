export interface MatchProfile {
  skills: string[];
  experience?: string;
  profession?: string;
  hourlyRate?: number | null;
}

export interface MatchResult {
  complete: boolean;
  matchScore: number;
  acceptanceScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  requiredSkills: string[];
  message?: string;
}

export const ONBOARDING_REQUIRED_MESSAGE =
  'Complete onboarding with at least two skills before Sovereign can calculate match and acceptance scores.';

const SKILL_CATALOG = [
  'react', 'next.js', 'nextjs', 'vue', 'nuxt', 'angular', 'svelte',
  'node', 'nodejs', 'express', 'nest', 'python', 'django', 'flask', 'fastapi',
  'typescript', 'javascript', 'html', 'css', 'tailwind', 'sass',
  'supabase', 'firebase', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis',
  'aws', 'gcp', 'azure', 'vercel', 'docker', 'kubernetes',
  'graphql', 'rest', 'api', 'openai', 'ai', 'llm', 'langchain',
  'react native', 'flutter', 'swift', 'kotlin', 'android', 'ios',
  'figma', 'ui', 'ux', 'wordpress', 'shopify', 'webflow',
  'php', 'laravel', 'ruby', 'rails', 'go', 'rust', 'java', 'spring',
  'seo', 'copywriting', 'content', 'marketing', 'sales',
  'full-stack', 'fullstack', 'frontend', 'backend', 'devops',
];

export function normalizeSkillList(values: Array<string | null | undefined> | string | null | undefined): string[] {
  const raw = Array.isArray(values)
    ? values
    : String(values || '').split(/[,|/]+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const skill = String(value || '').trim().replace(/\s+/g, ' ');
    if (skill.length < 2) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
  }
  return out.slice(0, 24);
}

export function isOnboardingComplete(profile?: MatchProfile | null): boolean {
  return normalizeSkillList(profile?.skills).length >= 2;
}

export function extractRequiredSkills(jobText: string, listedSkills: string[] = []): string[] {
  const hay = `${jobText} ${listedSkills.join(' ')}`.toLowerCase();
  const found = SKILL_CATALOG.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(hay);
  });
  return [...new Set([...normalizeSkillList(listedSkills).map((s) => s.toLowerCase()), ...found])];
}

function skillHitsJob(skill: string, hay: string): boolean {
  const needle = skill.toLowerCase();
  if (hay.includes(needle)) return true;
  const compact = needle.replace(/\s+/g, '');
  return compact.length >= 3 && hay.replace(/\s+/g, '').includes(compact);
}

export function scoreOpportunity(
  profile: MatchProfile | null | undefined,
  jobTitle: string,
  jobText: string,
  budget = '',
  listedSkills: string[] = [],
): MatchResult {
  const userSkills = normalizeSkillList([
    ...(profile?.skills || []),
    profile?.profession || '',
  ]);

  if (userSkills.length < 2) {
    return {
      complete: false,
      matchScore: 0,
      acceptanceScore: 0,
      matchedSkills: [],
      missingSkills: [],
      requiredSkills: [],
      message: ONBOARDING_REQUIRED_MESSAGE,
    };
  }

  const hay = `${jobTitle}\n${jobText}\n${budget}`.toLowerCase();
  const requiredSkills = extractRequiredSkills(hay, listedSkills);
  const matchedSkills = userSkills.filter((skill) => skillHitsJob(skill, hay));
  const requiredSet = new Set(requiredSkills);
  const missingSkills = requiredSkills.filter((skill) =>
    !matchedSkills.some((user) => user.toLowerCase() === skill || skill.includes(user.toLowerCase())),
  );
  const denominator = Math.max(requiredSet.size || userSkills.length, 1);
  const matchScore = Math.max(0, Math.min(100, Math.round((matchedSkills.length / denominator) * 100)));

  let acceptanceScore = matchScore;
  const userRate = Number(profile?.hourlyRate);
  const jobPay = Number((budget.match(/(\d+(?:\.\d+)?)/) || [])[1] || 0);
  if (Number.isFinite(userRate) && userRate > 0 && jobPay > 0 && jobPay < userRate * 0.7) {
    acceptanceScore -= 12;
  }
  const exp = String(profile?.experience || '').toLowerCase();
  if (/senior|lead|staff|principal/.test(exp) && /junior|intern|entry/.test(hay)) acceptanceScore -= 10;
  if (/junior|entry/.test(exp) && /senior|lead|architect/.test(hay)) acceptanceScore -= 8;
  acceptanceScore = Math.max(0, Math.min(100, acceptanceScore));

  return {
    complete: true,
    matchScore,
    acceptanceScore,
    matchedSkills,
    missingSkills: missingSkills.slice(0, 8),
    requiredSkills: requiredSkills.slice(0, 12),
  };
}
