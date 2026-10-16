/**
 * POST /api/extension/auto-fill-payload
 */
import { preflight, json } from '../_lib/cors';

export const config = { runtime: 'edge' };

const FORBIDDEN = [
  /in today's fast-paced world[,.]?\s*/gi,
  /i am writing to express my (?:enthusiasm|interest)[,.]?\s*/gi,
  /please (?:do not|don't) hesitate to (?:reach out|contact me)[,.]?\s*/gi,
  /\bleverage(?:s|d|ing)?\b/gi,
  /\bseamlessly\b/gi,
  /game[- ]changer/gi,
  /\bsynerg(?:y|ies|istic)\b/gi,
];

function sanitize(raw: string): string {
  let cleaned = raw;
  for (const p of FORBIDDEN) cleaned = cleaned.replace(p, ' ');
  return cleaned.replace(/\s+/g, ' ').replace(/ +\./g, '.').trim();
}

type ActionType = 'UPWORK_COVER_LETTER' | 'LINKEDIN_INMAIL' | 'GMAIL_OUTREACH';

function inferAction(sourceUrl = ''): ActionType {
  const u = sourceUrl.toLowerCase();
  if (u.includes('upwork')) return 'UPWORK_COVER_LETTER';
  if (u.includes('linkedin')) return 'LINKEDIN_INMAIL';
  return 'GMAIL_OUTREACH';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json() as {
      actionType?: ActionType;
      sourceUrl?: string;
      recipientName?: string;
      jobTitle?: string;
      painPoint?: string;
      skills?: string[];
      calendlyUrl?: string;
      draft?: string;
    };

    const actionType = body.actionType || inferAction(body.sourceUrl);
    const name = body.recipientName || 'there';
    const title = body.jobTitle || 'this role';
    const pain = body.painPoint || title;
    const skill = (body.skills && body.skills[0]) || 'the stack you listed';
    const calendly = body.calendlyUrl ? `\n\nBook a time: ${body.calendlyUrl}` : '';

    const rawBody = body.draft
      || (actionType === 'UPWORK_COVER_LETTER'
        ? `${pain} is the actual blocker. I would ship a first pass with ${skill} this week and iterate from there.`
        : `Hi ${name},\n\nYour ${title} brief stood out. I can cover ${pain} with ${skill}.${calendly}`);

    return json({
      recipientName: name,
      subjectLine: actionType === 'UPWORK_COVER_LETTER' ? title : `Quick note on ${title}`,
      bodyText: sanitize(rawBody),
      actionType,
    });
  } catch (err) {
    return json({ error: (err as Error).message || 'payload failed' }, 500);
  }
}
