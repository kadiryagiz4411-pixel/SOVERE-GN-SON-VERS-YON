/**
 * Fraud Detection & CV Authenticity Service
 *
 * Provides client-side helpers for interpreting fraud signals returned by the
 * AI evaluation engine. The actual detection logic runs in the GPT-4o prompt;
 * this module provides types, thresholds, UI helpers, and pre-submission
 * heuristic checks that run before the API call.
 */

export type AuthenticityVerdict = "AUTHENTIC" | "SUSPICIOUS" | "HIGH_RISK";

export interface FraudSignal {
  type: "timeline_overlap" | "ai_fluff" | "skill_depth" | "suspicious_tenure" | "generic_language";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface PreSubmissionReport {
  signals: FraudSignal[];
  overall_risk: "low" | "medium" | "high";
  recommendation: string;
}

// ─── Thresholds ────────────────────────────────────────────────────────────

export const FLUFF_THRESHOLDS = {
  clean: 25,
  moderate: 55,
  high: 76,
} as const;

export const FLUFF_VERDICTS = {
  clean: "Concrete & Authentic",
  moderate: "Some Generic Language",
  high: "Heavy AI Buzzword Padding",
} as const;

// Common AI-generated fluff phrases to detect pre-submission
const FLUFF_PHRASES = [
  "leveraged synergies", "drove business value", "dynamic team player",
  "results-driven", "passionate about", "strategic thinker", "thought leader",
  "innovative solutions", "robust framework", "paradigm shift", "best practices",
  "proactive approach", "cross-functional collaboration", "value proposition",
  "stakeholder alignment", "seamless integration", "actionable insights",
  "holistic approach", "game-changer", "disruptive", "cutting-edge solutions",
  "go-to-market", "move the needle", "bandwidth", "circle back",
];

// ─── Pre-submission client-side heuristic check ────────────────────────────

export function analyzeTextLocally(cvText: string): PreSubmissionReport {
  const text = cvText.toLowerCase();
  const signals: FraudSignal[] = [];

  // Count fluff phrases
  const fluffHits = FLUFF_PHRASES.filter(p => text.includes(p));
  if (fluffHits.length >= 5) {
    signals.push({
      type: "ai_fluff",
      severity: "high",
      message: `CV contains ${fluffHits.length} generic buzzword phrases without quantified evidence.`,
    });
  } else if (fluffHits.length >= 2) {
    signals.push({
      type: "ai_fluff",
      severity: "medium",
      message: `CV uses ${fluffHits.length} vague buzzword phrases. Verify with concrete metrics.`,
    });
  }

  // Check for suspiciously short tenure patterns (e.g. 8+ companies in 5 years)
  const yearMatches = text.match(/\b(20\d{2})\b/g) ?? [];
  const uniqueYears = new Set(yearMatches).size;
  if (uniqueYears >= 8 && yearMatches.length >= 14) {
    signals.push({
      type: "suspicious_tenure",
      severity: "medium",
      message: "High job-switching frequency detected. May indicate instability.",
    });
  }

  // Very short CV — likely incomplete
  if (cvText.trim().length < 300) {
    signals.push({
      type: "generic_language",
      severity: "low",
      message: "CV text is very short. May have failed to extract properly from file.",
    });
  }

  const highCount = signals.filter(s => s.severity === "high").length;
  const mediumCount = signals.filter(s => s.severity === "medium").length;

  const overall_risk: "low" | "medium" | "high" =
    highCount >= 1 ? "high" :
    mediumCount >= 2 ? "medium" :
    mediumCount === 1 ? "medium" : "low";

  const recommendation =
    overall_risk === "high"
      ? "AI evaluation will perform deep authenticity check. Proceed with caution."
      : overall_risk === "medium"
      ? "Some signals detected. AI will verify and flag any inconsistencies."
      : "No major pre-submission signals. Proceeding to AI evaluation.";

  return { signals, overall_risk, recommendation };
}

// ─── Interpret AI-returned fraud score ────────────────────────────────────

export interface FraudInterpretation {
  label: string;
  description: string;
  badge_class: string;
  icon: "shield-check" | "shield-alert" | "shield-x";
  show_warning: boolean;
}

export function interpretFluffScore(score: number): FraudInterpretation {
  if (score <= FLUFF_THRESHOLDS.clean) {
    return {
      label: "Authentic",
      description: "CV contains concrete metrics, specific achievements, and no major fluff signals.",
      badge_class: "text-emerald-400 bg-emerald-400/10 border-emerald-500/30",
      icon: "shield-check",
      show_warning: false,
    };
  }
  if (score <= FLUFF_THRESHOLDS.moderate) {
    return {
      label: "Some Fluff",
      description: "CV mixes concrete content with some generic language. Investigate further.",
      badge_class: "text-amber-400 bg-amber-400/10 border-amber-500/30",
      icon: "shield-alert",
      show_warning: false,
    };
  }
  if (score <= FLUFF_THRESHOLDS.high) {
    return {
      label: "High AI Padding",
      description: "CV heavily relies on buzzwords with limited quantified evidence. Verify claims.",
      badge_class: "text-orange-400 bg-orange-400/10 border-orange-500/30",
      icon: "shield-alert",
      show_warning: true,
    };
  }
  return {
    label: "AI-Generated Risk",
    description: "CV shows strong signals of AI-generated content without genuine experience evidence.",
    badge_class: "text-red-400 bg-red-400/10 border-red-500/30",
    icon: "shield-x",
    show_warning: true,
  };
}

export function interpretAuthenticityVerdict(verdict: AuthenticityVerdict): {
  label: string;
  class: string;
  description: string;
} {
  switch (verdict) {
    case "AUTHENTIC":
      return {
        label: "Authentic",
        class: "text-emerald-400 bg-emerald-400/10 border-emerald-500/30",
        description: "No significant authenticity concerns detected.",
      };
    case "SUSPICIOUS":
      return {
        label: "Suspicious",
        class: "text-amber-400 bg-amber-400/10 border-amber-500/30",
        description: "One or more moderate authenticity signals. Manual review recommended.",
      };
    case "HIGH_RISK":
      return {
        label: "High Risk",
        class: "text-red-400 bg-red-400/10 border-red-500/30",
        description: "Multiple serious authenticity concerns. Exercise significant caution.",
      };
  }
}

// ─── GDPR / KVKK Audit Metadata ────────────────────────────────────────────

export interface AuditRecord {
  evaluation_id: string;
  candidate_name: string;
  job_title: string;
  score: number;
  verdict: string;
  xai_reason: string;
  evaluated_at: string;
  data_retention_days: number;
  legal_basis: string;
}

export function buildAuditRecord(params: {
  evaluationId: string;
  candidateName: string;
  jobTitle: string;
  score: number;
  verdict: string;
  xaiReason: string;
}): AuditRecord {
  return {
    evaluation_id: params.evaluationId,
    candidate_name: params.candidateName,
    job_title: params.jobTitle,
    score: params.score,
    verdict: params.verdict,
    xai_reason: params.xaiReason,
    evaluated_at: new Date().toISOString(),
    data_retention_days: 365,
    legal_basis: "Legitimate interest in talent acquisition (GDPR Art. 6(1)(f)). Candidate can request data deletion under Art. 17.",
  };
}
