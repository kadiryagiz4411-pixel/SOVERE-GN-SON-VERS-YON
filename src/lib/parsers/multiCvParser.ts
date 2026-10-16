/**
 * multiCvParser.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts a SINGLE File (HTML, TXT, or PDF containing 1–200+ CVs inside it)
 * and returns an array of CandidateProfile objects.
 *
 * Parsing strategy (priority order):
 *  1. HTML  → DOMParser + structured class selectors (.cv-page, .candidate-card, <hr>)
 *  2. TXT   → Regex boundary detection (Candidate #N, ====, —————, email-as-anchor, etc.)
 *  3. PDF   → Extract text via FileReader → treat as TXT
 *  4. AI Fallback → Stream chunks to GPT-4o-mini structured extraction
 */

import { CandidateSchema, type CandidateProfile } from '@/lib/schemas/candidate';
import { getActiveApiKey } from '@/lib/apiKeyResolver';
import { parseLLMJson } from '@/utils/llmJson';

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_AI_CHUNK = 7000;   // ~5k tokens, safe for gpt-4o-mini context
const MIN_CANDIDATE_LENGTH = 80;  // ignore segments shorter than this

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ParseResult {
  candidates: CandidateProfile[];
  method: 'html' | 'txt' | 'pdf' | 'ai-fallback';
  rawText?: string;
}

/**
 * Primary entry point.  Pass the raw File from an <input> or drop event.
 */
export async function parseSingleFileToCandidates(file: File): Promise<ParseResult> {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  // ── HTML ────────────────────────────────────────────────────────────────────
  if (type.includes('html') || name.endsWith('.html') || name.endsWith('.htm')) {
    const html = await file.text();
    const candidates = parseHtml(html);
    if (candidates.length > 0) return { candidates, method: 'html' };
    // fall through to AI if HTML had no matching structure
    const raw = htmlToPlainText(html);
    const aiCandidates = await parseViaAI(raw);
    return { candidates: aiCandidates, method: 'ai-fallback', rawText: raw };
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    const raw = await extractPdfText(file);
    const parsed = parseTxt(raw);
    if (parsed.length > 0) return { candidates: parsed, method: 'pdf', rawText: raw };
    const aiCandidates = await parseViaAI(raw);
    return { candidates: aiCandidates, method: 'ai-fallback', rawText: raw };
  }

  // ── TXT / CSV / anything else ───────────────────────────────────────────────
  const raw = await file.text();
  const parsed = parseTxt(raw);
  if (parsed.length > 0) return { candidates: parsed, method: 'txt', rawText: raw };
  const aiCandidates = await parseViaAI(raw);
  return { candidates: aiCandidates, method: 'ai-fallback', rawText: raw };
}

// ─── HTML Parser ──────────────────────────────────────────────────────────────

function parseHtml(html: string): CandidateProfile[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const results: CandidateProfile[] = [];

  // Strategy A: named containers (.cv-page, .candidate-card, .cv-entry, [data-cv])
  const selectors = ['.cv-page', '.candidate-card', '.cv-entry', '.resume', '[data-cv]', 'article'];
  for (const sel of selectors) {
    const els = doc.querySelectorAll(sel);
    if (els.length > 0) {
      els.forEach((el, i) => {
        const candidate = extractFromEl(el as HTMLElement, i);
        if (candidate.rawContent.length >= MIN_CANDIDATE_LENGTH) results.push(candidate);
      });
      if (results.length > 0) return results;
    }
  }

  // Strategy B: split by <hr> elements
  const hrs = doc.querySelectorAll('hr');
  if (hrs.length > 0) {
    const sections: string[] = [];
    let cursor = doc.body as Element;
    let current = '';
    cursor.childNodes.forEach((node) => {
      if ((node as Element).tagName === 'HR') {
        sections.push(current);
        current = '';
      } else {
        current += (node as HTMLElement).outerHTML ?? (node as Text).textContent ?? '';
      }
    });
    sections.push(current);
    sections.forEach((sec, i) => {
      if (sec.trim().length < MIN_CANDIDATE_LENGTH) return;
      const div = document.createElement('div');
      div.innerHTML = sec;
      results.push(extractFromEl(div, i));
    });
    if (results.length > 0) return results;
  }

  return [];
}

function extractFromEl(el: HTMLElement, idx: number): CandidateProfile {
  const text = el.textContent ?? '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const fullName =
    el.querySelector('.candidate-name, .name, h1, h2, [data-name]')?.textContent?.trim()
    || lines[0]
    || `Candidate #${idx + 1}`;

  const title =
    el.querySelector('.candidate-title, .title, .role, h3, [data-title]')?.textContent?.trim()
    || lines[1]
    || '';

  const contactText = el.querySelector('.contact-info, .contact, .contacts')?.textContent ?? text;
  const email = contactText.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];

  const skills: string[] = [];
  el.querySelectorAll('.skill-badge, .skill, .tag, .badge').forEach(b => {
    const t = b.textContent?.trim();
    if (t) skills.push(t);
  });

  const summary = el.querySelector('.summary, .summary-text, .bio, .about, p')?.textContent?.trim() ?? '';

  return CandidateSchema.parse({
    fullName,
    title,
    email,
    summary,
    skills: skills.length > 0 ? skills : extractSkillsFromText(text),
    rawContent: text,
    experienceYears: guessYearsOfExperience(text),
    location: guessLocation(text),
  });
}

// ─── TXT Parser ───────────────────────────────────────────────────────────────

/**
 * Splits plain text into candidate segments using common boundary patterns:
 * "Candidate #N", "CV #N", "======", "————", consecutive blank lines + Name/Email anchor.
 */
export function parseExtractedText(text: string): CandidateProfile[] {
  return parseTxt(text);
}

function parseTxt(text: string): CandidateProfile[] {
  // Try ordered delimiters
  const delimPatterns = [
    /^-{3,}$/m,
    /^={3,}$/m,
    /^_{3,}$/m,
    /^#{3,}$/m,
    /^(?:candidate|cv|applicant|resume)\s*#?\s*\d+/im,
    /^\*{3,}$/m,
  ];

  for (const pat of delimPatterns) {
    const parts = text.split(pat).map(p => p.trim()).filter(p => p.length >= MIN_CANDIDATE_LENGTH);
    if (parts.length > 1) {
      return parts.map((part, i) => buildCandidateFromText(part, i));
    }
  }

  // Heuristic: split by double blank line + looks like a name/email starting line
  const emailAnchorPattern = /(?:^|\n{2,})(?=[A-Z][a-z]+ [A-Z][a-z]+\s*\n|[\w.+-]+@[\w.-]+\.\w+)/g;
  const anchorParts = text.split(emailAnchorPattern).map(p => p.trim()).filter(p => p.length >= MIN_CANDIDATE_LENGTH);
  if (anchorParts.length > 1) {
    return anchorParts.map((part, i) => buildCandidateFromText(part, i));
  }

  // Last resort: every 80+ line block as a single candidate
  if (text.trim().length >= MIN_CANDIDATE_LENGTH) {
    return [buildCandidateFromText(text, 0)];
  }

  return [];
}

function buildCandidateFromText(text: string, idx: number): CandidateProfile {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Name: first non-email, non-numeric line that looks like a proper noun
  const nameLine = lines.find(l => /^[A-Z][a-z]/.test(l) && !l.includes('@') && l.length < 60)
    ?? lines[0]
    ?? `Candidate #${idx + 1}`;

  const email = text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];
  const title = lines.find(l => /engineer|developer|designer|manager|analyst|director|lead|specialist|consultant|architect|scientist|writer|marketer|officer/i.test(l) && l.length < 80) ?? '';

  return CandidateSchema.parse({
    fullName: nameLine,
    title,
    email,
    summary: lines.slice(0, 5).join(' '),
    skills: extractSkillsFromText(text),
    rawContent: text,
    experienceYears: guessYearsOfExperience(text),
    location: guessLocation(text),
    education: guessEducation(text),
    workHistory: extractWorkHistory(text),
  });
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  try {
    // Works for text-based (non-scanned) PDFs
    const raw = await file.text();
    const cleaned = raw
      .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u024F\u0400-\u04FF\n\r\t ]/g, ' ')
      .replace(/\s{4,}/g, '\n')
      .replace(/\n{4,}/g, '\n\n')
      .trim();
    if (cleaned.length > MIN_CANDIDATE_LENGTH) return cleaned;
  } catch { /* fall through */ }

  // ArrayBuffer fallback – extract printable ASCII from binary PDF stream
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let text = '';
    let run = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 32 && b < 127) {
        run += String.fromCharCode(b);
      } else {
        if (run.length >= 4) text += run + ' ';
        run = '';
      }
    }
    if (run.length >= 4) text += run;
    return text.replace(/\s{3,}/g, '\n').trim();
  } catch {
    return '';
  }
}

// ─── AI Fallback ──────────────────────────────────────────────────────────────

async function parseViaAI(text: string): Promise<CandidateProfile[]> {
  const key = getActiveApiKey();
  if (!key) return [];

  const chunks = splitIntoChunks(text, MAX_AI_CHUNK);
  const allCandidates: CandidateProfile[] = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 2000,
          messages: [
            {
              role: 'system',
              content: `You are an expert CV parser. Extract structured candidate profiles from the provided text.
Return ONLY valid JSON — no markdown fences. Return an object: { "candidates": [...] }
Each candidate object must have these fields:
  fullName (string), title (string), email (string|null), location (string|null),
  experienceYears (number), summary (string), skills (string[]),
  education (string|null), workHistory (array of { role, company, period, highlights[] })`,
            },
            {
              role: 'user',
              content: `Extract all candidates from this text:\n\n${chunk}`,
            },
          ],
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      const parsed = parseLLMJson(content) as { candidates?: unknown[] } | null;

      if (parsed?.candidates && Array.isArray(parsed.candidates)) {
        for (const raw of parsed.candidates) {
          try {
            const candidate = CandidateSchema.parse({ ...(raw as object), rawContent: String((raw as Record<string, unknown>).rawContent ?? chunk.slice(0, 500)) });
            allCandidates.push(candidate);
          } catch { /* skip invalid */ }
        }
      }
    } catch { /* skip failing chunk */ }
  }

  return allCandidates;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function splitIntoChunks(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s{3,}/g, '\n').trim();
}

const SKILL_KEYWORDS = [
  'javascript','typescript','react','vue','angular','node','python','java','c++','c#','go','rust',
  'sql','nosql','mongodb','postgresql','mysql','redis','graphql','rest','api','aws','gcp','azure',
  'docker','kubernetes','ci/cd','git','linux','agile','scrum','figma','sketch','ux','ui','seo',
  'machine learning','deep learning','nlp','tensorflow','pytorch','keras','pandas','numpy',
  'html','css','sass','tailwind','bootstrap','next.js','nuxt','django','flask','laravel','spring',
  'excel','powerbi','tableau','looker','salesforce','hubspot','jira','confluence','notion',
];

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter(k => lower.includes(k));
}

function guessYearsOfExperience(text: string): number {
  const match = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
  if (match) return Math.min(40, parseInt(match[1]));

  // Count year ranges like 2018–2023
  const yearRanges = [...text.matchAll(/\b(20\d\d|19\d\d)\s*[-–—]\s*(20\d\d|19\d\d|present|now|current)\b/gi)];
  if (yearRanges.length > 0) {
    const currentYear = new Date().getFullYear();
    let total = 0;
    for (const m of yearRanges) {
      const start = parseInt(m[1]);
      const endStr = m[2];
      const end = /present|now|current/i.test(endStr) ? currentYear : parseInt(endStr);
      total += Math.max(0, end - start);
    }
    return Math.min(40, Math.round(total));
  }

  return 0;
}

const LOCATION_PATTERNS = [
  /(?:location|based in|city|address)[:\s]+([A-Z][a-z]+(?:,\s*[A-Z]{2,})?)/i,
  /\b([A-Z][a-z]+ (?:City|Town)|New York|San Francisco|London|Berlin|Istanbul|Remote)\b/,
];

function guessLocation(text: string): string {
  for (const pat of LOCATION_PATTERNS) {
    const m = text.match(pat);
    if (m) return m[1];
  }
  return '';
}

function guessEducation(text: string): string {
  const m = text.match(/(?:education|degree|university|bachelor|master|phd|mba)[^\n]{0,120}/i);
  return m?.[0]?.trim() ?? '';
}

function extractWorkHistory(text: string): Array<{ role: string; company: string; period: string; highlights: string[] }> {
  const results: Array<{ role: string; company: string; period: string; highlights: string[] }> = [];
  // Pattern: ROLE at/@ COMPANY | YEAR–YEAR
  const pattern = /([A-Z][^@\n]{3,50}?)\s+(?:at|@)\s+([A-Z][^,\n]{2,50})[,\s]+(\d{4}\s*[-–]\s*(?:\d{4}|present))/gi;
  for (const m of text.matchAll(pattern)) {
    results.push({ role: m[1].trim(), company: m[2].trim(), period: m[3].trim(), highlights: [] });
    if (results.length >= 5) break;
  }
  return results;
}
