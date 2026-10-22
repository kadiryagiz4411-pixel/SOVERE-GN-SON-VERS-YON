/**
 * POST /api/proposal
 * Dashboard proposal generation on the same Vercel OpenAI path the extension uses.
 */
import { preflight, jsonNoStore, readJsonBody } from './_lib/cors.js';
import { exposeApi } from './_lib/http.js';
import { resolveRequestApiKey, AI_BUSY_MESSAGE } from './_lib/openai.js';
import { completeChat, parseJsonObject } from './_lib/complete.js';
import { sanitizeAiText } from './_lib/sanitize.js';

export const config = { runtime: 'nodejs', maxDuration: 45 };

function textOf(value: unknown, max = 10000): string {
  if (typeof value === 'string') return value.trim().slice(0, max);
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean).join(', ').slice(0, max);
  if (value == null) return '';
  try {
    return JSON.stringify(value).slice(0, max);
  } catch {
    return String(value).slice(0, max);
  }
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
      service: 'proposal',
    });
  }
  if (method !== 'POST') return jsonNoStore({ error: 'Method not allowed' }, 405);

  const body = await readJsonBody<{
    jobDescription?: string;
    prompt?: string;
    pageText?: string;
    text?: string;
    pageUrl?: string;
    domContent?: unknown;
    tone?: string;
    customProfession?: string;
    outputLanguage?: string;
    culturalTone?: string;
    platformType?: string;
    selectedProfession?: string;
    userProfile?: {
      skills?: string[] | null;
      experience?: string | null;
      hourly_rate?: number | null;
    };
    customApiKey?: unknown;
  }>(req);

  const apiKey = resolveRequestApiKey(body);
  if (!apiKey) {
    console.error('CRITICAL ERROR: OPENAI_API_KEY is missing in Vercel environment!');
    return jsonNoStore({ error: 'AI service not configured on server' }, 500);
  }

  try {
    const jobDescription = textOf(
      body.jobDescription || body.prompt || body.pageText || body.text || body.domContent,
      8000,
    );
    if (!jobDescription || jobDescription.length < 20) {
      return jsonNoStore({ error: 'Job description is too short to analyze.' }, 400);
    }

    const skills = Array.isArray(body.userProfile?.skills)
      ? body.userProfile.skills.map((item) => String(item)).filter(Boolean).slice(0, 16)
      : [];
    const experience = textOf(body.userProfile?.experience, 800);
    const profession = textOf(body.customProfession || body.selectedProfession, 120);
    const outputLanguage = textOf(body.outputLanguage, 12) || 'en';
    const langName = outputLanguage === 'tr' ? 'Turkish' : outputLanguage === 'de' ? 'German' : outputLanguage === 'fr' ? 'French' : 'English';
    const rate = body.userProfile?.hourly_rate;

    const raw = await completeChat(apiKey, {
      system: `You are Sovereign Proposal Engine. Write a direct, human-toned freelance proposal.
Identify the client's real pain, prove you can solve it, end with a clear next step.
No generic AI filler. No "I am excited to apply". No "leverage" or "synergy".
Write the entire proposal in ${langName}.
Return JSON: { "proposal": "full proposal text", "painPoint": "one sentence", "title": "short title" }.`,
      user: `URL: ${textOf(body.pageUrl, 500)}
Profession: ${profession || 'not specified'}
Skills: ${skills.join(', ') || 'not specified'}
Experience: ${experience || 'not specified'}
${rate ? `Rate: $${rate}/hr` : ''}
Tone: ${textOf(body.tone || body.culturalTone, 40) || 'professional'}
Platform: ${textOf(body.platformType, 40) || 'direct'}

JOB / BRIEF:
${jobDescription}`,
      json: true,
      temperature: 0.4,
      maxTokens: 900,
    });

    const parsed = parseJsonObject(raw);
    const proposal = sanitizeAiText(
      String(parsed.proposal || parsed.coverLetter || parsed.text || raw),
    );
    if (!proposal) {
      return jsonNoStore({ success: false, error: AI_BUSY_MESSAGE }, 500);
    }

    return jsonNoStore({
      success: true,
      proposal,
      proposalText: proposal,
      painPoint: sanitizeAiText(String(parsed.painPoint || '')),
      title: sanitizeAiText(String(parsed.title || '')),
    });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown } };
    console.error('API route caught error:', err?.message || error, err?.response?.data ?? null);
    return jsonNoStore({ success: false, error: AI_BUSY_MESSAGE }, 500);
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
