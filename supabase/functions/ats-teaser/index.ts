import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lightweight ATS teaser: returns score + first 2 flaws visible, rest locked.
// No credits consumed — this is the freemium hook.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText, jobDescription, outputLanguage } = await req.json();

    if (!cvText || typeof cvText !== "string" || cvText.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "CV text must be at least 50 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = outputLanguage || "English";
    const jdSection = jobDescription?.trim()
      ? `\n\nTARGET JOB DESCRIPTION:\n${jobDescription.trim().slice(0, 2000)}`
      : "";

    const systemPrompt = `You are an ATS (Applicant Tracking System) expert. Analyze the CV against the job description (if provided) and respond ONLY with valid JSON.

Return this exact JSON structure:
{
  "ats_score": <integer 0-100>,
  "flaws": [
    "<specific flaw or missing keyword #1>",
    "<specific flaw or missing keyword #2>",
    "<specific flaw or missing keyword #3>",
    "<specific flaw or missing keyword #4>",
    "<specific flaw or missing keyword #5>",
    "<specific flaw or missing keyword #6>",
    "<specific flaw or missing keyword #7>",
    "<specific flaw or missing keyword #8>"
  ],
  "top_strength": "<one sentence: what the CV does best>"
}

Rules:
- ats_score: honest ATS compatibility score (most CVs score 30-70)
- flaws: exactly 6-8 specific, actionable issues (missing keywords, formatting, weak verbs, gaps, etc.)
- Write in ${lang}
- Return ONLY the JSON object, no markdown fences`;

    const userPrompt = `CV/RESUME:\n${cvText.trim().slice(0, 6000)}${jdSection}`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!aiResponse.ok) {
      return new Response(
        JSON.stringify({ error: "AI analysis failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: { ats_score: number; flaws: string[]; top_strength: string };
    try {
      // Strip markdown fences if present
      const json = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      parsed = JSON.parse(json);
    } catch {
      console.error("Failed to parse AI JSON:", raw);
      return new Response(
        JSON.stringify({ error: "Analysis parsing failed. Please retry." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const score = Math.max(0, Math.min(100, Math.round(parsed.ats_score ?? 45)));
    const allFlaws: string[] = Array.isArray(parsed.flaws) ? parsed.flaws.slice(0, 8) : [];
    const totalFlaws = allFlaws.length;

    // Free tier sees only the first 2 flaws; rest are locked
    const visibleFlaws = allFlaws.slice(0, 2);
    const hiddenCount = Math.max(0, totalFlaws - 2);

    return new Response(
      JSON.stringify({
        ats_score: score,
        visible_flaws: visibleFlaws,
        hidden_flaws_count: hiddenCount,
        total_flaws: totalFlaws,
        top_strength: parsed.top_strength ?? "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ats-teaser error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
