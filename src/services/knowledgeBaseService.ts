import { supabase } from '@/integrations/supabase/client';

export type KnowledgeCategory = 'case_study' | 'brand_voice' | 'service_package';

export interface KnowledgeEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  created_at: string;
}

export async function listKnowledge(userId: string): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabase
    .from('agency_knowledge_base')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  return data as KnowledgeEntry;
}

export async function updateKnowledge(
  id: string,
  patch: Partial<Pick<KnowledgeEntry, 'title' | 'content' | 'category'>>,
): Promise<void> {
  const { error } = await supabase.from('agency_knowledge_base').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteKnowledge(id: string): Promise<void> {
  const { error } = await supabase.from('agency_knowledge_base').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function knowledgeToPromptBlock(entries: KnowledgeEntry[]): string {
  if (!entries.length) return '';
  return entries
    .map((e) => `[${e.category}] ${e.title}:\n${e.content}`)
    .join('\n\n')
    .slice(0, 6000);
}
