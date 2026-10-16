/**
 * job.ts — Zod schemas for multi-job proposal ranking.
 */

import { z } from 'zod';

export const JOB_FIT_VALUES = [
  'Must Apply',
  'Strong Match',
  'Worth a Look',
  'Skip',
] as const;

export const JobPostingSchema = z.object({
  title:          z.string().default('Untitled Role'),
  clientName:     z.string().optional(),
  budget:         z.string().optional(),
  location:       z.string().optional(),
  skills:         z.array(z.string()).default([]),
  summary:        z.string().default(''),
  painPoint:      z.string().optional(),
  rawContent:     z.string().default(''),
});

export const JobEvaluationSchema = z.object({
  jobIndex:           z.number(),
  compatibilityScore: z.number().min(0).max(100),
  whyApply:           z.string(),
  keyFits:            z.array(z.string()),
  gaps:               z.array(z.string()),
  recommendation:     z.enum(JOB_FIT_VALUES),
});

export const BatchJobEvaluationResponseSchema = z.object({
  evaluations: z.array(JobEvaluationSchema),
});

export const RankedJobSchema = JobPostingSchema.extend({
  id:                 z.string(),
  batchId:            z.string(),
  rankPosition:       z.number(),
  compatibilityScore: z.number(),
  whyApply:           z.string(),
  keyFits:            z.array(z.string()),
  gaps:               z.array(z.string()),
  recommendation:     z.enum(JOB_FIT_VALUES),
  generatedProposal:  z.string().optional(),
  autoFillPayload:    z.string().optional(),
});

export type JobPosting     = z.infer<typeof JobPostingSchema>;
export type JobEvaluation  = z.infer<typeof JobEvaluationSchema>;
export type RankedJob      = z.infer<typeof RankedJobSchema>;
export type JobFit         = typeof JOB_FIT_VALUES[number];
