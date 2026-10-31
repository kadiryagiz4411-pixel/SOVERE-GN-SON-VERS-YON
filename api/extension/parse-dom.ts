import { preflight, jsonNoStore, readJsonBody } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { getOpenAIApiKey, AI_BUSY_MESSAGE } from '../_lib/openai.js';
import { matchBand, scoreOpportunity } from '../_lib/matchScore.js';
import { sanitizeAiText } from '../_lib/sanitize.js';
import { SCREEN_ANALYST_RULES } from '../_lib/tone.js';

// Node runtime + no-store JSON is the Vite equivalent of Next.js
// force-dynamic / revalidate 0 / fetchCache force-no-store.
export const config = { runtime: 'nodejs', maxDuration: 30 };

export type DetectedMode = 'JOB_PROPOSAL' | 'CV_EVALUATION' | 'B2B_COMMAND';

const JOB_PATTERN =
  /job description|responsibilities|qualifications|requirements|budget|hourly rate|fixed[- ]price|project scope|we are (?:looking|seeking|hiring)|apply now|must have|nice to have|cover letter|proposals? bid|buyer request|beatmaker|mixing|mastering|sound design|audio engineer|music production/gi;
const RESUME_PATTERN =
  /curriculum vitae|\bcv\b|work experience|professional experience|education|skills|languages|summary|references|certifications|linkedin\.com\/in|i am a |years of experience/gi;
const B2B_PATTERN =
  /about (?:us|the company)|our mission|enterprise|b2b|request a demo|book a demo|decision maker|series [a-d]|headquarters|fortune 500|saas platform|for teams|pricing plans|customers include/gi;

function platformLabel(url: string, mode: DetectedMode): string {
  const u = url.toLowerCase();
  if (u.includes('upwork.com')) return mode === 'JOB_PROPOSAL' ? 'Upwork Job Post' : 'Upwork Page';
  if (u.includes('fiverr.com')) return mode === 'JOB_PROPOSAL' ? 'Fiverr Brief' : 'Fiverr Page';
  if (u.includes('freelancer.com')) return mode === 'JOB_PROPOSAL' ? 'Freelancer Project' : 'Freelancer Page';
  if (u.includes('indeed.com')) return 'Indeed Job Post';
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
    || /linkedin\.com\/jobs/i.test(url)
    || /indeed\.com\/(viewjob|jobs)/i.test(url)) {
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

function looksLikeUiChrome(title: string, text: string): boolean {
  const compact = `${title || ''}\n${text || ''}`.replace(/\s+/g, ' ').trim();
  if (compact.length < 40) return true;
  const chromeHits = (compact.match(/translate this page|google çeviri|chrome.?çeviri|\btürkçe\b|cookie settings|sign in|join now|skip to main content/gi) || []).length;
  const jobHits = (compact.match(/responsibilities|requirements|job description|hourly|fixed[- ]price|must have|beatmaker|mixing|mastering|sound design|producer|react|python|design/gi) || []).length;
  if (chromeHits >= 1 && jobHits === 0 && compact.length < 240) return true;
  return chromeHits >= 2 && jobHits === 0;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function openaiErrorDetails(error: unknown): { message: string; responseData: unknown } {
  const err = error as {
    message?: string;
    response?: { data?: unknown };
    data?: unknown;
  };
  return {
    message: String(err?.message || error || 'Unknown OpenAI error'),
    responseData: err?.response?.data ?? err?.data ?? null,
  };
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
      temperature: 0.2,
      max_tokens: 480,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let errorData: unknown = raw.slice(0, 800);
    try {
      errorData = raw ? JSON.parse(raw) : {};
    } catch {
      errorData = { raw: raw.slice(0, 800) };
    }
    console.error('OpenAI API response error:', res.status, errorData);
    const err = new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    (err as { response?: { data?: unknown } }).response = { data: errorData };
    throw err;
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseJsonObject(data.choices?.[0]?.message?.content || '{}');
}

function listField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => sanitizeAiText(String(item))).filter(Boolean).slice(0, 6);
  if (typeof value === 'string' && value.trim()) return [sanitizeAiText(value)];
  return [];
}

async function handleRequest(req: Request): Promise<Response> {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS' || req.headers.get('access-control-request-method')) {
    return preflight();
  }
  if (method === 'GET' || method === 'HEAD') {
    return jsonNoStore({
      ok: true,
      success: true,
      message: 'Sovereign API is LIVE and fully reachable.',
      service: 'extension-parse-dom',
    });
  }
  if (method !== 'POST') return jsonNoStore({ error: 'Method not allowed' }, 405);

  try {
    const body = await readJsonBody<{
      pageText?: string;
      pageTitle?: string;
      pageUrl?: string;
      text?: string;
      sourceUrl?: string;
      jobTitle?: string;
      jobDescription?: string;
      requiredSkills?: string[];
      budget?: string;
      clientHistory?: string;
      /** Clean, field-isolated extraction from scraper.js — preferred over raw pageText. */
      structuredJob?: {
        title?: string;
        description?: string;
        skills?: string[];
        budget?: string;
        clientInfo?: string;
      };
      skills?: string[];
      experience?: string;
      profession?: string;
      hourlyRate?: number;
      matchDepth?: string;
      deepMatch?: boolean;
      scoreOnly?: boolean;
      /** Explicit output language code ('en', 'tr', 'de', …). 'auto' follows the page. */
      outputLanguage?: string;
      /** ISO code detected from the target webpage. Never the browser locale. */
      target_language?: string;
      targetLanguage?: string;
      /** B2B block: candidate scoring or proposal tuning. Isolates the prompt. */
      analysisMode?: 'candidate' | 'proposal' | '';
      /** Text extracted from a file dropped into the active B2B block only. */
      uploadedText?: string;
    }>(req);

    // Prefer structuredJob fields when present — they are field-isolated and
    // never have metadata (budget/proposals/time) mashed into the description.
    const sj = body.structuredJob;
    const jobTitle    = String(sj?.title    || body.jobTitle    || body.pageTitle  || '').trim();
    const jobDescription = String(sj?.description || body.jobDescription || '').trim();
    const listedSkills = [
      ...(Array.isArray(sj?.skills) ? sj.skills : []),
      ...(Array.isArray(body.requiredSkills) ? body.requiredSkills : []),
    ]
      .map((item) => String(item)).filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)   // deduplicate
      .slice(0, 16);
    const budget       = String(sj?.budget   || body.budget         || '').trim();
    const clientHistory = String(sj?.clientInfo || body.clientHistory || '').trim();
    const pageText     = String(jobDescription  || body.pageText || body.text || '').trim();
    const pageTitle    = jobTitle  || String(body.pageTitle  || '').trim();
    const pageUrl      = String(body.pageUrl   || body.sourceUrl   || '').trim();

    const LANGUAGE_NAMES: Record<string, string> = {
      en: 'English', tr: 'Turkish', de: 'German', fr: 'French', es: 'Spanish',
      pt: 'Portuguese', nl: 'Dutch', it: 'Italian', ru: 'Russian', ar: 'Arabic',
      zh: 'Chinese', ja: 'Japanese', ko: 'Korean', pl: 'Polish',
    };
    const asLang = (value: unknown) => {
      const code = String(value || '').trim().toLowerCase().split('-')[0];
      return /^[a-z]{2}$/.test(code) ? code : '';
    };
    const requested = asLang(body.outputLanguage);
    const pageLanguage = asLang(body.target_language || body.targetLanguage);
    const outputLanguage = (requested && requested !== 'auto')
      ? requested
      : (pageLanguage || 'en');
    const languageName = LANGUAGE_NAMES[outputLanguage] || 'English';
    const langDirective = [
      `LANGUAGE LOCK: The target webpage language is ${languageName} (${outputLanguage}).`,
      `Write the ENTIRE analysis in ${languageName}.`,
      `That includes scores labels, summaries, strengths, gaps, recommendations, proposals, hooks, and candidate notes.`,
      outputLanguage === 'en'
        ? 'Do not mix in another language.'
        : 'Do not fall back to English and do not mix languages.',
    ].join(' ');

    if (!pageText || pageText.length < 20) {
      return jsonNoStore({ error: 'Page content is too short to analyze.' }, 400);
    }

    if (looksLikeUiChrome(pageTitle, pageText)) {
      return jsonNoStore({
        success: true,
        discarded: true,
        discardReason: 'chrome',
        detectedMode: 'JOB_PROPOSAL',
        type: 'JOB_PROPOSAL',
        title: pageTitle,
        url: pageUrl,
        jobTitle: pageTitle,
        jobDescription: '',
        compatibilityScore: 0,
        overallScore: 0,
        match_score: 0,
        matchScore: 0,
        acceptanceScore: 0,
        matchLabel: 'Not a job',
        strengths: [],
        gaps: [],
        requiredSkills: [],
        matchedSkills: [],
        missingSkills: [],
        matchNarrative: 'This screen is UI chrome, not a job posting or CV.',
        matchMessage: 'This screen is UI chrome, not a job posting or CV.',
        scoreOnly: Boolean(body.scoreOnly),
      });
    }

    const analysisMode = body.analysisMode === 'candidate' || body.analysisMode === 'proposal'
      ? body.analysisMode
      : '';
    const uploadedText = String(body.uploadedText || '').trim().slice(0, 12000);
    const detectedMode = analysisMode === 'candidate'
      ? 'CV_EVALUATION'
      : analysisMode === 'proposal'
        ? 'JOB_PROPOSAL'
        : detectMode(pageUrl, pageTitle, pageText);
    const label = platformLabel(pageUrl, detectedMode);

    // Structured context: each field is clearly labelled so the LLM never
    // confuses "8 proposals · 3 hrs ago" with a requirement or skill.
    const context = [
      `=== JOB TITLE ===\n${pageTitle}`,
      pageUrl ? `=== URL ===\n${pageUrl}` : '',
      budget ? `=== BUDGET / RATE ===\n${budget}` : '',
      listedSkills.length ? `=== SKILLS REQUIRED ===\n${listedSkills.join(', ')}` : '',
      clientHistory ? `=== CLIENT INFO ===\n${clientHistory.slice(0, 400)}` : '',
      `=== JOB DESCRIPTION ===\n${pageText.slice(0, 4000)}`,
      analysisMode === 'candidate' && uploadedText
        ? `=== CANDIDATE DOCUMENT ===\nUse this only for resume parsing, skill matching, gap analysis, and candidate scoring. Do not write a client proposal.\n${uploadedText}`
        : '',
      analysisMode === 'proposal' && uploadedText
        ? `=== PROPOSAL SOURCE ===\nUse this only to tune the client proposal, cover letter, and opening hooks. Do not score a candidate resume.\n${uploadedText}`
        : '',
    ].filter(Boolean).join('\n\n');
    const depth = body.matchDepth === 'deep' || body.deepMatch ? 'deep' : 'basic';
    const match = scoreOpportunity(
      {
        skills: Array.isArray(body.skills) ? body.skills : [],
        experience: body.experience,
        profession: body.profession,
        hourlyRate: body.hourlyRate,
      },
      pageTitle,
      pageText,
      budget,
      listedSkills,
      { depth, clientHistory },
    );
    const score = match.complete ? match.matchScore : 0;
    const accept = match.complete ? match.acceptanceScore : 0;
    const matchPayload = {
      match_score: score,
      matchScore: score,
      acceptanceScore: accept,
      overallScore: accept,
      matchLabel: match.complete ? matchBand(score) : 'Add skills',
      strengths: match.matchedSkills.slice(0, 6),
      gaps: match.missingSkills.slice(0, 6),
      requiredSkills: match.requiredSkills,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      onboardingRequired: !match.complete,
      matchMessage: match.narrative || match.message || '',
      matchNarrative: match.narrative || match.message || '',
      domainFit: match.domainFit || 0,
      clientFit: match.clientFit || 0,
    };

    if (body.scoreOnly) {
      return jsonNoStore({
        success: true,
        detectedMode,
        type: detectedMode,
        intent: detectedMode === 'B2B_COMMAND' ? 'B2B_COMMAND' : detectedMode === 'CV_EVALUATION' ? 'CANDIDATE_POOL' : 'JOB_POSTINGS',
        platformLabel: label,
        title: pageTitle,
        url: pageUrl,
        jobTitle: pageTitle,
        jobDescription: pageText.slice(0, 4000),
        budget,
        clientHistory: clientHistory.slice(0, 500),
        compatibilityScore: score,
        scoreOnly: true,
        ...matchPayload,
      });
    }

    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      console.error('CRITICAL ERROR: OPENAI_API_KEY is missing in Vercel environment!');
      return jsonNoStore({ error: 'AI service not configured on server' }, 500);
    }

    if (detectedMode === 'JOB_PROPOSAL') {
      const proposalSystemPrompt = [
        SCREEN_ANALYST_RULES,
        langDirective,
        `You are the freelancer writing this proposal in first person. Follow this exact structure:`,
        `- Sentence 1: Name the client's specific problem from the JOB DESCRIPTION (no generic opener).`,
        `- Sentence 2: Exactly how you will solve it using the stated tech stack or approach.`,
        `- Sentence 3: One concrete proof point (a number, outcome, or past project — from your experience, not invented).`,
        `- Sentence 4 (optional): Turnaround time or next step.`,
        `Total: 3-5 sentences. No markdown. No headers. No "Dear Hiring Manager". No "I am excited to apply".`,
        `If the job description is unclear, ask one specific clarifying question instead of guessing.`,
        analysisMode === 'proposal'
          ? 'This is the Proposal Analysis block. Optimize the cover letter and return hooks: exactly 3 short persuasive opening lines. Do not include candidate scoring or resume gaps.'
          : '',
        `Return JSON: { proposal, painPoint, title, contentDomain, hooks }`,
      ].join('\n');
      const parsed = await completeJson(apiKey, proposalSystemPrompt, context);
      const proposalText = sanitizeAiText(
        String(parsed.proposal || parsed.coverLetter || '')
        || `I can take this on. ${pageTitle || 'This brief'} is a clear execution job. I'll start with the core requirement and send a first working pass quickly.`,
      );
      const painPoint = sanitizeAiText(String(parsed.painPoint || 'Technical implementation required'));
      const title = sanitizeAiText(String(parsed.title || pageTitle || 'Job posting'));
      return jsonNoStore({
        success: true,
        detectedMode,
        type: 'JOB_PROPOSAL',
        intent: 'JOB_POSTINGS',
        platformLabel: label,
        title,
        url: pageUrl,
        jobTitle: title,
        jobDescription: pageText.slice(0, 4000),
        budget,
        clientHistory: clientHistory.slice(0, 500),
        painPoint,
        compatibilityScore: score,
        overallScore: match.complete ? match.acceptanceScore : 0,
        proposalText,
        hooks: listField(parsed.hooks).slice(0, 3),
        summary: painPoint,
        ...matchPayload,
      });
    }

    if (detectedMode === 'B2B_COMMAND') {
      const b2bSystemPrompt = [
        SCREEN_ANALYST_RULES,
        langDirective,
        `You are a B2B lead analyst for an agency. Using ONLY the content in the structured sections:`,
        `- executiveSummary: 3 sentences on what the company does and the specific pain point you can solve.`,
        `- decisionMakers: array of likely decision-maker roles (e.g. "Head of Engineering", "CTO") — infer from context, do not fabricate names.`,
        `- outreach: a cold email under 80 words. First sentence: reference something specific from the page. No AI filler.`,
        `- score: 0-100 outreach priority based on company size, stated pain, and fit.`,
        `Return JSON: { company, executiveSummary, decisionMakers, outreach, score }`,
      ].join('\n');
      const parsed = await completeJson(apiKey, b2bSystemPrompt, context);
      const executiveSummary = sanitizeAiText(String(parsed.executiveSummary || parsed.summary || pageTitle));
      const outreach = sanitizeAiText(
        String(parsed.outreach || '')
        || `Quick note on ${pageTitle || 'your team'}: I can run a focused technical pass on the problem in this brief and send a concrete first result this week.`,
      );
      const leadScore = match.complete ? match.matchScore : 0;
      return jsonNoStore({
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
        compatibilityScore: leadScore,
        overallScore: leadScore,
        summary: executiveSummary,
        ...matchPayload,
        match_score: leadScore,
        matchScore: leadScore,
      });
    }

    let summary = 'Candidate parsed from the active tab.';
    let whyThisCandidate = '';
    let overallScore = match.complete ? match.matchScore : 0;
    let title = pageTitle || 'Candidate';
    let role = '';
    let pros: string[] = [];
    let cons: string[] = [];
    const cvSystemPrompt = [
      SCREEN_ANALYST_RULES,
      langDirective,
      `You are a blunt hiring manager evaluating a candidate profile. Use ONLY the structured content provided.`,
      `- fullName: candidate's full name (or empty string if not found).`,
      `- title: their current or most recent role.`,
      `- summary: 2 sentences on their profile. Be specific — reference actual skills or companies mentioned.`,
      `- whyThisCandidate: 2 sentences on their unique strengths for this type of role.`,
      `- pros: array of 3 concrete strengths from their profile.`,
      `- cons: array of 2 honest gaps.`,
      `- overallScore: 0-100 based on the actual content.`,
      analysisMode === 'candidate'
        ? 'This is the Candidate Analysis block. Return skillMatches (skills found on the resume), gaps (missing skills), and recommendations (what to improve). Do not write a cover letter or client proposal.'
        : '',
      `If the text is UI chrome (no resume content), return all empty strings and overallScore 0.`,
      `Return JSON: { fullName, title, summary, overallScore, whyThisCandidate, pros, cons, skillMatches, gaps, recommendations }`,
    ].join('\n');
    const parsed = await completeJson(apiKey, cvSystemPrompt, context);
    summary = sanitizeAiText(String(parsed.summary || summary));
    whyThisCandidate = sanitizeAiText(String(parsed.whyThisCandidate || ''));
    overallScore = match.complete ? match.matchScore : 0;
    title = sanitizeAiText(String(parsed.fullName || title));
    role = sanitizeAiText(String(parsed.title || ''));
    pros = listField(parsed.pros);
    cons = listField(parsed.cons);
    const skillMatches = listField(parsed.skillMatches);
    const candidateGaps = listField(parsed.gaps);
    const recommendations = listField(parsed.recommendations);

    return jsonNoStore({
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
      skillMatches,
      candidateGaps,
      recommendations,
      painPoint: whyThisCandidate || summary,
      overallScore,
      compatibilityScore: overallScore,
      proposalText: [summary, whyThisCandidate, pros.length ? `Pros: ${pros.join('; ')}` : '', cons.length ? `Watch: ${cons.join('; ')}` : ''].filter(Boolean).join('\n\n'),
      ...matchPayload,
      match_score: overallScore,
      matchScore: overallScore,
    });
  } catch (error: unknown) {
    const details = openaiErrorDetails(error);
    console.error('API route caught error:', details.message, details.responseData);
    return jsonNoStore({ success: false, error: AI_BUSY_MESSAGE }, 500);
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
