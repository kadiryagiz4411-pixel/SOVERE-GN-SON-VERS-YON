/**
 * B2B Batch Export Utilities
 * Exports candidate evaluation results as CSV or GDPR/KVKK compliance PDF.
 */
import { jsPDF } from "jspdf";
import type { CandidateEvaluation } from "@/services/b2bEvaluationEngine";

// ─── CSV Export ────────────────────────────────────────────────────────────

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCandidatesToCSV(
  candidates: CandidateEvaluation[],
  jobTitle: string,
  orgName: string
): void {
  const headers = [
    "Rank",
    "Candidate Name",
    "Email",
    "Match Score (%)",
    "Hiring Verdict",
    "Risk Level",
    "Authenticity",
    "AI Fluff Score (%)",
    "Technical Skill Fit",
    "Experience Depth",
    "Seniority Alignment",
    "Culture & Soft Skills",
    "Key Strengths",
    "Critical Gaps",
    "Statistical Percentile",
    "XAI Audit Reason",
    "Processing Status",
    "Evaluated At",
  ];

  const rows = candidates
    .filter(c => c.processing_status === "completed")
    .sort((a, b) => (b.match_score_percentage ?? 0) - (a.match_score_percentage ?? 0))
    .map((c, i) => {
      const ai = c.ai_analysis;
      const metrics = c.statistical_metrics;
      const fraud = ai?.fraud_analysis;

      return [
        i + 1,
        escapeCsv(c.candidate_name),
        escapeCsv(c.candidate_email),
        c.match_score_percentage?.toFixed(1) ?? "",
        escapeCsv(ai?.hiring_verdict?.replace("_", " ")),
        escapeCsv(ai?.risk_assessment?.risk_level),
        escapeCsv(fraud?.authenticity_verdict),
        fraud?.ai_fluff_score?.toFixed(0) ?? "",
        metrics?.technical_skill_fit?.toFixed(0) ?? "",
        metrics?.experience_depth_fit?.toFixed(0) ?? "",
        metrics?.seniority_alignment?.toFixed(0) ?? "",
        metrics?.culture_and_soft_skills?.toFixed(0) ?? "",
        escapeCsv(ai?.key_strengths?.slice(0, 3).join("; ")),
        escapeCsv(ai?.critical_gaps?.slice(0, 3).join("; ")),
        escapeCsv(ai?.statistical_percentile),
        escapeCsv(ai?.xai_audit_reason),
        escapeCsv(c.processing_status),
        escapeCsv(new Date(c.created_at).toLocaleDateString("en-GB")),
      ].join(",");
    });

  const meta = [
    `# Sovereign B2B — Candidate Evaluation Export`,
    `# Organization: ${orgName}`,
    `# Job Title: ${jobTitle}`,
    `# Exported: ${new Date().toISOString()}`,
    `# Total Candidates: ${candidates.filter(c => c.processing_status === "completed").length}`,
    `# GDPR Notice: This data is processed under legitimate interest (Art. 6(1)(f)).`,
    "",
  ].join("\n");

  const csv = meta + headers.join(",") + "\n" + rows.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sovereign-candidates-${jobTitle.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── GDPR / KVKK Compliance PDF Export ─────────────────────────────────────

export function exportCompliancePDF(candidate: CandidateEvaluation, jobTitle: string, orgName: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ai = candidate.ai_analysis;
  const fraud = ai?.fraud_analysis;
  const score = candidate.match_score_percentage ?? 0;

  const pageW = 210;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  const addLine = (h: number = 6) => { y += h; };
  const checkPage = (needed: number = 15) => {
    if (y + needed > 275) { doc.addPage(); y = 20; }
  };

  // ── Header ──
  doc.setFillColor(88, 28, 235); // violet-700
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SOVEREIGN B2B", marginL, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AI Candidate Evaluation — GDPR/KVKK Compliance Report", marginL, 20);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, marginL, 27);
  y = 42;

  // ── Organization & Job ──
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EVALUATION CONTEXT", marginL, y);
  addLine(6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const contextLines = [
    [`Organization:`, orgName],
    [`Job Title:`, jobTitle],
    [`Evaluation ID:`, candidate.id],
    [`Evaluated At:`, new Date(candidate.created_at).toLocaleString("en-GB")],
    [`Data Retention:`, "365 days from evaluation date"],
    [`Legal Basis:`, "GDPR Art. 6(1)(f) — Legitimate interest in talent acquisition"],
  ];
  contextLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, marginL, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, marginL + 38, y);
    addLine(5.5);
  });

  // ── Divider ──
  addLine(2);
  doc.setDrawColor(226, 232, 240);
  doc.line(marginL, y, pageW - marginR, y);
  addLine(6);

  // ── Candidate Identity ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CANDIDATE INFORMATION", marginL, y);
  addLine(6);
  doc.setFontSize(9);
  const candidateLines = [
    ["Full Name:", candidate.candidate_name],
    ["Email:", candidate.candidate_email ?? "Not provided"],
    ["CV File:", candidate.cv_storage_path?.split("/").pop() ?? "N/A"],
  ];
  candidateLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, marginL, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, marginL + 38, y);
    addLine(5.5);
  });

  addLine(2);
  doc.line(marginL, y, pageW - marginR, y);
  addLine(6);

  // ── Automated Decision Summary ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("AUTOMATED DECISION — ARTICLE 22 GDPR DISCLOSURE", marginL, y);
  addLine(6);

  // Score box
  const verdictColor = score >= 75 ? [16, 185, 129] : score >= 55 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(...verdictColor as [number, number, number]);
  doc.roundedRect(marginL, y - 1, 55, 18, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${score.toFixed(0)}/100`, marginL + 4, y + 9);
  doc.setFontSize(8);
  doc.text("MATCH SCORE", marginL + 4, y + 14.5);

  const verdictX = marginL + 60;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Hiring Verdict: ${ai?.hiring_verdict?.replace(/_/g, " ") ?? "—"}`, verdictX, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`Risk Level: ${ai?.risk_assessment?.risk_level ?? "—"}`, verdictX, y + 11);
  doc.text(`Confidence: ${((candidate.confidence_score ?? 0) * 100).toFixed(0)}%`, verdictX, y + 17);
  addLine(22);

  // XAI Audit Reason
  checkPage(20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(88, 28, 235);
  doc.text("Automated Decision Explanation (GDPR Art. 22 — Right to Explanation):", marginL, y);
  addLine(5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  const auditText = ai?.xai_audit_reason ?? "No automated decision explanation available.";
  const auditLines = doc.splitTextToSize(auditText, contentW);
  doc.text(auditLines, marginL, y);
  y += auditLines.length * 5 + 4;

  // Score Breakdown
  checkPage(40);
  addLine(2);
  doc.line(marginL, y, pageW - marginR, y);
  addLine(6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SCORING BREAKDOWN", marginL, y);
  addLine(6);
  doc.setFontSize(9);
  const metrics = candidate.statistical_metrics;
  if (metrics) {
    const breakdown = [
      ["Technical Skill Fit:", `${metrics.technical_skill_fit.toFixed(0)}/100`],
      ["Experience Depth:", `${metrics.experience_depth_fit.toFixed(0)}/100`],
      ["Seniority Alignment:", `${metrics.seniority_alignment.toFixed(0)}/100`],
      ["Culture & Soft Skills:", `${metrics.culture_and_soft_skills.toFixed(0)}/100`],
    ];
    breakdown.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, marginL, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, marginL + 48, y);
      addLine(5.5);
    });
  }

  // Key Strengths
  checkPage(30);
  addLine(2);
  doc.line(marginL, y, pageW - marginR, y);
  addLine(6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("KEY STRENGTHS", marginL, y);
  addLine(6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  (ai?.key_strengths ?? []).forEach(s => {
    checkPage(8);
    const lines = doc.splitTextToSize(`• ${s}`, contentW);
    doc.text(lines, marginL, y);
    y += lines.length * 5 + 1;
  });

  // Critical Gaps
  checkPage(30);
  addLine(3);
  doc.line(marginL, y, pageW - marginR, y);
  addLine(6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CRITICAL GAPS", marginL, y);
  addLine(6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const gaps = ai?.critical_gaps ?? [];
  if (gaps.length === 0) {
    doc.text("No critical gaps identified.", marginL, y);
    addLine(6);
  } else {
    gaps.forEach(g => {
      checkPage(8);
      const lines = doc.splitTextToSize(`• ${g}`, contentW);
      doc.text(lines, marginL, y);
      y += lines.length * 5 + 1;
    });
  }

  // Fraud Analysis
  if (fraud) {
    checkPage(35);
    addLine(3);
    doc.line(marginL, y, pageW - marginR, y);
    addLine(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("AUTHENTICITY & FRAUD ANALYSIS", marginL, y);
    addLine(6);
    doc.setFontSize(9);
    const fraudDetails = [
      ["Authenticity Verdict:", fraud.authenticity_verdict],
      ["AI Fluff Score:", `${fraud.ai_fluff_score.toFixed(0)}% (0=authentic, 100=all buzzwords)`],
    ];
    fraudDetails.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, marginL, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, marginL + 44, y);
      addLine(5.5);
    });
    if (fraud.timeline_flags.length > 0) {
      addLine(2);
      doc.setFont("helvetica", "bold");
      doc.text("Timeline Flags:", marginL, y);
      addLine(5);
      doc.setFont("helvetica", "normal");
      fraud.timeline_flags.forEach(f => {
        checkPage(8);
        const lines = doc.splitTextToSize(`• ${f}`, contentW);
        doc.text(lines, marginL, y);
        y += lines.length * 5 + 1;
      });
    }
    addLine(2);
    doc.setFont("helvetica", "bold");
    doc.text("Fraud Summary:", marginL, y);
    addLine(5);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(fraud.fraud_summary, contentW);
    doc.text(summaryLines, marginL, y);
    y += summaryLines.length * 5 + 2;
  }

  // Legal Footer
  checkPage(25);
  addLine(4);
  doc.line(marginL, y, pageW - marginR, y);
  addLine(5);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "italic");
  const footer = [
    "LEGAL NOTICE: This report was generated by automated AI processing (Sovereign B2B Engine). The candidate has the right to:",
    "1) Request human review of this automated decision (GDPR Art. 22). 2) Access their personal data (Art. 15). 3) Request erasure (Art. 17).",
    "Data processed under legitimate interest (Art. 6(1)(f)). Retained for 365 days. Contact: privacy@sovereignapp.pro",
  ];
  footer.forEach(line => {
    const wrapped = doc.splitTextToSize(line, contentW);
    doc.text(wrapped, marginL, y);
    y += wrapped.length * 4.5;
  });

  doc.save(`GDPR-audit-${candidate.candidate_name.replace(/\s+/g, "-")}-${Date.now()}.pdf`);
}

// ─── Batch Summary PDF ──────────────────────────────────────────────────────

export function exportBatchSummaryPDF(
  candidates: CandidateEvaluation[],
  jobTitle: string,
  orgName: string
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const completed = candidates
    .filter(c => c.processing_status === "completed")
    .sort((a, b) => (b.match_score_percentage ?? 0) - (a.match_score_percentage ?? 0));

  const pageW = 297;
  const marginL = 12;
  let y = 12;

  // Header
  doc.setFillColor(88, 28, 235);
  doc.rect(0, 0, 297, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SOVEREIGN B2B — Batch Evaluation Report", marginL, 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${orgName}  |  ${jobTitle}  |  ${completed.length} candidates  |  ${new Date().toLocaleDateString("en-GB")}`, marginL, 17);
  y = 30;

  // Column headers
  const cols = [
    { label: "#", x: marginL, w: 8 },
    { label: "Name", x: 22, w: 52 },
    { label: "Score", x: 76, w: 18 },
    { label: "Verdict", x: 96, w: 28 },
    { label: "Risk", x: 126, w: 18 },
    { label: "Auth.", x: 146, w: 24 },
    { label: "Fluff%", x: 172, w: 16 },
    { label: "Tech", x: 190, w: 14 },
    { label: "Exp", x: 206, w: 14 },
    { label: "Sen", x: 222, w: 14 },
    { label: "Soft", x: 238, w: 14 },
    { label: "Email", x: 254, w: 42 },
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(marginL - 2, y - 5, pageW - marginL - 8, 8, "F");
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  cols.forEach(col => doc.text(col.label, col.x, y));
  y += 5;

  // Rows
  doc.setFont("helvetica", "normal");
  completed.forEach((c, i) => {
    if (y > 188) { doc.addPage(); y = 15; }

    const rowBg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(...rowBg as [number, number, number]);
    doc.rect(marginL - 2, y - 4, pageW - marginL - 8, 7, "F");

    const score = c.match_score_percentage ?? 0;
    const scoreColor = score >= 80 ? [16, 185, 129] : score >= 65 ? [34, 197, 94] : score >= 50 ? [245, 158, 11] : [239, 68, 68];

    doc.setTextColor(51, 65, 85);
    doc.text(String(i + 1), cols[0].x, y);
    doc.text(c.candidate_name.substring(0, 28), cols[1].x, y);

    doc.setTextColor(...scoreColor as [number, number, number]);
    doc.setFont("helvetica", "bold");
    doc.text(`${score.toFixed(0)}%`, cols[2].x, y);

    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.text((c.ai_analysis?.hiring_verdict ?? "—").replace("_", " "), cols[3].x, y);
    doc.text(c.ai_analysis?.risk_assessment?.risk_level ?? "—", cols[4].x, y);
    doc.text(c.ai_analysis?.fraud_analysis?.authenticity_verdict ?? "—", cols[5].x, y);
    doc.text(c.ai_analysis?.fraud_analysis?.ai_fluff_score?.toFixed(0) ?? "—", cols[6].x, y);
    doc.text(c.statistical_metrics?.technical_skill_fit?.toFixed(0) ?? "—", cols[7].x, y);
    doc.text(c.statistical_metrics?.experience_depth_fit?.toFixed(0) ?? "—", cols[8].x, y);
    doc.text(c.statistical_metrics?.seniority_alignment?.toFixed(0) ?? "—", cols[9].x, y);
    doc.text(c.statistical_metrics?.culture_and_soft_skills?.toFixed(0) ?? "—", cols[10].x, y);
    doc.text((c.candidate_email ?? "").substring(0, 30), cols[11].x, y);
    y += 7;
  });

  doc.save(`sovereign-batch-${jobTitle.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`);
}
