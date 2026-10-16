/**
 * proposalEngine.ts — Rank job postings against the user's skill profile.
 */

import {
  BatchJobEvaluationResponseSchema,
  type JobPosting,
  type RankedJob,
} from '@/lib/schemas/job';
import { getActiveApiKey } from '@/lib/apiKeyResolver';
import { parseLLMJson } from '@/utils/llmJson';
import { sanitizeAiText, sanitizeList } from '@/lib/ai/sanitizer';
import { memoryToPrompt, type SovereignMemory } from '@/lib/memory/contextEngine';
import { supabase } from '@/integrations/supabase/client';
import { fetchMemoryBank, logActivity, memoryBankToPrompt } from '@/lib/memory/activityLogger';

const BATCH_SIZE = 10;
const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

export interface SkillProfile {
  name?: string;
  skills: string[];
  experience?: string;
  bio?: string;
}

export interface RankJobsOptions {
  jobs: JobPosting[];
  profile: SkillProfile;
  memory?: SovereignMemory | null;
  batchId?: string;
  userId?: string;
  onProgress?: (progress: number, done: number, total: number) => void;
  onItem?: (job: RankedJob) => void;
}

export async function evaluateJobsBatch(opts: RankJobsOptions): Promise<{ rankedJobs: RankedJob[] }> {
  const { jobs, profile, memory, onProgress, onItem } = opts;
  if (jobs.length === 0) return { rankedJobs: [] };

  const key = getActiveApiKey();
  if (!key) throw new Error('No OpenAI API key configured.');
  const bankLine = opts.userId
    ? memoryBankToPrompt(await fetchMemoryBank(opts.userId).catch(() => []))
    : '';

  const chunks: JobPosting[][] = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) chunks.push(jobs.slice(i, i + BATCH_SIZE));

  const scoreMap = new Map<number, {
    score: number; why: string; fits: string[]; gaps: string[]; rec: RankedJob['recommendation'];
  }>();
  let done = 0;

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    const offset = c * BATCH_SIZE;
    try {
      const evals = await evaluateJobChunk(chunk, offset, profile, memory, key, bankLine);
      for (const ev of evals) {
        scoreMap.set(ev.jobIndex, {
          score: ev.compatibilityScore,
          why: sanitizeAiText(ev.whyApply),
          fits: sanitizeList(ev.keyFits),
          gaps: sanitizeList(ev.gaps),
          rec: ev.recommendation,
        });
      }
    } catch (err) {
      console.warn('[ProposalEngine] chunk failed', err);
      chunk.forEach((j, i) => {
        const idx = offset + i;
        if (!scoreMap.has(idx)) {
          scoreMap.set(idx, {
            score: heuristicJobScore(j, profile),
            why: sanitizeAiText(`${j.title} lines up with ${profile.skills.slice(0, 3).join(', ') || 'your core skills'}.`),
            fits: j.skills.slice(0, 3),
            gaps: [],
            rec: 'Worth a Look',
          });
        }
      });
    }
    done += chunk.length;
    onProgress?.(done / jobs.length, done, jobs.length);
  }

  const scored = jobs.map((j, i) => {
    const ev = scoreMap.get(i) ?? {
      score: heuristicJobScore(j, profile),
      why: sanitizeAiText(`${j.title} is a possible fit.`),
      fits: j.skills.slice(0, 3),
      gaps: [] as string[],
      rec: 'Worth a Look' as const,
    };
    return { job: j, ...ev };
  });
  scored.sort((a, b) => b.score - a.score);

  const rankedJobs: RankedJob[] = scored.map((item, rank) => {
    const ranked: RankedJob = {
      ...item.job,
      id: crypto.randomUUID(),
      batchId: opts.batchId ?? '',
      rankPosition: rank + 1,
      compatibilityScore: item.score,
      whyApply: item.why,
      keyFits: item.fits,
      gaps: item.gaps,
      recommendation: item.rec,
    };
    onItem?.(ranked);
    return ranked;
  });

  return { rankedJobs };
}

async function evaluateJobChunk(
  chunk: JobPosting[],
  offset: number,
  profile: SkillProfile,
  memory: SovereignMemory | null | undefined,
  key: string,
  bankLine = '',
) {
  const listings = chunk.map((j, i) =>
    `Job ${offset + i} (index ${offset + i}):
  Title: ${j.title}
  Client: ${j.clientName || 'N/A'}
  Budget: ${j.budget || 'N/A'}
  Skills: ${j.skills.join(', ')}
  Pain: ${j.painPoint || 'N/A'}
  Summary: ${j.summary.slice(0, 280)}`,
  ).join('\n\n');

  const res = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 2200,
      messages: [
        {
          role: 'system',
          content: `You rank freelance/agency job postings against one skill profile. JSON only.
Return { "evaluations": [{ "jobIndex": number, "compatibilityScore": 0-100, "whyApply": "2-3 sentences", "keyFits": [], "gaps": [], "recommendation": "Must Apply|Strong Match|Worth a Look|Skip" }] }
Write like a blunt senior freelancer. No filler.${memoryToPrompt(memory)}${bankLine}

Profile: ${profile.name || 'Freelancer'}
Skills: ${profile.skills.join(', ')}
Experience: ${profile.experience || 'N/A'}
Bio: ${(profile.bio || '').slice(0, 300)}`,
        },
        { role: 'user', content: `Rank these ${chunk.length} jobs:\n\n${listings}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const parsed = parseLLMJson(data.choices?.[0]?.message?.content ?? '') as { evaluations?: unknown[] } | null;
  if (!parsed?.evaluations) throw new Error('No evaluations');
  return BatchJobEvaluationResponseSchema.parse(parsed).evaluations;
}

function heuristicJobScore(job: JobPosting, profile: SkillProfile): number {
  const profileSet = new Set(profile.skills.map(s => s.toLowerCase()));
  const hits = job.skills.filter(s => profileSet.has(s.toLowerCase())).length;
  return Math.min(92, 35 + hits * 12 + (job.budget ? 5 : 0));
}

export async function persistJobBatch(opts: {
  userId: string;
  fileName: string;
  rankedJobs: RankedJob[];
}): Promise<string> {
  const { data: batch, error } = await supabase
    .from('batch_uploads')
    .insert({
      user_id: opts.userId,
      file_name: opts.fileName,
      file_type: 'job_feed',
      total_candidates: opts.rankedJobs.length,
      status: 'completed',
    })
    .select('id')
    .single();

  if (error || !batch) throw new Error(error?.message || 'Failed to save job batch');
  const batchId = batch.id as string;

  await supabase.from('job_proposals').insert(
    opts.rankedJobs.map(j => ({
      batch_id: batchId,
      user_id: opts.userId,
      job_title: j.title,
      client_name: j.clientName ?? null,
      compatibility_score: j.compatibilityScore,
      rank_position: j.rankPosition,
      why_apply_rationale: j.whyApply,
      generated_proposal: j.generatedProposal ?? null,
      auto_fill_payload: j.autoFillPayload ?? null,
      raw_data: { skills: j.skills, painPoint: j.painPoint, summary: j.summary },
    })),
  );

  void logActivity({
    userId: opts.userId,
    activityType: 'PROPOSAL_GENERATED',
    entityName: opts.fileName,
    entityId: batchId,
    summary: `${opts.rankedJobs.length} jobs ranked from ${opts.fileName}`,
    metadata: { count: opts.rankedJobs.length },
  });

  return batchId;
}
