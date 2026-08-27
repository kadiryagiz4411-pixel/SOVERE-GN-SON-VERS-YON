/**
 * batchProposalService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Parallel batch proposal generation engine for B2B / Agency users.
 *
 * BYOK (Bring Your Own Key) logic:
 *   1. Fetch `custom_openai_key` from the user's Supabase profile.
 *   2. If present  → use it directly; skip internal credit deduction.
 *   3. If absent   → deduct COST_PER_ACTION (20) credits per item from the
 *                    Sovereign credit pool before generation.
 *                    Block the entire batch early if total cost > remaining credits.
 *
 * Concurrency: up to MAX_PARALLEL items run simultaneously to respect rate limits.
 */

import { supabase } from '@/integrations/supabase/client';
import { COST_PER_ACTION } from '@/lib/credits';
import { hasEnoughCredits, deductCredit } from '@/services/creditService';
import { fetchProfileByAuthId } from '@/lib/profileQuery';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ITEMS    = 20;
const MAX_PARALLEL = 4;
const OPENAI_URL   = 'https://api.openai.com/v1/chat/completions';
const MODEL        = 'gpt-4o-mini';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgencyProfile {
  /** Agency / company name shown in prompts */
  name: string;
  /** Tech stack / service offerings */
  techStack: string;
  /** Notable case studies or portfolio highlights */
  caseStudies: string;
  /** Portfolio / website URL */
  portfolioUrl?: string;
}

export type JobStatus = 'pending' | 'running' | 'done' | 'error';

export interface BatchJob {
  id: string;
  index: number;
  jobDescription: string;
  status: JobStatus;
  /** Generated proposal text (3 paragraphs) */
  proposal?: string;
  /** Match score 0–100 */
  matchScore?: number;
  /** Core client problem extracted by the LLM */
  clientProblem?: string;
  errorMessage?: string;
}

export interface BatchResult {
  jobs: BatchJob[];
  /** True when BYOK was used for this batch */
  usedByok: boolean;
  /** Credits deducted (0 when BYOK) */
  creditsUsed: number;
}

export interface BatchOptions {
  userId: string;
  jobDescriptions: string[];
  agencyProfile: AgencyProfile;
  /** Called each time a job's status changes — drives the live queue UI */
  onProgress?: (jobs: BatchJob[]) => void;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function resolveApiKey(userId: string): Promise<{ key: string; isByok: boolean }> {
  try {
    const { data } = await fetchProfileByAuthId<{ custom_openai_key?: string }>(
      userId,
      'custom_openai_key',
    );
    const byokKey = (data as { custom_openai_key?: string } | null)?.custom_openai_key?.trim();
    if (byokKey) return { key: byokKey, isByok: true };
  } catch {
    // fall through to platform key
  }

  const platformKey =
    (typeof import.meta !== 'undefined'
      ? (import.meta.env as Record<string, string>).VITE_OPENAI_API_KEY
      : '') || '';
  return { key: platformKey, isByok: false };
}

function buildPrompt(jd: string, agency: AgencyProfile): string {
  return `You are a senior B2B proposal writer for "${agency.name}".

Agency capabilities:
- Tech stack / services: ${agency.techStack || 'Full-stack development, AI/ML, DevOps'}
- Portfolio highlights: ${agency.caseStudies || 'Multiple enterprise clients delivered on time and on budget'}
${agency.portfolioUrl ? `- Portfolio URL: ${agency.portfolioUrl}` : ''}

Job Description / Client Brief:
"""
${jd.slice(0, 3000)}
"""

Respond ONLY with valid JSON in this exact schema:
{
  "clientProblem": "<one sentence: the client's core problem or goal>",
  "matchScore": <integer 0-100 representing how well this agency fits>,
  "proposal": "<3-paragraph high-converting proposal pitch that maps agency strengths to the client's problem. Each paragraph separated by \\n\\n.>"
}`;
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
): Promise<{ clientProblem: string; matchScore: number; proposal: string }> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(raw) as { clientProblem: string; matchScore: number; proposal: string };
}

// ─── Core async pool ──────────────────────────────────────────────────────────

async function runPool<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const taskIdx = idx++;
      results[taskIdx] = await tasks[taskIdx]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs the full batch proposal pipeline.
 * Throws a user-readable string if credits are insufficient before generation starts.
 */
export async function runBatchProposals(options: BatchOptions): Promise<BatchResult> {
  const { userId, jobDescriptions, agencyProfile, onProgress } = options;

  const jds = jobDescriptions
    .map((j) => j.trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS);

  if (jds.length === 0) throw new Error('Please provide at least one job description.');

  // 1. Resolve API key + BYOK status
  const { key: apiKey, isByok } = await resolveApiKey(userId);
  if (!apiKey) {
    throw new Error(
      'No OpenAI API key configured. Add your key in Profile → Settings or contact support.',
    );
  }

  // 2. Credit pre-flight check (skip when BYOK)
  if (!isByok) {
    const totalCost = jds.length * COST_PER_ACTION;
    const enough = await hasEnoughCredits(userId, totalCost);
    if (!enough) {
      throw new Error(
        `Insufficient credits. Generating ${jds.length} proposals costs ${totalCost} credits. ` +
          `Please top up or use your own OpenAI API key (BYOK) to bypass this limit.`,
      );
    }
  }

  // 3. Initialise job queue
  let jobs: BatchJob[] = jds.map((jd, i) => ({
    id: `job-${i}`,
    index: i,
    jobDescription: jd,
    status: 'pending',
  }));
  onProgress?.(jobs);

  let creditsUsed = 0;

  // 4. Build tasks
  const tasks = jds.map((jd, i) => async (): Promise<void> => {
    // Mark running
    jobs = jobs.map((j) => (j.index === i ? { ...j, status: 'running' } : j));
    onProgress?.([...jobs]);

    try {
      const prompt = buildPrompt(jd, agencyProfile);
      const result = await callOpenAI(prompt, apiKey);

      // Validate payload before touching credits
      if (!result.proposal) {
        throw new Error('OpenAI returned an empty proposal. No credits were deducted.');
      }

      // Deduct credit ONLY after receiving a valid payload (platform key only)
      if (!isByok) {
        const deduct = await deductCredit(userId, COST_PER_ACTION);
        if (!deduct.success) {
          throw new Error('Credit deduction failed — please retry.');
        }
        creditsUsed += COST_PER_ACTION;
      }

      jobs = jobs.map((j) =>
        j.index === i
          ? {
              ...j,
              status: 'done',
              proposal: result.proposal ?? '',
              matchScore: Math.min(100, Math.max(0, Math.round(result.matchScore ?? 0))),
              clientProblem: result.clientProblem ?? '',
            }
          : j,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      jobs = jobs.map((j) =>
        j.index === i ? { ...j, status: 'error', errorMessage: msg } : j,
      );
    }

    onProgress?.([...jobs]);
  });

  // 5. Run with concurrency limit
  await runPool(tasks, MAX_PARALLEL);

  return { jobs, usedByok: isByok, creditsUsed };
}

// ─── CSV export helper ────────────────────────────────────────────────────────

export function exportBatchToCsv(jobs: BatchJob[]): string {
  const header = ['#', 'Status', 'Match Score', 'Client Problem', 'Proposal'].join(',');
  const rows = jobs.map((j) => {
    const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    return [
      j.index + 1,
      j.status,
      j.matchScore ?? '',
      esc(j.clientProblem ?? ''),
      esc(j.proposal ?? j.errorMessage ?? ''),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export function downloadBatchCsv(jobs: BatchJob[], filename = 'batch-proposals.csv'): void {
  const csv = exportBatchToCsv(jobs);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
