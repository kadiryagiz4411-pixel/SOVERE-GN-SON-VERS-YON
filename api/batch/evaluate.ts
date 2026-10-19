/**
 * POST /api/batch/evaluate
 * Server-side multi-CV evaluation. Returns OPENAI_KEY_MISSING instead of crashing.
 */
import { preflight, json, readJsonBody } from '../_lib/cors';
import { getOpenAIApiKey, isOpenAIApiKeyConfigured, OPENAI_KEY_MISSING_PAYLOAD } from '../_lib/openai';

export const config = { maxDuration: 60 };

type Candidate = {
  fullName?: string;
  title?: string;
  email?: string;
  location?: string;
  experienceYears?: number;
  photoUrl?: string;
  summary?: string;
  skills?: string[];
  workHistory?: Array<{ role?: string; company?: string; period?: string }>;
  education?: string;
  rawContent?: string;
};

type RankedCandidate = Candidate & {
  id: string;
  batchId: string;
  rankPosition: number;
  overallScore: number;
  whyThisCandidate: string;
  keyStrengths: string[];
  missingSkills: string[];
  recommendation: 'Top Pick' | 'Strong Fit' | 'Moderate Fit' | 'Not Recommended';
};

const BATCH_SIZE = 10;

function heuristicScore(c: Candidate): number {
  let score = 40;
  score += Math.min(20, (c.experienceYears ?? 0) * 2);
  score += Math.min(20, (c.skills?.length ?? 0) * 2);
  if (c.education) score += 5;
  if ((c.workHistory?.length ?? 0) > 0) score += 10;
  if (c.summary && c.summary.length > 100) score += 5;
  return Math.min(95, score);
}

function parseEvaluations(raw: string): Array<{
  candidateIndex: number;
  overallScore: number;
  whyThisCandidate: string;
  keyStrengths: string[];
  missingSkills: string[];
  recommendation: RankedCandidate['recommendation'];
}> {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { evaluations?: unknown[] };
    if (!Array.isArray(parsed.evaluations)) return [];
    return parsed.evaluations.map((item) => {
      const ev = (item ?? {}) as Record<string, unknown>;
      const rec = String(ev.recommendation ?? 'Moderate Fit');
      const allowed: RankedCandidate['recommendation'][] = [
        'Top Pick', 'Strong Fit', 'Moderate Fit', 'Not Recommended',
      ];
      return {
        candidateIndex: Number(ev.candidateIndex ?? 0),
        overallScore: Math.max(0, Math.min(100, Number(ev.overallScore ?? 50))),
        whyThisCandidate: String(ev.whyThisCandidate ?? ''),
        keyStrengths: Array.isArray(ev.keyStrengths) ? ev.keyStrengths.map(String) : [],
        missingSkills: Array.isArray(ev.missingSkills) ? ev.missingSkills.map(String) : [],
        recommendation: (allowed.includes(rec as RankedCandidate['recommendation'])
          ? rec
          : 'Moderate Fit') as RankedCandidate['recommendation'],
      };
    });
  } catch {
    return [];
  }
}

async function evaluateChunk(
  chunk: Candidate[],
  offset: number,
  jobContext: string,
  apiKey: string,
) {
  const contextLine = jobContext
    ? `\nJob/Role Context: ${jobContext.slice(0, 500)}`
    : '\nEvaluate each candidate on general professional excellence, technical depth, and career progression.';

  const candidateSummaries = chunk.map((c, i) => {
    const work = c.workHistory?.map(w => `${w.role} @ ${w.company} (${w.period})`).join('; ') || 'Not specified';
    return `Candidate ${offset + i} (index ${offset + i}):
  Name: ${c.fullName || 'Unknown'}
  Title: ${c.title || 'Professional'}
  Experience: ${c.experienceYears ?? 0} years
  Skills: ${(c.skills ?? []).slice(0, 15).join(', ')}
  Summary: ${(c.summary ?? '').slice(0, 300) || 'N/A'}
  Work History: ${work}
  Education: ${c.education || 'N/A'}`;
  }).join('\n\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 2500,
      messages: [
        {
          role: 'system',
          content: `You are an expert senior HR director and talent evaluator.
Evaluate the provided candidates and return ONLY valid JSON. No markdown, no fences.${contextLine}

Return: { "evaluations": [ { "candidateIndex": number, "overallScore": 0-100, "whyThisCandidate": "2-3 sentences", "keyStrengths": ["..."], "missingSkills": ["..."], "recommendation": "Top Pick|Strong Fit|Moderate Fit|Not Recommended" } ] }`,
        },
        {
          role: 'user',
          content: `Evaluate these ${chunk.length} candidates:\n\n${candidateSummaries}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseEvaluations(data.choices?.[0]?.message?.content ?? '');
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = getOpenAIApiKey();
  if (!isOpenAIApiKeyConfigured(apiKey)) {
    return json(OPENAI_KEY_MISSING_PAYLOAD, 500);
  }

  try {
    const body = await readJsonBody<{ candidates?: Candidate[]; jobContext?: string; batchId?: string }>(req);
    const candidates = Array.isArray(body.candidates) ? body.candidates : [];
    if (candidates.length === 0) {
      return json({ error: 'candidates array is required' }, 400);
    }

    const jobContext = String(body.jobContext ?? '');
    const scoreMap = new Map<number, {
      score: number;
      why: string;
      strengths: string[];
      missing: string[];
      rec: RankedCandidate['recommendation'];
    }>();

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const chunk = candidates.slice(i, i + BATCH_SIZE);
      try {
        const evaluations = await evaluateChunk(chunk, i, jobContext, apiKey);
        for (const ev of evaluations) {
          scoreMap.set(ev.candidateIndex, {
            score: ev.overallScore,
            why: ev.whyThisCandidate,
            strengths: ev.keyStrengths,
            missing: ev.missingSkills,
            rec: ev.recommendation,
          });
        }
      } catch (err) {
        console.warn('[batch/evaluate] chunk failed', err);
        chunk.forEach((c, idx) => {
          const index = i + idx;
          if (!scoreMap.has(index)) {
            scoreMap.set(index, {
              score: heuristicScore(c),
              why: `${c.fullName || 'This candidate'} has ${c.experienceYears ?? 0} years of experience.`,
              strengths: (c.skills ?? []).slice(0, 3),
              missing: [],
              rec: 'Moderate Fit',
            });
          }
        });
      }
    }

    const scored = candidates.map((c, i) => {
      const ev = scoreMap.get(i) ?? {
        score: heuristicScore(c),
        why: `${c.fullName || 'This candidate'} brings ${c.experienceYears ?? 0} years of experience.`,
        strengths: (c.skills ?? []).slice(0, 3),
        missing: [] as string[],
        rec: 'Moderate Fit' as const,
      };
      return { candidate: c, ...ev };
    });
    scored.sort((a, b) => b.score - a.score);

    const rankedCandidates: RankedCandidate[] = scored.map((item, rank) => ({
      ...item.candidate,
      id: crypto.randomUUID(),
      batchId: body.batchId ?? '',
      rankPosition: rank + 1,
      overallScore: item.score,
      whyThisCandidate: item.why,
      keyStrengths: item.strengths,
      missingSkills: item.missing,
      recommendation: item.rec,
    }));

    return json({ rankedCandidates });
  } catch (err) {
    console.error('[batch/evaluate]', err);
    return json({
      error: 'EVALUATE_FAILED',
      message: err instanceof Error ? err.message : 'Batch evaluation failed',
    }, 500);
  }
}
