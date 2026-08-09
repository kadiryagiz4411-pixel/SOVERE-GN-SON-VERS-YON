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
    const { proposal, jobDescription, userSegment, platformType, professionCluster } = await req.json();

    if (!proposal || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Proposal and job description are required" }),
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_expires_at, skills, experience, full_name, profession_cluster, platform_type")
      .eq("user_id", user.id)
      .maybeSingle();

    let plan = profile?.subscription_plan || "free";
    if ((plan === "pro" || plan === "elite") && profile?.subscription_expires_at) {
      if (new Date() > new Date(profile.subscription_expires_at)) plan = "free";
    }

    if (plan !== "pro" && plan !== "elite") {
      return new Response(
        JSON.stringify({ error: "This feature requires Pro or Elite plan" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isElite = plan === "elite";
    const listingCount = isElite ? 15 : 6;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured. OPENAI_API_KEY missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userSkills = profile?.skills?.join(", ") || "not specified";
    const userExperience = profile?.experience || "not specified";
    const cluster = professionCluster || profile?.profession_cluster || "general";
    const platform = platformType || profile?.platform_type || "upwork";

    const systemPrompt = `You are a career advisor AI that generates personalized job recommendations from freelance platforms (Upwork, Fiverr, Freelancer, Toptal) and job boards.

Based on the user's generated proposal, job description they applied to, their skills, and experience, generate EXACTLY ${listingCount} highly relevant job listings they should apply to next.

Each listing MUST be realistic and match what you'd find on these platforms today. Include a mix of:
- Upwork jobs
- Fiverr buyer requests  
- Direct client opportunities
- LinkedIn/Indeed postings (for corporate segment)

For each listing provide:
1. title: Job title (realistic, specific)
2. platform: Which platform (Upwork, Fiverr, LinkedIn, Indeed, Toptal, Freelancer)
3. company: Company or client name (realistic but fictional)
4. budget: Budget range or hourly rate
5. description: 1-2 sentence description
6. matchScore: Acceptance probability percentage (40-95) based on how well the user's profile matches
7. matchReason: Why this is a good match (1 sentence)
8. skills: Array of 3-5 required skills
9. urgency: "high" | "medium" | "low" - how urgent the posting is
10. postedAgo: How recently posted (e.g., "2 hours ago", "1 day ago")
11. applicants: Number of current applicants (realistic)
12. applyUrl: A realistic URL to the platform's job search page

${isElite ? `ELITE BONUS: Also include for each listing:
- strategyTip: A personalized strategy tip for this specific application
- competitorAnalysis: Brief insight about competition level
- bestTimeToApply: When to submit for maximum visibility` : ''}

Sort by matchScore descending. Make listings diverse across platforms and skill requirements.

CRITICAL: Return ONLY valid JSON array. No markdown, no code blocks.`;

    const userPrompt = `USER PROFILE:
- Skills: ${userSkills}
- Experience: ${userExperience}
- Segment: ${userSegment || "freelancer"}
- Platform focus: ${platform}
- Profession cluster: ${cluster}

THEIR GENERATED PROPOSAL:
${proposal.slice(0, 2000)}

JOB THEY APPLIED TO:
${jobDescription.slice(0, 2000)}

Generate ${listingCount} personalized job recommendations as a JSON array.`;

    // Helper with retry for rate limits
    const fetchWithRetry = async (body: Record<string, unknown>, maxRetries = 3) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (res.status === 429 && attempt < maxRetries - 1) {
          const wait = Math.pow(2, attempt + 1) * 1000;
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        return res;
      }
      throw new Error("Max retries exceeded");
    };

    const aiResponse = await fetchWithRetry({
      model: isElite ? "gpt-4o" : "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let recommendations = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        recommendations = JSON.parse(cleaned);
      }
    } catch {
      console.error("Failed to parse AI response:", content.slice(0, 500));
      recommendations = [];
    }

    // Generate analysis report
    const analysisPrompt = `Based on this proposal and job description, generate a detailed analysis report.

PROPOSAL: ${proposal.slice(0, 1500)}
JOB: ${jobDescription.slice(0, 1500)}
USER SKILLS: ${userSkills}

Return a JSON object with:
{
  "overallScore": number (0-100),
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "marketPosition": "description of where user stands in the market",
  "improvementAreas": [
    {"area": "name", "currentScore": number, "potentialScore": number, "tip": "how to improve"}
  ],
  "industryInsights": {
    "demandLevel": "high|medium|low",
    "averageRate": "$X-$Y/hr",
    "competitionLevel": "high|medium|low",
    "growthTrend": "growing|stable|declining"
  },
  "weeklyActionPlan": [
    {"day": "Mon-Tue", "action": "what to do", "priority": "high|medium|low"}
  ]
}

CRITICAL: Return ONLY valid JSON. No markdown.`;

    const analysisResponse = await fetchWithRetry({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a career analytics expert. Return only valid JSON." },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.3,
    });

    let analysisReport = null;
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      const analysisContent = analysisData.choices?.[0]?.message?.content || "";
      try {
        const jsonObjMatch = analysisContent.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          analysisReport = JSON.parse(jsonObjMatch[0]);
        } else {
          const cleanedAnalysis = analysisContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          analysisReport = JSON.parse(cleanedAnalysis);
        }
      } catch {
        console.error("Failed to parse analysis:", analysisContent.slice(0, 300));
      }
    }

    return new Response(
      JSON.stringify({
        recommendations,
        analysisReport,
        plan,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Job recommendations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate recommendations" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
