/**
 * tokenTrimmer.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Strips boilerplate, HTML, and redundant noise from scraped job descriptions
 * and LinkedIn pages before they reach LLM prompts.
 *
 * Goal: reduce token count by 40–60% without losing signal.
 */

// ─── HTML / Markup Stripping ──────────────────────────────────────────────────

/** Remove all HTML tags and decode common entities. */
export function stripHtml(input: string): string {
  return input
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── Boilerplate Pattern Registry ────────────────────────────────────────────

const BOILERPLATE_PATTERNS: RegExp[] = [
  // Company history / about us sections
  /(?:about us|about the company|who we are|our story|company overview)[^\n]*[\s\S]{0,800}?(?=\n{2,}|\z)/gi,
  // Generic EEO / legal disclaimers
  /(?:equal opportunity|eeo|affirmative action|diversity|we do not discriminate)[^\n]*/gi,
  // Application process boilerplate
  /(?:how to apply|application process|next steps)[^\n]*/gi,
  // Benefits list noise (keep short, remove if > 5 consecutive lines)
  /(?:401k|dental|vision|life insurance|commuter|snacks|ping pong|foosball)[^\n]*/gi,
  // Cookie / privacy notices (from scraped pages)
  /(?:we use cookies|cookie policy|privacy notice|by using this site)[^\n]*/gi,
  // Navigation artifacts
  /(?:home\s*›|careers\s*›|jobs\s*›)[^\n]*/gi,
  // Share / social buttons text
  /(?:share this job|tweet|linkedin share|facebook share)[^\n]*/gi,
  // Salary range disclaimers
  /(?:salary ranges? (?:may vary|are approximate|subject to change))[^\n]*/gi,
];

/** Remove known boilerplate patterns from job text. */
export function removeBoilerplate(input: string): string {
  let result = input;
  for (const pattern of BOILERPLATE_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Repetition Collapse ──────────────────────────────────────────────────────

/** Collapse blocks of identical or near-identical lines (e.g. repeated bullet points). */
export function collapseRepetition(input: string): string {
  const lines = input.split('\n');
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of lines) {
    const normalized = line.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalized.length < 5) { out.push(line); continue; }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(line);
    }
  }
  return out.join('\n');
}

// ─── Whitespace Normalisation ─────────────────────────────────────────────────

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/ {3,}/g, '  ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Token Estimator (rough 4-chars-per-token heuristic) ─────────────────────

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export interface TrimResult {
  trimmed: string;
  originalChars: number;
  trimmedChars: number;
  estimatedTokensSaved: number;
  reductionPct: number;
}

/**
 * Full trim pipeline. Pass raw scraped HTML or plain text.
 * @param raw          Raw input (HTML or text)
 * @param maxChars     Hard cap on output length (default 6 000 chars ≈ ~1 500 tokens)
 */
export function trimForLLM(raw: string, maxChars = 6_000): TrimResult {
  const originalChars = raw.length;

  let result = raw;
  result = stripHtml(result);
  result = removeBoilerplate(result);
  result = collapseRepetition(result);
  result = normalizeWhitespace(result);

  // Hard cap — preserve the most signal-dense portion (top of the description)
  if (result.length > maxChars) {
    result = result.slice(0, maxChars) + '\n\n[...truncated for token efficiency]';
  }

  const trimmedChars = result.length;
  const estimatedTokensSaved = Math.floor((originalChars - trimmedChars) / 4);
  const reductionPct = originalChars > 0
    ? Math.round((1 - trimmedChars / originalChars) * 100)
    : 0;

  return { trimmed: result, originalChars, trimmedChars, estimatedTokensSaved, reductionPct };
}

// ─── Content Hash (for cache key) ────────────────────────────────────────────

/**
 * Generates a stable, deterministic string key for a normalised job description.
 * Used to look up the job_analysis_cache table.
 */
export async function contentHash(text: string): Promise<string> {
  const normalised = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const encoded = new TextEncoder().encode(normalised);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
