/**
 * POST /api/optimize-proposal
 * Pro/Elite diagnosis cards: acceptance score, why it may fail, outreach, strategy.
 */
import { preflight, jsonNoStore, readJsonBody } from './_lib/cors.js';
import { exposeApi } from './_lib/http.js';
import { resolveRequestApiKey, AI_BUSY_MESSAGE } from './_lib/openai.js';
import { completeChat, parseJsonObject } from './_lib/complete.js';
import { sanitizeAiText } from './_lib/sanitize.js';
import { HUMAN_WRITING_RULES } from './_lib/tone.js';
import { extractRequiredSkills, scoreOpportunity } from './_lib/matchScore.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

type OptimizationType =
  | 'company-rewrite'
  | 'acceptance-score'
  | 'tone-optimization'
  | 'decision-maker'
  | 'outreach-messages'
  | 'full-strategy';

const VALID: OptimizationType[] = [
  'company-rewrite',
  'acceptance-score',
  'tone-optimization',
  'decision-maker',
  'outreach-messages',
  'full-strategy',
];

function textOf(value: unknown, max = 8000): string {
  if (typeof value === 'string') return value.trim().slice(0, max);
  if (Array.isArray(value)) return value.map((item) => textOf(item, max)).filter(Boolean).join('\n').slice(0, max);
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    return textOf(rec.text ?? rec.content ?? rec.body ?? rec.proposal ?? rec.jobDescription, max);
  }
  return '';
}

function titleFrom(text: string): string {
  return String(text || '').split(/\n/)[0].replace(/[#*_`-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'this role';
}

function fallbackFor(type: OptimizationType, proposal: string, job: string) {
  const role = titleFrom(job || proposal);
  const skills = extractRequiredSkills(job || proposal);
  const scored = scoreOpportunity(
    { skills: skills.length >= 2 ? skills : ['communication', 'delivery'] },
    role,
    job || proposal,
  );
  const score = scored.complete ? scored.acceptanceScore || scored.matchScore : 58;
  const rewritten = sanitizeAiText(proposal) || sanitizeAiText(
    `I can take ${role} from a short diagnostic to a first visible milestone this week.`,
  );

  if (type === 'company-rewrite' || type === 'tone-optimization') return rewritten;

  if (type === 'acceptance-score') {
    return {
      score,
      strengths: scored.matchedSkills.slice(0, 3).map((s) => `Clear overlap on ${s}`) || ['The note is specific about a first deliverable'],
      weaknesses: scored.missingSkills.slice(0, 3).map((s) => `The brief also asks for ${s}`) || ['The first week outcome could be sharper'],
      suggestions: ['Lead with one result', 'Name the first milestone and when they see it'],
      summary: `Fit sits around ${score}%. Tighten the first-week outcome and drop generic claims.`,
    };
  }

  if (type === 'decision-maker') {
    return {
      primaryDecisionMaker: {
        title: 'Hiring manager',
        department: 'The team that owns this brief',
        influence: 'Likely final yes on the first milestone',
        linkedInSearchTip: `Search the company plus "${role}" and filter current employees`,
      },
      secondaryStakeholders: [
        { title: 'Project lead', role: 'Reviews the first deliverable' },
        { title: 'Procurement / ops', role: 'May handle contracting' },
      ],
      companyInsights: {
        companyType: 'Not stated in the brief',
        hiringStyle: 'They will judge a first visible result more than a long pitch',
        redFlags: ['Vague scope', 'No named decision-maker'],
        greenFlags: ['A concrete first milestone can be proposed'],
      },
      outreachStrategy: `Write to the hiring manager with one result you can ship for ${role} in the first week.`,
    };
  }

  if (type === 'outreach-messages') {
    return {
      linkedInConnectionRequest: sanitizeAiText(`Working on ${role} briefs like yours. Happy to share a first-week plan.`).slice(0, 280),
      linkedInFollowUp: sanitizeAiText(`Thanks for connecting. I can start ${role} with a short diagnostic, then a first milestone you can review.`),
      coldEmail: {
        subject: `First-week plan for ${role}`,
        body: sanitizeAiText(`Hi — I read the brief for ${role}. I would start with one bottleneck and a result you can review in week one. If useful I can send that plan today.`),
      },
      followUpEmail: {
        subject: `Quick follow-up on ${role}`,
        body: sanitizeAiText(`Circling back on ${role}. I can still hold a first-week slot if timing is better later this month.`),
      },
      tips: ['Keep the first note under five sentences', 'Name one deliverable', 'Do not attach a long CV unasked'],
    };
  }

  return {
    overallAssessment: {
      fitScore: score,
      summary: `This brief is a ${score >= 70 ? 'strong' : score >= 50 ? 'workable' : 'thin'} fit if you lead with a first-week result.`,
      verdict: score >= 75 ? 'Strong Match' : score >= 60 ? 'Good Match' : score >= 45 ? 'Moderate Match' : 'Weak Match',
    },
    whyApplicationsFail: [
      { reason: 'Generic pitch with no first deliverable', howToAvoid: 'Name the first milestone and when they see it' },
      { reason: 'Tool list instead of a result', howToAvoid: 'Lead with one before/after from similar work' },
    ],
    differentiators: ['A diagnostic-first start', 'A reviewable first milestone'],
    riskFactors: [
      { risk: 'Scope creep in week one', mitigation: 'Agree the first deliverable in writing' },
    ],
    actionPlan: [
      { step: 1, action: 'Send a five-sentence note with the first milestone', timing: 'Today', priority: 'High' },
      { step: 2, action: 'Offer a 20-minute diagnostic', timing: 'This week', priority: 'Medium' },
    ],
    interviewPrep: {
      likelyQuestions: ['What would the first 30 days look like?', 'How have you done this before?'],
      questionsToAsk: ['What does a successful first week look like?', 'Who reviews the first deliverable?'],
      keyTalkingPoints: ['One comparable result', 'A named first milestone'],
    },
    salaryInsight: {
      estimatedRange: 'Confirm against the posted budget',
      negotiationTips: ['Anchor on the first milestone, not a monthly retainer'],
    },
    finalAdvice: 'Send a short note, not a deck. Ask for the first review date.',
  };
}

async function handleRequest(req: Request): Promise<Response> {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS' || req.headers.get('access-control-request-method')) return preflight();
  if (method === 'GET' || method === 'HEAD') {
    return jsonNoStore({ ok: true, success: true, service: 'optimize-proposal' });
  }
  if (method !== 'POST') return jsonNoStore({ error: 'Method not allowed' }, 405);

  const body = await readJsonBody<Record<string, unknown>>(req);
  const typeRaw = String(body.optimizationType || body.type || '').toLowerCase();
  const optimizationType = VALID.includes(typeRaw as OptimizationType) ? typeRaw as OptimizationType : 'acceptance-score';
  const proposal = textOf(body.proposal ?? body.proposalHistory, 8000);
  const jobDescription = textOf(body.jobDescription ?? body.jobContext, 8000);
  const fallback = fallbackFor(optimizationType, proposal, jobDescription);

  const apiKey = resolveRequestApiKey(body);
  if (!apiKey) {
    return jsonNoStore({ success: true, fallback: true, type: optimizationType, result: fallback });
  }

  const context = `PROPOSAL:\n${proposal || 'not provided'}\n\nJOB:\n${jobDescription || 'not provided'}`;
  try {
    if (optimizationType === 'company-rewrite' || optimizationType === 'tone-optimization') {
      const raw = await completeChat(apiKey, {
        system: `Rewrite the proposal so it sounds like a real person. Return ONLY the proposal text. ${HUMAN_WRITING_RULES}`,
        user: context,
        temperature: 0.45,
        maxTokens: 900,
      });
      const text = sanitizeAiText(raw) || String(fallback);
      return jsonNoStore({ success: true, type: optimizationType, result: text });
    }

    const schemaHint = optimizationType === 'acceptance-score'
      ? '{"score":0,"strengths":[],"weaknesses":[],"suggestions":[],"summary":""}'
      : optimizationType === 'decision-maker'
        ? '{"primaryDecisionMaker":{"title":"","department":"","influence":"","linkedInSearchTip":""},"secondaryStakeholders":[],"companyInsights":{"companyType":"","hiringStyle":"","redFlags":[],"greenFlags":[]},"outreachStrategy":""}'
        : optimizationType === 'outreach-messages'
          ? '{"linkedInConnectionRequest":"","linkedInFollowUp":"","coldEmail":{"subject":"","body":""},"followUpEmail":{"subject":"","body":""},"tips":[]}'
          : '{"overallAssessment":{"fitScore":0,"summary":"","verdict":""},"whyApplicationsFail":[],"differentiators":[],"riskFactors":[],"actionPlan":[],"interviewPrep":{"likelyQuestions":[],"questionsToAsk":[],"keyTalkingPoints":[]},"finalAdvice":""}';

    const raw = await completeChat(apiKey, {
      system: `Return ONLY JSON matching ${schemaHint}. ${HUMAN_WRITING_RULES} No markdown.`,
      user: context,
      json: true,
      temperature: 0.4,
      maxTokens: 1200,
    });
    const parsed = parseJsonObject(raw);
    const result = Object.keys(parsed).length ? parsed : fallback;
    return jsonNoStore({ success: true, type: optimizationType, result });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('optimize-proposal failed:', err?.message || error);
    return jsonNoStore({
      success: true,
      fallback: true,
      message: AI_BUSY_MESSAGE,
      type: optimizationType,
      result: fallback,
    });
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
