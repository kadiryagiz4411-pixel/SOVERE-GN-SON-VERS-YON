import { MessageSquare, Zap, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CandidateEvaluation } from "@/services/b2bEvaluationEngine";

interface Props {
  candidate: CandidateEvaluation;
  className?: string;
}

export default function CandidateBriefCard({ candidate, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const ai = candidate.ai_analysis;
  const brief = ai?.micro_brief;
  const questions = ai?.interview_questions ?? [];

  if (!brief && questions.length === 0) return null;

  const copyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  return (
    <div className={cn("rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden", className)}>
      {/* Micro Brief — always visible */}
      {brief && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Executive Brief</span>
          </div>

          {/* Primary Value Prop */}
          <BriefRow
            icon={<div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1" />}
            label="Value Prop"
            text={brief.primary_value_prop}
            textClass="text-emerald-300"
          />

          {/* Primary Red Flag */}
          <BriefRow
            icon={<div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1" />}
            label="Red Flag"
            text={brief.primary_red_flag}
            textClass="text-red-300"
          />

          {/* Tailored Question */}
          <div className="flex items-start gap-2.5 pt-1 border-t border-slate-700/50">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 mb-1">Screening Question</p>
              <div className="flex items-start gap-2">
                <p className="text-xs text-amber-200 italic flex-1">&ldquo;{brief.tailored_interview_question}&rdquo;</p>
                <button
                  onClick={() => copyQuestion(brief.tailored_interview_question, -1)}
                  className="flex-shrink-0 text-slate-600 hover:text-amber-400 transition-colors mt-0.5"
                  title="Copy question"
                >
                  {copiedIdx === -1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview Questions Expander */}
      {questions.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-slate-700/60 hover:bg-slate-700/30 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-slate-400">{questions.length} Interview Questions</span>
            </div>
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            }
          </button>

          {expanded && (
            <div className="border-t border-slate-700/60 divide-y divide-slate-700/40">
              {questions.map((q, i) => {
                const labels = ["Technical", "Behavioral", "Situational"];
                const colors = [
                  "text-blue-400 bg-blue-400/10",
                  "text-purple-400 bg-purple-400/10",
                  "text-teal-400 bg-teal-400/10",
                ];
                return (
                  <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-700/20 transition-colors">
                    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5", colors[i] ?? "text-slate-400 bg-slate-400/10")}>
                      {labels[i] ?? `Q${i + 1}`}
                    </span>
                    <p className="text-xs text-slate-300 flex-1 leading-relaxed italic">&ldquo;{q}&rdquo;</p>
                    <button
                      onClick={() => copyQuestion(q, i)}
                      className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors mt-0.5"
                      title="Copy question"
                    >
                      {copiedIdx === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BriefRow({
  icon, label, text, textClass,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  textClass: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
        <p className={cn("text-xs leading-relaxed", textClass)}>{text}</p>
      </div>
    </div>
  );
}
