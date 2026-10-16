/**
 * smartIntent.ts — Automatic file-intent detector.
 *
 * Users never pick a module before upload. Structural keyword density
 * routes a single file to Candidate Evaluation or Job Proposal generation.
 */

export type DetectedIntent = 'CANDIDATE_POOL' | 'JOB_POSTINGS';

const RESUME_PATTERN =
  /curriculum vitae|\bcv\b|work experience|professional experience|education|skills|languages|summary|references|certifications|linkedin\.com\/in/gi;

const JOB_PATTERN =
  /job description|responsibilities|qualifications|requirements|budget|hourly rate|fixed[- ]price|project scope|we are (?:looking|seeking|hiring)|apply now|to apply|client needs|must have|nice to have/gi;

export interface IntentResult {
  intent: DetectedIntent;
  resumeHits: number;
  jobHits: number;
  confidence: number;
}

export function analyzeFileIntent(extractedText: string): IntentResult {
  const sample = (extractedText || '').slice(0, 20_000);
  const resumeHits = (sample.match(RESUME_PATTERN) || []).length;
  const jobHits = (sample.match(JOB_PATTERN) || []).length;
  const total = resumeHits + jobHits;
  const intent: DetectedIntent = resumeHits >= jobHits ? 'CANDIDATE_POOL' : 'JOB_POSTINGS';
  const winner = Math.max(resumeHits, jobHits);
  return {
    intent,
    resumeHits,
    jobHits,
    confidence: total === 0 ? 0.4 : Math.min(0.99, 0.5 + winner / (total + 2)),
  };
}

export async function detectFileIntent(extractedText: string): Promise<DetectedIntent> {
  return analyzeFileIntent(extractedText).intent;
}
