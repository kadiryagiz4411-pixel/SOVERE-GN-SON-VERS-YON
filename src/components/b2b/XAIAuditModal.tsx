import { useState } from "react";
import {
  X, Shield, FileText, Download, Scale, Clock, Eye,
  AlertTriangle, CheckCircle2, Copy, Check, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CandidateEvaluation } from "@/services/b2bEvaluationEngine";
import { getScoreColor, getScoreBg, getRiskColor } from "@/services/b2bEvaluationEngine";
import { interpretAuthenticityVerdict, interpretFluffScore } from "@/services/b2b/fraudDetector";
import { exportCompliancePDF } from "@/utils/b2bExport";

interface Props {
  candidate: CandidateEvaluation;
  jobTitle: string;
  orgName: string;
  onClose: () => void;
}

export default function XAIAuditModal({ candidate, jobTitle, orgName, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const ai = candidate.ai_analysis;
  const fraud = ai?.fraud_analysis;
  const score = candidate.match_score_percentage ?? 0;

  const auditText = ai?.xai_audit_reason
    ?? `Candidate scored ${score.toFixed(0)}/100 for ${jobTitle}. Insufficient information available for detailed explanation.`;

  const copyAuditText = () => {
    navigator.clipboard.writeText(auditText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      exportCompliancePDF(candidate, jobTitle, orgName);
    } finally {
      setTimeout(() => setExportingPDF(false), 1000);
    }
  };

  const fraudInterp = fraud ? interpretFluffScore(fraud.ai_fluff_score) : null;
  const authInterp = fraud ? interpretAuthenticityVerdict(fraud.authenticity_verdict) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">XAI Compliance Audit</h2>
              <p className="text-xs text-slate-500">GDPR Art. 22 · KVKK Compliance Report</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Candidate Identity */}
          <Section title="Candidate Identity" icon={<Eye className="w-4 h-4 text-slate-400" />}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Name" value={candidate.candidate_name} />
              <Field label="Email" value={candidate.candidate_email ?? "Not provided"} />
              <Field label="Evaluation ID" value={candidate.id.substring(0, 8) + "..."} mono />
              <Field label="Evaluated" value={new Date(candidate.created_at).toLocaleDateString("en-GB", { dateStyle: "long" })} />
            </div>
          </Section>

          {/* Automated Decision */}
          <Section
            title="Automated Decision Summary"
            icon={<Info className="w-4 h-4 text-violet-400" />}
            badge={<Badge className="bg-violet-600/20 text-violet-300 border-violet-500/30 text-xs">GDPR Art. 22</Badge>}
          >
            {/* Score ring mini */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className={cn("text-3xl font-black font-mono", getScoreColor(score))}>
                  {score.toFixed(0)}<span className="text-base font-normal text-slate-500">/100</span>
                </div>
                <div className="h-1.5 w-24 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  <div className={cn("h-full rounded-full", getScoreBg(score))} style={{ width: `${score}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ai?.hiring_verdict && (
                  <VerdictBadge verdict={ai.hiring_verdict} />
                )}
                {ai?.risk_assessment?.risk_level && (
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium border", getRiskColor(ai.risk_assessment.risk_level))}>
                    {ai.risk_assessment.risk_level} RISK
                  </span>
                )}
                {ai?.statistical_percentile && (
                  <span className="text-xs text-violet-400 flex items-center gap-1">
                    {ai.statistical_percentile}
                  </span>
                )}
              </div>
            </div>

            {/* Legal audit reason box */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Legal Audit Reason</p>
                <button
                  onClick={copyAuditText}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{auditText}</p>
            </div>
          </Section>

          {/* Score Breakdown */}
          {candidate.statistical_metrics && (
            <Section title="Score Breakdown" icon={<FileText className="w-4 h-4 text-slate-400" />}>
              <div className="space-y-2.5">
                {Object.entries(candidate.statistical_metrics).map(([k, v]) => {
                  const labels: Record<string, string> = {
                    technical_skill_fit: "Technical Skill Fit",
                    experience_depth_fit: "Experience Depth",
                    seniority_alignment: "Seniority Alignment",
                    culture_and_soft_skills: "Culture & Soft Skills",
                  };
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{labels[k] ?? k}</span>
                        <span className={cn("font-mono font-bold", getScoreColor(v as number))}>
                          {(v as number).toFixed(0)}/100
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", getScoreBg(v as number))} style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Fraud & Authenticity */}
          {fraud && (
            <Section
              title="Authenticity & Fraud Analysis"
              icon={<Shield className="w-4 h-4 text-slate-400" />}
              badge={
                authInterp ? (
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", authInterp.class)}>
                    {authInterp.label}
                  </span>
                ) : null
              }
            >
              <div className="space-y-4">
                {/* Fluff score meter */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">AI Fluff / Buzzword Score</span>
                      <span className="text-xs text-slate-600">(0 = authentic, 100 = all buzzwords)</span>
                    </div>
                    {fraudInterp && (
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", fraudInterp.badge_class)}>
                        {fraudInterp.label}
                      </span>
                    )}
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        fraud.ai_fluff_score <= 25 ? "bg-emerald-500" :
                        fraud.ai_fluff_score <= 55 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${fraud.ai_fluff_score}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-600">Authentic</span>
                    <span className={cn("text-xs font-bold font-mono", fraud.ai_fluff_score <= 25 ? "text-emerald-400" : fraud.ai_fluff_score <= 55 ? "text-amber-400" : "text-red-400")}>
                      {fraud.ai_fluff_score.toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-600">All Buzzwords</span>
                  </div>
                </div>

                {/* Fraud summary */}
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Fraud Assessment</p>
                  <p className="text-sm text-slate-200">{fraud.fraud_summary}</p>
                </div>

                {/* Timeline flags */}
                {fraud.timeline_flags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Timeline Flags ({fraud.timeline_flags.length})
                    </p>
                    <ul className="space-y-1.5">
                      {fraud.timeline_flags.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-amber-500 mt-0.5">⚠</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Skill depth mismatch */}
                {fraud.skill_depth_mismatch.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Skill Depth Discrepancies
                    </p>
                    <ul className="space-y-1.5">
                      {fraud.skill_depth_mismatch.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-orange-500 mt-0.5">●</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fraud.timeline_flags.length === 0 && fraud.skill_depth_mismatch.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    No timeline contradictions or skill depth mismatches detected.
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* GDPR Rights Notice */}
          <Section
            title="Data Subject Rights (GDPR / KVKK)"
            icon={<Scale className="w-4 h-4 text-blue-400" />}
          >
            <div className="space-y-2">
              {[
                ["Art. 15 — Right of Access", "Candidate may request a copy of all data held about them."],
                ["Art. 22 — Automated Decisions", "Candidate may request human review of this AI-generated score."],
                ["Art. 17 — Right to Erasure", "Candidate may request deletion of their evaluation data."],
                ["Art. 7 — KVKK", "Subject retains rights under Turkish Personal Data Protection Law."],
              ].map(([right, desc]) => (
                <div key={right} className="flex items-start gap-2.5 py-2 border-b border-slate-800 last:border-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-300">{right}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5" />
              Data retention: 365 days · Legal basis: Legitimate interest (Art. 6(1)(f))
            </div>
          </Section>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Sovereign B2B · Compliant with GDPR, KVKK & EU AI Act
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-700 text-slate-400 hover:text-slate-200"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              {exportingPDF ? "Generating..." : "Export GDPR PDF"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Section({
  title, icon, badge, children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("text-sm text-slate-200 mt-0.5", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const configs: Record<string, string> = {
    STRONG_HIRE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    HIRE: "bg-green-500/20 text-green-400 border-green-500/30",
    MAYBE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    NO_HIRE: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <Badge className={cn("text-xs font-semibold px-2.5 py-1 border", configs[verdict] ?? "bg-slate-700 text-slate-400")}>
      {verdict.replace("_", " ")}
    </Badge>
  );
}
