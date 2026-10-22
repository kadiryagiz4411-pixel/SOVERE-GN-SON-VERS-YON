/**
 * POST /api/smart-match
 * Job match analysis for Run Smart Match. Incomplete payloads never 500.
 */
import { preflight, jsonNoStore, readJsonBody } from './_lib/cors.js';
import { exposeApi } from './_lib/http.js';
import { resolveRequestApiKey, AI_BUSY_MESSAGE } from './_lib/openai.js';
import { completeChat, parseJsonObject } from './_lib/complete.js';
import { sanitizeAiText } from './_lib/sanitize.js';
import { HUMAN_WRITING_RULES } from './_lib/tone.js';
import { extractRequiredSkills, scoreOpportunity } from './_lib/matchScore.js';

export const config = { runtime: 'nodejs', maxDuration: 45 };

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

function fallbackSmartMatch(job: string, skills: string[]) {
  const required = extractRequiredSkills(job, skills).slice(0, 8);
  const scored = scoreOpportunity({ skills: skills.length >= 2 ? skills : required.concat(['communication']) }, titleFrom(job), job);
  const matchScore = scored.complete ? scored.matchScore : 55;
  const role = titleFrom(job);
  return {
    jobParsing: {
      requiredSkills: required.length ? required : ['communication', 'delivery'],
      yearsOfExperience: 'Not clearly stated',
      coreTechnologies: required.slice(0, 6),
      companyValues: ['clear communication', 'on-time delivery'],
      roleLevel: 'Not specified',
      workType: 'Not specified',
      estimatedSalary: 'N/A',
    },
    matchScore,
    matchBreakdown: {
      skillsMatch: matchScore,
      experienceMatch: Math.max(35, matchScore - 8),
      cultureMatch: Math.max(40, matchScore - 5),
      technicalMatch: matchScore,
    },
    platformAcceptance: {
      upwork: Math.max(8, Math.min(40, Math.round(matchScore * 0.4))),
      fiverr: Math.max(10, Math.min(45, Math.round(matchScore * 0.42))),
      linkedin: Math.max(6, Math.min(28, Math.round(matchScore * 0.24))),
      corporate: Math.max(7, Math.min(32, Math.round(matchScore * 0.28))),
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
    matchScore: clamp(raw.matchScore, fallback.matchScore),
    matchBreakdown: {
      skillsMatch: clamp(breakdown.skillsMatch, fallback.matchBreakdown.skillsMatch),
      experienceMatch: clamp(breakdown.experienceMatch, fallback.matchBreakdown.experienceMatch),
      cultureMatch: clamp(breakdown.cultureMatch, fallback.matchBreakdown.cultureMatch),
      technicalMatch: clamp(breakdown.technicalMatch, fallback.matchBreakdown.technicalMatch),
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

async function handleRequest(req: Request): Promise<Response> {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS' || req.headers.get('access-control-request-method')) return preflight();
  if (method === 'GET' || method === 'HEAD') {
    return jsonNoStore({ ok: true, success: true, service: 'smart-match' });
  }
  if (method !== 'POST') return jsonNoStore({ error: 'Method not allowed' }, 405);

  const body = await readJsonBody<Record<string, unknown>>(req);
  const jobDescription = textOf(body.jobDescription ?? body.jobContext ?? body.job, 8000);
  const outputLanguage = textOf(body.outputLanguage ?? body.language, 12) || 'en';
  const skills = asList(body.skills, 16);
  const fallback = fallbackSmartMatch(jobDescription, skills);

  if (jobDescription.length < 12) {
    return jsonNoStore({ success: true, fallback: true, ...fallback });
  }

  const apiKey = resolveRequestApiKey(body);
  if (!apiKey) return jsonNoStore({ success: true, fallback: true, ...fallback });

  const lang = outputLanguage === 'tr' ? 'Turkish' : outputLanguage === 'de' ? 'German' : outputLanguage === 'fr' ? 'French' : 'English';
  try {
    const raw = await completeChat(apiKey, {
      system: `You analyze a job brief and a candidate. Return ONLY JSON with keys:
jobParsing, matchScore, matchBreakdown, platformAcceptance, gapAnalysis, coverLetter, linkedInOutreach, sampleJobListings, topAlignmentPoints, applicationTips, status.
status must be analysis_complete. ${HUMAN_WRITING_RULES}
Write user-facing text in ${lang}. No markdown.`,
      user: `JOB:\n${jobDescription}\n\nCANDIDATE SKILLS:\n${skills.join(', ') || 'not listed'}`,
      json: true,
      temperature: 0.35,
      maxTokens: 1400,
    });
    const parsed = parseJsonObject(raw);
    return jsonNoStore({ success: true, ...normalize(parsed, fallback) });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('smart-match failed:', err?.message || error);
    return jsonNoStore({ success: true, fallback: true, message: AI_BUSY_MESSAGE, ...fallback });
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
