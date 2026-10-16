/**
 * shareLinks.ts — Live client portal links + decision sync.
 */

import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/memory/activityLogger';
import type { RankedCandidate, Recommendation } from '@/lib/schemas/candidate';

export type DecisionStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

export interface ShareLink {
  id: string;
  batchId: string;
  shareCode: string;
  passcode: string | null;
  title: string | null;
  userId?: string | null;
}

export interface SharedCandidate extends RankedCandidate {
  decision: DecisionStatus;
  dbCandidateId?: string;
}

function makeCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

export async function createShareLink(opts: {
  userId: string;
  batchId: string;
  title?: string;
  passcode?: string;
}): Promise<ShareLink> {
  const shareCode = makeCode();
  const { data, error } = await supabase
    .from('share_links')
    .insert({
      user_id: opts.userId,
      batch_id: opts.batchId,
      share_code: shareCode,
      passcode: opts.passcode || null,
      title: opts.title || 'Candidate Shortlist',
      is_active: true,
    })
    .select('id, batch_id, share_code, passcode, title')
    .single();

  if (error || !data) throw new Error(error?.message || 'Could not create share link');
  void logActivity({
    userId: opts.userId,
    activityType: 'SHARE_LINK_CREATED',
    entityName: opts.title || 'Candidate Shortlist',
    entityId: data.id as string,
    summary: `Live portal ${shareCode}`,
  });
  return {
    id: data.id as string,
    batchId: data.batch_id as string,
    shareCode: data.share_code as string,
    passcode: (data.passcode as string) ?? null,
    title: (data.title as string) ?? null,
  };
}

export function shareUrl(code: string): string {
  return `${window.location.origin}/share/${code}`;
}

export async function loadShareByCode(code: string): Promise<{
  link: ShareLink;
  candidates: SharedCandidate[];
} | null> {
  const { data: link, error } = await supabase
    .from('share_links')
    .select('id, batch_id, share_code, passcode, title, is_active, user_id')
    .eq('share_code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !link) return null;

  const batchId = link.batch_id as string;
  const { data: rows } = await supabase
    .from('batch_candidates')
    .select('id, full_name, title, email, location, experience_years, photo_url, summary, skills, education, work_history, raw_data')
    .eq('batch_id', batchId);

  const { data: evals } = await supabase
    .from('batch_evaluations')
    .select('candidate_id, overall_score, rank_position, why_this_candidate, key_strengths, missing_skills, recommendation')
    .eq('batch_id', batchId);

  const { data: decisions } = await supabase
    .from('client_decisions')
    .select('candidate_id, status')
    .eq('share_id', link.id);

  const evalByCand = new Map((evals ?? []).map(e => [e.candidate_id as string, e]));
  const decByCand = new Map((decisions ?? []).map(d => [d.candidate_id as string, d.status as DecisionStatus]));

  const candidates: SharedCandidate[] = (rows ?? []).map((row) => {
    const ev = evalByCand.get(row.id as string);
    const rec = (ev?.recommendation as Recommendation) || 'Moderate Fit';
    return {
      id: row.id as string,
      dbCandidateId: row.id as string,
      batchId,
      fullName: String(row.full_name ?? 'Unknown'),
      title: String(row.title ?? ''),
      email: (row.email as string) ?? undefined,
      location: (row.location as string) ?? undefined,
      experienceYears: Number(row.experience_years ?? 0),
      photoUrl: (row.photo_url as string) ?? undefined,
      summary: String(row.summary ?? ''),
      skills: (row.skills as string[]) ?? [],
      education: (row.education as string) ?? undefined,
      workHistory: Array.isArray(row.work_history) ? row.work_history as RankedCandidate['workHistory'] : [],
      rawContent: String((row.raw_data as Record<string, unknown> | null)?.rawContent ?? ''),
      rankPosition: Number(ev?.rank_position ?? 0),
      overallScore: Number(ev?.overall_score ?? 0),
      whyThisCandidate: String(ev?.why_this_candidate ?? ''),
      keyStrengths: (ev?.key_strengths as string[]) ?? [],
      missingSkills: (ev?.missing_skills as string[]) ?? [],
      recommendation: rec,
      decision: decByCand.get(row.id as string) ?? 'PENDING',
    };
  }).sort((a, b) => a.rankPosition - b.rankPosition || b.overallScore - a.overallScore);

  return {
    link: {
      id: link.id as string,
      batchId,
      shareCode: link.share_code as string,
      passcode: (link.passcode as string) ?? null,
      title: (link.title as string) ?? null,
      userId: (link.user_id as string) ?? null,
    },
    candidates,
  };
}

export async function upsertDecision(opts: {
  shareId: string;
  candidateId: string;
  status: DecisionStatus;
  feedback?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('client_decisions')
    .upsert(
      {
        share_id: opts.shareId,
        candidate_id: opts.candidateId,
        status: opts.status,
        feedback: opts.feedback ?? null,
      },
      { onConflict: 'share_id,candidate_id' },
    );
  if (error) throw new Error(error.message);
}

export function subscribeDecisions(
  shareId: string,
  onChange: (candidateId: string, status: DecisionStatus) => void,
): () => void {
  const channel = supabase
    .channel(`decisions:${shareId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'client_decisions', filter: `share_id=eq.${shareId}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | undefined;
        if (!row?.candidate_id) return;
        onChange(String(row.candidate_id), (row.status as DecisionStatus) || 'PENDING');
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
