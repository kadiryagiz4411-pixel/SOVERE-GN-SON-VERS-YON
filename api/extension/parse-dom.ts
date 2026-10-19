import { preflight, json, readJsonBody } from '../_lib/cors.js';
import { getOpenAIClient, OPENAI_KEY_MISSING_PAYLOAD } from '../_lib/openai.js';
import { scoreOpportunity } from '../_lib/matchScore.js';
import { sanitizeAiText } from '../_lib/sanitize.js';

export const config = { runtime: 'edge', maxDuration: 30 };

export type DetectedMode = 'JOB_PROPOSAL' | 'CV_EVALUATION' | 'B2B_COMMAND';

const JOB_PATTERN =
  /job description|responsibilities|qualifications|requirements|budget|hourly rate|fixed[- ]price|project scope|we are (?:looking|seeking|hiring)|apply now|must have|nice to have|cover letter|proposals? bid|buyer request/gi;
const RESUME_PATTERN =
  /curriculum vitae|\bcv\b|work experience|professional experience|education|skills|languages|summary|references|certifications|linkedin\.com\/in|i am a |years of experience/gi;
const B2B_PATTERN =
  /about (?:us|the company)|our mission|enterprise|b2b|request a demo|book a demo|decision maker|series [a-d]|headquarters|fortune 500|saas platform|for teams|pricing plans|customers include/gi;

function platformLabel(url: string, mode: DetectedMode): string {
  const u = url.toLowerCase();
  if (u.includes('upwork.com')) return mode === 'JOB_PROPOSAL' ? 'Upwork Job Post' : 'Upwork Page';
  if (u.includes('fiverr.com')) return mode === 'JOB_PROPOSAL' ? 'Fiverr Brief' : 'Fiverr Page';
  if (u.includes('freelancer.com')) return mode === 'JOB_PROPOSAL' ? 'Freelancer Project' : 'Freelancer Page';
  if (u.includes('linkedin.com/in')) return 'LinkedIn Profile';
  if (u.includes('linkedin.com/jobs')) return 'LinkedIn Job Post';
  if (u.includes('linkedin.com/company')) return 'LinkedIn Company';
  if (mode === 'CV_EVALUATION') return 'Candidate Profile';
  if (mode === 'B2B_COMMAND') return 'B2B / Company Page';
  return 'Job Post';
}

export function detectMode(pageUrl: string, pageTitle: string, pageText: string): DetectedMode {
  const url = pageUrl.toLowerCase();
  const title = pageTitle.toLowerCase();
  const sample = `${title}\n${pageText}`.slice(0, 20_000);

  if (/upwork\.com\/(jobs|nx\/search\/jobs|ab\/proposals)/i.test(url)
    || /fiverr\.com\/.*(request|brief|buyer)/i.test(url)
    || /freelancer\.com\/projects/i.test(url)
    || /linkedin\.com\/jobs/i.test(url)) {
    return 'JOB_PROPOSAL';
  }
  if (/linkedin\.com\/in\//i.test(url) || /\/resume|\/cv\b/i.test(url)) {
    return 'CV_EVALUATION';
  }
  if (/linkedin\.com\/company|crunchbase\.com|\/about(?:-us)?\/?$/i.test(url)) {
    return 'B2B_COMMAND';
  }

  const jobHits = (sample.match(JOB_PATTERN) || []).length;
  const resumeHits = (sample.match(RESUME_PATTERN) || []).length;
  const b2bHits = (sample.match(B2B_PATTERN) || []).length;
  if (b2bHits > jobHits && b2bHits >= resumeHits && b2bHits >= 2) return 'B2B_COMMAND';
  if (resumeHits > jobHits) return 'CV_EVALUATION';
  return 'JOB_PROPOSAL';
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function completeJson(apiKey: string, system: string, user: string): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseJsonObject(data.choices?.[0]?.message?.content || '{}');
}

function listField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => sanitizeAiText(String(item))).filter(Boolean).slice(0, 6);
  if (typeof value === 'string' && value.trim()) return [sanitizeAiText(value)];
  return [];
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await readJsonBody<{
      pageText?: string;
      pageTitle?: string;
      pageUrl?: string;
      text?: string;
      sourceUrl?: string;
      skills?: string[];
      experience?: string;
      profession?: string;
      hourlyRate?: number;
    }>(req);

    const pageText = String(body.pageText || body.text || '').trim();
    const pageTitle = String(body.pageTitle || '').trim();
    const pageUrl = String(body.pageUrl || body.sourceUrl || '').trim();

    if (!pageText || pageText.length < 50) {
      return json({ error: 'Page content is too short to analyze.' }, 400);
    }

    const detectedMode = detectMode(pageUrl, pageTitle, pageText);
    const label = platformLabel(pageUrl, detectedMode);
    const context = `Title: ${pageTitle}\nURL: ${pageUrl}\nContent:\n${pageText.slice(0, 4000)}`;
    const match = scoreOpportunity(
      {
        skills: Array.isArray(body.skills) ? body.skills : [],
        experience: body.experience,
        profession: body.profession,
        hourlyRate: body.hourlyRate,
      },
      pageTitle,
      pageText,
    );
    let apiKey = '';
    try {
      apiKey = getOpenAIClient().apiKey;
    } catch (err) {
      return json({
        ...OPENAI_KEY_MISSING_PAYLOAD,
        detectedMode,
        message: err instanceof Error ? err.message : OPENAI_KEY_MISSING_PAYLOAD.message,
      }, 500);
    }

    if (detectedMode === 'JOB_PROPOSAL') {
      const parsed = await completeJson(
        apiKey,
        'You are Sovereign Proposal Engine. Analyze the job posting. Identify the primary technical pain point and write a 3-sentence direct, human-toned cover letter. No generic AI filler. Return JSON: proposal, painPoint, score (0-100), title.',
        context,
      );
      const proposalText = sanitizeAiText(String(parsed.proposal || parsed.coverLetter || ''));
      const painPoint = sanitizeAiText(String(parsed.painPoint || 'Technical implementation required'));
      const score = match.complete ? match.matchScore : 0;
      const title = sanitizeAiText(String(parsed.title || pageTitle || 'Job posting'));
      return json({
        success: true,
        detectedMode,
        type: 'JOB_PROPOSAL',
        intent: 'JOB_POSTINGS',
        platformLabel: label,
        title,
        url: pageUrl,
        painPoint,
        compatibilityScore: score,
        overallScore: match.complete ? match.acceptanceScore : 0,
        onboardingRequired: !match.complete,
        matchMessage: match.message,
        matchedSkills: match.matchedSkills,
        proposalText,
        summary: painPoint,
      });
    }

    if (detectedMode === 'B2B_COMMAND') {
      const parsed = await completeJson(
        apiKey,
        'You are a B2B command analyst. From this company or lead page, return JSON: company, executiveSummary (3 sentences), decisionMakers (array of roles), outreach (short cold email, no AI filler), score (0-100).',
        context,
      );
      const executiveSummary = sanitizeAiText(String(parsed.executiveSummary || parsed.summary || pageTitle));
      const outreach = sanitizeAiText(String(parsed.outreach || ''));
      const score = match.complete ? match.matchScore : Math.max(0, Math.min(100, Number(parsed.score ?? 0)));
      return json({
        success: true,
        detectedMode,
        type: 'B2B_COMMAND',
        intent: 'B2B_COMMAND',
        platformLabel: label,
        title: sanitizeAiText(String(parsed.company || pageTitle || 'Company')),
        url: pageUrl,
        executiveSummary,
        decisionMakers: listField(parsed.decisionMakers),
        outreach,
        proposalText: outreach,
        painPoint: executiveSummary,
        compatibilityScore: score,
        overallScore: score,
        summary: executiveSummary,
      });
    }

    let summary = 'Candidate parsed from the active tab.';
    let whyThisCandidate = '';
    let overallScore = match.complete ? match.matchScore : 0;
    let title = pageTitle || 'Candidate';
    let role = '';
    let pros: string[] = [];
    let cons: string[] = [];
    if (apiKey) {
      const parsed = await completeJson(
        apiKey,
        'You are a blunt hiring manager. Evaluate this candidate profile. Return JSON: fullName, title, summary, overallScore (0-100), whyThisCandidate (2 sentences), pros (array), cons (array). No AI filler.',
        context,
      );
      summary = sanitizeAiText(String(parsed.summary || summary));
      whyThisCandidate = sanitizeAiText(String(parsed.whyThisCandidate || ''));
      overallScore = Math.max(0, Math.min(100, Number(parsed.overallScore ?? 70)));
      title = sanitizeAiText(String(parsed.fullName || title));
      role = sanitizeAiText(String(parsed.title || ''));
      pros = listField(parsed.pros);
      cons = listField(parsed.cons);
    }

    return json({
      success: true,
      detectedMode: 'CV_EVALUATION',
      type: 'CV_EVALUATION',
      intent: 'CANDIDATE_POOL',
      platformLabel: label,
      title,
      role,
      url: pageUrl,
      summary,
      whyThisCandidate,
      pros,
      cons,
      painPoint: whyThisCandidate || summary,
      overallScore,
      compatibilityScore: overallScore,
      proposalText: [summary, whyThisCandidate, pros.length ? `Pros: ${pros.join('; ')}` : '', cons.length ? `Watch: ${cons.join('; ')}` : ''].filter(Boolean).join('\n\n'),
    });
  } catch (err: unknown) {
    console.error('Extension Parse DOM Error:', err);
    return json({ error: err instanceof Error ? err.message : 'DOM analysis failed' }, 500);
  }
}
