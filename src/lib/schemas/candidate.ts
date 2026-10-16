/**
 * candidate.ts — Zod schemas for single-file multi-CV batch evaluation.
 *
 * Used by the multi-CV parser to validate AI-structured outputs and by the
 * evaluator to validate ranking/evaluation responses from the LLM.
 */

import { z } from 'zod';

// ── Candidate (extracted from single document) ────────────────────────────────

export const WorkHistoryItemSchema = z.object({
  role:       z.string().default(''),
  company:    z.string().default(''),
  period:     z.string().default(''),
  highlights: z.array(z.string()).default([]),
});

export const CandidateSchema = z.object({
  fullName:        z.string().default('Unknown Candidate'),
  title:           z.string().default('Professional'),
  email:           z.string().optional(),
  location:        z.string().optional(),
  experienceYears: z.number().min(0).default(0),
  photoUrl:        z.string().optional(),
  summary:         z.string().default(''),
  skills:          z.array(z.string()).default([]),
  workHistory:     z.array(WorkHistoryItemSchema).default([]),
  education:       z.string().optional(),
  /** Raw extracted text for this candidate's section */
  rawContent:      z.string().default(''),
});

// ── Evaluation & Ranking ──────────────────────────────────────────────────────

export const RECOMMENDATION_VALUES = [
  'Top Pick',
  'Strong Fit',
  'Moderate Fit',
  'Not Recommended',
] as const;

export const EvaluationSchema = z.object({
  /** 0-based index into the candidates array */
  candidateIndex:   z.number(),
  overallScore:     z.number().min(0).max(100),
  /**
   * Concise 2–3 sentence executive rationale explaining WHY this candidate
   * received this score (skills match, experience depth, standout achievements).
   */
  whyThisCandidate: z.string().describe(
    'Concise 2-3 sentence executive rationale explaining why this candidate received this score and rank.',
  ),
  keyStrengths:  z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendation: z.enum(RECOMMENDATION_VALUES),
});

export const BatchEvaluationResponseSchema = z.object({
  evaluations: z.array(EvaluationSchema),
});

// ── Composed ranked candidate (parser output merged with evaluation) ───────────

export const RankedCandidateSchema = CandidateSchema.extend({
  id:               z.string(),
  batchId:          z.string(),
  rankPosition:     z.number(),
  overallScore:     z.number(),
  whyThisCandidate: z.string(),
  keyStrengths:     z.array(z.string()),
  missingSkills:    z.array(z.string()),
  recommendation:   z.enum(RECOMMENDATION_VALUES),
});

// ── TypeScript types (inferred) ───────────────────────────────────────────────

export type CandidateProfile    = z.infer<typeof CandidateSchema>;
export type WorkHistoryItem     = z.infer<typeof WorkHistoryItemSchema>;
export type CandidateEvaluation = z.infer<typeof EvaluationSchema>;
export type RankedCandidate     = z.infer<typeof RankedCandidateSchema>;
export type Recommendation      = typeof RECOMMENDATION_VALUES[number];
