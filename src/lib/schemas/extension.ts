import { z } from 'zod';

export const AutoFillActionTypes = [
  'UPWORK_COVER_LETTER',
  'LINKEDIN_INMAIL',
  'GMAIL_OUTREACH',
] as const;

export const AutoFillPayloadSchema = z.object({
  recipientName: z.string(),
  subjectLine: z.string(),
  bodyText: z.string(),
  actionType: z.enum(AutoFillActionTypes),
});

export const ParseDomRequestSchema = z.object({
  text: z.string().optional(),
  html: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export type AutoFillPayload = z.infer<typeof AutoFillPayloadSchema>;
export type AutoFillActionType = typeof AutoFillActionTypes[number];
