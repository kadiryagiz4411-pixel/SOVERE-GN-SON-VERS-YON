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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const plan = profile?.subscription_plan || "basic";
    if (plan !== "pro" && plan !== "elite") {
      return new Response(JSON.stringify({ error: "Upgrade to Pro or Elite for career roadmap" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured. OPENAI_API_KEY missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Based on this professional profile, create a personalized career roadmap.

PROFILE:
- Skills: ${body.skills?.join(", ") || "Not specified"}
- Experience: ${body.experience || "Not specified"}
- Looking for: ${body.onboarding_role || "Not specified"}
- Experience level: ${body.onboarding_experience || "Not specified"}
- Biggest challenge: ${body.onboarding_goal || "Not specified"}
- Application volume: ${body.onboarding_volume || "Not specified"}

Generate a JSON object with this exact structure (no markdown, no code blocks, just pure JSON):
{
  "summary": "2-3 sentence personalized assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "focusAreas": ["area 1", "area 2", "area 3"],
  "weeklyPlan": [
    {"week": "Week 1", "goal": "goal", "actions": ["action1", "action2", "action3"]},
    {"week": "Week 2", "goal": "goal", "actions": ["action1", "action2", "action3"]},
    {"week": "Week 3-4", "goal": "goal", "actions": ["action1", "action2", "action3"]}
  ],
  "targetRoles": ["role1", "role2", "role3", "role4"],
  "expectedOutcome": "What they can expect after following this plan for a month"
}

Make it highly specific to their actual skills and goals. Be actionable and realistic.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a career strategy expert. Output only valid JSON, no markdown formatting." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Clean potential markdown wrapping
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    const roadmap = JSON.parse(content);

    return new Response(JSON.stringify({ roadmap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Roadmap error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate roadmap" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
