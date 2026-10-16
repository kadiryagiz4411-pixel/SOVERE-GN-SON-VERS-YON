/**
 * evaluator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rational AI batch evaluator & ranker for multi-CV single-file uploads.
 *
 * - Processes candidates in parallel chunks of BATCH_SIZE (10).
 * - Compares each profile against optional job context or general excellence.
 * - Returns all candidates sorted by overallScore DESC with rankPosition 1…N.
 */

import {
  BatchEvaluationResponseSchema,
  type CandidateProfile,
  type RankedCandidate,
} from '@/lib/schemas/candidate';
import { getActiveApiKey } from '@/lib/apiKeyResolver';
import { getOpenAIApiKey, isOpenAIApiKeyConfigured, OPENAI_KEY_MISSING_PAYLOAD } from '@/lib/ai/openai';
import { parseLLMJson } from '@/utils/llmJson';
import { sanitizeAiText, sanitizeList } from '@/lib/ai/sanitizer';
import { loadMemory, memoryToPrompt, type SovereignMemory } from '@/lib/memory/contextEngine';
import { fetchMemoryBank, memoryBankToPrompt } from '@/lib/memory/activityLogger';
import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 10;
const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BatchEvaluateOptions {
  candidates:   CandidateProfile[];
  jobContext?:  string;
  userId?:      string;
  batchId?:     string;
  /** Called after each chunk completes (progress: 0–1) */
  onProgress?:  (progress: number, evaluated: number, total: number) => void;
  /** Stream a candidate as soon as its chunk is scored */
  onItem?:      (candidate: RankedCandidate) => void;
}

export interface EvaluatorResult {
  rankedCandidates: RankedCandidate[];
}

// ─── Main evaluator ───────────────────────────────────────────────────────────

export async function evaluateCandidatesBatch(opts: BatchEvaluateOptions): Promise<EvaluatorResult> {
  const { candidates, jobContext = '', onProgress } = opts;
  const memory = opts.userId ? await loadMemory(opts.userId).catch(() => null) : null;
  const bankLine = opts.userId
    ? memoryBankToPrompt(await fetchMemoryBank(opts.userId).catch(() => []))
    : '';

  if (candidates.length === 0) return { rankedCandidates: [] };

  const key = getActiveApiKey() || getOpenAIApiKey();
  if (!isOpenAIApiKeyConfigured(key)) {
    const remote = await evaluateViaApi(opts);
    if (remote) return remote;
    throw new Error(`${OPENAI_KEY_MISSING_PAYLOAD.error}: ${OPENAI_KEY_MISSING_PAYLOAD.message}`);
  }

  // Split into chunks of BATCH_SIZE
  const chunks: CandidateProfile[][] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    chunks.push(candidates.slice(i, i + BATCH_SIZE));
  }

  // Score store keyed by original index
  const scoreMap = new Map<number, { score: number; why: string; strengths: string[]; missing: string[]; rec: RankedCandidate['recommendation'] }>();
  let evaluated = 0;

  // Process chunks (sequential to respect rate limits)
  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    const offset = chunkIdx * BATCH_SIZE;

    try {
      const evaluations = await evaluateChunk(chunk, offset, jobContext, key, memory, bankLine);
      for (const ev of evaluations) {
        scoreMap.set(ev.candidateIndex, {
          score:     ev.overallScore,
          why:       sanitizeAiText(ev.whyThisCandidate),
          strengths: sanitizeList(ev.keyStrengths),
          missing:   sanitizeList(ev.missingSkills),
          rec:       ev.recommendation,
        });
      }
      if (opts.onItem) {
        chunk.forEach((c, i) => {
          const idx = offset + i;
          const ev = scoreMap.get(idx);
          if (!ev) return;
          opts.onItem?.({
            ...c,
            id: crypto.randomUUID(),
            batchId: opts.batchId ?? '',
            rankPosition: 0,
            overallScore: ev.score,
            whyThisCandidate: ev.why,
            keyStrengths: ev.strengths,
            missingSkills: ev.missing,
            recommendation: ev.rec,
          });
        });
      }
    } catch (err) {
      console.warn(`[Evaluator] Chunk ${chunkIdx} failed, using fallback scores:`, err);
      // Assign heuristic scores for failed chunk
      chunk.forEach((c, i) => {
        const idx = offset + i;
        if (!scoreMap.has(idx)) {
          scoreMap.set(idx, {
            score:     heuristicScore(c),
            why:       sanitizeAiText(`${c.fullName} has ${c.experienceYears} years of experience and skills including ${c.skills.slice(0, 3).join(', ') || 'various technologies'}.`),
            strengths: c.skills.slice(0, 3),
            missing:   [],
            rec:       'Moderate Fit',
          });
        }
      });
    }

    evaluated += chunk.length;
    onProgress?.(evaluated / candidates.length, evaluated, candidates.length);
  }

  // Build ranked candidates (sorted by score DESC)
  const scored = candidates.map((c, i) => {
    const ev = scoreMap.get(i) ?? {
      score:     heuristicScore(c),
      why:       sanitizeAiText(`${c.fullName} brings ${c.experienceYears} years of experience.`),
      strengths: c.skills.slice(0, 3),
      missing:   [],
      rec:       'Moderate Fit' as const,
    };
    return { candidate: c, index: i, ...ev };
  });

  scored.sort((a, b) => b.score - a.score);

  const rankedCandidates: RankedCandidate[] = scored.map((item, rank) => ({
    ...item.candidate,
    id:               crypto.randomUUID(),
    batchId:          opts.batchId ?? '',
    rankPosition:     rank + 1,
    overallScore:     item.score,
    whyThisCandidate: item.why,
    keyStrengths:     item.strengths,
    missingSkills:    item.missing,
    recommendation:   item.rec,
  }));

  return { rankedCandidates };
}

async function evaluateViaApi(opts: BatchEvaluateOptions): Promise<EvaluatorResult | null> {
  try {
    const res = await fetch('/api/batch/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidates: opts.candidates,
        jobContext: opts.jobContext ?? '',
        batchId: opts.batchId ?? '',
      }),
    });
    const payload = await res.json().catch(() => ({})) as {
      error?: string;
      message?: string;
      rankedCandidates?: RankedCandidate[];
    };
    if (payload.error === 'OPENAI_KEY_MISSING' || !res.ok) return null;
    if (!Array.isArray(payload.rankedCandidates) || payload.rankedCandidates.length === 0) return null;
    opts.onProgress?.(1, payload.rankedCandidates.length, opts.candidates.length);
    payload.rankedCandidates.forEach((c) => opts.onItem?.(c));
    return { rankedCandidates: payload.rankedCandidates };
  } catch {
    return null;
  }
}

// ─── Chunk evaluator ──────────────────────────────────────────────────────────

async function evaluateChunk(
  chunk: CandidateProfile[],
  offset: number,
  jobContext: string,
  key: string,
  memory?: SovereignMemory | null,
  bankLine = '',
) {
  const contextLine = jobContext
    ? `\nJob/Role Context: ${jobContext.slice(0, 500)}`
    : '\nEvaluate each candidate on general professional excellence, technical depth, and career progression.';
  const memoryLine = `${memoryToPrompt(memory)}${bankLine}`;

  const candidateSummaries = chunk.map((c, i) => {
    const work = c.workHistory?.map(w => `${w.role} @ ${w.company} (${w.period})`).join('; ') || 'Not specified';
    return `Candidate ${offset + i} (index ${offset + i}):
  Name: ${c.fullName}
  Title: ${c.title}
  Experience: ${c.experienceYears} years
  Skills: ${c.skills.slice(0, 15).join(', ')}
  Summary: ${c.summary?.slice(0, 300) || 'N/A'}
  Work History: ${work}
  Education: ${c.education || 'N/A'}`;
  }).join('\n\n');

  const systemPrompt = `You are an expert senior HR director and talent evaluator.
Evaluate the provided candidates and return ONLY valid JSON. No markdown, no fences.
Write whyThisCandidate like a blunt hiring manager. No filler phrases.${contextLine}${memoryLine}

Return: { "evaluations": [ { "candidateIndex": number, "overallScore": 0-100, "whyThisCandidate": "2-3 sentences", "keyStrengths": ["..."], "missingSkills": ["..."], "recommendation": "Top Pick|Strong Fit|Moderate Fit|Not Recommended" } ] }

Scoring rubric (0-100):
- 90-100: Exceptional – perfect match, rare skills, impressive trajectory
- 75-89: Strong – solid fit, most requirements met
- 60-74: Moderate – some gaps but trainable
- 0-59: Weak – significant misalignment or insufficient experience

Be objective and differentiate scores meaningfully across candidates.`;

  const res = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model:       'gpt-4o-mini',
      temperature: 0.2,
      max_tokens:  2500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Evaluate these ${chunk.length} candidates:\n\n${candidateSummaries}` },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseLLMJson(content) as { evaluations?: unknown[] } | null;

  if (!parsed?.evaluations) throw new Error('No evaluations array in response');

  const validated = BatchEvaluationResponseSchema.parse(parsed);
  return validated.evaluations;
}

// ─── Supabase persistence ─────────────────────────────────────────────────────

export interface PersistBatchOptions {
  userId:           string;
  fileName:         string;
  fileType:         string;
  jobContext?:      string;
  rankedCandidates: RankedCandidate[];
}

export interface PersistBatchResult {
  batchId: string;
}

export async function persistBatchResults(opts: PersistBatchOptions): Promise<PersistBatchResult> {
  const { userId, fileName, fileType, jobContext, rankedCandidates } = opts;

  // 1. Insert batch_upload record
  const { data: batch, error: batchErr } = await supabase
    .from('batch_uploads')
    .insert({
      user_id:          userId,
      file_name:        fileName,
      file_type:        fileType,
      total_candidates: rankedCandidates.length,
      status:           'completed',
      job_context:      jobContext ?? null,
    })
    .select('id')
    .single();

  if (batchErr || !batch) throw new Error(`Failed to save batch: ${batchErr?.message}`);
  const batchId: string = batch.id as string;

  // 2. Insert candidates
  const candidateRows = rankedCandidates.map(c => ({
    batch_id:         batchId,
    full_name:        c.fullName,
    title:            c.title ?? '',
    email:            c.email ?? null,
    location:         c.location ?? null,
    experience_years: c.experienceYears ?? 0,
    photo_url:        c.photoUrl ?? null,
    summary:          c.summary ?? '',
    skills:           c.skills ?? [],
    education:        c.education ?? null,
    work_history:     c.workHistory ?? [],
    raw_data:         { rawContent: c.rawContent?.slice(0, 2000) ?? '' },
  }));

  const { data: savedCandidates, error: candErr } = await supabase
    .from('batch_candidates')
    .insert(candidateRows)
    .select('id');

  if (candErr || !savedCandidates) throw new Error(`Failed to save candidates: ${candErr?.message}`);

  // 3. Insert evaluations (map by rank position)
  const evalRows = rankedCandidates.map((c, i) => ({
    candidate_id:       (savedCandidates[i] as Record<string, unknown>)?.id as string,
    batch_id:           batchId,
    overall_score:      c.overallScore,
    rank_position:      c.rankPosition,
    why_this_candidate: c.whyThisCandidate,
    key_strengths:      c.keyStrengths,
    missing_skills:     c.missingSkills,
    recommendation:     c.recommendation,
  }));

  await supabase.from('batch_evaluations').insert(evalRows);

  return { batchId };
}

// ─── Heuristic fallback score ─────────────────────────────────────────────────

function heuristicScore(c: CandidateProfile): number {
  let score = 40;
  score += Math.min(20, (c.experienceYears ?? 0) * 2);
  score += Math.min(20, (c.skills?.length ?? 0) * 2);
  if (c.education) score += 5;
  if ((c.workHistory?.length ?? 0) > 0) score += 10;
  if (c.summary && c.summary.length > 100) score += 5;
  return Math.min(95, score);
}
