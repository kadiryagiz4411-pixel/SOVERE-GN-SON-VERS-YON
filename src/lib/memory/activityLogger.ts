/**
 * activityLogger.ts — Persist Command Center events (fire-and-forget).
 */

import { supabase } from '@/integrations/supabase/client';

export type ActivityType =
  | 'CV_PARSED'
  | 'CANDIDATE_EVALUATED'
  | 'CV_AUDITED'
  | 'PROPOSAL_GENERATED'
  | 'OUTREACH_SENT'
  | 'SHARE_LINK_CREATED';

export interface LogActivityInput {
  userId?: string | null;
  activityType: ActivityType;
  entityName: string;
  entityId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  if (!input.userId) return;
  const { error } = await supabase.from('command_center_activities').insert({
    user_id: input.userId,
    activity_type: input.activityType,
    entity_id: input.entityId ?? null,
    entity_name: input.entityName.slice(0, 180),
    summary_snippet: (input.summary ?? '').slice(0, 500) || null,
    metadata: input.metadata ?? {},
  });
  if (error) console.warn('[activityLogger]', error.message);
}

export interface CommandActivity {
  id: string;
  activityType: ActivityType;
  entityName: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function fetchActivities(userId: string, query = ''): Promise<CommandActivity[]> {
  let q = supabase
    .from('command_center_activities')
    .select('id, activity_type, entity_name, summary_snippet, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80);

  const { data, error } = await q;
  if (error || !data) return [];

  const needle = query.trim().toLowerCase();
  return (data as Record<string, unknown>[])
    .map((row) => ({
      id: String(row.id),
      activityType: row.activity_type as ActivityType,
      entityName: String(row.entity_name ?? ''),
      summary: String(row.summary_snippet ?? ''),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at ?? ''),
    }))
    .filter((row) => {
      if (!needle) return true;
      return (
        row.entityName.toLowerCase().includes(needle) ||
        row.summary.toLowerCase().includes(needle) ||
        row.activityType.toLowerCase().includes(needle)
      );
    });
}

export type MemoryCategory = 'TECH_STACK' | 'PAST_HIRING_WIN' | 'PROPOSAL_PATTERN' | 'COMPANY_CULTURE';

export interface MemoryCard {
  id: string;
  category: MemoryCategory;
  keyTitle: string;
  memoryContent: string;
  createdAt: string;
}

export async function fetchMemoryBank(userId: string): Promise<MemoryCard[]> {
  const { data, error } = await supabase
    .from('b2b_memory_bank')
    .select('id, category, key_title, memory_content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    category: row.category as MemoryCategory,
    keyTitle: String(row.key_title ?? ''),
    memoryContent: String(row.memory_content ?? ''),
    createdAt: String(row.created_at ?? ''),
  }));
}

export async function upsertMemoryCard(opts: {
  userId: string;
  id?: string;
  category: MemoryCategory;
  keyTitle: string;
  memoryContent: string;
}): Promise<void> {
  const payload = {
    user_id: opts.userId,
    category: opts.category,
    key_title: opts.keyTitle,
    memory_content: opts.memoryContent,
  };
  if (opts.id) {
    const { error } = await supabase.from('b2b_memory_bank').update(payload).eq('id', opts.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('b2b_memory_bank').insert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteMemoryCard(id: string): Promise<void> {
  await supabase.from('b2b_memory_bank').delete().eq('id', id);
}

/** Compact extra context from memory bank for LLM prompts. */
export function memoryBankToPrompt(cards: MemoryCard[]): string {
  if (!cards.length) return '';
  const lines = cards.slice(0, 12).map(c => `${c.category}: ${c.keyTitle} — ${c.memoryContent.slice(0, 180)}`);
  return `\nMemory bank:\n${lines.join('\n')}`;
}
