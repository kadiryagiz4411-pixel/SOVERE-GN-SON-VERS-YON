/**
 * POST /api/extension/parse-dom
 * On-demand DOM analysis for the Sovereign Chrome side panel.
 * Vite/Vercel equivalent of app/api/extension/parse-dom/route.ts
 */
import { preflight, json, readJsonBody } from '../_lib/cors';
import { getOpenAIApiKey, isOpenAIApiKeyConfigured, OPENAI_KEY_MISSING_PAYLOAD } from '../_lib/openai';
import { sanitizeAiText } from '../_lib/sanitize';

export const config = { runtime: 'edge', maxDuration: 30 };

const RESUME_PATTERN =
  /curriculum vitae|\bcv\b|work experience|professional experience|education|skills|languages|summary|references|certifications|linkedin\.com\/in/gi;
const JOB_PATTERN =
  /job description|responsibilities|qualifications|requirements|budget|hourly rate|fixed[- ]price|project scope|we are (?:looking|seeking|hiring)|apply now|must have|nice to have/gi;

function detectFileIntent(text: string): 'CANDIDATE_POOL' | 'JOB_POSTINGS' {
  const sample = text.slice(0, 20_000);
  const resumeHits = (sample.match(RESUME_PATTERN) || []).length;
  const jobHits = (sample.match(JOB_PATTERN) || []).length;
  return resumeHits >= jobHits ? 'CANDIDATE_POOL' : 'JOB_POSTINGS';
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function completeJson(apiKey: string, system: string, user: string): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseJsonObject(data.choices?.[0]?.message?.content || '{}');
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await readJsonBody<{
      pageText?: string;
      pageTitle?: string;
      pageUrl?: string;
      userId?: string;
      text?: string;
      html?: string;
      sourceUrl?: string;
    }>(req);

    const pageText = String(body.pageText || body.text || '').trim();
    const pageTitle = String(body.pageTitle || '').trim();
    const pageUrl = String(body.pageUrl || body.sourceUrl || '').trim();

    if (!pageText || pageText.length < 50) {
      return json({ error: 'Page content is too short to analyze.' }, 400);
    }

    const intent = detectFileIntent(pageText);
    const apiKey = getOpenAIApiKey();

    if (intent === 'JOB_POSTINGS') {
      if (!isOpenAIApiKeyConfigured(apiKey)) {
        return json(OPENAI_KEY_MISSING_PAYLOAD, 500);
      }

      const parsed = await completeJson(
        apiKey,
        `You are Sovereign Proposal Engine. Analyze the job posting. Identify the primary technical pain point and generate a 3-sentence direct, human-toned cover letter. Do NOT use generic AI filler. Return JSON with keys: proposal, painPoint, score (0-100), title.`,
        `Job Title: ${pageTitle}\nURL: ${pageUrl}\nContent:\n${pageText.slice(0, 4000)}`,
      );

      const proposalText = sanitizeAiText(String(parsed.proposal || parsed.coverLetter || ''));
      const painPoint = sanitizeAiText(String(parsed.painPoint || 'Technical implementation required'));
      const compatibilityScore = Math.max(0, Math.min(100, Number(parsed.score ?? 88)));
      const title = sanitizeAiText(String(parsed.title || pageTitle || 'Job posting'));

      return json({
        type: 'JOB_PROPOSAL',
        intent: 'JOB_POSTINGS',
        title,
        url: pageUrl,
        painPoint,
        compatibilityScore,
        proposalText,
      });
    }

    let summary = 'Candidate parsed from DOM';
    let overallScore = 70;
    let whyThisCandidate = '';
    if (isOpenAIApiKeyConfigured(apiKey)) {
      const parsed = await completeJson(
        apiKey,
        `You are a blunt hiring manager. Evaluate this candidate profile from a public page. Return JSON: fullName, title, summary, overallScore (0-100), whyThisCandidate (2 sentences, no AI filler).`,
        `Page title: ${pageTitle}\nURL: ${pageUrl}\nContent:\n${pageText.slice(0, 4000)}`,
      );
      summary = sanitizeAiText(String(parsed.summary || summary));
      whyThisCandidate = sanitizeAiText(String(parsed.whyThisCandidate || ''));
      overallScore = Math.max(0, Math.min(100, Number(parsed.overallScore ?? 70)));
      return json({
        type: 'CANDIDATE_PROFILE',
        intent: 'CANDIDATE_POOL',
        title: sanitizeAiText(String(parsed.fullName || pageTitle || 'Candidate')),
        role: sanitizeAiText(String(parsed.title || '')),
        url: pageUrl,
        summary,
        overallScore,
        whyThisCandidate,
      });
    }

    return json({
      type: 'CANDIDATE_PROFILE',
      intent: 'CANDIDATE_POOL',
      title: pageTitle,
      url: pageUrl,
      summary,
      overallScore,
      whyThisCandidate,
    });
  } catch (err: unknown) {
    console.error('Extension Parse DOM Error:', err);
    return json({ error: err instanceof Error ? err.message : 'DOM analysis failed' }, 500);
  }
}
