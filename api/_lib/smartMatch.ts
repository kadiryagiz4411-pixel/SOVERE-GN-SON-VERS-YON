/**
 * Smart Match analysis. Invoked from generate-cv so Hobby stays under 12 functions.
 */
import { jsonNoStore } from './cors.js';
import { resolveRequestApiKey, AI_BUSY_MESSAGE } from './openai.js';
import { completeChat, parseJsonObject } from './complete.js';
import { sanitizeAiText } from './sanitize.js';
import { HUMAN_WRITING_RULES, SCREEN_ANALYST_RULES } from './tone.js';
import { extractRequiredSkills, scoreOpportunity } from './matchScore.js';

function textOf(value: unknown, max = 8000): string {
  if (typeof value === 'string') return value.trim().slice(0, max);
  if (Array.isArray(value)) return value.map((item) => textOf(item, max)).filter(Boolean).join('\n').slice(0, max);
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    return textOf(rec.jobDescription ?? rec.jobContext ?? rec.text ?? rec.content, max);
  }
  return '';
}

function asList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizeAiText(String(item || ''))).filter(Boolean).slice(0, max);
}

function listOr(value: unknown, fallback: string[], max = 8): string[] {
  const list = asList(value, max);
  return list.length ? list : fallback;
}

function clamp(value: unknown, fallback = 50): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function titleFrom(text: string): string {
  return String(text || '').split(/\n/)[0].replace(/[#*_`-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'this role';
}

function looksLikeUiChrome(title: string, text: string): boolean {
  const compact = `${title || ''}\n${text || ''}`.replace(/\s+/g, ' ').trim();
  if (compact.length < 40) return true;
  const chromeHits = (compact.match(/translate this page|google çeviri|chrome.?çeviri|\btürkçe\b|cookie settings|sign in|join now|skip to main content/gi) || []).length;
  const jobHits = (compact.match(/responsibilities|requirements|job description|hourly|fixed[- ]price|must have|beatmaker|mixing|mastering|sound design|producer|react|python|design/gi) || []).length;
  if (chromeHits >= 1 && jobHits === 0 && compact.length < 240) return true;
  return chromeHits >= 2 && jobHits === 0;
}

function fallbackSmartMatch(
  job: string,
  skills: string[],
  extras?: {
    experience?: string;
    hourlyRate?: number;
    budget?: string;
    listedSkills?: string[];
    depth?: 'basic' | 'deep';
    clientHistory?: string;
    jobTitle?: string;
  },
) {
  const required = extractRequiredSkills(job, extras?.listedSkills || skills).slice(0, 8);
  const scored = scoreOpportunity(
    { skills, experience: extras?.experience, hourlyRate: extras?.hourlyRate },
    extras?.jobTitle || titleFrom(job),
    job,
    extras?.budget || '',
    extras?.listedSkills || [],
    { depth: extras?.depth === 'deep' ? 'deep' : 'basic', clientHistory: extras?.clientHistory },
  );
  const matchScore = scored.complete ? scored.matchScore : 0;
  const role = extras?.jobTitle || titleFrom(job);
  return {
    jobParsing: {
      requiredSkills: required.length ? required : scored.requiredSkills.slice(0, 8),
      yearsOfExperience: 'Not clearly stated',
      coreTechnologies: required.slice(0, 6),
      companyValues: ['clear communication', 'on-time delivery'],
      roleLevel: 'Not specified',
      workType: 'Not specified',
      estimatedSalary: 'N/A',
    },
    matchScore,
    acceptanceScore: scored.complete ? scored.acceptanceScore : 0,
    matchNarrative: scored.narrative || scored.message || '',
    onboardingRequired: !scored.complete,
    matchBreakdown: {
      skillsMatch: matchScore,
      experienceMatch: scored.complete ? Math.max(35, matchScore - 8) : 0,
      cultureMatch: scored.complete ? Math.max(40, matchScore - 5) : 0,
      technicalMatch: matchScore,
    },
    platformAcceptance: {
      upwork: scored.complete ? Math.max(8, Math.min(40, Math.round(matchScore * 0.4))) : 0,
      fiverr: scored.complete ? Math.max(10, Math.min(45, Math.round(matchScore * 0.42))) : 0,
      linkedin: scored.complete ? Math.max(6, Math.min(28, Math.round(matchScore * 0.24))) : 0,
      corporate: scored.complete ? Math.max(7, Math.min(32, Math.round(matchScore * 0.28))) : 0,
    },
    gapAnalysis: {
      strengths: scored.matchedSkills.slice(0, 3).map((area) => ({
        area,
        detail: `This brief mentions ${area}, which overlaps your profile.`,
      })),
      gaps: scored.missingSkills.slice(0, 3).map((area) => ({
        area,
        detail: `The brief also asks for ${area}.`,
        suggestion: `Cover ${area} in one concrete example, not a skill dump.`,
      })),
    },
    coverLetter: sanitizeAiText(
      `I can take ${role} from a short diagnostic to a first visible milestone without a long ramp. I would start with the current workflow, pick one bottleneck, and ship a result you can review in the first week.`,
    ),
    linkedInOutreach: sanitizeAiText(
      `Saw the brief for ${role}. I can start with a tight first pass this week if that timing still works.`,
    ),
    sampleJobListings: [
      { title: role, platform: 'Upwork', budget: 'Open', matchReason: 'Same skill cluster as this brief' },
    ],
    topAlignmentPoints: scored.matchedSkills.slice(0, 3).map((skill) => `Overlap on ${skill}`),
    applicationTips: [
      'Lead with one result, not a tool list.',
      'Name the first deliverable and when they would see it.',
    ],
    status: 'analysis_complete',
  };
}

function normalize(raw: Record<string, unknown>, fallback: ReturnType<typeof fallbackSmartMatch>) {
  const jobParsing = raw.jobParsing && typeof raw.jobParsing === 'object' ? raw.jobParsing as Record<string, unknown> : {};
  const breakdown = raw.matchBreakdown && typeof raw.matchBreakdown === 'object' ? raw.matchBreakdown as Record<string, unknown> : {};
  const platforms = raw.platformAcceptance && typeof raw.platformAcceptance === 'object' ? raw.platformAcceptance as Record<string, unknown> : {};
  const gaps = raw.gapAnalysis && typeof raw.gapAnalysis === 'object' ? raw.gapAnalysis as Record<string, unknown> : {};
  return {
    ...fallback,
    jobParsing: {
      requiredSkills: listOr(jobParsing.requiredSkills, fallback.jobParsing.requiredSkills),
      yearsOfExperience: sanitizeAiText(textOf(jobParsing.yearsOfExperience, 40)) || fallback.jobParsing.yearsOfExperience,
      coreTechnologies: listOr(jobParsing.coreTechnologies, fallback.jobParsing.coreTechnologies),
      companyValues: listOr(jobParsing.companyValues, fallback.jobParsing.companyValues, 6),
      roleLevel: sanitizeAiText(textOf(jobParsing.roleLevel, 40)) || fallback.jobParsing.roleLevel,
      workType: sanitizeAiText(textOf(jobParsing.workType, 40)) || fallback.jobParsing.workType,
      estimatedSalary: sanitizeAiText(textOf(jobParsing.estimatedSalary, 60)) || fallback.jobParsing.estimatedSalary,
    },
    matchScore: fallback.matchScore,
    acceptanceScore: fallback.acceptanceScore,
    matchNarrative: fallback.matchNarrative,
    onboardingRequired: fallback.onboardingRequired,
    matchBreakdown: {
      skillsMatch: fallback.matchScore,
      experienceMatch: clamp(breakdown.experienceMatch, fallback.matchBreakdown.experienceMatch),
      cultureMatch: clamp(breakdown.cultureMatch, fallback.matchBreakdown.cultureMatch),
      technicalMatch: fallback.matchScore,
    },
    platformAcceptance: {
      upwork: clamp(platforms.upwork, fallback.platformAcceptance.upwork),
      fiverr: clamp(platforms.fiverr, fallback.platformAcceptance.fiverr),
      linkedin: clamp(platforms.linkedin, fallback.platformAcceptance.linkedin),
      corporate: clamp(platforms.corporate, fallback.platformAcceptance.corporate),
    },
    gapAnalysis: {
      strengths: Array.isArray(gaps.strengths) && gaps.strengths.length ? gaps.strengths : fallback.gapAnalysis.strengths,
      gaps: Array.isArray(gaps.gaps) && gaps.gaps.length ? gaps.gaps : fallback.gapAnalysis.gaps,
    },
    coverLetter: sanitizeAiText(textOf(raw.coverLetter, 4000)) || fallback.coverLetter,
    linkedInOutreach: sanitizeAiText(textOf(raw.linkedInOutreach, 1200)) || fallback.linkedInOutreach,
    sampleJobListings: Array.isArray(raw.sampleJobListings) && raw.sampleJobListings.length
      ? raw.sampleJobListings
      : fallback.sampleJobListings,
    topAlignmentPoints: listOr(raw.topAlignmentPoints, fallback.topAlignmentPoints, 4),
    applicationTips: listOr(raw.applicationTips, fallback.applicationTips, 4),
    status: 'analysis_complete',
  };
}

export async function handleSmartMatchPost(body: Record<string, unknown>): Promise<Response> {
  const jobDescription = textOf(body.jobDescription ?? body.jobContext ?? body.job, 8000);
  const outputLanguage = textOf(body.outputLanguage ?? body.language, 12) || 'en';
  const skills = asList(body.skills, 16);
  const extras = {
    experience: textOf(body.experience, 40),
    hourlyRate: Number(body.hourlyRate) || undefined,
    budget: textOf(body.budget, 160),
    listedSkills: asList(body.requiredSkills ?? body.listedSkills, 16),
    depth: body.matchDepth === 'deep' || body.deepMatch ? 'deep' as const : 'basic' as const,
    clientHistory: textOf(body.clientHistory, 500),
    jobTitle: textOf(body.jobTitle ?? body.pageTitle, 180),
  };
  const fallback = fallbackSmartMatch(jobDescription, skills, extras);

  if (looksLikeUiChrome(extras.jobTitle, jobDescription)) {
    return jsonNoStore({
      success: true,
      discarded: true,
      fallback: true,
      ...fallback,
      matchScore: 0,
      acceptanceScore: 0,
      matchNarrative: 'This screen is UI chrome, not a job posting or CV.',
      coverLetter: '',
      linkedInOutreach: '',
      topAlignmentPoints: [],
      applicationTips: [],
    });
  }

  if (jobDescription.length < 12 || fallback.onboardingRequired) {
    return jsonNoStore({ success: true, fallback: true, ...fallback });
  }

  const apiKey = resolveRequestApiKey(body);
  if (!apiKey) return jsonNoStore({ success: true, fallback: true, ...fallback });

  const lang = outputLanguage === 'tr' ? 'Turkish' : outputLanguage === 'de' ? 'German' : outputLanguage === 'fr' ? 'French' : 'English';
  try {
    const raw = await completeChat(apiKey, {
      system: `${SCREEN_ANALYST_RULES}
You analyze a job brief and a candidate. Return ONLY JSON with keys:
jobParsing, matchScore, matchBreakdown, platformAcceptance, gapAnalysis, coverLetter, linkedInOutreach, sampleJobListings, topAlignmentPoints, applicationTips, status.
status must be analysis_complete. ${HUMAN_WRITING_RULES}
Write user-facing text in ${lang}. No markdown. If the brief is UI chrome, return empty arrays and scores of 0.`,
      user: `JOB:\n${jobDescription}\n\nCANDIDATE SKILLS:\n${skills.join(', ') || 'not listed'}`,
      json: true,
      temperature: 0.2,
      maxTokens: 600,
    });
    const parsed = parseJsonObject(raw);
    return jsonNoStore({ success: true, ...normalize(parsed, fallback) });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('smart-match failed:', err?.message || error);
    return jsonNoStore({ success: true, fallback: true, message: AI_BUSY_MESSAGE, ...fallback });
  }
}
