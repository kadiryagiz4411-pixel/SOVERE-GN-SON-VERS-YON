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

// ─── Configuration ────────────────────────────────────────────────────────────

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

/** Pull API key from env (server-side edge functions supply this; never expose client-side). */
const getApiKey = () =>
  (typeof import.meta !== 'undefined' ? import.meta.env.VITE_OPENAI_API_KEY : '') as string;

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
  const key = getApiKey();
  if (!key) throw new Error('VITE_OPENAI_API_KEY is not set.');

  const res = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
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
    const parsed = JSON.parse(raw);
    return { ...parsed, fromCache: false, cacheHit: false };
  } catch {
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
    return JSON.parse(raw) as Stage2Result;
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
