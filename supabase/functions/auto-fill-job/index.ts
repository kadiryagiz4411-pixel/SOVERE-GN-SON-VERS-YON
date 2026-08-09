import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription } = await req.json();

    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Job description too short (min 20 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth check
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

    // Check plan - only Pro and Elite can use auto-fill
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const plan = profile?.subscription_plan || "basic";
    if (plan !== "pro" && plan !== "elite") {
      return new Response(
        JSON.stringify({ error: "Auto-fill requires Pro or Elite plan" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured. OPENAI_API_KEY missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a job description analyzer. Analyze the given job description and extract structured metadata. Return ONLY a JSON object with these fields:

{
  "segment": "freelancer" or "corporate",
  "platformType": "upwork" | "fiverr" | "direct-client" | "agency" | "",
  "professionCluster": "creative" | "technical" | "marketing" | "consulting" | "",
  "suggestedProfession": "short profession label like 'Web Developer' or 'Graphic Designer'",
  "suggestedTone": "professional" | "aggressive" | "calm" | "consistent",
  "detectedLanguage": "ISO 639-1 code like 'en', 'tr', 'de', etc.",
  "confidence": 0.0 to 1.0
}

Rules:
- If the job mentions Upwork, Fiverr, freelance platforms, set segment to "freelancer" and detect platformType
- If it mentions a company hiring full-time/part-time, set segment to "corporate"
- Detect the profession cluster from the job requirements
- Suggest the best tone based on the job's formality level
- Detect the language the job description is written in
- Return ONLY valid JSON, nothing else`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: jobDescription.slice(0, 5000) },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      // Return sensible defaults
      parsed = {
        segment: "corporate",
        platformType: "",
        professionCluster: "technical",
        suggestedProfession: "",
        suggestedTone: "professional",
        detectedLanguage: "en",
        confidence: 0.3,
      };
    }

    return new Response(
      JSON.stringify({
        autofill: {
          segment: parsed.segment || "corporate",
          platformType: parsed.platformType || "",
          professionCluster: parsed.professionCluster || "",
          suggestedProfession: parsed.suggestedProfession || "",
          suggestedTone: parsed.suggestedTone || "professional",
          detectedLanguage: parsed.detectedLanguage || "en",
          confidence: parsed.confidence || 0.5,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auto-fill error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
