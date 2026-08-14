import { supabase } from "@/integrations/supabase/client";

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface StatisticalMetrics {
  technical_skill_fit: number;
  experience_depth_fit: number;
  seniority_alignment: number;
  culture_and_soft_skills: number;
}

export interface RiskAssessment {
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}

export interface FraudAnalysis {
  ai_fluff_score: number;
  timeline_flags: string[];
  skill_depth_mismatch: string[];
  authenticity_verdict: "AUTHENTIC" | "SUSPICIOUS" | "HIGH_RISK";
  fraud_summary: string;
}

export interface MicroBrief {
  primary_value_prop: string;
  primary_red_flag: string;
  tailored_interview_question: string;
}

export interface AIAnalysis {
  key_strengths: string[];
  critical_gaps: string[];
  risk_assessment: RiskAssessment;
  statistical_percentile: string;
  explainable_reasoning: string;
  hiring_verdict: "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE";
  // Extended fields (v2)
  fraud_analysis?: FraudAnalysis;
  xai_audit_reason?: string;
  interview_questions?: string[];
  micro_brief?: MicroBrief;
}

export interface CandidateEvaluation {
  id: string;
  job_posting_id: string;
  organization_id: string;
  candidate_name: string;
  candidate_email: string | null;
  cv_storage_path: string | null;
  match_score_percentage: number | null;
  confidence_score: number | null;
  statistical_metrics: StatisticalMetrics | null;
  ai_analysis: AIAnalysis | null;
  processing_status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  required_skills: string[];
  nice_to_have_skills: string[];
  seniority_level: "junior" | "mid" | "senior" | "lead" | "executive";
  employment_type: "full_time" | "part_time" | "contract" | "freelance";
  location: string | null;
  created_by: string;
  is_active: boolean;
  candidate_count: number;
  created_at: string;
}

export interface UploadQueueItem {
  file: File;
  status: "queued" | "uploading" | "evaluating" | "done" | "error";
  progress: number;
  evaluationId?: string;
  error?: string;
  candidateName?: string;
  matchScore?: number;
}

// ─── Concurrency Queue ───────────────────────────────────────────────────────

export class ConcurrencyQueue {
  private running = 0;
  private queue: (() => Promise<void>)[] = [];

  constructor(private concurrency: number = 4) {}

  async add(task: () => Promise<void>): Promise<void> {
    if (this.running < this.concurrency) {
      this.running++;
      try {
        await task();
      } finally {
        this.running--;
        this.next();
      }
    } else {
      await new Promise<void>((resolve, reject) => {
        this.queue.push(async () => {
          try {
            await task();
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  }

  private next() {
    if (this.queue.length > 0 && this.running < this.concurrency) {
      const next = this.queue.shift()!;
      this.running++;
      next().finally(() => {
        this.running--;
        this.next();
      });
    }
  }
}

// ─── PDF/DOCX Text Extraction ────────────────────────────────────────────────

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "text/plain") {
    return await file.text();
  }

  if (file.type === "application/pdf") {
    // Read as ArrayBuffer and extract text via basic byte parsing
    // For production, a proper PDF parser (pdf.js) would be ideal;
    // this lightweight approach extracts readable text tokens.
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let text = "";
    for (let i = 0; i < bytes.length - 1; i++) {
      const c = bytes[i];
      if (c >= 0x20 && c < 0x7f) {
        text += String.fromCharCode(c);
      } else if (c === 0x0a || c === 0x0d) {
        text += "\n";
      }
    }
    // Remove PDF control noise, keep readable lines
    return text
      .split("\n")
      .filter(line => line.trim().length > 3 && !/^[\x00-\x1f]*$/.test(line))
      .join("\n")
      .substring(0, 8000);
  }

  if (file.type.includes("wordprocessingml")) {
    // DOCX is a zip — extract XML text content
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const wordDoc = zip.file("word/document.xml");
    if (!wordDoc) return file.name;
    const xml = await wordDoc.async("text");
    return xml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 8000);
  }

  return file.name;
}

// ─── Upload single CV to storage ─────────────────────────────────────────────

export async function uploadCV(
  file: File,
  orgId: string,
  jobId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/${jobId}/${Date.now()}_${safeName}`;

  onProgress?.(10);

  const { data, error } = await supabase.storage
    .from("organization-cvs")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;
  onProgress?.(100);
  return data.path;
}

// ─── Create evaluation record ─────────────────────────────────────────────────

export async function createEvaluationRecord(params: {
  jobPostingId: string;
  organizationId: string;
  cvStoragePath: string;
  fileName: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("candidate_evaluations")
    .insert({
      job_posting_id: params.jobPostingId,
      organization_id: params.organizationId,
      cv_storage_path: params.cvStoragePath,
      candidate_name: params.fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
      processing_status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

// ─── Trigger AI evaluation ────────────────────────────────────────────────────

export async function triggerAIEvaluation(params: {
  evaluationId: string;
  cvText: string;
  jobPosting: JobPosting;
  orgId: string;
}): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/b2b-evaluate-cv`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      evaluation_id: params.evaluationId,
      cv_text: params.cvText,
      job_title: params.jobPosting.title,
      job_description: params.jobPosting.description,
      required_skills: params.jobPosting.required_skills,
      seniority_level: params.jobPosting.seniority_level,
      org_id: params.orgId,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }
}

// ─── Bulk processing pipeline ─────────────────────────────────────────────────

export interface BulkProcessOptions {
  files: File[];
  jobPosting: JobPosting;
  orgId: string;
  concurrency?: number;
  onItemUpdate: (index: number, update: Partial<UploadQueueItem>) => void;
}

export async function processBulkCVs(options: BulkProcessOptions): Promise<void> {
  const { files, jobPosting, orgId, concurrency = 4, onItemUpdate } = options;
  const queue = new ConcurrencyQueue(concurrency);

  const tasks = files.map((file, index) =>
    queue.add(async () => {
      try {
        // 1. Upload
        onItemUpdate(index, { status: "uploading", progress: 5 });
        const storagePath = await uploadCV(file, orgId, jobPosting.id, (pct) => {
          onItemUpdate(index, { progress: Math.round(pct * 0.4) });
        });

        // 2. Create DB record
        onItemUpdate(index, { progress: 45 });
        const evalId = await createEvaluationRecord({
          jobPostingId: jobPosting.id,
          organizationId: orgId,
          cvStoragePath: storagePath,
          fileName: file.name,
        });

        // 3. Extract text
        onItemUpdate(index, { status: "evaluating", progress: 55, evaluationId: evalId });
        const cvText = await extractTextFromFile(file);

        // 4. AI evaluation
        onItemUpdate(index, { progress: 65 });
        await triggerAIEvaluation({ evaluationId: evalId, cvText, jobPosting, orgId });

        // 5. Fetch result
        const { data } = await supabase
          .from("candidate_evaluations")
          .select("candidate_name, match_score_percentage")
          .eq("id", evalId)
          .single();

        onItemUpdate(index, {
          status: "done",
          progress: 100,
          candidateName: data?.candidate_name,
          matchScore: data?.match_score_percentage ?? undefined,
        });
      } catch (err) {
        onItemUpdate(index, {
          status: "error",
          progress: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  await Promise.all(tasks);
}

// ─── Fetch job postings for org ───────────────────────────────────────────────

export async function fetchJobPostings(orgId: string): Promise<JobPosting[]> {
  const { data, error } = await supabase
    .from("job_postings")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as JobPosting[];
}

// ─── Fetch candidate evaluations ──────────────────────────────────────────────

export async function fetchCandidateEvaluations(jobPostingId: string): Promise<CandidateEvaluation[]> {
  const { data, error } = await supabase
    .from("candidate_evaluations")
    .select("*")
    .eq("job_posting_id", jobPostingId)
    .order("match_score_percentage", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as CandidateEvaluation[];
}

// ─── Create job posting ────────────────────────────────────────────────────────

export async function createJobPosting(params: {
  organizationId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniorityLevel: JobPosting["seniority_level"];
  employmentType: JobPosting["employment_type"];
  location?: string;
}): Promise<JobPosting> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("job_postings")
    .insert({
      organization_id: params.organizationId,
      title: params.title,
      description: params.description,
      required_skills: params.requiredSkills,
      nice_to_have_skills: params.niceToHaveSkills,
      seniority_level: params.seniorityLevel,
      employment_type: params.employmentType,
      location: params.location ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as JobPosting;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

export function getVerdictColor(verdict: AIAnalysis["hiring_verdict"]): string {
  switch (verdict) {
    case "STRONG_HIRE": return "text-emerald-400";
    case "HIRE":        return "text-green-400";
    case "MAYBE":       return "text-amber-400";
    case "NO_HIRE":     return "text-red-400";
    default:            return "text-slate-400";
  }
}

export function getRiskColor(risk: RiskAssessment["risk_level"]): string {
  switch (risk) {
    case "LOW":    return "text-emerald-400 bg-emerald-400/10";
    case "MEDIUM": return "text-amber-400 bg-amber-400/10";
    case "HIGH":   return "text-red-400 bg-red-400/10";
    default:       return "text-slate-400 bg-slate-400/10";
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 65) return "text-green-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function getFluffColor(score: number): string {
  if (score <= 25) return "text-emerald-400 bg-emerald-400/10 border-emerald-500/30";
  if (score <= 55) return "text-amber-400 bg-amber-400/10 border-amber-500/30";
  return "text-red-400 bg-red-400/10 border-red-500/30";
}

export function getFluffLabel(score: number): string {
  if (score <= 25) return "Authentic";
  if (score <= 55) return "Some Fluff";
  return "High AI Fluff";
}

export function getAuthenticityColor(verdict: FraudAnalysis["authenticity_verdict"]): string {
  switch (verdict) {
    case "AUTHENTIC":  return "text-emerald-400 bg-emerald-400/10 border-emerald-500/30";
    case "SUSPICIOUS": return "text-amber-400 bg-amber-400/10 border-amber-500/30";
    case "HIGH_RISK":  return "text-red-400 bg-red-400/10 border-red-500/30";
    default:           return "text-slate-400 bg-slate-400/10 border-slate-500/30";
  }
}
