import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const { type, proposal, jobDescription, language, userProfile } = await req.json();

    const lang = language || "en";

    if (type === "interview") {
      // Interview Prep Mode
      const systemPrompt = `You are a career coach and interview preparation expert. Analyze the job description and generate exactly 3 interview questions that are most likely to be asked for this specific role. For each question provide a suggested answer tailored to the candidate's profile and a pro tip.

Respond ONLY with valid JSON in this format:
{
  "questions": [
    {
      "question": "...",
      "suggestedAnswer": "...",
      "tip": "..."
    }
  ]
}

${lang === "tr" ? "Respond in Turkish." : lang === "de" ? "Respond in German." : lang === "fr" ? "Respond in French." : "Respond in English."}`;

      const userContent = `Job Description:\n${jobDescription?.slice(0, 2000) || "N/A"}\n\nCandidate's Proposal:\n${proposal?.slice(0, 1000) || "N/A"}\n\nCandidate Skills: ${userProfile?.skills?.join(", ") || "N/A"}\nCandidate Experience: ${userProfile?.experience?.slice(0, 500) || "N/A"}`;

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
            { role: "user", content: userContent },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${status}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "";
      
      // Extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid AI response");
      
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Follow-up Mode (default)
      const systemPrompt = `You are a professional follow-up message writer. Generate exactly 2 follow-up messages for a job application:
1. A 3-day follow-up: Light, shows initiative, not pushy. 2-3 sentences max.
2. A 7-day follow-up: Adds value (shares insight, relevant resource, or additional qualification). 3-4 sentences max.

Both should reference the specific job and the candidate's initial pitch naturally.

Respond ONLY with valid JSON:
{
  "followUp3": "...",
  "followUp7": "..."
}

${lang === "tr" ? "Respond in Turkish." : lang === "de" ? "Respond in German." : lang === "fr" ? "Respond in French." : "Respond in English."}`;

      const userContent = `Original Proposal:\n${proposal?.slice(0, 1500) || "N/A"}\n\nJob Description:\n${jobDescription?.slice(0, 1500) || "N/A"}`;

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
            { role: "user", content: userContent },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${status}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "";
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid AI response");
      
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("generate-followup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
