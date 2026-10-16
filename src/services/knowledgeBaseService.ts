import { supabase } from '@/integrations/supabase/client';
import { OWNER_EMAIL } from '@/lib/superadmin';
import {
  fetchAgencyKnowledgeBase,
  fetchAllAgencyKnowledgeBase,
  isAgencyKnowledgeSchemaError,
} from '@/lib/supabase/knowledgeBase';

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

function isMissingTableError(error: unknown): boolean {
  return isAgencyKnowledgeSchemaError(error);
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
  try {
    const callerEmail = await getCallerEmail();
    const isSuperAdmin = callerEmail === OWNER_EMAIL;
    const rows = isSuperAdmin
      ? await fetchAllAgencyKnowledgeBase()
      : await fetchAgencyKnowledgeBase(userId);
    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      content: row.content,
      category: (row.category as KnowledgeCategory) || 'case_study',
      created_at: row.created_at,
    }));
  } catch (err) {
    console.error('[knowledgeBaseService] listKnowledge fallback:', err);
    return [];
  }
}

export async function createKnowledge(
  userId: string,
  entry: { title: string; content: string; category?: KnowledgeCategory },
): Promise<KnowledgeEntry> {
  try {
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
      if (isMissingTableError(error) || error.code === 'PGRST301' || (error.message || '').includes('schema cache')) {
        console.warn('agency_knowledge_base table not found. Create skipped.');
        throw new Error('Knowledge base is not initialized yet. Please retry after the database migration finishes.');
      }
      if (isRlsError(error.code)) {
        throw new Error('Permission denied: you may not add entries to this knowledge base. Contact the workspace admin.');
      }
      throw new Error(error.message);
    }
    return data as KnowledgeEntry;
  } catch (err) {
    if (err instanceof Error) throw err;
    console.error('Error creating agency knowledge base entry:', err);
    throw new Error('Could not save knowledge base entry.');
  }
}

export async function updateKnowledge(
  id: string,
  patch: Partial<Pick<KnowledgeEntry, 'title' | 'content' | 'category'>>,
): Promise<void> {
  try {
    const { error } = await supabase.from('agency_knowledge_base').update(patch).eq('id', id);
    if (error) {
      if (isMissingTableError(error) || error.code === 'PGRST301' || (error.message || '').includes('schema cache')) {
        console.warn('agency_knowledge_base table not found. Update skipped.');
        return;
      }
      if (isRlsError(error.code)) {
        throw new Error('Permission denied: cannot update this entry.');
      }
      throw new Error(error.message);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Permission denied')) throw err;
    console.error('Error updating agency knowledge base:', err);
  }
}

export async function deleteKnowledge(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('agency_knowledge_base').delete().eq('id', id);
    if (error) {
      if (isMissingTableError(error) || error.code === 'PGRST301' || (error.message || '').includes('schema cache')) {
        console.warn('agency_knowledge_base table not found. Delete skipped.');
        return;
      }
      if (isRlsError(error.code)) {
        throw new Error('Permission denied: cannot delete this entry.');
      }
      throw new Error(error.message);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Permission denied')) throw err;
    console.error('Error deleting agency knowledge base entry:', err);
  }
}

export function knowledgeToPromptBlock(entries: KnowledgeEntry[]): string {
  if (!entries.length) return '';
  return entries
    .map((e) => `[${e.category}] ${e.title}:\n${e.content}`)
    .join('\n\n')
    .slice(0, 6000);
}
