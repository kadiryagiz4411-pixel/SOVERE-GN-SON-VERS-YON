import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvaluationRequest {
  evaluation_id: string;
  cv_text: string;
  job_title: string;
  job_description: string;
  required_skills: string[];
  seniority_level: string;
  org_id: string;
}

interface EvaluationResult {
  candidate_name: string;
  overall_match_percentage: number;
  confidence_score: number;
  breakdown: {
    technical_skill_fit: number;
    experience_depth_fit: number;
    seniority_alignment: number;
    culture_and_soft_skills: number;
  };
  key_strengths: string[];
  critical_gaps: string[];
  risk_assessment: {
    risk_level: "LOW" | "MEDIUM" | "HIGH";
    reasons: string[];
  };
  statistical_percentile: string;
  explainable_reasoning: string;
  hiring_verdict: "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE";
  fraud_analysis: {
    ai_fluff_score: number;
    timeline_flags: string[];
    skill_depth_mismatch: string[];
    authenticity_verdict: "AUTHENTIC" | "SUSPICIOUS" | "HIGH_RISK";
    fraud_summary: string;
  };
  xai_audit_reason: string;
  interview_questions: string[];
  micro_brief: {
    primary_value_prop: string;
    primary_red_flag: string;
    tailored_interview_question: string;
  };
}

// Strict JSON schema for OpenAI Structured Outputs
const EVALUATION_SCHEMA = {
  type: "object",
  properties: {
    candidate_name: { type: "string" },
    overall_match_percentage: { type: "number" },
    confidence_score: { type: "number" },
    breakdown: {
      type: "object",
      properties: {
        technical_skill_fit: { type: "number" },
        experience_depth_fit: { type: "number" },
        seniority_alignment: { type: "number" },
        culture_and_soft_skills: { type: "number" },
      },
      required: ["technical_skill_fit", "experience_depth_fit", "seniority_alignment", "culture_and_soft_skills"],
      additionalProperties: false,
    },
    key_strengths: { type: "array", items: { type: "string" } },
    critical_gaps: { type: "array", items: { type: "string" } },
    risk_assessment: {
      type: "object",
      properties: {
        risk_level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        reasons: { type: "array", items: { type: "string" } },
      },
      required: ["risk_level", "reasons"],
      additionalProperties: false,
    },
    statistical_percentile: { type: "string" },
    explainable_reasoning: { type: "string" },
    hiring_verdict: { type: "string", enum: ["STRONG_HIRE", "HIRE", "MAYBE", "NO_HIRE"] },
    fraud_analysis: {
      type: "object",
      properties: {
        ai_fluff_score: { type: "number" },
        timeline_flags: { type: "array", items: { type: "string" } },
        skill_depth_mismatch: { type: "array", items: { type: "string" } },
        authenticity_verdict: { type: "string", enum: ["AUTHENTIC", "SUSPICIOUS", "HIGH_RISK"] },
        fraud_summary: { type: "string" },
      },
      required: ["ai_fluff_score", "timeline_flags", "skill_depth_mismatch", "authenticity_verdict", "fraud_summary"],
      additionalProperties: false,
    },
    xai_audit_reason: { type: "string" },
    interview_questions: { type: "array", items: { type: "string" } },
    micro_brief: {
      type: "object",
      properties: {
        primary_value_prop: { type: "string" },
        primary_red_flag: { type: "string" },
        tailored_interview_question: { type: "string" },
      },
      required: ["primary_value_prop", "primary_red_flag", "tailored_interview_question"],
      additionalProperties: false,
    },
  },
  required: [
    "candidate_name", "overall_match_percentage", "confidence_score",
    "breakdown", "key_strengths", "critical_gaps", "risk_assessment",
    "statistical_percentile", "explainable_reasoning", "hiring_verdict",
    "fraud_analysis", "xai_audit_reason", "interview_questions", "micro_brief",
  ],
  additionalProperties: false,
};

// ─── Global English-Native AI System Prompt ────────────────────────────────
// Sovereign Enterprise Talent Acquisition & Candidate Matching Engine v2
// Optimized for native English NLP, multi-format CV parsing, and compliance.
const SYSTEM_PROMPT = `You are Sovereign's Enterprise Talent Acquisition & Candidate Matching Engine.
Your goal is to perform ultra-precise, objective, and statistically grounded evaluations of candidates against Job Descriptions (JDs).
ALL output — rationale, summaries, scoring, and interview questions — MUST be written in crisp, concise, high-impact Business English.

═══════════════════════════════════════════
EVALUATION & SEMANTIC RULES
═══════════════════════════════════════════

1. SEMANTIC MATCHING — NOT LITERAL:
   Map equivalent global technical skills, frameworks, and roles seamlessly. Examples:
   • "React Architecture" == "Frontend Engineering Lead" == "SPA Development"
   • "Kubernetes" == "Cloud Infrastructure" == "Container Orchestration" == "DevOps"
   • "PostgreSQL" == "Relational Databases" == "SQL" == "RDBMS"
   • "Growth Marketing" == "Digital Marketing" == "Performance Marketing" == "Demand Gen"
   • "Machine Learning" == "ML" == "AI/ML" == "Predictive Modeling" == "Data Science"
   • "Node.js" == "Server-side JavaScript" == "Backend JavaScript" == "Express.js"
   • "Agile" == "Scrum" == "Kanban" == "SAFe" == "Iterative Development"
   • "Team Lead" == "Engineering Manager" == "Tech Lead" == "Senior IC with reports"
   Extend this semantic intelligence across ALL domains: technical, managerial, domain-specific, and soft skills.

2. RESUME FORMAT RESILIENCE:
   Parse complex multi-column PDFs, raw text dumps, visual timelines, and mixed-format resumes with maximum accuracy.
   Infer structure from context — do not fail on unconventional CV layouts.
   Extract: employment history, skill depth signals, quantifiable KPIs, tenure patterns, education, certifications.

3. EXECUTIVE DENSITY:
   All rationale, summaries, and interview questions must be written in professional Business English.
   Be specific, evidence-driven, and avoid vague language.
   Use active voice. Reference specific candidate experience, metrics, and job requirements.

4. FRAUD & BUZZWORD DETECTION:
   ai_fluff_score (0–100): Penalize CVs with generic buzzwords lacking quantified evidence.
   Signals of high fluff: "drove business value", "leveraged synergies", "dynamic team player", "results-driven professional" without supporting KPIs or metrics.
   timeline_flags: Detect overlapping full-time roles, suspicious tenure gaps, impossibly round durations, chronological inconsistencies.
   skill_depth_mismatch: Flag where claimed years of expertise contradicts demonstrated project complexity or seniority.
   authenticity_verdict: AUTHENTIC (clean), SUSPICIOUS (1–2 moderate signals), HIGH_RISK (multiple serious concerns).

5. EXPLAINABLE AI (XAI) — GLOBAL COMPLIANCE:
   xai_audit_reason: Provide a precise, legally transparent English explanation for the candidate's score.
   Format: "Candidate scored [X]/100 for [Job Title]. Met requirements: [list]. Missing: [list]. Score adjusted due to [key factors]."
   This text must satisfy GDPR Art. 22 (EU), KVKK Art. 11 (Turkey), and CCPA right-to-explanation (US) standards.
   The explanation must be factual, non-discriminatory, and role-relevant only.

6. INTERVIEW QUESTIONS — TAILORED & HIGH-IMPACT:
   Generate exactly 3 questions: Technical → Behavioral → Situational.
   Each question must reference specific details from this candidate's CV and the job requirements.
   Questions should probe the candidate's biggest gaps or validate their strongest claims.

7. MICRO BRIEF — EXECUTIVE SPEED READ:
   primary_value_prop: Single sharpest reason to advance this candidate. Must cite evidence.
   primary_red_flag: Most significant risk or missing requirement. Be specific.
   tailored_interview_question: The single highest-leverage screening question for this candidate.

8. SCORING:
   overall_match_percentage (0–100): Weighted composite of all breakdown dimensions.
   confidence_score (0.0–1.0): Reflects quality and quantity of extractable signal in the CV.
   statistical_percentile: Human-readable ranking string, e.g. "Top 8% of candidate pool".
   Breakdown dimensions MUST sum logically to the overall score.

Always extract candidate_name from the CV text. If not found, use "Unknown Candidate".
Never fabricate experience. Score only what is evidenced in the CV.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: EvaluationRequest = await req.json();
    const { evaluation_id, cv_text, job_title, job_description, required_skills, seniority_level } = body;

    if (!evaluation_id || !cv_text || !job_description) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing
    await supabase
      .from("candidate_evaluations")
      .update({ processing_status: "processing" })
      .eq("id", evaluation_id);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const userPrompt = `Evaluate this candidate's CV against the job description. Apply semantic concept matching — synonyms and domain equivalents count as matches. Return a complete structured JSON assessment.

═══ JOB CONTEXT ═══
JOB TITLE: ${job_title}
SENIORITY LEVEL: ${seniority_level}
REQUIRED SKILLS: ${required_skills.join(", ")}

JOB DESCRIPTION:
${job_description.substring(0, 3000)}

═══ CANDIDATE CV ═══
${cv_text.substring(0, 4500)}

═══ INSTRUCTIONS ═══
1. Match skills semantically — if the JD says "PostgreSQL" and CV shows "SQL/relational DB expertise", that counts.
2. Detect fraud signals: overlapping dates, AI-generated buzzword padding, claimed expertise that contradicts demonstrated work.
3. Write the xai_audit_reason as a legally compliant GDPR/KVKK explanation (1-3 sentences naming specific missing/met criteria).
4. Write 3 tailored interview questions (technical, behavioral, situational) that probe this specific candidate's gaps or strengths.
5. The micro_brief must be brutally concise: 1 sentence each for value prop, red flag, and interview question.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "candidate_evaluation_v2",
            strict: true,
            schema: EVALUATION_SCHEMA,
          },
        },
        temperature: 0.15,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errText}`);
    }

    const openaiData = await openaiResponse.json();
    const result: EvaluationResult = JSON.parse(openaiData.choices[0].message.content);

    // Persist all results into ai_analysis JSONB
    const { error: updateError } = await supabase
      .from("candidate_evaluations")
      .update({
        candidate_name: result.candidate_name || "Unknown Candidate",
        match_score_percentage: result.overall_match_percentage,
        confidence_score: result.confidence_score,
        statistical_metrics: {
          technical_skill_fit: result.breakdown.technical_skill_fit,
          experience_depth_fit: result.breakdown.experience_depth_fit,
          seniority_alignment: result.breakdown.seniority_alignment,
          culture_and_soft_skills: result.breakdown.culture_and_soft_skills,
        },
        ai_analysis: {
          key_strengths: result.key_strengths,
          critical_gaps: result.critical_gaps,
          risk_assessment: result.risk_assessment,
          statistical_percentile: result.statistical_percentile,
          explainable_reasoning: result.explainable_reasoning,
          hiring_verdict: result.hiring_verdict,
          // Extended fields
          fraud_analysis: result.fraud_analysis,
          xai_audit_reason: result.xai_audit_reason,
          interview_questions: result.interview_questions,
          micro_brief: result.micro_brief,
        },
        processing_status: "completed",
      })
      .eq("id", evaluation_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("b2b-evaluate-cv error:", err);

    try {
      const body = await (req.clone()).json().catch(() => ({}));
      if (body?.evaluation_id) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabaseAdmin
          .from("candidate_evaluations")
          .update({ processing_status: "failed", error_message: String(err) })
          .eq("id", body.evaluation_id);
      }
    } catch {}

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
