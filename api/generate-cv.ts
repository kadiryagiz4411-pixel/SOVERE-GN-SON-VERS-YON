/**
 * POST /api/generate-cv
 * Dashboard CV generation on the same Vercel OpenAI path the extension uses.
 */
import { preflight, jsonNoStore, readJsonBody } from './_lib/cors.js';
import { exposeApi } from './_lib/http.js';
import { resolveRequestApiKey, AI_BUSY_MESSAGE } from './_lib/openai.js';
import { completeChat } from './_lib/complete.js';
import { sanitizeAiText } from './_lib/sanitize.js';
import { CV_SECTION_FORMAT, HUMAN_WRITING_RULES } from './_lib/tone.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

type FormData = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  certifications?: string;
};

function textOf(value: unknown, max = 10000): string {
  if (typeof value === 'string') return value.trim().slice(0, max);
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
      service: 'generate-cv',
    });
  }
  if (method !== 'POST') return jsonNoStore({ error: 'Method not allowed' }, 405);

  const body = await readJsonBody<{
    mode?: string;
    targetRole?: string;
    targetCompany?: string;
    jobDescription?: string;
    outputLanguage?: string;
    existingCvText?: string;
    pageText?: string;
    text?: string;
    domContent?: unknown;
    formData?: FormData;
    customApiKey?: unknown;
  }>(req);

  const apiKey = resolveRequestApiKey(body);
  if (!apiKey) {
    console.error('CRITICAL ERROR: OPENAI_API_KEY is missing in Vercel environment!');
    return jsonNoStore({ error: 'AI service not configured on server' }, 500);
  }

  try {
    const mode = String(body.mode || 'generate-from-text');
    const targetRole = textOf(body.targetRole, 200);
    const targetCompany = textOf(body.targetCompany, 200);
    const jobDescription = textOf(body.jobDescription, 5000);
    const outputLanguage = textOf(body.outputLanguage, 12) || 'en';
    const existingCvText = textOf(
      body.existingCvText || body.pageText || body.text || body.domContent,
      10000,
    );
    const formData = body.formData && typeof body.formData === 'object' ? body.formData : {};

    const langName = outputLanguage === 'tr' ? 'Turkish' : outputLanguage === 'de' ? 'German' : outputLanguage === 'fr' ? 'French' : 'English';
    const langInstruction = outputLanguage !== 'en'
      ? `Write the ENTIRE CV in ${langName}. Do not write in English.`
      : 'Write in professional English.';

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'optimize' && existingCvText) {
      systemPrompt = `You are a hiring manager rewriting a colleague's CV so it sounds like a real person wrote it. Return ONLY the CV text. No commentary. ${langInstruction}
${HUMAN_WRITING_RULES}
${CV_SECTION_FORMAT}`;
      userPrompt = `Optimize this CV${targetRole ? ` for ${targetRole}` : ''}${targetCompany ? ` at ${targetCompany}` : ''}${jobDescription ? `\n\nTarget job:\n${jobDescription}` : ''}\n\nEXISTING CV:\n${existingCvText}`;
    } else if (mode === 'generate' && (formData.fullName || formData.experience || formData.skills)) {
      systemPrompt = `You are a senior operator writing your own CV. Direct, specific, no fluff. Return ONLY the CV text. ${langInstruction}
${HUMAN_WRITING_RULES}
${CV_SECTION_FORMAT}`;
      userPrompt = [
        formData.fullName ? `NAME: ${formData.fullName}` : '',
        formData.email ? `EMAIL: ${formData.email}` : '',
        formData.phone ? `PHONE: ${formData.phone}` : '',
        formData.location ? `LOCATION: ${formData.location}` : '',
        targetRole ? `TARGET ROLE: ${targetRole}` : '',
        targetCompany ? `TARGET COMPANY: ${targetCompany}` : '',
        formData.summary ? `SUMMARY:\n${formData.summary}` : '',
        formData.experience ? `EXPERIENCE:\n${String(formData.experience).slice(0, 2500)}` : '',
        formData.education ? `EDUCATION:\n${formData.education}` : '',
        formData.skills ? `SKILLS: ${formData.skills}` : '',
        formData.certifications ? `CERTIFICATIONS: ${formData.certifications}` : '',
        jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : '',
      ].filter(Boolean).join('\n');
    } else {
      if (!existingCvText || existingCvText.length < 20) {
        return jsonNoStore({ error: 'CV content is too short to generate.' }, 400);
      }
      systemPrompt = `You are a senior operator writing your own CV from rough notes. Direct, specific, no fluff. Return ONLY the CV text. ${langInstruction}
${HUMAN_WRITING_RULES}
${CV_SECTION_FORMAT}`;
      userPrompt = `Create a CV from this information${targetRole ? ` for ${targetRole}` : ''}${targetCompany ? ` at ${targetCompany}` : ''}:\n\n${existingCvText}${jobDescription ? `\n\nJOB DESCRIPTION:\n${jobDescription}` : ''}`;
    }

    const raw = await completeChat(apiKey, {
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.45,
      maxTokens: 1800,
    });
    const cv = sanitizeAiText(raw);
    if (!cv) {
      return jsonNoStore({ success: false, error: AI_BUSY_MESSAGE }, 500);
    }

    return jsonNoStore({
      success: true,
      cv,
      proposal: cv,
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
