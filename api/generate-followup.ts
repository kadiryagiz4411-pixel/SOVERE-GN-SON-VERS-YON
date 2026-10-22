/**
 * POST /api/generate-followup
 * Follow-up kit and interview questions. Incomplete payloads never 500.
 */
import { preflight, jsonNoStore, readJsonBody } from './_lib/cors.js';
import { exposeApi } from './_lib/http.js';
import { resolveRequestApiKey, AI_BUSY_MESSAGE } from './_lib/openai.js';
import { completeChat, parseJsonObject } from './_lib/complete.js';
import { sanitizeAiText } from './_lib/sanitize.js';
import { HUMAN_WRITING_RULES } from './_lib/tone.js';

export const config = { runtime: 'nodejs', maxDuration: 45 };

function textOf(value: unknown, max = 4000): string {
  if (typeof value === 'string') return value.trim().slice(0, max);
  if (Array.isArray(value)) {
    return value.map((item) => textOf(item, max)).filter(Boolean).join('\n').slice(0, max);
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    return textOf(
      rec.text ?? rec.content ?? rec.body ?? rec.message ?? rec.proposal ?? rec.jobDescription ?? rec.summary,
      max,
    );
  }
  return '';
}

function firstText(values: unknown[], max = 4000): string {
  for (const value of values) {
    const text = textOf(value, max);
    if (text) return text;
  }
  return '';
}

function titleFrom(text: string): string {
  const line = String(text || '').split(/\n/)[0].replace(/[#*_`-]/g, ' ').replace(/\s+/g, ' ').trim();
  return line.slice(0, 80) || 'this role';
}

function fallbackFollowUps(job: string, proposal: string, clientName: string) {
  const role = titleFrom(job || proposal);
  const name = clientName || 'there';
  const snippet = sanitizeAiText(proposal).slice(0, 120);
  const extra = snippet
    ? ` I can pick up from the approach I already sent.`
    : '';
  return {
    followUp3: sanitizeAiText(
      `Hi ${name} — circling back on ${role}. If useful, I can walk through a first pass this week.${extra}`,
    ),
    followUp7: sanitizeAiText(
      `Wanted to add one practical next step for ${role}: a short diagnostic, then the first milestone without a long ramp. If timing is better later, I can hold a slot next week.`,
    ),
  };
}

function fallbackQuestions(job: string, proposal: string) {
  const role = titleFrom(job || proposal);
  return {
    questions: [
      {
        question: `What would a strong first 30 days look like for ${role}?`,
        suggestedAnswer: sanitizeAiText(
          `I would map the current workflow, pick one bottleneck I can fix in week one, and agree on a measurable result before expanding scope.`,
        ),
        tip: 'Name a concrete first deliverable, not a generic onboarding plan.',
      },
      {
        question: `How have you handled similar work before?`,
        suggestedAnswer: sanitizeAiText(
          proposal
            ? `I would point to the same pattern in the note I already sent: start small, ship a visible win, then scale the parts that actually moved the needle.`
            : `I would pick one comparable project, state the constraint, and show the result in numbers rather than listing tools.`,
        ),
        tip: 'Keep the story to one project with a before/after.',
      },
      {
        question: `What would you need from us to start?`,
        suggestedAnswer: sanitizeAiText(
          `Access to the live brief, one decision-maker, and a sample of the current output. That is enough to start without a long kickoff.`,
        ),
        tip: 'Ask for access, not a committee.',
      },
    ],
  };
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
      service: 'generate-followup',
    });
  }
  if (method !== 'POST') return jsonNoStore({ error: 'Method not allowed' }, 405);

  const body = await readJsonBody<Record<string, unknown>>(req);
  const type = String(body.type || body.mode || 'followup').toLowerCase();
  const language = textOf(body.language || body.outputLanguage, 12) || 'en';
  const jobDescription = firstText([
    body.jobDescription,
    body.jobContext,
    body.job_context,
    body.job,
    body.pageText,
  ], 4000);
  const proposal = firstText([
    body.proposal,
    body.proposalHistory,
    body.proposal_history,
    body.previousMessages,
    body.previous_messages,
    body.messages,
  ], 4000);
  const clientName = firstText([body.clientName, body.client_name, body.client], 80);
  const profile = body.userProfile && typeof body.userProfile === 'object'
    ? body.userProfile as Record<string, unknown>
    : {};
  const skills = firstText([profile.skills, body.skills], 400);
  const experience = firstText([profile.experience, body.experience], 800);

  const fallback = type === 'interview'
    ? fallbackQuestions(jobDescription, proposal)
    : fallbackFollowUps(jobDescription, proposal, clientName);

  const apiKey = resolveRequestApiKey(body);
  if (!apiKey) {
    return jsonNoStore({
      success: true,
      fallback: true,
      ...fallback,
    });
  }

  const langName = language === 'tr' ? 'Turkish' : language === 'de' ? 'German' : language === 'fr' ? 'French' : 'English';
  const context = [
    jobDescription ? `JOB:\n${jobDescription}` : '',
    proposal ? `PREVIOUS NOTE:\n${proposal}` : '',
    clientName ? `CLIENT: ${clientName}` : '',
    skills ? `SKILLS: ${skills}` : '',
    experience ? `EXPERIENCE:\n${experience}` : '',
  ].filter(Boolean).join('\n\n') || 'The candidate already applied. Write a natural follow-up from that fact alone.';

  try {
    if (type === 'interview') {
      const raw = await completeChat(apiKey, {
        system: `You write interview prep for a specific role. Return ONLY JSON:
{"questions":[{"question":"...","suggestedAnswer":"...","tip":"..."}]}
Exactly 3 questions. ${HUMAN_WRITING_RULES}
Write in ${langName}.`,
        user: context,
        json: true,
        temperature: 0.4,
        maxTokens: 900,
      });
      const parsed = parseJsonObject(raw);
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      const cleaned = questions.slice(0, 3).map((item) => {
        const rec = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
          question: sanitizeAiText(textOf(rec.question, 240)) || 'What would a strong first month look like?',
          suggestedAnswer: sanitizeAiText(textOf(rec.suggestedAnswer || rec.answer, 800)),
          tip: sanitizeAiText(textOf(rec.tip, 240)),
        };
      }).filter((item) => item.question && item.suggestedAnswer);
      const pack = cleaned.length ? { questions: cleaned } : fallbackQuestions(jobDescription, proposal);
      return jsonNoStore({ success: true, fallback: !cleaned.length, ...pack });
    }

    const raw = await completeChat(apiKey, {
      system: `You write short follow-up messages after a job application. Return ONLY JSON:
{"followUp3":"...","followUp7":"..."}
followUp3: 2-3 sentences, light check-in, not pushy.
followUp7: 3-4 sentences, add one practical next step.
${HUMAN_WRITING_RULES}
Write in ${langName}. No markdown.`,
      user: context,
      json: true,
      temperature: 0.45,
      maxTokens: 500,
    });
    const parsed = parseJsonObject(raw);
    const followUp3 = sanitizeAiText(textOf(parsed.followUp3 || parsed.follow_up_3, 800));
    const followUp7 = sanitizeAiText(textOf(parsed.followUp7 || parsed.follow_up_7, 800));
    if (!followUp3 || !followUp7) {
      return jsonNoStore({ success: true, fallback: true, ...fallbackFollowUps(jobDescription, proposal, clientName) });
    }
    return jsonNoStore({ success: true, followUp3, followUp7 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('generate-followup failed:', err?.message || error);
    return jsonNoStore({
      success: true,
      fallback: true,
      message: AI_BUSY_MESSAGE,
      ...fallback,
    });
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
