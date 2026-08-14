import { useState } from "react";
import {
  X, Star, AlertTriangle, TrendingUp, Brain, Shield, Target,
  ChevronDown, ChevronRight, User, Mail, CheckCircle, XCircle, Scale,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CandidateEvaluation,
  getVerdictColor,
  getRiskColor,
  getScoreColor,
  getScoreBg,
  getFluffColor,
  getFluffLabel,
  getAuthenticityColor,
} from "@/services/b2bEvaluationEngine";
import { interpretFluffScore } from "@/services/b2b/fraudDetector";
import CandidateBriefCard from "./CandidateBriefCard";

interface Props {
  candidate: CandidateEvaluation;
  rank?: number;
  jobTitle?: string;
  orgName?: string;
  onClose?: () => void;
  onOpenAudit?: (candidate: CandidateEvaluation) => void;
}

const METRIC_LABELS: Record<string, string> = {
  technical_skill_fit: "Technical Skills",
  experience_depth_fit: "Experience Depth",
  seniority_alignment: "Seniority Alignment",
  culture_and_soft_skills: "Culture & Soft Skills",
};

type Section = "brief" | "breakdown" | "strengths" | "gaps" | "fraud" | "risk" | "reasoning";

export default function CandidateScoreCard({ candidate, rank, jobTitle, orgName, onClose, onOpenAudit }: Props) {
  const [expandedSection, setExpandedSection] = useState<Section | null>("brief");
  const { ai_analysis: ai, statistical_metrics: metrics } = candidate;
  const fraud = ai?.fraud_analysis;

  const toggleSection = (section: Section) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const score = candidate.match_score_percentage ?? 0;
  const fluffInterp = fraud ? interpretFluffScore(fraud.ai_fluff_score) : null;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {rank && (
            <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-violet-400">#{rank}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-100">{candidate.candidate_name}</h2>
            </div>
            {candidate.candidate_email && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm text-slate-400">{candidate.candidate_email}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAudit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenAudit(candidate)}
              className="text-slate-500 hover:text-violet-400 gap-1.5 h-8 px-2"
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="text-xs">GDPR Audit</span>
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200 h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Score Hero */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-5">
          {/* Circular score */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={score >= 80 ? "#10b981" : score >= 65 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"}
                strokeWidth="10"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-xl font-black", getScoreColor(score))}>{score.toFixed(0)}</span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {ai?.hiring_verdict && (
                <Badge className={cn(
                  "text-xs font-semibold px-2.5 py-1 border",
                  ai.hiring_verdict === "STRONG_HIRE" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                  ai.hiring_verdict === "HIRE" && "bg-green-500/20 text-green-400 border-green-500/30",
                  ai.hiring_verdict === "MAYBE" && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                  ai.hiring_verdict === "NO_HIRE" && "bg-red-500/20 text-red-400 border-red-500/30",
                )}>
                  {ai.hiring_verdict.replace("_", " ")}
                </Badge>
              )}
              {candidate.confidence_score != null && (
                <span className="text-xs text-slate-500">
                  {(candidate.confidence_score * 100).toFixed(0)}% conf.
                </span>
              )}
            </div>
            {ai?.statistical_percentile && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-slate-300">{ai.statistical_percentile}</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {ai?.risk_assessment && (
                <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", getRiskColor(ai.risk_assessment.risk_level))}>
                  <Shield className="w-2.5 h-2.5" />
                  {ai.risk_assessment.risk_level} RISK
                </div>
              )}
              {fraud && (
                <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", getAuthenticityColor(fraud.authenticity_verdict))}>
                  <Shield className="w-2.5 h-2.5" />
                  {fraud.authenticity_verdict}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fluff meter */}
        {fraud && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">AI Fluff Score</span>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", getFluffColor(fraud.ai_fluff_score))}>
                {getFluffLabel(fraud.ai_fluff_score)} · {fraud.ai_fluff_score.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  fraud.ai_fluff_score <= 25 ? "bg-emerald-500" :
                  fraud.ai_fluff_score <= 55 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${fraud.ai_fluff_score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Micro Brief + Interview Questions */}
        {(ai?.micro_brief || (ai?.interview_questions?.length ?? 0) > 0) && (
          <CollapsibleSection
            title="Executive Brief & Interview"
            icon={<Zap className="w-4 h-4 text-violet-400" />}
            id="brief"
            expanded={expandedSection === "brief"}
            onToggle={toggleSection as (id: string) => void}
          >
            <CandidateBriefCard candidate={candidate} />
          </CollapsibleSection>
        )}

        {/* Skill Breakdown */}
        {metrics && (
          <CollapsibleSection
            title="Score Breakdown"
            icon={<Target className="w-4 h-4 text-violet-400" />}
            id="breakdown"
            expanded={expandedSection === "breakdown"}
            onToggle={toggleSection as (id: string) => void}
          >
            <div className="space-y-3">
              {Object.entries(metrics).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{METRIC_LABELS[key] ?? key}</span>
                    <span className={cn("font-mono font-semibold", getScoreColor(value as number))}>
                      {(value as number).toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", getScoreBg(value as number))}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Key Strengths */}
        {ai?.key_strengths && ai.key_strengths.length > 0 && (
          <CollapsibleSection
            title="Key Strengths"
            icon={<Star className="w-4 h-4 text-amber-400" />}
            id="strengths"
            expanded={expandedSection === "strengths"}
            onToggle={toggleSection as (id: string) => void}
          >
            <ul className="space-y-2">
              {ai.key_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{s}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Critical Gaps */}
        {ai?.critical_gaps && ai.critical_gaps.length > 0 && (
          <CollapsibleSection
            title="Critical Gaps"
            icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
            id="gaps"
            expanded={expandedSection === "gaps"}
            onToggle={toggleSection as (id: string) => void}
          >
            <ul className="space-y-2">
              {ai.critical_gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{g}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Fraud Analysis */}
        {fraud && (
          <CollapsibleSection
            title="Fraud & Authenticity Analysis"
            icon={<Shield className="w-4 h-4 text-slate-400" />}
            id="fraud"
            expanded={expandedSection === "fraud"}
            onToggle={toggleSection as (id: string) => void}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium border", getAuthenticityColor(fraud.authenticity_verdict))}>
                  {fraud.authenticity_verdict}
                </span>
                {fluffInterp && (
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium border", fluffInterp.badge_class)}>
                    Fluff: {fraud.ai_fluff_score.toFixed(0)}% · {fluffInterp.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300">{fraud.fraud_summary}</p>
              {fraud.timeline_flags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Timeline Flags</p>
                  {fraud.timeline_flags.map((f, i) => (
                    <p key={i} className="text-xs text-slate-400 flex items-start gap-1.5 mb-1">
                      <span className="text-amber-500">⚠</span>{f}
                    </p>
                  ))}
                </div>
              )}
              {fraud.skill_depth_mismatch.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-400 mb-1.5">Skill Depth Issues</p>
                  {fraud.skill_depth_mismatch.map((m, i) => (
                    <p key={i} className="text-xs text-slate-400 flex items-start gap-1.5 mb-1">
                      <span className="text-orange-500">●</span>{m}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Risk Assessment */}
        {ai?.risk_assessment && (
          <CollapsibleSection
            title="Risk Assessment"
            icon={<Shield className="w-4 h-4 text-slate-400" />}
            id="risk"
            expanded={expandedSection === "risk"}
            onToggle={toggleSection as (id: string) => void}
          >
            <div className="space-y-2">
              <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium", getRiskColor(ai.risk_assessment.risk_level))}>
                <Shield className="w-4 h-4" />
                {ai.risk_assessment.risk_level} RISK
              </div>
              {ai.risk_assessment.reasons.length > 0 && (
                <ul className="space-y-1.5 mt-2">
                  {ai.risk_assessment.reasons.map((r, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-slate-600 mt-0.5">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* XAI Reasoning */}
        {ai?.explainable_reasoning && (
          <CollapsibleSection
            title="AI Reasoning (XAI)"
            icon={<Brain className="w-4 h-4 text-violet-400" />}
            id="reasoning"
            expanded={expandedSection === "reasoning"}
            onToggle={toggleSection as (id: string) => void}
          >
            <p className="text-sm text-slate-300 leading-relaxed">{ai.explainable_reasoning}</p>
            {ai?.xai_audit_reason && (
              <div className="mt-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                <p className="text-xs font-semibold text-violet-400 mb-1 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  Legal Audit Reason (GDPR Art. 22)
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{ai.xai_audit_reason}</p>
              </div>
            )}
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title, icon, id, expanded, onToggle, children
}: {
  title: string;
  icon: React.ReactNode;
  id: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-800">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-200">{title}</span>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-500" />
          : <ChevronRight className="w-4 h-4 text-slate-500" />
        }
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
