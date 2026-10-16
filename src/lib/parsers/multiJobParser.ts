/**
 * multiJobParser.ts — Split a SINGLE file containing 1–50+ job postings.
 */

import { JobPostingSchema, type JobPosting } from '@/lib/schemas/job';
import { getActiveApiKey } from '@/lib/apiKeyResolver';
import { parseLLMJson } from '@/utils/llmJson';

const MIN_JOB_LENGTH = 60;
const MAX_AI_CHUNK = 7000;

export interface JobParseResult {
  jobs: JobPosting[];
  method: 'txt' | 'html' | 'ai-fallback';
  rawText: string;
}

export async function parseSingleFileToJobs(file: File): Promise<JobParseResult> {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  let raw = '';

  if (type.includes('html') || name.endsWith('.html') || name.endsWith('.htm')) {
    raw = htmlToText(await file.text());
  } else if (type.includes('pdf') || name.endsWith('.pdf')) {
    raw = await extractPdfishText(file);
  } else {
    raw = await file.text();
  }

  const parsed = splitJobs(raw);
  if (parsed.length > 1) return { jobs: parsed, method: 'txt', rawText: raw };

  const ai = await parseJobsViaAI(raw);
  if (ai.length > 0) return { jobs: ai, method: 'ai-fallback', rawText: raw };

  return {
    jobs: parsed.length ? parsed : [buildJob(raw, 0)],
    method: 'txt',
    rawText: raw,
  };
}

export function parseExtractedJobs(text: string): JobPosting[] {
  return splitJobs(text);
}

function splitJobs(text: string): JobPosting[] {
  const delim = [
    /^={3,}$/m,
    /^-{3,}$/m,
    /^(?:job|posting|opportunity|role)\s*#?\s*\d+/im,
    /^\*{3,}$/m,
  ];
  for (const pat of delim) {
    const parts = text.split(pat).map(p => p.trim()).filter(p => p.length >= MIN_JOB_LENGTH);
    if (parts.length > 1) return parts.map((p, i) => buildJob(p, i));
  }

  const heading = text.split(/(?=^(?:job title|position|we're hiring|we are hiring|looking for)\b)/gim)
    .map(p => p.trim())
    .filter(p => p.length >= MIN_JOB_LENGTH);
  if (heading.length > 1) return heading.map((p, i) => buildJob(p, i));

  if (text.trim().length >= MIN_JOB_LENGTH) return [buildJob(text, 0)];
  return [];
}

function buildJob(text: string, idx: number): JobPosting {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title =
    lines.find(l => /engineer|developer|designer|manager|analyst|writer|consultant|architect|specialist/i.test(l) && l.length < 90)
    || lines[0]
    || `Job #${idx + 1}`;

  const budget = text.match(/(?:budget|rate|salary)[:\s]+[^\n]{3,40}/i)?.[0];
  const client = text.match(/(?:client|company|posted by)[:\s]+([^\n]{2,40})/i)?.[1];

  return JobPostingSchema.parse({
    title: title.replace(/^(?:job title|position)[:\s]+/i, '').trim(),
    clientName: client?.trim(),
    budget: budget?.trim(),
    summary: lines.slice(0, 6).join(' '),
    skills: extractSkills(text),
    painPoint: guessPain(text),
    rawContent: text,
  });
}

const SKILLS = [
  'javascript','typescript','react','vue','node','python','java','go','rust',
  'sql','aws','gcp','azure','docker','kubernetes','figma','seo','wordpress',
  'shopify','next.js','django','flask','laravel','excel','salesforce',
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILLS.filter(k => lower.includes(k));
}

function guessPain(text: string): string {
  const m = text.match(/(?:looking for|need(?:s)?|problem|pain|challenge)[:\s]+([^\n]{20,160})/i);
  return m?.[1]?.trim() ?? '';
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s{3,}/g, '\n').trim();
}

async function extractPdfishText(file: File): Promise<string> {
  try {
    const raw = await file.text();
    const cleaned = raw.replace(/[^\x20-\x7E\n\r\t ]/g, ' ').replace(/\s{4,}/g, '\n').trim();
    if (cleaned.length > MIN_JOB_LENGTH) return cleaned;
  } catch { /* ignore */ }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let text = '';
  let run = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b < 127) run += String.fromCharCode(b);
    else {
      if (run.length >= 4) text += run + ' ';
      run = '';
    }
  }
  return (text + run).replace(/\s{3,}/g, '\n').trim();
}

async function parseJobsViaAI(text: string): Promise<JobPosting[]> {
  const key = getActiveApiKey();
  if (!key) return [];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_AI_CHUNK) chunks.push(text.slice(i, i + MAX_AI_CHUNK));

  const jobs: JobPosting[] = [];
  for (const chunk of chunks) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 1800,
          messages: [
            {
              role: 'system',
              content: `Extract job postings as JSON only: { "jobs": [{ "title", "clientName", "budget", "location", "skills": [], "summary", "painPoint" }] }`,
            },
            { role: 'user', content: chunk },
          ],
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = parseLLMJson(data.choices?.[0]?.message?.content ?? '') as { jobs?: unknown[] } | null;
      if (!parsed?.jobs) continue;
      for (const raw of parsed.jobs) {
        try {
          jobs.push(JobPostingSchema.parse({ ...(raw as object), rawContent: chunk.slice(0, 800) }));
        } catch { /* skip */ }
      }
    } catch { /* skip chunk */ }
  }
  return jobs;
}
