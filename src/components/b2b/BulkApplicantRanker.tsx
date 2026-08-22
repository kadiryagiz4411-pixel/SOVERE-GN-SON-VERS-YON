/**
 * BulkApplicantRanker.tsx — B2B Bulk CV Screening & Ranked Applicant Table
 *
 * Features:
 * - Multi-file drag-and-drop (PDF, DOCX, TXT — up to 200 files)
 * - Batched scoring with live progress bar
 * - Ranked table: Name, Score ring, Strengths, Missing Skills, Status badge
 * - Per-row "Generate Rejection Email" action
 * - "Bulk Reject All" button for Reject-status applicants
 * - CSV export of ranked table
 */
import { useState, useCallback, useRef } from "react";
import {
  Upload, FileText, Loader2, Download, Mail, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Users, Zap, AlertTriangle,
  Search, RefreshCw, ClipboardCopy, Check, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  rankApplicants,
  generateRejectionEmail,
  getATSScoreColor,
  getATSScoreBg,
  getStatusColor,
  type BulkApplicant,
  type RankedApplicant,
} from "@/services/atsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_FILES = 200;
const ACCEPTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
const ACCEPTED_EXT   = [".pdf", ".docx", ".txt"];

/** Very lightweight text extractor for plain-text and .txt files. */
async function extractPlainText(file: File): Promise<string> {
  if (file.type === "text/plain") {
    return await file.text();
  }
  // For PDF/DOCX we read raw bytes and extract visible ASCII strings
  // (adequate for keyword scoring; not a full parser)
  const buf  = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let text = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if ((c >= 32 && c < 127) || c === 10 || c === 13) {
      text += String.fromCharCode(c);
    }
  }
  // Collapse noise and keep readable words
  return text.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s{3,}/g, " ").trim();
}

function miniScoreRing(score: number, size = 36) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const col = score >= 70 ? "#34d399" : score >= 45 ? "#f59e0b" : "#f87171";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} stroke="#1e293b" strokeWidth="3.5" fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={col} strokeWidth="3.5" fill="none"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  applicant: RankedApplicant;
  rank: number;
  onGenerateEmail: (id: string) => void;
  generatingEmail: string | null;
  onCopyEmail: (id: string) => void;
  copiedEmail: string | null;
}

function ApplicantRow({ applicant, rank, onGenerateEmail, generatingEmail, onCopyEmail, copiedEmail }: RowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className={cn(
        "border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors cursor-pointer",
        expanded && "bg-slate-800/20",
      )} onClick={() => setExpanded(p => !p)}>
        {/* Rank */}
        <td className="px-4 py-3 text-xs text-slate-500 w-10">{rank}</td>

        {/* Score ring */}
        <td className="px-2 py-3 w-12">
          <div className="flex items-center gap-1.5">
            {miniScoreRing(applicant.matchScore)}
            <span className={cn("text-sm font-bold", getATSScoreColor(applicant.matchScore))}>
              {applicant.matchScore}%
            </span>
          </div>
        </td>

        {/* Name */}
        <td className="px-3 py-3">
          <p className="text-sm font-medium text-slate-200">{applicant.name}</p>
          {applicant.email && <p className="text-[11px] text-slate-500">{applicant.email}</p>}
        </td>

        {/* Top strengths */}
        <td className="px-3 py-3 hidden lg:table-cell">
          <div className="flex flex-wrap gap-1">
            {applicant.topStrengths.slice(0, 3).map(s => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {s}
              </span>
            ))}
            {applicant.topStrengths.length > 3 && (
              <span className="text-[10px] text-slate-500">+{applicant.topStrengths.length - 3}</span>
            )}
          </div>
        </td>

        {/* Missing */}
        <td className="px-3 py-3 hidden xl:table-cell">
          <div className="flex flex-wrap gap-1">
            {applicant.missingRequirements.slice(0, 3).map(s => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                {s}
              </span>
            ))}
          </div>
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <span className={cn("text-[11px] px-2 py-1 rounded-full border font-medium", getStatusColor(applicant.status))}>
            {applicant.status}
          </span>
        </td>

        {/* Actions */}
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          {applicant.status === "Reject" && (
            applicant.rejectionEmail ? (
              <button
                onClick={() => onCopyEmail(applicant.id)}
                className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-200"
              >
                {copiedEmail === applicant.id
                  ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</>
                  : <><ClipboardCopy className="w-3.5 h-3.5" /> Copy Email</>
                }
              </button>
            ) : (
              <button
                onClick={() => onGenerateEmail(applicant.id)}
                disabled={generatingEmail === applicant.id}
                className="text-xs flex items-center gap-1 text-violet-400 hover:text-violet-300 disabled:opacity-50"
              >
                {generatingEmail === applicant.id
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing…</>
                  : <><Mail className="w-3.5 h-3.5" /> Write Email</>
                }
              </button>
            )
          )}
        </td>

        {/* Expand */}
        <td className="px-3 py-3 w-8 text-slate-600">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>

      {/* Expanded rejection email */}
      {expanded && applicant.rejectionEmail && (
        <tr className="bg-slate-900/50">
          <td colSpan={8} className="px-6 py-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Rejection Email Draft
              </p>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans">{applicant.rejectionEmail}</pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BulkApplicantRankerProps {
  /** Pre-fill JD from the selected job posting */
  jobTitle?: string;
  jobDescription?: string;
}

export function BulkApplicantRanker({ jobTitle = "", jobDescription = "" }: BulkApplicantRankerProps) {
  const [jdText, setJdText]               = useState(jobDescription);
  const [isDragging, setIsDragging]       = useState(false);
  const [files, setFiles]                 = useState<File[]>([]);
  const [processing, setProcessing]       = useState(false);
  const [progress, setProgress]           = useState(0);
  const [ranked, setRanked]               = useState<RankedApplicant[]>([]);
  const [searchQuery, setSearchQuery]     = useState("");
  const [filterStatus, setFilterStatus]   = useState<"All" | "Interview" | "Hold" | "Reject">("All");
  const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail]         = useState<string | null>(null);
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File handling ─────────────────────────────────────────────────────────

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles
      .filter(f => ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.some(e => f.name.endsWith(e)))
      .slice(0, MAX_FILES - files.length);
    if (valid.length === 0) { toast.error("No valid files. Accepted: PDF, DOCX, TXT"); return; }
    setFiles(prev => [...prev, ...valid]);
    toast.success(`${valid.length} file${valid.length > 1 ? "s" : ""} added.`);
  }, [files.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ── Process ───────────────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (files.length === 0) { toast.error("Add at least one CV file."); return; }
    if (!jdText.trim() || jdText.trim().length < 50) {
      toast.error("Please enter a job description (min 50 characters).");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setRanked([]);

    const applicants: BulkApplicant[] = [];

    // Extract text from all files
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const text = await extractPlainText(f);
      const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      applicants.push({ id: `${i}-${f.name}`, name, cvText: text });
      setProgress(Math.round(((i + 1) / files.length) * 30));
    }

    const result = await rankApplicants(applicants, jdText, (done, total) => {
      setProgress(30 + Math.round((done / total) * 70));
    });

    setRanked(result.ranked);
    setProcessing(false);
    setProgress(100);
    toast.success(`Ranked ${result.processedCount} applicants in ${(result.durationMs / 1000).toFixed(1)}s.`);
  };

  // ── Rejection email ───────────────────────────────────────────────────────

  const handleGenerateEmail = async (id: string) => {
    const app = ranked.find(r => r.id === id);
    if (!app) return;
    setGeneratingEmail(id);
    try {
      const email = await generateRejectionEmail(app.name, jobTitle || "the role");
      setRanked(prev => prev.map(r => r.id === id ? { ...r, rejectionEmail: email } : r));
    } catch {
      toast.error("Failed to generate email. Please try again.");
    } finally {
      setGeneratingEmail(null);
    }
  };

  const handleCopyEmail = (id: string) => {
    const app = ranked.find(r => r.id === id);
    if (!app?.rejectionEmail) return;
    navigator.clipboard.writeText(app.rejectionEmail);
    setCopiedEmail(id);
    toast.success("Email copied to clipboard.");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleBulkReject = async () => {
    const rejectList = ranked.filter(r => r.status === "Reject" && !r.rejectionEmail);
    if (rejectList.length === 0) { toast.info("All rejection emails already generated."); return; }
    setIsBulkRejecting(true);
    let done = 0;
    for (const app of rejectList) {
      const email = await generateRejectionEmail(app.name, jobTitle || "the role");
      setRanked(prev => prev.map(r => r.id === app.id ? { ...r, rejectionEmail: email } : r));
      done++;
      toast.success(`Generated ${done}/${rejectList.length} rejection emails…`);
    }
    setIsBulkRejecting(false);
    toast.success(`All ${rejectList.length} rejection emails ready.`);
  };

  // ── CSV export ────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ["Rank", "Name", "Email", "Score (%)", "Status", "Top Strengths", "Missing Requirements"];
    const rows = ranked.map((r, i) => [
      i + 1,
      r.name,
      r.email ?? "",
      r.matchScore,
      r.status,
      r.topStrengths.join("; "),
      r.missingRequirements.join("; "),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `applicant-ranking-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  };

  // ── Filtered view ─────────────────────────────────────────────────────────

  const filtered = ranked
    .filter(r => filterStatus === "All" || r.status === filterStatus)
    .filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = {
    interview: ranked.filter(r => r.status === "Interview").length,
    hold:      ranked.filter(r => r.status === "Hold").length,
    reject:    ranked.filter(r => r.status === "Reject").length,
    avgScore:  ranked.length ? Math.round(ranked.reduce((s, r) => s + r.matchScore, 0) / ranked.length) : 0,
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* JD Input */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            {jobTitle ? `Screening for: ${jobTitle}` : "Bulk Applicant Screening"}
          </h3>
          <Badge className="ml-auto bg-violet-600/10 text-violet-400 border-violet-500/20 text-[10px]">B2B</Badge>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-500 uppercase tracking-wider">Job Description</label>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste the full job description here to score all applicants against it…"
            className="w-full h-28 text-sm bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 resize-none"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
          isDragging
            ? "border-violet-500 bg-violet-500/5"
            : "border-slate-700 hover:border-slate-500 bg-slate-900/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={e => addFiles(Array.from(e.target.files ?? []))}
        />
        <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <p className="text-sm text-slate-300 font-medium">
          Drag & drop CVs here or <span className="text-violet-400 underline">browse files</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT — up to {MAX_FILES} files</p>
        {files.length > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
            <FileText className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-slate-300 font-medium">{files.length} file{files.length > 1 ? "s" : ""} queued</span>
            <button
              onClick={e => { e.stopPropagation(); setFiles([]); }}
              className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* File list (compact) */}
      {files.length > 0 && files.length <= 10 && (
        <div className="rounded-xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-sm text-slate-300 truncate flex-1">{f.name}</span>
              <span className="text-[11px] text-slate-600">{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => removeFile(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Process button */}
      <div className="flex gap-3">
        <Button
          onClick={handleProcess}
          disabled={processing || files.length === 0}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white flex-1 sm:flex-none"
        >
          {processing
            ? <><Loader2 className="w-4 h-4 animate-spin" />Processing {files.length} CVs…</>
            : <><Zap className="w-4 h-4" />Rank {files.length || ""} Applicants</>
          }
        </Button>
        {ranked.length > 0 && (
          <Button onClick={() => { setRanked([]); setFiles([]); setProgress(0); }} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {processing && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Processing applicants…</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-800" />
        </div>
      )}

      {/* Results table */}
      {ranked.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          {/* Table header with KPIs */}
          <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center gap-5">
            <div className="flex gap-5">
              {[
                { label: "Interview", value: kpis.interview, color: "text-emerald-400" },
                { label: "Hold",      value: kpis.hold,      color: "text-amber-400" },
                { label: "Reject",    value: kpis.reject,    color: "text-red-400" },
                { label: "Avg Score", value: `${kpis.avgScore}%`, color: "text-slate-200" },
              ].map(k => (
                <div key={k.label}>
                  <p className={cn("text-lg font-bold", k.color)}>{k.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{k.label}</p>
                </div>
              ))}
            </div>

            <div className="ml-auto flex gap-2 flex-wrap">
              {/* Status filter */}
              {(["All", "Interview", "Hold", "Reject"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors",
                    filterStatus === s
                      ? "bg-violet-600 text-white border-violet-600"
                      : "text-slate-400 border-slate-700 hover:border-slate-500",
                  )}
                >
                  {s}
                </button>
              ))}

              {/* Bulk reject email */}
              {kpis.reject > 0 && (
                <Button
                  onClick={handleBulkReject}
                  disabled={isBulkRejecting}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-7"
                >
                  {isBulkRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Bulk Reject Emails
                </Button>
              )}

              {/* CSV export */}
              <Button onClick={exportCSV} size="sm" variant="outline" className="gap-1.5 text-xs h-7">
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-2.5 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  <th className="px-4 py-2.5 text-left w-10">#</th>
                  <th className="px-2 py-2.5 text-left">Score</th>
                  <th className="px-3 py-2.5 text-left">Name</th>
                  <th className="px-3 py-2.5 text-left hidden lg:table-cell">Top Strengths</th>
                  <th className="px-3 py-2.5 text-left hidden xl:table-cell">Missing</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-left">Actions</th>
                  <th className="px-3 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                      No applicants match your filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((app, i) => (
                    <ApplicantRow
                      key={app.id}
                      applicant={app}
                      rank={ranked.indexOf(app) + 1}
                      onGenerateEmail={handleGenerateEmail}
                      generatingEmail={generatingEmail}
                      onCopyEmail={handleCopyEmail}
                      copiedEmail={copiedEmail}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
              <span>Showing {filtered.length} of {ranked.length} applicants</span>
              <span>Top scorer: {ranked[0]?.name} ({ranked[0]?.matchScore}%)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BulkApplicantRanker;
