/**
 * atsService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dual-sided ATS Matching Engine for Sovereign.
 *
 * B2C: analyzeATSMatch()   — score + gap analysis for a single resume vs JD
 *      generateATSFix()    — AI rewrites bullet points, injecting missing keywords
 *
 * B2B: rankApplicants()    — batch score multiple resumes against one JD
 *      generateRejectionEmail() — polite, personalised rejection copy
 *
 * Architecture:
 *  Stage 1 — deterministic keyword matching (instant, zero cost)
 *  Stage 2 — GPT-4o-mini gap narrative + fix suggestions (cheap)
 *  Stage 3 — GPT-4o bullet rewrite (only when user clicks "1-Click ATS Fix")
 */

import { trimForLLM } from "@/utils/tokenTrimmer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApplicantStatus = "Interview" | "Hold" | "Reject";

export interface ATSSkillGap {
  keyword: string;
  /** Semantic category: 'technical' | 'soft' | 'tool' | 'domain' */
  category: "technical" | "soft" | "tool" | "domain";
  importance: "must_have" | "nice_to_have";
}

export interface FormattingError {
  issue: string;
  suggestion: string;
}

export interface ATSAnalysisResult {
  /** 0–100 composite ATS match score */
  matchScore: number;
  /** Matched keywords found in both JD and resume */
  matchedKeywords: string[];
  /** Keywords in JD missing from resume */
  hardSkillGaps: ATSSkillGap[];
  softSkillGaps: ATSSkillGap[];
  formattingErrors: FormattingError[];
  /** One-sentence summary of the match */
  summary: string;
  /** AI-generated narrative gaps (populated if AI mode used) */
  aiNarrative?: string;
  fromAI: boolean;
}

export interface ATSFixResult {
  originalBullets: string[];
  rewrittenBullets: string[];
  keywordsInjected: string[];
  coverLetterOpener: string;
}

export interface BulkApplicant {
  id: string;
  name: string;
  /** Raw plain-text content of the CV */
  cvText: string;
  email?: string;
}

export interface RankedApplicant extends BulkApplicant {
  matchScore: number;
  status: ApplicantStatus;
  topStrengths: string[];
  missingRequirements: string[];
  rejectionEmail?: string;
}

export interface BulkRankResult {
  ranked: RankedApplicant[];
  processedCount: number;
  durationMs: number;
}

// ─── Keyword extraction (deterministic) ──────────────────────────────────────

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","have","has","had",
  "do","does","did","will","would","could","should","may","might","must",
  "this","that","these","those","it","its","we","our","you","your",
  "they","their","he","she","him","her","who","what","when","where","how",
  "not","no","nor","so","yet","both","either","neither","whether",
  "if","then","than","as","such","also","about","above","after","before",
]);

const SOFT_SKILL_WORDS = new Set([
  "communication","leadership","teamwork","collaboration","problem-solving",
  "analytical","critical thinking","adaptability","creativity","initiative",
  "empathy","attention to detail","time management","organization","mentoring",
  "presentation","stakeholder","negotiation","decision-making","strategic",
  "proactive","self-motivated","results-driven","customer-focused",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-+#./]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function extractPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  // Common multi-word skills/tech phrases
  const phraseRegex =
    /\b(?:react\.?js?|node\.?js?|next\.?js?|vue\.?js?|type ?script|java ?script|python|c\+\+|c#|\.net|go ?lang|rust|kotlin|swift|aws|gcp|azure|ci\/cd|rest ?api|graph ?ql|postgre ?s?|mongo ?db|redis|docker|kubernetes|machine learning|deep learning|natural language|computer vision|data science|agile|scrum|devops|git\b|sql|nosql|spring boot|django|fastapi|flask|express\.?js|tailwind|sass|webpack|vite|jest|cypress|selenium|figma|sketch|adobe|jira|confluence|salesforce|hubspot|power ?bi|tableau|excel|word|powerpoint)\b/gi;

  return [...new Set((lower.match(phraseRegex) || []).map(p => p.trim()))];
}

// ─── Stage 1: deterministic scoring ──────────────────────────────────────────

function deterministicScore(resumeText: string, jdText: string): {
  score: number;
  matched: string[];
  missing: string[];
  softMissing: string[];
} {
  const jdKeywords = new Set([
    ...extractKeywords(jdText),
    ...extractPhrases(jdText),
  ]);
  const resumeKeywords = new Set([
    ...extractKeywords(resumeText),
    ...extractPhrases(resumeText),
  ]);

  const matched: string[] = [];
  const missing: string[] = [];
  const softMissing: string[] = [];

  for (const kw of jdKeywords) {
    const inResume =
      resumeKeywords.has(kw) ||
      resumeText.toLowerCase().includes(kw);

    if (inResume) {
      matched.push(kw);
    } else if (SOFT_SKILL_WORDS.has(kw)) {
      softMissing.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const total = jdKeywords.size || 1;
  const score = Math.min(100, Math.round((matched.length / total) * 100));

  return { score, matched, missing, softMissing };
}

function detectFormattingErrors(resumeText: string): FormattingError[] {
  const errors: FormattingError[] = [];
  const lower = resumeText.toLowerCase();

  if (lower.length < 300)
    errors.push({ issue: "Resume appears too short", suggestion: "Aim for at least 400–600 words for an ATS-optimised resume." });

  if (!/\b(?:19|20)\d{2}\b/.test(resumeText))
    errors.push({ issue: "No dates detected", suggestion: "Add start/end dates (MM/YYYY) to each role." });

  if (!/\d+[\%x×]|\$[\d,]+|[\d,]+ (?:users|customers|revenue|sales|growth)/.test(resumeText))
    errors.push({ issue: "No quantifiable achievements found", suggestion: "Add measurable results: '↑ revenue by 30%', 'managed 15 engineers'." });

  if (/(?:table|column|image|photo|graph|chart|icon)/i.test(resumeText))
    errors.push({ issue: "Possible table or image content", suggestion: "ATS parsers often miss content in tables. Use plain bullet lists instead." });

  if (resumeText.split(/\n/).some(l => l.length > 200))
    errors.push({ issue: "Long unbroken text blocks detected", suggestion: "Break long paragraphs into concise bullet points (≤ 2 lines each)." });

  return errors;
}

// ─── OpenAI helper (reuses VITE_OPENAI_API_KEY pattern from aiService) ────────

async function callOpenAI(
  model: string,
  messages: { role: string; content: string }[],
  maxTokens = 700,
): Promise<string> {
  const key = (import.meta as any).env?.VITE_OPENAI_API_KEY as string | undefined;
  if (!key) throw new Error("VITE_OPENAI_API_KEY is not set.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.25 }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

// ─── Public: analyzeATSMatch ──────────────────────────────────────────────────

/**
 * Runs the deterministic Stage 1 analysis.
 * If `useAI` is true, also calls GPT-4o-mini for a narrative gap assessment.
 */
export async function analyzeATSMatch(
  resumeText: string,
  jdText: string,
  useAI = false,
): Promise<ATSAnalysisResult> {
  const { trimmed: trimmedResume } = trimForLLM(resumeText, 4_000);
  const { trimmed: trimmedJD }     = trimForLLM(jdText, 3_000);

  const { score, matched, missing, softMissing } = deterministicScore(
    trimmedResume,
    trimmedJD,
  );

  const formattingErrors = detectFormattingErrors(resumeText);

  const hardSkillGaps: ATSSkillGap[] = missing.slice(0, 20).map(kw => ({
    keyword: kw,
    category: extractPhrases(kw).length ? "tool" : "technical",
    importance: score < 50 ? "must_have" : "nice_to_have",
  }));

  const softSkillGaps: ATSSkillGap[] = softMissing.slice(0, 8).map(kw => ({
    keyword: kw,
    category: "soft",
    importance: "nice_to_have",
  }));

  const summary =
    score >= 80
      ? "Strong match — resume aligns well with the job requirements."
      : score >= 60
        ? "Moderate match — a few key skills are missing. Consider tailoring your resume."
        : score >= 40
          ? "Weak match — significant keyword gaps detected. Use the 1-Click ATS Fix."
          : "Poor match — this role may require different skills or experience level.";

  let aiNarrative: string | undefined;

  if (useAI && hardSkillGaps.length > 0) {
    try {
      const prompt = `You are an expert ATS consultant. In 2–3 sentences, explain the most critical skill gaps between this resume and job description.

Missing keywords: ${hardSkillGaps.map(g => g.keyword).join(", ")}
ATS Score: ${score}%

Be specific, actionable, and professional. No bullet points — write flowing text.`;

      aiNarrative = await callOpenAI(
        "gpt-4o-mini",
        [{ role: "user", content: prompt }],
        200,
      );
    } catch {
      aiNarrative = undefined;
    }
  }

  return {
    matchScore: score,
    matchedKeywords: matched.slice(0, 30),
    hardSkillGaps,
    softSkillGaps,
    formattingErrors,
    summary,
    aiNarrative,
    fromAI: useAI,
  };
}

// ─── Public: generateATSFix ───────────────────────────────────────────────────

/**
 * Calls GPT-4o to rewrite the candidate's bullet points,
 * naturally incorporating missing keywords WITHOUT fabricating experience.
 */
export async function generateATSFix(
  resumeText: string,
  jdText: string,
  gaps: ATSSkillGap[],
): Promise<ATSFixResult> {
  const { trimmed: trimmedResume } = trimForLLM(resumeText, 3_000);
  const missingKeywords = gaps.map(g => g.keyword).slice(0, 15).join(", ");

  const prompt = `You are a professional CV writer. Rewrite the experience bullet points from this resume to naturally include the missing ATS keywords below.

RULES (strictly follow):
1. DO NOT fabricate experience, skills, or achievements the candidate didn't have.
2. Rephrase existing achievements to use the missing terminology where genuinely applicable.
3. Use strong action verbs. Be concise (≤ 20 words per bullet).
4. Return ONLY valid JSON — no markdown fences.

MISSING KEYWORDS TO INJECT: ${missingKeywords}

CURRENT RESUME (trimmed):
${trimmedResume}

RETURN:
{
  "originalBullets": ["exact bullets extracted from the resume (max 6)"],
  "rewrittenBullets": ["rewritten versions with keywords injected naturally (max 6)"],
  "keywordsInjected": ["list of keywords successfully injected"],
  "coverLetterOpener": "One powerful opening sentence for a cover letter tailored to this role."
}`;

  const raw = await callOpenAI(
    "gpt-4o",
    [
      {
        role: "system",
        content:
          "You are an expert ATS resume writer. Output only valid JSON. Never fabricate experience.",
      },
      { role: "user", content: prompt },
    ],
    900,
  );

  try {
    return JSON.parse(raw) as ATSFixResult;
  } catch {
    return {
      originalBullets: [],
      rewrittenBullets: [raw.slice(0, 600)],
      keywordsInjected: [],
      coverLetterOpener: "",
    };
  }
}

// ─── Public: rankApplicants (B2B bulk) ────────────────────────────────────────

function statusFromScore(score: number): ApplicantStatus {
  if (score >= 70) return "Interview";
  if (score >= 45) return "Hold";
  return "Reject";
}

/**
 * Scores and ranks a batch of applicants against a single JD.
 * Uses only deterministic Stage 1 (instant, no API cost).
 * Pass `useAI: true` to also get a GPT-4o-mini narrative for each (slower).
 */
export async function rankApplicants(
  applicants: BulkApplicant[],
  jdText: string,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkRankResult> {
  const startMs = Date.now();
  const ranked: RankedApplicant[] = [];

  const jdKeywords = [
    ...extractKeywords(jdText),
    ...extractPhrases(jdText),
  ];

  for (let i = 0; i < applicants.length; i++) {
    const app = applicants[i];
    const { score, matched, missing } = deterministicScore(app.cvText, jdText);

    ranked.push({
      ...app,
      matchScore: score,
      status: statusFromScore(score),
      topStrengths: matched.slice(0, 5),
      missingRequirements: missing.slice(0, 5),
    });

    onProgress?.(i + 1, applicants.length);
  }

  // Sort descending by score
  ranked.sort((a, b) => b.matchScore - a.matchScore);

  return {
    ranked,
    processedCount: applicants.length,
    durationMs: Date.now() - startMs,
  };
}

// ─── Public: generateRejectionEmail ──────────────────────────────────────────

/**
 * Generates a polite, personalised rejection email for a low-score applicant.
 * Uses GPT-4o-mini for warmth and variety.
 */
export async function generateRejectionEmail(
  candidateName: string,
  jobTitle: string,
  companyName = "our company",
): Promise<string> {
  const prompt = `Write a professional, empathetic rejection email for a job applicant.

Candidate: ${candidateName}
Role: ${jobTitle}
Company: ${companyName}

Requirements:
- 3–4 short paragraphs
- Open with a genuine thank-you
- Decline graciously without stating a specific reason
- Encourage them to apply for future roles
- Close warmly
- Tone: professional yet human
- Do NOT use clichés like "We had many qualified candidates"
- Max 150 words`;

  try {
    return await callOpenAI(
      "gpt-4o-mini",
      [{ role: "user", content: prompt }],
      300,
    );
  } catch {
    return `Dear ${candidateName},

Thank you for your interest in the ${jobTitle} role at ${companyName} and for taking the time to apply.

After careful consideration, we have decided to move forward with other candidates whose background more closely matches our current needs. This was not an easy decision, and we truly appreciate the effort you put into your application.

We encourage you to keep an eye on our openings and hope you will consider applying again in the future.

We wish you the very best in your job search.

Warm regards,
The ${companyName} Hiring Team`;
  }
}

// ─── Utility: score colour helpers ────────────────────────────────────────────

export function getATSScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export function getATSScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export function getStatusColor(status: ApplicantStatus): string {
  switch (status) {
    case "Interview": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "Hold":      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "Reject":    return "text-red-400 bg-red-500/10 border-red-500/30";
  }
}
