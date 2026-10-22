export interface MatchProfile {
  skills: string[];
  experience?: string;
  profession?: string;
  hourlyRate?: number | null;
}

export type MatchDepth = 'basic' | 'deep';

export interface MatchResult {
  complete: boolean;
  matchScore: number;
  acceptanceScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  requiredSkills: string[];
  message?: string;
  narrative?: string;
  domainFit?: number;
  clientFit?: number;
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

export function matchBand(score: number): string {
  if (score >= 80) return 'High Probability';
  if (score >= 60) return 'Strong Fit';
  if (score >= 40) return 'Partial Fit';
  return 'Low Fit';
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

export function buildMatchNarrative(result: MatchResult, jobTitle = ''): string {
  if (!result.complete) return result.message || ONBOARDING_REQUIRED_MESSAGE;
  const matched = result.matchedSkills.slice(0, 3);
  const missing = result.missingSkills[0];
  const role = String(jobTitle || 'this brief').replace(/\s+/g, ' ').trim().slice(0, 72);
  const overlap = matched.length ? matched.join(' & ') : 'the skills you listed';
  const fit = result.matchScore >= 80
    ? 'high overlap'
    : result.matchScore >= 60
      ? 'solid overlap'
      : result.matchScore >= 40
        ? 'partial overlap'
        : 'thin overlap';
  let line = `${result.matchScore}% fit — ${fit} on ${overlap}`;
  if (missing) line += `; the brief also asks for ${missing}`;
  line += `. Acceptance sits around ${result.acceptanceScore}% if you lead with a first-week result`;
  if (missing) line += ` and cover ${missing} in one concrete example`;
  if (role) line += ` for ${role}`;
  return `${line}.`;
}

export function scoreOpportunity(
  profile: MatchProfile | null | undefined,
  jobTitle: string,
  jobText: string,
  budget = '',
  listedSkills: string[] = [],
  options?: { depth?: MatchDepth; clientHistory?: string },
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
      narrative: ONBOARDING_REQUIRED_MESSAGE,
      domainFit: 0,
      clientFit: 0,
    };
  }

  const hay = `${jobTitle}\n${jobText}\n${budget}`.toLowerCase();
  const clientHay = String(options?.clientHistory || '').toLowerCase();
  const requiredSkills = extractRequiredSkills(hay, listedSkills);
  const matchedSkills = userSkills.filter((skill) => skillHitsJob(skill, hay));
  const requiredSet = new Set(requiredSkills);
  const missingSkills = requiredSkills.filter((skill) =>
    !matchedSkills.some((user) => user.toLowerCase() === skill || skill.includes(user.toLowerCase())),
  );
  const denominator = Math.max(requiredSet.size || userSkills.length, 1);
  const skillScore = Math.max(0, Math.min(100, Math.round((matchedSkills.length / denominator) * 100)));

  const domainWords = ['frontend', 'backend', 'full-stack', 'fullstack', 'mobile', 'devops', 'data', 'design', 'marketing'];
  const domainHits = domainWords.filter((word) => hay.includes(word) && userSkills.some((skill) => skill.toLowerCase().includes(word) || hay.includes(skill.toLowerCase())));
  const domainAsked = domainWords.filter((word) => hay.includes(word));
  const domainFit = domainAsked.length
    ? Math.round((domainHits.length / domainAsked.length) * 100)
    : skillScore;

  const exp = String(profile?.experience || '').toLowerCase();
  let expFit = 70;
  if (/senior|lead|staff|principal/.test(exp) && /junior|intern|entry/.test(hay)) expFit = 42;
  else if (/junior|entry/.test(exp) && /senior|lead|architect/.test(hay)) expFit = 48;
  else if (/senior|lead|staff|principal/.test(exp) && /senior|lead|architect/.test(hay)) expFit = 88;
  else if (/mid/.test(exp)) expFit = 72;

  let clientFit = 58;
  if (/payment verified|verified payment|100% hire|hire rate/.test(clientHay)) clientFit = 78;
  if (/no hires|payment method not verified|low hire/.test(clientHay)) clientFit = 40;

  const depth = options?.depth === 'deep' ? 'deep' : 'basic';
  let matchScore = skillScore;
  if (depth === 'deep') {
    matchScore = Math.max(0, Math.min(100, Math.round(
      skillScore * 0.55 + domainFit * 0.2 + expFit * 0.15 + clientFit * 0.1,
    )));
  }

  let acceptanceScore = matchScore;
  const userRate = Number(profile?.hourlyRate);
  const jobPay = Number((budget.match(/(\d+(?:\.\d+)?)/) || [])[1] || 0);
  if (Number.isFinite(userRate) && userRate > 0 && jobPay > 0 && jobPay < userRate * 0.7) {
    acceptanceScore -= 12;
  }
  if (/senior|lead|staff|principal/.test(exp) && /junior|intern|entry/.test(hay)) acceptanceScore -= 10;
  if (/junior|entry/.test(exp) && /senior|lead|architect/.test(hay)) acceptanceScore -= 8;
  acceptanceScore = Math.max(0, Math.min(100, acceptanceScore));

  const result: MatchResult = {
    complete: true,
    matchScore,
    acceptanceScore,
    matchedSkills,
    missingSkills: missingSkills.slice(0, 8),
    requiredSkills: requiredSkills.slice(0, 12),
    domainFit,
    clientFit,
  };
  result.narrative = buildMatchNarrative(result, jobTitle);
  return result;
}
