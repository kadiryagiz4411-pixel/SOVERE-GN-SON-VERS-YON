import { supabase } from '@/integrations/supabase/client';

export interface SemanticRow {
  id: string;
  name: string;
  skills: string;
  score: number;
  verdict: string;
  email?: string;
  cvText?: string;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9+#]+/).filter((t) => t.length > 2);
}

function scoreText(query: string, hay: string): number {
  const q = new Set(tokenize(query));
  const h = tokenize(hay);
  if (!q.size || !h.length) return 0;
  let hits = 0;
  q.forEach((t) => {
    if (h.includes(t)) hits += 1;
  });
  return Math.round((hits / q.size) * 100);
}

export async function semanticCandidateSearch(query: string, orgId?: string | null): Promise<{ rows: SemanticRow[]; elapsedMs: number }> {
  const t0 = performance.now();
  let builder = supabase
    .from('candidate_evaluations')
    .select('id, candidate_name, candidate_email, cv_text_extracted, match_score_percentage, ai_analysis, organization_id')
    .limit(200);
  if (orgId) builder = builder.eq('organization_id', orgId);
  const { data } = await builder;
  const rows = ((data ?? []) as Array<{
    id: string;
    candidate_name: string;
    candidate_email?: string | null;
    cv_text_extracted?: string | null;
    match_score_percentage?: number | null;
    ai_analysis?: { key_strengths?: string[]; hiring_verdict?: string } | null;
  }>)
    .map((c) => {
      const skills = (c.ai_analysis?.key_strengths ?? []).join(', ');
      const hay = `${c.candidate_name} ${skills} ${c.cv_text_extracted ?? ''}`;
      return {
        id: c.id,
        name: c.candidate_name,
        skills,
        score: Math.max(c.match_score_percentage ?? 0, scoreText(query, hay)),
        verdict: c.ai_analysis?.hiring_verdict ?? '—',
        email: c.candidate_email ?? undefined,
        cvText: c.cv_text_extracted ?? undefined,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
  return { rows, elapsedMs: Math.round(performance.now() - t0) };
}
