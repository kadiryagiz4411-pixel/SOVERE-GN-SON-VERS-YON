/**
 * b2b-embed-candidate
 * Generates an OpenAI text-embedding-3-small vector for a completed candidate
 * evaluation and stores it in candidate_evaluations.embedding.
 * Called after a successful b2b-evaluate-cv run.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmbedRequest {
  evaluation_id: string;
}

/** Build a rich text representation of the candidate for embedding. */
function buildEmbedText(row: Record<string, unknown>): string {
  const ai = row.ai_analysis as Record<string, unknown> | null;
  const metrics = row.statistical_metrics as Record<string, number> | null;
  const fraud = ai?.fraud_analysis as Record<string, unknown> | null;

  const parts: string[] = [
    `Candidate: ${row.candidate_name ?? "Unknown"}`,
    `Match Score: ${row.match_score_percentage ?? "N/A"}/100`,
    `Verdict: ${ai?.hiring_verdict ?? ""}`,
    `Risk: ${(ai?.risk_assessment as Record<string, string>)?.risk_level ?? ""}`,
    `Authenticity: ${fraud?.authenticity_verdict ?? ""}`,
    `Percentile: ${ai?.statistical_percentile ?? ""}`,
    `Technical Fit: ${metrics?.technical_skill_fit ?? ""}`,
    `Experience Depth: ${metrics?.experience_depth_fit ?? ""}`,
    `Seniority Alignment: ${metrics?.seniority_alignment ?? ""}`,
    `Culture Fit: ${metrics?.culture_and_soft_skills ?? ""}`,
    `Strengths: ${((ai?.key_strengths as string[]) ?? []).join("; ")}`,
    `Gaps: ${((ai?.critical_gaps as string[]) ?? []).join("; ")}`,
    `XAI Reason: ${ai?.xai_audit_reason ?? ""}`,
    `Value Prop: ${(ai?.micro_brief as Record<string, string>)?.primary_value_prop ?? ""}`,
    `Red Flag: ${(ai?.micro_brief as Record<string, string>)?.primary_red_flag ?? ""}`,
    `Reasoning: ${ai?.explainable_reasoning ?? ""}`,
  ];

  return parts.filter(p => !p.endsWith(": ") && !p.endsWith(": N/A")).join("\n");
}

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

    const { evaluation_id }: EmbedRequest = await req.json();
    if (!evaluation_id) {
      return new Response(JSON.stringify({ error: "evaluation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch completed evaluation
    const { data: evalRow, error: fetchErr } = await supabase
      .from("candidate_evaluations")
      .select("id, candidate_name, candidate_email, match_score_percentage, confidence_score, statistical_metrics, ai_analysis, processing_status, organization_id")
      .eq("id", evaluation_id)
      .eq("processing_status", "completed")
      .single();

    if (fetchErr || !evalRow) {
      return new Response(JSON.stringify({ error: "Evaluation not found or not completed" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const embedText = buildEmbedText(evalRow as Record<string, unknown>);

    // Generate embedding via OpenAI text-embedding-3-small (1536 dims)
    const embedResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: embedText,
        dimensions: 1536,
      }),
    });

    if (!embedResponse.ok) {
      throw new Error(`OpenAI Embeddings error: ${await embedResponse.text()}`);
    }

    const embedData = await embedResponse.json();
    const embedding: number[] = embedData.data[0].embedding;

    // Store embedding in DB using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: updateErr } = await supabaseAdmin
      .from("candidate_evaluations")
      .update({
        embedding: `[${embedding.join(",")}]`,
        embedding_generated_at: new Date().toISOString(),
      })
      .eq("id", evaluation_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, dimensions: embedding.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("b2b-embed-candidate error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
