/**
 * aiService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Cost-optimised hybrid LLM architecture for Sovereign.
 *
 * Stage 1 — gpt-4o-mini (cheap):
 *   Parse JD → extract requirements, skills, ATS keywords.
 *   Results cached in Supabase job_analysis_cache for 7 days.
 *
 * Stage 2 — gpt-4o (premium, on-demand only):
 *   Tailored CV section synthesis, cover letter generation.
 *
 * Token reduction: trimForLLM() applied before every API call.
 */

import { supabase } from '@/integrations/supabase/client';
import { trimForLLM, contentHash } from '@/utils/tokenTrimmer';
import { parseLLMJson } from '@/utils/llmJson';
import { toast } from 'sonner';
import {
  resolveOpenAIKey,
  getActiveApiKey,
  hasByokKeyStored,
  BYOK_STORAGE_KEY,
  AI_NOT_CONFIGURED_MESSAGE,
} from '@/lib/apiKeyResolver';

// ─── Configuration ────────────────────────────────────────────────────────────

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

/** @deprecated Import BYOK_STORAGE_KEY from @/lib/apiKeyResolver instead. */
export { BYOK_STORAGE_KEY };

/**
 * Resolve the OpenAI API key (BYOK → Vercel VITE_OPENAI_API_KEY).
 * Returns '' when neither is configured (does not throw).
 */
export const getApiKey = (): string => resolveOpenAIKey();

/**
 * Returns true when the user has an active BYOK key stored in localStorage.
 * Components use this to surface the "BYOK ACTIVE" badge.
 */
export const hasByokKey = (): boolean => hasByokKeyStored();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Stage1Result {
  keywords:          string[];
  must_have_skills:  string[];
  nice_to_have:      string[];
  seniority_level:   string;
  employment_type:   string;
  ats_score_hint:    number;       // 0–100 predicted ATS match
  summary:           string;       // 1-sentence JD summary
  fromCache:         boolean;
  cacheHit?:         boolean;
}

export interface Stage2Result {
  tailored_cv_section: string;
  cover_letter:        string;
  match_score:         number;     // 0–100
  top_improvements:    string[];
}

export interface AISynthesisInput {
  jobDescription: string;
  jobUrl?:        string;
  candidateProfile: {
    name:        string;
    skills:      string[];
    experience:  string;
    targetRole?: string;
  };
}

// ─── Internal: OpenAI fetch wrapper ──────────────────────────────────────────

async function callOpenAI(
  model: string,
  messages: { role: string; content: string }[],
  maxTokens = 800,
): Promise<string> {
  let key = getActiveApiKey();
  if (!key) {
    toast.error("Lütfen Ayarlar'dan API Anahtarınızı girin", { id: 'sovereign-no-api-key', duration: 8000 });
    throw new Error(AI_NOT_CONFIGURED_MESSAGE);
  }

  console.log('[AI Engine Request]', { model, hasKey: true, maxTokens });

  const res = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '(no body)');
    // Surface a friendly Turkish message for common HTTP errors.
    let userMsg: string;
    if (res.status === 401) {
      userMsg = 'OpenAI API Anahtarı Geçersiz (401). Lütfen Ayarlar sayfasından anahtarınızı kontrol edin.';
    } else if (res.status === 429) {
      userMsg = 'OpenAI API kota sınırına ulaşıldı (429). Lütfen bir süre bekleyin veya farklı bir anahtar deneyin.';
    } else {
      userMsg = `OpenAI API Hatası (HTTP ${res.status}): ${errText.slice(0, 200)}`;
    }
    console.error('[SOVEREIGN_ERR] callOpenAI:', userMsg);
    throw new Error(userMsg);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

// ─── Stage 1: Cheap parsing + keyword extraction ─────────────────────────────

const STAGE1_SYSTEM = `You are a professional ATS analyst. Extract structured data from job descriptions.
Return ONLY valid JSON. No markdown fences.`;

async function runStage1API(trimmedJD: string): Promise<Stage1Result> {
  const prompt = `Analyse this job description and return a JSON object with these exact keys:
{
  "keywords": ["string"],
  "must_have_skills": ["string"],
  "nice_to_have": ["string"],
  "seniority_level": "junior|mid|senior|lead|executive",
  "employment_type": "full_time|part_time|contract|freelance",
  "ats_score_hint": 70,
  "summary": "one sentence"
}

Job Description:
${trimmedJD}`;

  const raw = await callOpenAI(
    'gpt-4o-mini',
    [
      { role: 'system',  content: STAGE1_SYSTEM },
      { role: 'user',    content: prompt },
    ],
    600,
  );

  try {
    const parsed = parseLLMJson<Stage1Result>(raw);
    return { ...parsed, fromCache: false, cacheHit: false };
  } catch (parseErr) {
    console.error('[SOVEREIGN_ERR] runStage1API: failed to parse LLM JSON response', parseErr, '\nRaw response:', raw.slice(0, 300));
    return {
      keywords: [], must_have_skills: [], nice_to_have: [],
      seniority_level: 'mid', employment_type: 'full_time',
      ats_score_hint: 50, summary: 'Could not parse job description.',
      fromCache: false,
    };
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function getCachedStage1(hash: string): Promise<Stage1Result | null> {
  const { data, error } = await supabase
    .from('job_analysis_cache')
    .select('stage1_result, hit_count')
    .eq('content_hash', hash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  // Increment hit counter (fire-and-forget)
  supabase
    .from('job_analysis_cache')
    .update({ hit_count: ((data as any).hit_count ?? 0) + 1 })
    .eq('content_hash', hash)
    .then(() => {});

  return { ...(data as any).stage1_result, fromCache: true, cacheHit: true };
}

async function saveStage1Cache(
  hash: string, trimmedJD: string, result: Stage1Result, jobUrl?: string,
): Promise<void> {
  const { fromCache: _f, cacheHit: _c, ...toStore } = result;
  await supabase.from('job_analysis_cache').upsert({
    content_hash:  hash,
    job_url:       jobUrl ?? null,
    raw_snippet:   trimmedJD.slice(0, 500),
    stage1_result: toStore,
    model_used:    'gpt-4o-mini',
    expires_at:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'content_hash' });
}

// ─── Public: analyseJobDescription (Stage 1) ─────────────────────────────────

/**
 * Parses a job description using gpt-4o-mini.
 * Returns cached result if the same JD was seen within the last 7 days.
 */
export async function analyseJobDescription(
  rawJobText: string,
  jobUrl?: string,
): Promise<Stage1Result> {
  // Trim to reduce tokens
  const { trimmed } = trimForLLM(rawJobText, 4_000);

  // Cache lookup
  const hash = await contentHash(trimmed);
  const cached = await getCachedStage1(hash);
  if (cached) return cached;

  // API call
  const result = await runStage1API(trimmed);

  // Persist to cache (fire-and-forget)
  saveStage1Cache(hash, trimmed, result, jobUrl).catch(() => {});

  return result;
}

// ─── Stage 2: Premium synthesis ──────────────────────────────────────────────

const STAGE2_SYSTEM = `You are a world-class career coach and CV writer.
Write in crisp, concise, high-impact Business English.
Tailor every sentence specifically to the candidate and the job.
Return ONLY valid JSON. No markdown fences.`;

/**
 * Generates a tailored CV section and cover letter using gpt-4o.
 * Only called after Stage 1 has confirmed a viable match.
 *
 * @param input     Candidate profile + already-trimmed JD
 * @param stage1    Stage 1 result (used to inject keywords efficiently)
 */
export async function synthesiseCVAndLetter(
  input: AISynthesisInput,
  stage1: Stage1Result,
): Promise<Stage2Result> {
  const { trimmed } = trimForLLM(input.jobDescription, 3_000);

  const prompt = `Generate tailored career content for this candidate and job.

CANDIDATE:
Name: ${input.candidateProfile.name}
Skills: ${(input.candidateProfile.skills ?? []).join(', ')}
Experience: ${input.candidateProfile.experience?.slice(0, 800) ?? 'Not provided'}

JOB SUMMARY: ${stage1.summary}
REQUIRED KEYWORDS TO INCLUDE: ${stage1.must_have_skills.slice(0, 10).join(', ')}
SENIORITY: ${stage1.seniority_level}

JOB DESCRIPTION (trimmed):
${trimmed}

Return JSON with:
{
  "tailored_cv_section": "2-3 bullet points for the CV summary / skills section",
  "cover_letter": "3-paragraph cover letter (opening, value proof, closing CTA)",
  "match_score": 82,
  "top_improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`;

  const raw = await callOpenAI(
    'gpt-4o',
    [
      { role: 'system', content: STAGE2_SYSTEM },
      { role: 'user',   content: prompt },
    ],
    1200,
  );

  try {
    return parseLLMJson<Stage2Result>(raw);
  } catch {
    return {
      tailored_cv_section: raw.slice(0, 500),
      cover_letter:        '',
      match_score:         stage1.ats_score_hint,
      top_improvements:    [],
    };
  }
}

// ─── Full pipeline (Stage 1 + Stage 2) ───────────────────────────────────────

/**
 * Convenience wrapper: runs both stages in sequence.
 * Stage 1 is cached; Stage 2 always calls gpt-4o.
 */
export async function runFullPipeline(input: AISynthesisInput): Promise<{
  stage1: Stage1Result;
  stage2: Stage2Result;
}> {
  const stage1 = await analyseJobDescription(input.jobDescription, input.jobUrl);
  const stage2 = await synthesiseCVAndLetter(input, stage1);
  return { stage1, stage2 };
}

// ─── Sovereign Core-Generation Wrapper ───────────────────────────────────────

import { invokeEdgeJson, invokeCvFunction, EDGE_FUNCTIONS } from '@/lib/edgeFunctions';

const FALLBACK_CONTENT =
  'Service is currently experiencing high load. Please try again in a few moments.';

export interface SovereignGeneratePayload {
  /** Authenticated user ID (used for server-side credit deduction). */
  userId: string;
  /** The main text input — job description for proposals, CV text for CV generation. */
  prompt: string;
  /** Generation type. */
  type: 'cv' | 'proposal';
  /** Any additional params passed through to the edge function. */
  [key: string]: unknown;
}

export interface SovereignGenerateResult {
  success: boolean;
  /** True when the primary call failed and a safe fallback message was returned. */
  fallback: boolean;
  /** Raw edge-function response on success. */
  data?: unknown;
  /** Human-readable fallback copy shown directly in the UI. */
  content?: string;
  /** Machine-readable error for logging. */
  error?: string;
}

// ─── Client-side CV Generation Fallback ─────────────────────────────────────

export interface CVFallbackInput {
  /** Generation mode — controls which system prompt and content structure to use. */
  mode: 'generate' | 'generate-from-text' | 'optimize';
  /** Free-text CV input (used by generate-from-text and optimize modes). */
  existingCvText?: string;
  /** Structured form data for full-form mode. */
  formData?: {
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
  targetRole?: string;
  targetCompany?: string;
  jobDescription?: string;
  outputLanguage?: string;
}

/**
 * Client-side CV generation fallback — triggered when the Supabase Edge Function
 * returns 401, 402, 500, or a network error AND the user has a BYOK key or
 * VITE_OPENAI_API_KEY is configured.
 *
 * Generates a professional CV directly in the browser via OpenAI API.
 * Returns null when no API key is available.
 */
export async function generateCVFallback(input: CVFallbackInput): Promise<string | null> {
  const key = getActiveApiKey();
  if (!key) {
    toast.error("Lütfen Ayarlar'dan API Anahtarınızı girin", {
      id: 'sovereign-no-api-key',
      duration: 8000,
    });
    return null;
  }

  const langNote = input.outputLanguage && input.outputLanguage !== 'en'
    ? `Write the ENTIRE CV in the language with ISO code "${input.outputLanguage}". Do NOT use English.`
    : 'Write in professional English.';

  let systemPrompt: string;
  let userPrompt: string;

  if (input.mode === 'optimize' && input.existingCvText) {
    systemPrompt =
      'You are a world-class CV coach and ATS optimization specialist. ' +
      'Rewrite and enhance the provided CV to maximise ATS pass rates and recruiter appeal. ' +
      'Inject relevant keywords, quantify achievements, remove filler phrases, and tighten language. ' +
      'Return ONLY the improved CV text — no commentary, no markdown headers, no preamble. ' +
      langNote;

    userPrompt = `EXISTING CV:\n${input.existingCvText.slice(0, 4000)}` +
      (input.targetRole ? `\n\nTARGET ROLE: ${input.targetRole}` : '') +
      (input.jobDescription ? `\n\nJOB DESCRIPTION:\n${input.jobDescription.slice(0, 1500)}` : '');

  } else if (input.mode === 'generate-from-text' && input.existingCvText) {
    systemPrompt =
      'You are a professional CV writer. Transform the provided background description into a ' +
      'polished, ATS-friendly CV. Use clear sections (Summary, Experience, Skills, Education). ' +
      'Return ONLY the CV text — no commentary. ' +
      langNote;

    userPrompt = `BACKGROUND DESCRIPTION:\n${input.existingCvText.slice(0, 4000)}` +
      (input.targetRole ? `\n\nTARGET ROLE: ${input.targetRole}` : '') +
      (input.targetCompany ? `\nTARGET COMPANY: ${input.targetCompany}` : '') +
      (input.jobDescription ? `\n\nJOB DESCRIPTION:\n${input.jobDescription.slice(0, 1500)}` : '');

  } else if (input.mode === 'generate' && input.formData) {
    const fd = input.formData;
    systemPrompt =
      'You are a professional CV writer. Generate a polished, ATS-friendly CV from the provided details. ' +
      'Use clear sections (Professional Summary, Work Experience, Skills, Education, Certifications). ' +
      'Return ONLY the CV text — no commentary, no markdown code fences. ' +
      langNote;

    userPrompt = [
      fd.fullName   ? `NAME: ${fd.fullName}` : '',
      fd.email      ? `EMAIL: ${fd.email}` : '',
      fd.phone      ? `PHONE: ${fd.phone}` : '',
      fd.location   ? `LOCATION: ${fd.location}` : '',
      input.targetRole    ? `TARGET ROLE: ${input.targetRole}` : '',
      input.targetCompany ? `TARGET COMPANY: ${input.targetCompany}` : '',
      fd.summary    ? `\nSUMMARY:\n${fd.summary}` : '',
      fd.experience ? `\nEXPERIENCE:\n${fd.experience.slice(0, 2000)}` : '',
      fd.education  ? `\nEDUCATION:\n${fd.education}` : '',
      fd.skills     ? `\nSKILLS: ${fd.skills}` : '',
      fd.certifications ? `\nCERTIFICATIONS: ${fd.certifications}` : '',
      input.jobDescription ? `\n\nTARGET JOB DESCRIPTION:\n${input.jobDescription.slice(0, 1500)}` : '',
    ].filter(Boolean).join('\n');

  } else {
    // Fallback-of-fallback: generate from whatever text is available.
    const anyText = input.existingCvText || Object.values(input.formData ?? {}).join(' ');
    if (!anyText.trim()) return null;
    systemPrompt = 'You are a professional CV writer. Generate a polished CV. Return only CV text. ' + langNote;
    userPrompt = anyText.slice(0, 4000);
  }

  try {
    const result = await callOpenAI(
      'gpt-4o-mini',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      1200,
    );
    return result || null;
  } catch (err) {
    console.error('[SOVEREIGN_ERR] generateCVFallback failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Client-side ATS Score Fallback ─────────────────────────────────────────

export interface ATSFallbackResult {
  ats_score: number;
  visible_flaws: string[];
  hidden_flaws_count: number;
  total_flaws: number;
  top_strength: string;
}

/**
 * Client-side ATS analysis fallback — used when the ats-teaser / optimize-cv
 * edge functions are unavailable.
 * Returns null when no API key is available.
 */
export async function generateATSFallback(
  cvText: string,
  jobDescription?: string,
  outputLanguage?: string,
): Promise<ATSFallbackResult | null> {
  const key = getActiveApiKey();
  if (!key) {
    toast.error("Lütfen Ayarlar'dan API Anahtarınızı girin", {
      id: 'sovereign-no-api-key',
      duration: 8000,
    });
    return null;
  }

  const langNote = outputLanguage && outputLanguage !== 'en'
    ? `Respond in the language with ISO code "${outputLanguage}".`
    : 'Respond in English.';

  const systemPrompt =
    'You are an expert ATS (Applicant Tracking System) analyst. ' +
    'Analyse the provided CV and return a JSON object with ATS score and improvement areas. ' +
    'Return ONLY valid JSON. No markdown fences. ' +
    langNote;

  const userPrompt = `Analyse this CV for ATS compatibility and return JSON with these exact keys:
{
  "ats_score": 72,
  "visible_flaws": ["flaw 1", "flaw 2", "flaw 3"],
  "hidden_flaws_count": 4,
  "total_flaws": 7,
  "top_strength": "one sentence about the strongest section"
}

CV TEXT:
${cvText.slice(0, 3000)}
${jobDescription ? `\nTARGET JOB DESCRIPTION:\n${jobDescription.slice(0, 1000)}` : ''}`;

  try {
    const raw = await callOpenAI(
      'gpt-4o-mini',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      600,
    );
    try {
      const parsed = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
      return parsed as ATSFallbackResult;
    } catch {
      return null;
    }
  } catch (err) {
    console.error('[SOVEREIGN_ERR] generateATSFallback failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Client-side proposal fallback — used when the Supabase Edge Function is
 * unreachable (network error, CORS, cold start timeout, misconfiguration).
 *
 * Requires VITE_OPENAI_API_KEY to be set (BYOK or admin-configured key).
 * Returns null when no API key is available so the caller can fall through
 * to its own error UX.
 */
export async function generateProposalFallback(
  jobDescription: string,
  profile?: {
    skills?: string[] | null;
    experience?: string | null;
    hourly_rate?: number | null;
  } | null,
  profession?: string,
): Promise<string | null> {
  const key = getActiveApiKey();
  if (!key) {
    toast.error("Lütfen Ayarlar'dan API Anahtarınızı girin", {
      id: 'sovereign-no-api-key',
      duration: 8000,
    });
    return null;
  }

  const skillsList = (profile?.skills ?? []).slice(0, 12).join(', ') || 'Not specified';
  const experience = (profile?.experience ?? '').slice(0, 500) || 'Not specified';

  // Dynamic system prompt: adapt tone & terminology to the user's profession.
  const professionLine = profession?.trim()
    ? `You are an expert ${profession.trim()}. Adapt the proposal's tone, terminology, value proposition, and deliverables specifically to match the standards and client expectations of the ${profession.trim()} industry.`
    : 'You are a world-class freelance proposal writer specialising in high-conversion client pitches.';

  const systemPrompt =
    professionLine +
    ' Write natural, specific, and compelling proposals. Avoid generic filler.' +
    ' Lead with the client\'s problem, prove expertise, end with a clear CTA.';

  const userPrompt = `Write a professional, high-converting proposal for this opportunity.

JOB / CLIENT BRIEF:
${jobDescription.slice(0, 2500)}

CANDIDATE:
${profession ? `- Profession: ${profession}` : ''}
- Skills: ${skillsList}
- Experience: ${experience}
${profile?.hourly_rate ? `- Rate: $${profile.hourly_rate}/hr` : ''}

Structure:
1. Hook — address the client's core problem directly (2-3 sentences)
2. Value proof — specific experience that solves their problem (3-4 sentences)
3. CTA — confident, clear next step (1-2 sentences)

Tone: professional, warm, confident. No generic phrases like "I am excited to apply".`;

  try {
    const result = await callOpenAI(
      'gpt-4o-mini',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      900,
    );
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Unified resilient wrapper for Sovereign's core generation functions.
 *
 * Primary:   Supabase Edge Function (generate-proposal / generate-cv).
 * Secondary: Client-side OpenAI call via generateProposalFallback() when the
 *            edge function fails AND VITE_OPENAI_API_KEY is configured.
 * Final:     Safe fallback message so the UI never white-screens.
 */
export async function generateSovereignContent(
  payload: SovereignGeneratePayload,
): Promise<SovereignGenerateResult> {
  try {
    if (payload.type === 'cv') {
      const { userId: _u, prompt, type: _t, ...rest } = payload;
      const result = await invokeCvFunction<{ cv?: string; error?: string }>({
        mode: 'generate-from-text',
        existingCvText: prompt,
        ...rest,
      });

      // ── CV client-side fallback ──────────────────────────────────────────────
      // If the edge function fails for ANY reason (401/402/network/500), try to
      // generate the CV directly via OpenAI using the BYOK/admin API key.
      if (result.error || !result.data || !(result.data as any)?.cv) {
        const shouldFallback = result.status === 401
          || result.status === 402
          || result.status === 500
          || result.status === 0       // network error
          || result.status === 404;    // function not deployed

        if (shouldFallback) {
          console.warn(`[generateSovereignContent:cv] edge failed (${result.status}) — trying client-side CV fallback.`);
          const fallbackCV = await generateCVFallback({
            mode: (rest as any).mode ?? 'generate-from-text',
            existingCvText: prompt,
            targetRole:   (rest as any).targetRole,
            targetCompany: (rest as any).targetCompany,
            jobDescription: (rest as any).jobDescription,
            outputLanguage: (rest as any).outputLanguage,
            formData:     (rest as any).formData,
          });
          if (fallbackCV) {
            console.info('[generateSovereignContent:cv] client-side CV fallback succeeded.');
            return { success: true, fallback: true, data: { cv: fallbackCV } };
          }
        }

        console.error('[generateSovereignContent:cv] both edge and fallback failed', result.error, result.status);
        return { success: false, fallback: true, content: FALLBACK_CONTENT, error: result.error ?? 'Unknown error' };
      }
      return { success: true, fallback: false, data: result.data };
    }

    // type === 'proposal' — try edge function first
    const { userId: _u, prompt, type: _t, ...rest } = payload;
    const result = await invokeEdgeJson<{ proposal?: string; error?: string }>(
      EDGE_FUNCTIONS.proposal,
      { jobDescription: prompt, ...rest },
    );
    if (!result.error && result.data) {
      return { success: true, fallback: false, data: result.data };
    }

    // Edge function failed — try client-side OpenAI fallback
    console.warn('[generateSovereignContent:proposal] edge failed, trying client fallback', result.error);
    const fallbackText = await generateProposalFallback(prompt);
    if (fallbackText) {
      return { success: true, fallback: false, data: { proposal: fallbackText } };
    }

    // Both paths failed
    console.error('[generateSovereignContent:proposal] both paths failed', result.error);
    return { success: false, fallback: true, content: FALLBACK_CONTENT, error: result.error ?? 'Unknown error' };

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[SOVEREIGN_ERR] generateSovereignContent — unexpected exception:', errMsg, err);

    // Last-chance client-side fallback for proposal type
    if (payload.type === 'proposal') {
      const fallbackText = await generateProposalFallback(payload.prompt).catch((fbErr) => {
        console.error('[SOVEREIGN_ERR] generateProposalFallback — client fallback also failed:', fbErr instanceof Error ? fbErr.message : fbErr);
        return null;
      });
      if (fallbackText) {
        return { success: true, fallback: false, data: { proposal: fallbackText } };
      }
    }

    return {
      success: false,
      fallback: true,
      content: FALLBACK_CONTENT,
      error: errMsg,
    };
  }
}
