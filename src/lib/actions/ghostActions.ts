/**
 * ghostActions.ts — One-click outreach, interview invite, and auto-fill payloads.
 * Vite SPA equivalent of POST /api/actions/outreach and /api/actions/auto-fill-payload.
 */

import { getActiveApiKey } from '@/lib/apiKeyResolver';
import { getOpenAIApiKey, isOpenAIApiKeyConfigured } from '@/lib/ai/openai';
import { parseLLMJson } from '@/utils/llmJson';
import { sanitizeAiText } from '@/lib/ai/sanitizer';
import { memoryToPrompt, type SovereignMemory } from '@/lib/memory/contextEngine';
import type { RankedCandidate } from '@/lib/schemas/candidate';
import type { RankedJob, JobPosting } from '@/lib/schemas/job';
import type { SkillProfile } from '@/lib/ai/proposalEngine';

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

async function chat(system: string, user: string, maxTokens = 400): Promise<string> {
  const key = getActiveApiKey() || getOpenAIApiKey();
  if (!isOpenAIApiKeyConfigured(key)) throw new Error('OPENAI_KEY_MISSING: OpenAI API Key is not configured in environment variables. Please check Vercel settings and redeploy.');
  const res = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? '');
}

export interface OutreachResult {
  subject: string;
  body: string;
}

/** Personalized interview invitation referencing a real project from the CV. */
export async function generateOutreachEmail(
  candidate: RankedCandidate,
  memory?: SovereignMemory | null,
): Promise<OutreachResult> {
  const project = candidate.workHistory?.[0];
  const raw = await chat(
    `Write a short interview invite email. Sound like a busy hiring manager.
3-6 sentences. Reference one real project or skill. No fluff.${memoryToPrompt(memory)}
Return JSON: { "subject": "...", "body": "..." }`,
    `Candidate: ${candidate.fullName}
Title: ${candidate.title}
Skills: ${candidate.skills.slice(0, 8).join(', ')}
Recent work: ${project ? `${project.role} at ${project.company} (${project.period})` : candidate.summary.slice(0, 220)}
Score: ${candidate.overallScore}
Why: ${candidate.whyThisCandidate}`,
    350,
  );

  try {
    const parsed = parseLLMJson<{ subject?: string; body?: string }>(raw);
    return {
      subject: sanitizeAiText(parsed.subject || `Quick chat — ${candidate.fullName}`),
      body: sanitizeAiText(parsed.body || fallbackInvite(candidate)),
    };
  } catch {
    return {
      subject: `Quick chat — ${candidate.fullName}`,
      body: sanitizeAiText(fallbackInvite(candidate)),
    };
  }
}

function fallbackInvite(c: RankedCandidate): string {
  const project = c.workHistory?.[0];
  const hook = project
    ? `Your ${project.role} work at ${project.company} stood out.`
    : `Your ${c.skills.slice(0, 2).join(' and ') || c.title} background stood out.`;
  return `Hi ${c.fullName.split(' ')[0]},\n\n${hook} We'd like a 20-minute interview this week. Reply with two times that work.\n\nThanks`;
}

/** Direct 3-sentence solution proposal + paste-ready auto-fill payload. */
export async function generateAutoFillPayload(
  job: RankedJob | JobPosting,
  profile: SkillProfile,
  memory?: SovereignMemory | null,
): Promise<{ proposal: string; payload: string }> {
  const ranked = job as RankedJob;
  const raw = await chat(
    `You are a freelancer writing a 3-sentence technical proposal.
Sentence 1: name the client's main pain.
Sentence 2: say exactly how you solve it (tool/method).
Sentence 3: one proof point from the profile.
No greetings. No "I am writing". JSON: { "proposal": "...", "payload": "paste-ready 3 sentences" }${memoryToPrompt(memory)}`,
    `Job: ${job.title}
Client: ${('clientName' in job && job.clientName) || 'Client'}
Pain: ${job.painPoint || job.summary}
Skills wanted: ${job.skills.join(', ')}
My skills: ${profile.skills.join(', ')}
My bio: ${(profile.bio || profile.experience || '').slice(0, 400)}
Why apply: ${ranked.whyApply || ''}`,
    420,
  );

  try {
    const parsed = parseLLMJson<{ proposal?: string; payload?: string }>(raw);
    const proposal = sanitizeAiText(parsed.proposal || parsed.payload || fallbackProposal(job, profile));
    return { proposal, payload: sanitizeAiText(parsed.payload || proposal) };
  } catch {
    const proposal = sanitizeAiText(fallbackProposal(job, profile));
    return { proposal, payload: proposal };
  }
}

function fallbackProposal(job: JobPosting, profile: SkillProfile): string {
  const pain = job.painPoint || job.title;
  const skill = profile.skills[0] || job.skills[0] || 'the stack you listed';
  return `${pain} is the blocker. I would ship this with ${skill} in a first pass this week. I have done similar work across ${profile.skills.slice(0, 3).join(', ') || 'this stack'}.`;
}

export async function generateRejectionNote(candidate: RankedCandidate): Promise<string> {
  const raw = await chat(
    'Write a 2-sentence rejection that is respectful and specific. No "unfortunately at this time" cliches. Plain text only.',
    `${candidate.fullName} — ${candidate.title}. Gaps: ${candidate.missingSkills.slice(0, 3).join(', ') || 'not the closest match'}.`,
    180,
  );
  return sanitizeAiText(raw) || `Thanks ${candidate.fullName.split(' ')[0]} — we are moving forward with people whose recent work maps closer to this brief.`;
}
