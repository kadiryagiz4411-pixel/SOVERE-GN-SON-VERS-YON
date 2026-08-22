/**
 * ATSAnalyzer.tsx — B2C ATS Gap Analysis & 1-Click CV Tailoring Panel
 *
 * Features:
 * - Resume + JD text input
 * - Instant deterministic ATS score (0–100%)
 * - Hard Skills Gap, Soft Skills Gap, Formatting Errors breakdown
 * - "Analyse with AI" for narrative gap assessment (gpt-4o-mini)
 * - "1-Click ATS Fix" to rewrite bullets with missing keywords (gpt-4o)
 * - Copy / plain-text export of the fixed resume bullets
 */
import { useState, useCallback } from "react";
import {
  Target, Zap, AlertTriangle, CheckCircle2, XCircle, Copy,
  Check, Loader2, ChevronDown, ChevronUp, Download, RefreshCw,
  Sparkles, FileText, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  analyzeATSMatch,
  generateATSFix,
  getATSScoreColor,
  getATSScoreBg,
  type ATSAnalysisResult,
  type ATSFixResult,
} from "@/services/atsService";

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);

  const col =
    score >= 80 ? "#34d399"   // emerald
    : score >= 60 ? "#facc15" // yellow
    : score >= 40 ? "#f59e0b" // amber
    : "#f87171";              // red

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} stroke="#1e293b" strokeWidth="10" fill="none" />
        <circle
          cx="72" cy="72" r={r}
          stroke={col}
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="relative text-center">
        <p className="text-3xl font-bold text-slate-100">{score}%</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">ATS Score</p>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({
  icon, title, count, color,
}: { icon: React.ReactNode; title: string; count?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={cn("flex-shrink-0", color)}>{icon}</span>
      <span className="text-sm font-semibold text-slate-200">{title}</span>
      {count !== undefined && (
        <Badge className="ml-auto text-xs px-1.5 py-0 bg-slate-700 text-slate-300">
          {count}
        </Badge>
      )}
    </div>
  );
}

// ─── Keyword chip ─────────────────────────────────────────────────────────────

function Chip({ label, variant }: { label: string; variant: "matched" | "missing" | "soft" }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
      variant === "matched"
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
        : variant === "missing"
          ? "bg-red-500/10 text-red-400 border-red-500/25"
          : "bg-amber-500/10 text-amber-400 border-amber-500/25",
    )}>
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ATSAnalyzerProps {
  /** Pre-fill the resume text from the user's profile */
  prefillResume?: string;
  /** Pre-fill from the current job description in the Dashboard */
  prefillJD?: string;
  plan?: string;
  onUpgrade?: () => void;
}

export function ATSAnalyzer({ prefillResume = "", prefillJD = "", plan = "free", onUpgrade }: ATSAnalyzerProps) {
  const [resumeText, setResumeText] = useState(prefillResume);
  const [jdText, setJdText]         = useState(prefillJD);
  const [result, setResult]         = useState<ATSAnalysisResult | null>(null);
  const [fix, setFix]               = useState<ATSFixResult | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isFixing, setIsFixing]       = useState(false);
  const [showMatched, setShowMatched] = useState(false);
  const [copiedBullet, setCopiedBullet] = useState<number | null>(null);
  const [copiedAll, setCopiedAll]       = useState(false);

  const isPaidPlan = plan !== "free";

  const handleAnalyse = useCallback(async (withAI = false) => {
    if (!resumeText.trim() || resumeText.trim().length < 50) {
      toast.error("Please paste your resume text (at least 50 characters).");
      return;
    }
    if (!jdText.trim() || jdText.trim().length < 50) {
      toast.error("Please paste the job description (at least 50 characters).");
      return;
    }

    setIsAnalysing(true);
    setFix(null);
    try {
      const r = await analyzeATSMatch(resumeText, jdText, withAI && isPaidPlan);
      setResult(r);
    } catch (err) {
      toast.error("Analysis failed. Please try again.");
      console.error(err);
    } finally {
      setIsAnalysing(false);
    }
  }, [resumeText, jdText, isPaidPlan]);

  const handleFix = useCallback(async () => {
    if (!result) return;
    if (!isPaidPlan) { onUpgrade?.(); return; }

    setIsFixing(true);
    try {
      const f = await generateATSFix(resumeText, jdText, result.hardSkillGaps);
      setFix(f);
      toast.success(`Injected ${f.keywordsInjected.length} keywords into your bullet points.`);
    } catch (err) {
      toast.error("ATS Fix failed. Please try again.");
      console.error(err);
    } finally {
      setIsFixing(false);
    }
  }, [result, resumeText, jdText, isPaidPlan, onUpgrade]);

  const copyBullet = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedBullet(index);
    setTimeout(() => setCopiedBullet(null), 1500);
  };

  const copyAll = () => {
    if (!fix) return;
    navigator.clipboard.writeText(fix.rewrittenBullets.join("\n"));
    setCopiedAll(true);
    toast.success("All rewritten bullets copied to clipboard.");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const exportTxt = () => {
    if (!fix) return;
    const blob = new Blob([fix.rewrittenBullets.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "ats-optimised-resume.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as plain-text ATS file.");
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">ATS Gap Analyzer</h2>
          <p className="text-xs text-muted-foreground">Compare your resume against any job description</p>
        </div>
        <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-[10px]">
          B2C
        </Badge>
      </div>

      <div className="p-5 space-y-5">
        {/* Input row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Your Resume (paste text)
            </label>
            <textarea
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              placeholder="Paste your full resume text here…"
              className="w-full h-44 text-sm bg-background border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Target Job Description
            </label>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the full job description here…"
              className="w-full h-44 text-sm bg-background border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => handleAnalyse(false)}
            disabled={isAnalysing}
            variant="outline"
            className="gap-2"
          >
            {isAnalysing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            Analyse ATS Score
          </Button>
          {isPaidPlan && (
            <Button
              onClick={() => handleAnalyse(true)}
              disabled={isAnalysing}
              variant="default"
              className="gap-2"
            >
              {isAnalysing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyse with AI
            </Button>
          )}
          {!isPaidPlan && (
            <Button onClick={onUpgrade} variant="outline" className="gap-2 border-primary/30 text-primary">
              <Sparkles className="w-4 h-4" />
              AI Analysis (Pro+)
            </Button>
          )}
          {result && (
            <Button
              onClick={() => { setResult(null); setFix(null); }}
              variant="ghost"
              size="sm"
              className="gap-1.5 ml-auto text-muted-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Score + summary */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-900/50 border border-border">
              <ScoreRing score={result.matchScore} />

              <div className="flex-1 space-y-3">
                <p className={cn("text-sm font-medium", getATSScoreColor(result.matchScore))}>
                  {result.summary}
                </p>

                {/* Sub-bars */}
                {[
                  { label: "Keyword Coverage", value: result.matchedKeywords.length, max: result.matchedKeywords.length + result.hardSkillGaps.length, color: "bg-primary" },
                  { label: "Hard Skills Match", value: Math.max(0, 100 - result.hardSkillGaps.length * 8), max: 100, color: getATSScoreBg(result.matchScore) },
                  { label: "Soft Skills Match", value: Math.max(0, 100 - result.softSkillGaps.length * 12), max: 100, color: "bg-amber-500" },
                ].map(bar => (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{bar.label}</span>
                      <span>{bar.label === "Keyword Coverage" ? `${result.matchedKeywords.length} matched` : `${Math.min(100, bar.value)}%`}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", bar.color)}
                        style={{ width: `${Math.min(100, bar.label === "Keyword Coverage" ? (bar.value / (bar.max || 1)) * 100 : bar.value)}%` }}
                      />
                    </div>
                  </div>
                ))}

                {result.aiNarrative && (
                  <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5 text-primary inline mr-1.5" />
                    {result.aiNarrative}
                  </div>
                )}
              </div>
            </div>

            {/* Gaps grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Hard Skills Gap */}
              <div className="rounded-xl border border-border bg-card p-4">
                <SectionHeading
                  icon={<XCircle className="w-4 h-4" />}
                  title="Hard Skills Gap"
                  count={result.hardSkillGaps.length}
                  color="text-red-400"
                />
                {result.hardSkillGaps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hard skill gaps detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.hardSkillGaps.slice(0, 12).map(g => (
                      <Chip key={g.keyword} label={g.keyword} variant="missing" />
                    ))}
                    {result.hardSkillGaps.length > 12 && (
                      <span className="text-xs text-muted-foreground">+{result.hardSkillGaps.length - 12} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Soft Skills Gap */}
              <div className="rounded-xl border border-border bg-card p-4">
                <SectionHeading
                  icon={<AlertTriangle className="w-4 h-4" />}
                  title="Soft Skills Gap"
                  count={result.softSkillGaps.length}
                  color="text-amber-400"
                />
                {result.softSkillGaps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No soft skill gaps detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.softSkillGaps.map(g => (
                      <Chip key={g.keyword} label={g.keyword} variant="soft" />
                    ))}
                  </div>
                )}
              </div>

              {/* Formatting Errors */}
              <div className="rounded-xl border border-border bg-card p-4">
                <SectionHeading
                  icon={<AlertTriangle className="w-4 h-4" />}
                  title="Formatting Errors"
                  count={result.formattingErrors.length}
                  color="text-orange-400"
                />
                {result.formattingErrors.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Format looks clean.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {result.formattingErrors.map((e, i) => (
                      <li key={i} className="text-xs">
                        <p className="text-orange-400 font-medium">{e.issue}</p>
                        <p className="text-muted-foreground mt-0.5">{e.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Matched keywords (collapsed) */}
            {result.matchedKeywords.length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <button
                  className="flex items-center gap-2 w-full text-left"
                  onClick={() => setShowMatched(p => !p)}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-200">
                    Matched Keywords ({result.matchedKeywords.length})
                  </span>
                  {showMatched ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                </button>
                {showMatched && (
                  <div className="mt-3 flex flex-wrap gap-1.5 animate-in fade-in">
                    {result.matchedKeywords.map(kw => (
                      <Chip key={kw} label={kw} variant="matched" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 1-Click ATS Fix */}
            {result.hardSkillGaps.length > 0 && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      1-Click ATS Fix
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rewrites your bullet points to naturally include {Math.min(15, result.hardSkillGaps.length)} missing keywords — without fabricating experience.
                    </p>
                  </div>
                  <Button
                    onClick={handleFix}
                    disabled={isFixing}
                    className="shrink-0 gap-2 bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    {isFixing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Fixing…</>
                    ) : (
                      <><Sparkles className="w-4 h-4" />Fix My Resume</>
                    )}
                  </Button>
                </div>

                {/* Fixed bullets */}
                {fix && (
                  <div className="mt-5 space-y-4 animate-in fade-in">
                    {/* Keywords injected */}
                    {fix.keywordsInjected.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {fix.keywordsInjected.map(kw => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 font-medium">
                            +{kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Cover letter opener */}
                    {fix.coverLetterOpener && (
                      <div className="p-3 rounded-xl bg-background border border-border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cover letter opener</p>
                        <p className="text-sm text-foreground italic">"{fix.coverLetterOpener}"</p>
                      </div>
                    )}

                    {/* Side-by-side bullets */}
                    {fix.rewrittenBullets.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rewritten Bullets</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={copyAll} className="gap-1.5 h-7 text-xs">
                              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              Copy All
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportTxt} className="gap-1.5 h-7 text-xs">
                              <Download className="w-3.5 h-3.5" />
                              Export .txt
                            </Button>
                          </div>
                        </div>
                        {fix.rewrittenBullets.map((bullet, i) => (
                          <div key={i} className="group flex items-start gap-2 p-3 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors">
                            <span className="text-primary mt-0.5">•</span>
                            <p className="flex-1 text-sm text-foreground">{bullet}</p>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => copyBullet(bullet, i)}
                            >
                              {copiedBullet === i
                                ? <Check className="w-4 h-4 text-emerald-400" />
                                : <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                              }
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ATSAnalyzer;
