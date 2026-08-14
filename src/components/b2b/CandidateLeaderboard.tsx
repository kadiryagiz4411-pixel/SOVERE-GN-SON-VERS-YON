import { useState, useMemo } from "react";
import {
  Trophy, User, TrendingUp, Shield, Filter, Search,
  Loader2, RefreshCw, ChevronUp, ChevronDown, BarChart3,
  Download, FileText, Scale, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CandidateEvaluation,
  getScoreColor,
  getScoreBg,
  getRiskColor,
  getFluffColor,
  getFluffLabel,
} from "@/services/b2bEvaluationEngine";
import { exportCandidatesToCSV, exportBatchSummaryPDF } from "@/utils/b2bExport";
import CandidateScoreCard from "./CandidateScoreCard";
import XAIAuditModal from "./XAIAuditModal";

interface Props {
  candidates: CandidateEvaluation[];
  isLoading?: boolean;
  onRefresh?: () => void;
  jobTitle?: string;
  orgName?: string;
}

type SortKey = "match_score_percentage" | "candidate_name" | "created_at" | "ai_fluff";
type FilterVerdict = "all" | "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE";
type FilterRisk = "all" | "LOW" | "MEDIUM" | "HIGH";
type FilterAuth = "all" | "AUTHENTIC" | "SUSPICIOUS" | "HIGH_RISK";

const VERDICT_COLORS: Record<string, string> = {
  STRONG_HIRE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  HIRE: "bg-green-500/20 text-green-400 border-green-500/30",
  MAYBE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  NO_HIRE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const AUTH_COLORS: Record<string, string> = {
  AUTHENTIC: "text-emerald-400 bg-emerald-400/10",
  SUSPICIOUS: "text-amber-400 bg-amber-400/10",
  HIGH_RISK: "text-red-400 bg-red-400/10",
};

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export default function CandidateLeaderboard({ candidates, isLoading, onRefresh, jobTitle = "Position", orgName = "Organization" }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("match_score_percentage");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterVerdict, setFilterVerdict] = useState<FilterVerdict>("all");
  const [filterRisk, setFilterRisk] = useState<FilterRisk>("all");
  const [filterAuth, setFilterAuth] = useState<FilterAuth>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending" | "processing" | "failed">("all");
  const [selected, setSelected] = useState<CandidateEvaluation | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | undefined>();
  const [auditCandidate, setAuditCandidate] = useState<CandidateEvaluation | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let result = [...candidates];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.candidate_name.toLowerCase().includes(q) ||
        (c.candidate_email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterVerdict !== "all") result = result.filter(c => c.ai_analysis?.hiring_verdict === filterVerdict);
    if (filterRisk !== "all") result = result.filter(c => c.ai_analysis?.risk_assessment?.risk_level === filterRisk);
    if (filterAuth !== "all") result = result.filter(c => c.ai_analysis?.fraud_analysis?.authenticity_verdict === filterAuth);
    if (filterStatus !== "all") result = result.filter(c => c.processing_status === filterStatus);

    result.sort((a, b) => {
      let aVal: string | number, bVal: string | number;

      if (sortKey === "match_score_percentage") {
        aVal = a.match_score_percentage ?? -1;
        bVal = b.match_score_percentage ?? -1;
      } else if (sortKey === "candidate_name") {
        aVal = a.candidate_name;
        bVal = b.candidate_name;
      } else if (sortKey === "ai_fluff") {
        aVal = a.ai_analysis?.fraud_analysis?.ai_fluff_score ?? -1;
        bVal = b.ai_analysis?.fraud_analysis?.ai_fluff_score ?? -1;
      } else {
        aVal = a.created_at;
        bVal = b.created_at;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return result;
  }, [candidates, search, sortKey, sortDir, filterVerdict, filterRisk, filterAuth, filterStatus]);

  const completed = candidates.filter(c => c.processing_status === "completed");
  const avgScore = completed.length > 0
    ? (completed.reduce((s, c) => s + (c.match_score_percentage ?? 0), 0) / completed.length).toFixed(1) : "—";
  const topScore = completed.length > 0
    ? Math.max(...completed.map(c => c.match_score_percentage ?? 0)).toFixed(0) : "—";
  const strongHires = completed.filter(c => c.ai_analysis?.hiring_verdict === "STRONG_HIRE").length;
  const highRiskAuth = completed.filter(c => c.ai_analysis?.fraud_analysis?.authenticity_verdict === "HIGH_RISK").length;

  return (
    <>
      <div className="flex gap-4 h-full">
        {/* Main leaderboard */}
        <div className="flex-1 flex flex-col min-w-0 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total CVs", value: candidates.length, icon: <User className="w-4 h-4 text-slate-400" /> },
              { label: "Avg Score", value: avgScore, icon: <BarChart3 className="w-4 h-4 text-violet-400" /> },
              { label: "Top Score", value: topScore, icon: <Trophy className="w-4 h-4 text-amber-400" /> },
              { label: "Strong Hires", value: strongHires, icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">{s.icon}</div>
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-lg font-bold text-slate-100">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fraud alert banner */}
          {highRiskAuth > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">
                <span className="font-semibold">{highRiskAuth} candidate{highRiskAuth > 1 ? "s" : ""}</span> flagged as HIGH RISK authenticity. Review fraud analysis before proceeding.
              </p>
            </div>
          )}

          {/* Filters + Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-44">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search candidates..."
                className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 h-9"
              />
            </div>

            <Select value={filterVerdict} onValueChange={v => setFilterVerdict(v as FilterVerdict)}>
              <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-slate-300 h-9">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <SelectValue placeholder="Verdict" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {["all", "STRONG_HIRE", "HIRE", "MAYBE", "NO_HIRE"].map(v => (
                  <SelectItem key={v} value={v} className="text-slate-300">{v === "all" ? "All verdicts" : v.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRisk} onValueChange={v => setFilterRisk(v as FilterRisk)}>
              <SelectTrigger className="w-28 bg-slate-800 border-slate-700 text-slate-300 h-9">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {["all", "LOW", "MEDIUM", "HIGH"].map(v => (
                  <SelectItem key={v} value={v} className="text-slate-300">{v === "all" ? "All risks" : v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAuth} onValueChange={v => setFilterAuth(v as FilterAuth)}>
              <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-slate-300 h-9">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <SelectValue placeholder="Authenticity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {["all", "AUTHENTIC", "SUSPICIOUS", "HIGH_RISK"].map(v => (
                  <SelectItem key={v} value={v} className="text-slate-300">{v === "all" ? "All auth." : v.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 ml-auto">
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} className="border-slate-700 text-slate-400 hover:text-slate-200 h-9 w-9 p-0">
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-slate-100 h-9 gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700" align="end">
                  <DropdownMenuItem
                    className="text-slate-300 hover:bg-slate-700 cursor-pointer gap-2"
                    onClick={() => exportCandidatesToCSV(candidates, jobTitle, orgName)}
                  >
                    <FileText className="w-4 h-4 text-green-400" />
                    Export CSV (Excel)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-slate-300 hover:bg-slate-700 cursor-pointer gap-2"
                    onClick={() => exportBatchSummaryPDF(candidates, jobTitle, orgName)}
                  >
                    <FileText className="w-4 h-4 text-red-400" />
                    Export Batch PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
                <tr className="border-b border-slate-800">
                  <th className="text-left p-3 text-slate-500 font-medium w-10">#</th>
                  <SortHeader label="Candidate" field="candidate_name" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Score" field="match_score_percentage" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="text-left p-3 text-slate-500 font-medium">Breakdown</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Verdict</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Risk</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Auth.</th>
                  <SortHeader label="Fluff%" field="ai_fluff" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="text-left p-3 text-slate-500 font-medium">Status</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center p-12">
                      <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
                      <p className="text-slate-500 mt-2">Loading candidates...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-12">
                      <User className="w-10 h-10 text-slate-700 mx-auto" />
                      <p className="text-slate-500 mt-2">No candidates found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => {
                    const originalRank = candidates.findIndex(cand => cand.id === c.id) + 1;
                    const score = c.match_score_percentage;
                    const verdict = c.ai_analysis?.hiring_verdict;
                    const risk = c.ai_analysis?.risk_assessment?.risk_level;
                    const auth = c.ai_analysis?.fraud_analysis?.authenticity_verdict;
                    const fluff = c.ai_analysis?.fraud_analysis?.ai_fluff_score;
                    const metrics = c.statistical_metrics;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => { setSelected(c); setSelectedRank(originalRank); }}
                        className={cn(
                          "border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-800/60",
                          selected?.id === c.id && "bg-violet-500/10 border-violet-500/20",
                          auth === "HIGH_RISK" && "border-l-2 border-l-red-500/60"
                        )}
                      >
                        <td className="p-3 text-center">
                          {originalRank <= 3
                            ? <span className="text-base">{RANK_ICONS[originalRank - 1]}</span>
                            : <span className="text-xs text-slate-500 font-mono">{originalRank}</span>
                          }
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-slate-200">{c.candidate_name}</p>
                          {c.candidate_email && <p className="text-xs text-slate-500 truncate max-w-36">{c.candidate_email}</p>}
                        </td>
                        <td className="p-3">
                          {score != null ? (
                            <div className="flex items-center gap-2">
                              <span className={cn("text-lg font-black font-mono", getScoreColor(score))}>{score.toFixed(0)}</span>
                              <div className="w-12">
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", getScoreBg(score))} style={{ width: `${score}%` }} />
                                </div>
                              </div>
                            </div>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="p-3">
                          {metrics ? (
                            <div className="space-y-0.5 min-w-24">
                              {Object.values(metrics).map((v, mi) => (
                                <div key={mi} className="flex items-center gap-1">
                                  <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full", getScoreBg(v as number))} style={{ width: `${v}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-600 font-mono">{(v as number).toFixed(0)}</span>
                                </div>
                              ))}
                            </div>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          {verdict
                            ? <Badge className={cn("text-xs", VERDICT_COLORS[verdict])}>{verdict.replace("_", " ")}</Badge>
                            : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          {risk
                            ? <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getRiskColor(risk))}>{risk}</span>
                            : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          {auth
                            ? <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", AUTH_COLORS[auth] ?? "text-slate-400 bg-slate-400/10")}>
                                {auth === "HIGH_RISK" ? "⚠ " : ""}{auth.replace("_", " ")}
                              </span>
                            : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          {fluff != null
                            ? <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", getFluffColor(fluff))}>
                                {fluff.toFixed(0)}%
                              </span>
                            : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="p-3"><StatusPill status={c.processing_status} /></td>
                        <td className="p-3">
                          <button
                            onClick={e => { e.stopPropagation(); setAuditCandidate(c); }}
                            title="Open GDPR Audit"
                            className="text-slate-600 hover:text-violet-400 transition-colors"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 text-right">Showing {filtered.length} of {candidates.length} candidates</p>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 flex-shrink-0 border border-slate-800 rounded-xl overflow-hidden">
            <CandidateScoreCard
              candidate={selected}
              rank={selectedRank}
              jobTitle={jobTitle}
              orgName={orgName}
              onClose={() => setSelected(null)}
              onOpenAudit={c => setAuditCandidate(c)}
            />
          </div>
        )}
      </div>

      {/* XAI Audit Modal */}
      {auditCandidate && (
        <XAIAuditModal
          candidate={auditCandidate}
          jobTitle={jobTitle}
          orgName={orgName}
          onClose={() => setAuditCandidate(null)}
        />
      )}
    </>
  );
}

function SortHeader({ label, field, current, dir, onSort }: {
  label: string; field: SortKey; current: SortKey; dir: "asc" | "desc"; onSort: (f: SortKey) => void;
}) {
  const active = current === field;
  return (
    <th className="text-left p-3 text-slate-500 font-medium cursor-pointer hover:text-slate-300 transition-colors select-none" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {active
          ? dir === "desc" ? <ChevronDown className="w-3 h-3 text-violet-400" /> : <ChevronUp className="w-3 h-3 text-violet-400" />
          : <ChevronDown className="w-3 h-3 opacity-30" />}
      </div>
    </th>
  );
}

function StatusPill({ status }: { status: CandidateEvaluation["processing_status"] }) {
  const config: Record<typeof status, { label: string; class: string }> = {
    completed: { label: "Done", class: "text-emerald-400 bg-emerald-400/10" },
    processing: { label: "Processing", class: "text-blue-400 bg-blue-400/10" },
    pending: { label: "Queued", class: "text-slate-400 bg-slate-400/10" },
    failed: { label: "Failed", class: "text-red-400 bg-red-400/10" },
  };
  const { label, class: cls } = config[status];
  return <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cls)}>{label}</span>;
}
