/**
 * Shared parse-dom core used by the Chrome extension side panel
 * and the Vercel /api/extension/parse-dom handler (via relative import).
 */

import { analyzeFileIntent, type DetectedIntent } from '@/lib/router/smartIntent';
import { parseExtractedText } from '@/lib/parsers/multiCvParser';
import { parseExtractedJobs } from '@/lib/parsers/multiJobParser';
import type { CandidateProfile } from '@/lib/schemas/candidate';
import type { JobPosting } from '@/lib/schemas/job';

export interface ParseDomResult {
  intent: DetectedIntent;
  confidence: number;
  sourceUrl?: string;
  candidates: CandidateProfile[];
  jobs: JobPosting[];
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function parseDomPayload(input: { text?: string; html?: string; sourceUrl?: string }): ParseDomResult {
  const extracted = (input.text || (input.html ? stripTags(input.html) : '')).slice(0, 80_000);
  const analysis = analyzeFileIntent(extracted);

  if (analysis.intent === 'JOB_POSTINGS') {
    return {
      intent: analysis.intent,
      confidence: analysis.confidence,
      sourceUrl: input.sourceUrl,
      candidates: [],
      jobs: parseExtractedJobs(extracted),
    };
  }

  return {
    intent: analysis.intent,
    confidence: analysis.confidence,
    sourceUrl: input.sourceUrl,
    candidates: parseExtractedText(extracted),
    jobs: [],
  };
}
