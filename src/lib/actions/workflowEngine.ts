/**
 * workflowEngine.ts — Interview invites, bulk reject, client-decision webhooks.
 */

import { supabase } from '@/integrations/supabase/client';
import { generateOutreachEmail, generateRejectionNote } from '@/lib/actions/ghostActions';
import { loadMemory, type SovereignMemory } from '@/lib/memory/contextEngine';
import { sanitizeAiText } from '@/lib/ai/sanitizer';
import type { RankedCandidate } from '@/lib/schemas/candidate';

export interface InterviewDraft {
  candidateId: string;
  candidateName: string;
  email: string;
  subject: string;
  body: string;
  mailtoHref: string;
}

export interface RejectionDraft {
  candidateId: string;
  candidateName: string;
  email: string;
  subject: string;
  body: string;
  mailtoHref: string;
}

function mailto(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}

async function logEvent(opts: {
  userId?: string;
  shareId?: string;
  candidateId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await supabase.from('workflow_events').insert({
    user_id: opts.userId ?? null,
    share_id: opts.shareId ?? null,
    candidate_id: opts.candidateId ?? null,
    event_type: opts.eventType,
    payload: opts.payload ?? {},
  });
}

export async function draftInterviewInvites(
  candidates: RankedCandidate[],
  opts: { userId?: string; calendlyUrl?: string } = {},
): Promise<InterviewDraft[]> {
  const memory = opts.userId ? await loadMemory(opts.userId) : null;
  const calendly = opts.calendlyUrl || memory?.calendlyUrl || '';
  const drafts: InterviewDraft[] = [];

  for (const c of candidates) {
    const email = await generateOutreachEmail(c, memory);
    let body = email.body;
    if (calendly && !body.toLowerCase().includes('calendly') && !body.includes(calendly)) {
      body = `${body}\n\nBook a slot: ${calendly}`;
    }
    body = sanitizeAiText(body);
    drafts.push({
      candidateId: c.id,
      candidateName: c.fullName,
      email: c.email || '',
      subject: email.subject,
      body,
      mailtoHref: mailto(c.email || '', email.subject, body),
    });
    await logEvent({
      userId: opts.userId,
      candidateId: c.id,
      eventType: 'OUTREACH_DRAFTED',
      payload: { name: c.fullName, rank: c.rankPosition },
    });
  }
  return drafts;
}

export async function draftBulkRejections(
  candidates: RankedCandidate[],
  opts: { userId?: string; threshold?: number } = {},
): Promise<RejectionDraft[]> {
  const threshold = opts.threshold ?? 50;
  const below = candidates.filter(c => c.overallScore < threshold);
  const drafts: RejectionDraft[] = [];

  for (const c of below) {
    const body = await generateRejectionNote(c);
    const subject = `Update on your application`;
    drafts.push({
      candidateId: c.id,
      candidateName: c.fullName,
      email: c.email || '',
      subject,
      body,
      mailtoHref: mailto(c.email || '', subject, body),
    });
  }

  await logEvent({
    userId: opts.userId,
    eventType: 'BULK_REJECT',
    payload: { count: drafts.length, threshold },
  });

  return drafts;
}

/** Called from the live share portal when a client Approves / Rejects. */
export async function notifyClientDecision(opts: {
  shareId: string;
  candidateId: string;
  candidateName: string;
  status: 'APPROVED' | 'REJECTED';
  ownerUserId?: string;
  webhookUrl?: string;
}): Promise<void> {
  const eventType = opts.status === 'APPROVED' ? 'CLIENT_APPROVED' : 'CLIENT_REJECTED';
  await logEvent({
    userId: opts.ownerUserId,
    shareId: opts.shareId,
    candidateId: opts.candidateId,
    eventType,
    payload: { name: opts.candidateName, status: opts.status },
  });

  let hook = opts.webhookUrl;
  if (!hook && opts.ownerUserId) {
    const memory = await loadMemory(opts.ownerUserId);
    hook = memory.webhookUrl || undefined;
  }
  if (!hook) return;

  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventType,
        shareId: opts.shareId,
        candidateId: opts.candidateId,
        candidateName: opts.candidateName,
        status: opts.status,
        at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[workflow] webhook failed', err);
  }
}

export function subscribeWorkflowEvents(
  userId: string,
  onEvent: (eventType: string, payload: Record<string, unknown>) => void,
): () => void {
  const channel = supabase
    .channel(`workflow:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'workflow_events', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        onEvent(String(row.event_type ?? ''), (row.payload as Record<string, unknown>) ?? {});
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export type { SovereignMemory };
