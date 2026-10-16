/**
 * POST /api/extension/parse-dom
 * Self-contained (no Vite @ aliases) so Vercel Edge can bundle it.
 */
import { preflight, json } from '../_lib/cors';

export const config = { runtime: 'edge' };

const RESUME_PATTERN =
  /curriculum vitae|\bcv\b|work experience|professional experience|education|skills|languages|summary|references|certifications|linkedin\.com\/in/gi;
const JOB_PATTERN =
  /job description|responsibilities|qualifications|requirements|budget|hourly rate|fixed[- ]price|project scope|we are (?:looking|seeking|hiring)|apply now|must have|nice to have/gi;

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function detectIntent(text: string): { intent: 'CANDIDATE_POOL' | 'JOB_POSTINGS'; resumeHits: number; jobHits: number } {
  const sample = text.slice(0, 20_000);
  const resumeHits = (sample.match(RESUME_PATTERN) || []).length;
  const jobHits = (sample.match(JOB_PATTERN) || []).length;
  return {
    intent: resumeHits >= jobHits ? 'CANDIDATE_POOL' : 'JOB_POSTINGS',
    resumeHits,
    jobHits,
  };
}

function splitBlocks(text: string): string[] {
  const delims = [/^={3,}$/m, /^-{3,}$/m, /^(?:candidate|cv|job|posting|role)\s*#?\s*\d+/im];
  for (const pat of delims) {
    const parts = text.split(pat).map(p => p.trim()).filter(p => p.length >= 60);
    if (parts.length > 1) return parts;
  }
  return text.trim().length >= 60 ? [text.trim()] : [];
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json() as { text?: string; html?: string; sourceUrl?: string };
    const extracted = (body.text || (body.html ? stripTags(body.html) : '')).slice(0, 80_000);
    if (!extracted) return json({ error: 'text or html is required' }, 400);

    const { intent, resumeHits, jobHits } = detectIntent(extracted);
    const blocks = splitBlocks(extracted);
    const confidence = Math.min(0.99, 0.5 + Math.max(resumeHits, jobHits) / (resumeHits + jobHits + 2));

    if (intent === 'JOB_POSTINGS') {
      const jobs = blocks.map((raw, i) => {
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        return {
          title: lines[0]?.slice(0, 90) || `Job #${i + 1}`,
          summary: lines.slice(0, 6).join(' '),
          rawContent: raw.slice(0, 2000),
        };
      });
      return json({ intent, confidence, sourceUrl: body.sourceUrl, candidates: [], jobs });
    }

    const candidates = blocks.map((raw, i) => {
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      const email = raw.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] || '';
      return {
        fullName: lines[0]?.slice(0, 60) || `Candidate #${i + 1}`,
        title: lines[1]?.slice(0, 80) || '',
        email,
        summary: lines.slice(0, 5).join(' '),
        rawContent: raw.slice(0, 2000),
      };
    });

    return json({ intent, confidence, sourceUrl: body.sourceUrl, candidates, jobs: [] });
  } catch (err) {
    return json({ error: (err as Error).message || 'parse failed' }, 500);
  }
}
