/**
 * Talent Pool Semantic Vector Search Service
 * Wraps the b2b-talent-search edge function with client-side utilities.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CandidateEvaluation } from "@/services/b2bEvaluationEngine";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TalentSearchResult extends CandidateEvaluation {
  similarity: number;
  job_posting_id: string;
}

export interface SearchFilters {
  minScore?: number;
  verdictFilter?: Array<"STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE">;
  matchThreshold?: number;
  matchCount?: number;
}

export interface SearchState {
  query: string;
  results: TalentSearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
  elapsedMs: number | null;
}

// ─── Example queries for UI hints ──────────────────────────────────────────

export const EXAMPLE_QUERIES = [
  "Senior React engineers with cloud architecture experience",
  "Product managers with B2B SaaS background and Agile certification",
  "Data scientists who worked with large-scale ML pipelines and Python",
  "DevOps engineers with Kubernetes and multi-cloud expertise",
  "Full-stack engineers strong in Node.js and PostgreSQL, available for contract",
  "Marketing leads with growth hacking experience and 5+ years in SaaS",
  "Strong communicators with team lead experience and low attrition risk",
  "Candidates with AUTHENTIC authenticity rating and STRONG_HIRE verdict",
];

// ─── Search function ────────────────────────────────────────────────────────

export async function searchTalentPool(params: {
  query: string;
  orgId: string;
  filters?: SearchFilters;
}): Promise<{ results: TalentSearchResult[]; elapsedMs: number }> {
  const { query, orgId, filters = {} } = params;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const t0 = performance.now();

  const response = await fetch(`${supabaseUrl}/functions/v1/b2b-talent-search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      query,
      org_id: orgId,
      match_threshold: filters.matchThreshold ?? 0.60,
      match_count: filters.matchCount ?? 20,
      min_score: filters.minScore ?? 0,
      verdict_filter: filters.verdictFilter ?? null,
    }),
  });

  const elapsedMs = Math.round(performance.now() - t0);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  const data = await response.json();
  return { results: (data.results ?? []) as TalentSearchResult[], elapsedMs };
}

// ─── Fetch pool stats ────────────────────────────────────────────────────────

export interface TalentPoolStats {
  total: number;
  indexed: number;
  indexing_pct: number;
  avg_score: number | null;
  verdict_distribution: Record<string, number>;
}

export async function fetchTalentPoolStats(orgId: string): Promise<TalentPoolStats> {
  const { data, error } = await supabase
    .from("candidate_evaluations")
    .select("match_score_percentage, ai_analysis, processing_status, embedding")
    .eq("organization_id", orgId)
    .eq("processing_status", "completed");

  if (error) throw error;
  const rows = data ?? [];

  const indexed = rows.filter(r => r.embedding !== null).length;
  const scores = rows.map(r => r.match_score_percentage).filter(s => s !== null) as number[];
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const verdictDist: Record<string, number> = {};
  rows.forEach(r => {
    const v = (r.ai_analysis as Record<string, unknown>)?.hiring_verdict as string | undefined;
    if (v) verdictDist[v] = (verdictDist[v] ?? 0) + 1;
  });

  return {
    total: rows.length,
    indexed,
    indexing_pct: rows.length > 0 ? Math.round((indexed / rows.length) * 100) : 0,
    avg_score: avgScore ? parseFloat(avgScore.toFixed(1)) : null,
    verdict_distribution: verdictDist,
  };
}

// ─── Similarity label helpers ───────────────────────────────────────────────

export function getSimilarityLabel(sim: number): string {
  if (sim >= 0.90) return "Perfect Match";
  if (sim >= 0.80) return "Excellent Match";
  if (sim >= 0.70) return "Strong Match";
  if (sim >= 0.60) return "Good Match";
  return "Partial Match";
}

export function getSimilarityColor(sim: number): string {
  if (sim >= 0.85) return "text-emerald-400 bg-emerald-400/10 border-emerald-500/30";
  if (sim >= 0.70) return "text-green-400 bg-green-400/10 border-green-500/30";
  if (sim >= 0.60) return "text-amber-400 bg-amber-400/10 border-amber-500/30";
  return "text-slate-400 bg-slate-400/10 border-slate-500/30";
}
