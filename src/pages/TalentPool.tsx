import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Sparkles, Loader2, Database, TrendingUp, Users,
  Trophy, Shield, Clock, ChevronRight, ArrowLeft, Zap,
  Filter, BarChart3, Building2, Crown, X, Mail, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  TalentSearchResult, SearchFilters, TalentPoolStats,
  searchTalentPool, fetchTalentPoolStats,
  EXAMPLE_QUERIES, getSimilarityLabel, getSimilarityColor,
} from "@/services/b2b/talentSearch";
import {
  getScoreColor, getScoreBg, getRiskColor,
} from "@/services/b2bEvaluationEngine";
import CandidateScoreCard from "@/components/b2b/CandidateScoreCard";
import { FeatureGate } from "@/components/entitlements/FeatureGate";
import { toast } from "sonner";

const VERDICT_COLORS: Record<string, string> = {
  STRONG_HIRE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  HIRE: "bg-green-500/20 text-green-400 border-green-500/30",
  MAYBE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  NO_HIRE: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function TalentPool() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("Organization");
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<TalentSearchResult[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [selected, setSelected] = useState<TalentSearchResult | null>(null);

  const [stats, setStats] = useState<TalentPoolStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Filters
  const [minScore, setMinScore] = useState("0");
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const [matchThreshold, setMatchThreshold] = useState("0.60");

  useEffect(() => {
    loadOrg();
  }, []);

  const loadOrg = async () => {
    setIsLoadingOrg(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id, plan_type")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id || profile.plan_type !== "B2B_ENTERPRISE") {
        navigate("/b2b");
        return;
      }

      setOrgId(profile.org_id);

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile.org_id)
        .single();

      if (org) setOrgName(org.name);

      // Load stats
      setIsLoadingStats(true);
      const poolStats = await fetchTalentPoolStats(profile.org_id);
      setStats(poolStats);
    } catch (err) {
      toast.error("Failed to load talent pool");
    } finally {
      setIsLoadingOrg(false);
      setIsLoadingStats(false);
    }
  };

  const handleSearch = useCallback(async (q?: string) => {
    const searchQuery = (q ?? query).trim();
    if (!searchQuery || !orgId) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setSelected(null);

    try {
      const filters: SearchFilters = {
        minScore: parseFloat(minScore) || 0,
        matchThreshold: parseFloat(matchThreshold) || 0.60,
        matchCount: 25,
        verdictFilter: verdictFilter !== "all"
          ? [verdictFilter as "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE"]
          : undefined,
      };

      const { results: hits, elapsedMs: ms } = await searchTalentPool({
        query: searchQuery,
        orgId,
        filters,
      });

      setResults(hits);
      setElapsedMs(ms);
    } catch (err) {
      toast.error("Search failed. Make sure candidates have been indexed.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [query, orgId, minScore, verdictFilter, matchThreshold]);

  const handleExampleClick = (q: string) => {
    setQuery(q);
    handleSearch(q);
  };

  if (isLoadingOrg) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-400 mx-auto" />
          <p className="text-slate-400 mt-3">Loading Talent Pool...</p>
        </div>
      </div>
    );
  }

  const pageContent = (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Nav */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/b2b")}
              className="text-slate-400 hover:text-slate-200 gap-1.5 h-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
            <div className="w-px h-5 bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                <Database className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">Talent Pool</span>
                  <Badge className="bg-violet-600/20 text-violet-300 border-violet-500/30 text-xs px-1.5 py-0">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    Vector Search
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{orgName}</p>
              </div>
            </div>
          </div>

          {/* Pool stats */}
          {stats && (
            <div className="hidden md:flex items-center gap-5">
              <PoolStat label="Candidates" value={stats.total} icon={<Users className="w-3.5 h-3.5 text-slate-400" />} />
              <PoolStat label="Indexed" value={`${stats.indexing_pct}%`} icon={<Database className="w-3.5 h-3.5 text-violet-400" />} />
              {stats.avg_score !== null && (
                <PoolStat label="Avg Score" value={`${stats.avg_score}`} icon={<BarChart3 className="w-3.5 h-3.5 text-emerald-400" />} />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6 gap-5">
        {/* Left panel: search + filters + results */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Hero search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h1 className="text-xl font-bold text-slate-100 mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              Semantic Talent Search
            </h1>
            <p className="text-sm text-slate-400 mb-5">
              Search your entire candidate pool in plain English. The AI understands synonyms, role equivalences, and multi-dimensional skill signals.
            </p>

            {/* Search bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. Senior React engineers with cloud experience and low attrition risk..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching || !query.trim()}
                className="bg-violet-600 hover:bg-violet-500 text-white px-6 gap-2 rounded-xl"
              >
                {isSearching
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />
                }
                Search
              </Button>
            </div>

            {/* Filters row */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500">Filters:</span>
              </div>
              <Select value={verdictFilter} onValueChange={setVerdictFilter}>
                <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-slate-300 h-8 text-xs">
                  <SelectValue placeholder="All verdicts" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {["all", "STRONG_HIRE", "HIRE", "MAYBE", "NO_HIRE"].map(v => (
                    <SelectItem key={v} value={v} className="text-slate-300 text-xs">{v === "all" ? "All verdicts" : v.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={minScore} onValueChange={setMinScore}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-300 h-8 text-xs">
                  <SelectValue placeholder="Min score" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {["0", "50", "65", "75", "85"].map(v => (
                    <SelectItem key={v} value={v} className="text-slate-300 text-xs">Score ≥ {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={matchThreshold} onValueChange={setMatchThreshold}>
                <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-slate-300 h-8 text-xs">
                  <SelectValue placeholder="Similarity" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {[["0.50", "Low (50%)"], ["0.60", "Medium (60%)"], ["0.70", "High (70%)"], ["0.80", "Very High (80%)"]].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-slate-300 text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Example queries */}
            {!hasSearched && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Try these:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUERIES.slice(0, 5).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(q)}
                      className="text-xs text-slate-400 hover:text-violet-300 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-violet-500/10 border border-slate-700 hover:border-violet-500/40 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {isSearching && (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              <span>Searching talent pool with semantic AI...</span>
            </div>
          )}

          {hasSearched && !isSearching && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Results header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-300">
                    {results.length > 0 ? (
                      <>{results.length} candidates found</>
                    ) : (
                      <>No matches found</>
                    )}
                  </span>
                  {results.length > 0 && (
                    <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {elapsedMs}ms
                    </Badge>
                  )}
                </div>
                {results.length > 0 && (
                  <p className="text-xs text-slate-500">Ranked by semantic similarity · Click to view details</p>
                )}
              </div>

              {results.length === 0 ? (
                <div className="text-center py-16">
                  <Database className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">No candidates match this query</p>
                  <p className="text-slate-600 text-sm mt-1">Try lowering the similarity threshold or broadening your search terms</p>
                  {stats?.indexed === 0 && (
                    <p className="text-amber-400 text-xs mt-3">Tip: Candidates need to be evaluated first before they appear in the talent pool.</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {results.map((r, i) => (
                    <ResultRow
                      key={r.id}
                      result={r}
                      rank={i + 1}
                      isSelected={selected?.id === r.id}
                      onClick={() => setSelected(selected?.id === r.id ? null : r)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!hasSearched && !isSearching && stats && stats.total === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <Database className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Talent Pool is empty</p>
              <p className="text-slate-500 text-sm mt-1">
                Evaluate candidates in the{" "}
                <button onClick={() => navigate("/b2b")} className="text-violet-400 underline">B2B Dashboard</button>{" "}
                to populate the talent pool.
              </p>
            </div>
          )}
        </div>

        {/* Right panel: candidate detail */}
        {selected && (
          <div className="w-96 flex-shrink-0 border border-slate-800 rounded-2xl overflow-hidden sticky top-20 max-h-[calc(100vh-100px)]">
            <CandidateScoreCard
              candidate={selected}
              rank={results.findIndex(r => r.id === selected.id) + 1}
              jobTitle="Talent Pool"
              orgName={orgName}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      {/* Pool stats sidebar (when no detail panel) */}
      {!selected && stats && stats.total > 0 && (
        <div className="fixed bottom-6 right-6 z-20">
          <PoolStatsCard stats={stats} />
        </div>
      )}
    </div>
  );

  return (
    <FeatureGate featureKey="TALENT_POOL_VECTOR_SEARCH">
      {pageContent}
    </FeatureGate>
  );
}

// ─── Result Row ──────────────────────────────────────────────────────────────

function ResultRow({
  result, rank, isSelected, onClick,
}: {
  result: TalentSearchResult;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const score = result.match_score_percentage ?? 0;
  const verdict = result.ai_analysis?.hiring_verdict;
  const risk = result.ai_analysis?.risk_assessment?.risk_level;
  const sim = result.similarity;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-5 py-4 cursor-pointer transition-all",
        isSelected ? "bg-violet-500/10 border-l-2 border-l-violet-500" : "hover:bg-slate-800/60"
      )}
    >
      {/* Rank + similarity */}
      <div className="flex flex-col items-center w-12 flex-shrink-0">
        <span className="text-xs text-slate-500 font-mono">#{rank}</span>
        <div className={cn("mt-1 text-xs font-bold px-1.5 py-0.5 rounded-full border", getSimilarityColor(sim))}>
          {(sim * 100).toFixed(0)}%
        </div>
      </div>

      {/* Candidate info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-200 truncate">{result.candidate_name}</p>
          {verdict && (
            <Badge className={cn("text-xs px-1.5 py-0 border", VERDICT_COLORS[verdict])}>
              {verdict.replace("_", " ")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {result.candidate_email && (
            <span className="text-xs text-slate-500 flex items-center gap-1 truncate max-w-40">
              <Mail className="w-3 h-3 flex-shrink-0" />{result.candidate_email}
            </span>
          )}
          {risk && (
            <span className={cn("text-xs font-medium", getRiskColor(risk).split(" ")[0])}>{risk} risk</span>
          )}
          <span className="text-xs text-slate-600">{getSimilarityLabel(sim)}</span>
        </div>

        {/* Value prop snippet */}
        {result.ai_analysis?.micro_brief?.primary_value_prop && (
          <p className="text-xs text-slate-400 mt-1.5 italic truncate max-w-md">
            "{result.ai_analysis.micro_brief.primary_value_prop}"
          </p>
        )}
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-right">
        <p className={cn("text-2xl font-black font-mono", getScoreColor(score))}>{score.toFixed(0)}</p>
        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
          <div className={cn("h-full rounded-full", getScoreBg(score))} style={{ width: `${score}%` }} />
        </div>
      </div>

      <ChevronRight className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-violet-400" : "text-slate-700")} />
    </div>
  );
}

// ─── Pool Stats Card (floating) ───────────────────────────────────────────────

function PoolStatsCard({ stats }: { stats: TalentPoolStats }) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-2 hover:border-violet-500/50 transition-colors"
      >
        <Database className="w-4 h-4 text-violet-400" />
        <span className="text-sm text-slate-300">{stats.total} candidates · {stats.indexing_pct}% indexed</span>
      </button>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 min-w-64 shadow-xl shadow-black/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-slate-300">Pool Stats</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="text-slate-600 hover:text-slate-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-2.5">
        <StatLine label="Total candidates" value={stats.total} />
        <StatLine label="Vector-indexed" value={`${stats.indexed} (${stats.indexing_pct}%)`} highlight />
        {stats.avg_score && <StatLine label="Avg match score" value={`${stats.avg_score}/100`} />}
        {Object.entries(stats.verdict_distribution).map(([v, n]) => (
          <StatLine key={v} label={v.replace("_", " ")} value={n} />
        ))}
      </div>
    </div>
  );
}

function StatLine({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn("text-xs font-medium", highlight ? "text-violet-400" : "text-slate-300")}>{value}</span>
    </div>
  );
}

function PoolStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="text-right">
      <div className="flex items-center gap-1.5 justify-end">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-200">{value}</p>
    </div>
  );
}
