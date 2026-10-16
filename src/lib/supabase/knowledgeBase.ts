import { supabase } from '@/lib/supabase/client';

export type AgencyKnowledgeRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
};

function errorText(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  const rec = error as { code?: string; message?: string; details?: string; hint?: string };
  return [rec.code, rec.message, rec.details, rec.hint].filter(Boolean).join(' ');
}

/** PostgREST / Postgres errors when the table is missing or not in the schema cache. */
export function isAgencyKnowledgeSchemaError(error: unknown): boolean {
  const rec = error as { code?: string; message?: string } | null;
  const code = String(rec?.code ?? '');
  const text = errorText(error).toLowerCase();
  return (
    code === 'PGRST205' ||
    code === 'PGRST301' ||
    code === 'PGRST204' ||
    code === '42P01' ||
    text.includes('schema cache') ||
    (text.includes('agency_knowledge_base') && (text.includes('does not exist') || text.includes('could not find')))
  );
}

export async function fetchAgencyKnowledgeBase(userId: string): Promise<AgencyKnowledgeRow[]> {
  try {
    const { data, error } = await supabase
      .from('agency_knowledge_base')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isAgencyKnowledgeSchemaError(error) || error.code === 'PGRST301' || (error.message || '').includes('schema cache')) {
        console.warn('agency_knowledge_base table not found. Returning empty fallback array.');
        return [];
      }
      throw error;
    }

    return (data || []) as AgencyKnowledgeRow[];
  } catch (err) {
    console.error('Error fetching agency knowledge base:', err);
    return [];
  }
}

export async function fetchAllAgencyKnowledgeBase(): Promise<AgencyKnowledgeRow[]> {
  try {
    const { data, error } = await supabase
      .from('agency_knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isAgencyKnowledgeSchemaError(error) || error.code === 'PGRST301' || (error.message || '').includes('schema cache')) {
        console.warn('agency_knowledge_base table not found. Returning empty fallback array.');
        return [];
      }
      throw error;
    }

    return (data || []) as AgencyKnowledgeRow[];
  } catch (err) {
    console.error('Error fetching agency knowledge base:', err);
    return [];
  }
}
