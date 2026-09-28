import { supabase } from '@/integrations/supabase/client';
import { OWNER_EMAIL } from '@/lib/superadmin';

export type KnowledgeCategory = 'case_study' | 'brand_voice' | 'service_package';

export interface KnowledgeEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  created_at: string;
}

/**
 * RLS-safe error codes that should degrade gracefully to an empty list
 * rather than crashing the UI (e.g. row-level-security denial).
 */
const RLS_ERROR_CODES = new Set(['42501', 'PGRST301', 'PGRST116']);

function isRlsError(code: string | undefined): boolean {
  return !!code && RLS_ERROR_CODES.has(code);
}

/**
 * Resolve caller email from the live Supabase session.
 * Returns '' when no session exists (guest / unauthenticated).
 */
async function getCallerEmail(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.email ?? '';
  } catch {
    return '';
  }
}

export async function listKnowledge(userId: string): Promise<KnowledgeEntry[]> {
  // Superadmin bypass — fetch ALL entries without the user_id filter so the
  // owner can inspect/manage agency knowledge base items globally.
  const callerEmail = await getCallerEmail();
  const isSuperAdmin = callerEmail === OWNER_EMAIL;

  const query = supabase
    .from('agency_knowledge_base')
    .select('*')
    .order('created_at', { ascending: false });

  const { data, error } = isSuperAdmin
    ? await query                          // no user_id restriction for superadmin
    : await query.eq('user_id', userId);   // standard RLS-consistent filter

  if (error) {
    // RLS denial or PostgREST restriction: degrade to empty list, don't crash.
    if (isRlsError(error.code)) {
      console.warn('[knowledgeBaseService] listKnowledge: RLS denied access — returning []', error.message);
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []) as KnowledgeEntry[];
}

export async function createKnowledge(
  userId: string,
  entry: { title: string; content: string; category?: KnowledgeCategory },
): Promise<KnowledgeEntry> {
  const { data, error } = await supabase
    .from('agency_knowledge_base')
    .insert({
      user_id: userId,
      title: entry.title.trim(),
      content: entry.content.trim(),
      category: entry.category ?? 'case_study',
    })
    .select()
    .single();

  if (error) {
    if (isRlsError(error.code)) {
      throw new Error('Permission denied: you may not add entries to this knowledge base. Contact the workspace admin.');
    }
    throw new Error(error.message);
  }
  return data as KnowledgeEntry;
}

export async function updateKnowledge(
  id: string,
  patch: Partial<Pick<KnowledgeEntry, 'title' | 'content' | 'category'>>,
): Promise<void> {
  const { error } = await supabase.from('agency_knowledge_base').update(patch).eq('id', id);
  if (error) {
    if (isRlsError(error.code)) {
      throw new Error('Permission denied: cannot update this entry.');
    }
    throw new Error(error.message);
  }
}

export async function deleteKnowledge(id: string): Promise<void> {
  const { error } = await supabase.from('agency_knowledge_base').delete().eq('id', id);
  if (error) {
    if (isRlsError(error.code)) {
      throw new Error('Permission denied: cannot delete this entry.');
    }
    throw new Error(error.message);
  }
}

export function knowledgeToPromptBlock(entries: KnowledgeEntry[]): string {
  if (!entries.length) return '';
  return entries
    .map((e) => `[${e.category}] ${e.title}:\n${e.content}`)
    .join('\n\n')
    .slice(0, 6000);
}
