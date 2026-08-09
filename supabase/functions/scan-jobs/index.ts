import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check plan - only Pro and Elite
    const plan = profile.subscription_plan || "basic";
    if (plan !== "pro" && plan !== "elite") {
      return new Response(JSON.stringify({ error: "Upgrade to Pro or Elite to use Apply Queue" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    const creditCost = 30;
    if ((profile.credits_balance || 0) < creditCost) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's past outcomes for learning loop
    const { data: pastOutcomes } = await supabase
      .from("outcome_tracking")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: pastApps } = await supabase
      .from("applications")
      .select("job_title, company, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    // Build learning context
    const wonJobs = pastApps?.filter(a => a.status === "won") || [];
    const lostJobs = pastApps?.filter(a => a.status === "lost") || [];
    const learningContext = wonJobs.length > 0
      ? `User's winning patterns: Won ${wonJobs.length} jobs (${wonJobs.map(j => j.job_title).join(", ")}). Lost ${lostJobs.length} jobs. Focus on similar job types.`
      : "No outcome data yet. Use general best practices.";

    const maxJobs = plan === "elite" ? 10 : 5;
    const batchId = crypto.randomUUID();

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const preferredPlatforms = body.platforms || ["Upwork", "Fiverr", "LinkedIn", "Toptal"];

    const systemPrompt = `You are Sovereign's Job Scanner AI. You find the BEST freelance opportunities for a specific user.

USER PROFILE:
- Skills: ${(profile.skills || []).join(", ") || "General freelancer"}
- Experience: ${profile.experience || "Not specified"}
- Hourly Rate: $${profile.hourly_rate || 50}/hr
- Segment: ${profile.user_segment || "freelancer"}
- Platform: ${profile.platform_type || "Upwork"}
- Profession: ${profile.profession_cluster || "General"}

LEARNING DATA:
${learningContext}

RULES:
1. Generate EXACTLY ${maxJobs} job recommendations
2. Each must be REALISTIC (real-world job types, budgets, companies)
3. Calculate acceptance_probability based on: skill match, competition level, budget fit, profile strength
4. If a job has <35% probability, set rejection_reason explaining why they should NOT apply
5. Proposals must be HIGHLY specific - never generic
6. Each proposal should feel written for THAT exact job
7. Quality > Quantity - only recommend jobs worth applying to
8. Preferred platforms: ${preferredPlatforms.join(", ")}

OUTPUT FORMAT (JSON array):
[{
  "job_title": "string",
  "company": "string (realistic company/client name)",
  "platform": "string",
  "budget": "string (e.g. '$500-$1000' or '$50/hr')",
  "job_url": "string (realistic URL)",
  "job_description": "string (100-200 words, realistic)",
  "match_score": number (0-100),
  "acceptance_probability": number (0-100),
  "match_reasoning": ["reason1", "reason2", "reason3"],
  "rejection_reason": "string or null",
  "generated_proposal": "string (200-400 words, highly tailored)",
  "skills_matched": ["skill1", "skill2"],
  "competition_level": "low|medium|high",
  "client_quality_score": number (0-100),
  "urgency": "high|medium|low"
}]`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${maxJobs} high-quality, personalized job recommendations for this freelancer. Return ONLY a JSON array.` },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      console.error("OpenAI error:", err);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await openaiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobs = JSON.parse(jsonMatch[0]);

    // Insert into apply_queue
    const queueItems = jobs.map((job: any) => ({
      user_id: user.id,
      job_title: job.job_title || "Untitled",
      company: job.company || "",
      platform: job.platform || "Upwork",
      budget: job.budget || "",
      job_url: job.job_url || "",
      job_description: job.job_description || "",
      match_score: Math.min(100, Math.max(0, job.match_score || 50)),
      acceptance_probability: Math.min(100, Math.max(0, job.acceptance_probability || 50)),
      match_reasoning: job.match_reasoning || [],
      rejection_reason: job.rejection_reason || null,
      generated_proposal: job.generated_proposal || "",
      status: job.rejection_reason ? "rejected" : "pending",
      skills_matched: job.skills_matched || [],
      competition_level: job.competition_level || "medium",
      client_quality_score: Math.min(100, Math.max(0, job.client_quality_score || 50)),
      urgency: job.urgency || "medium",
      batch_id: batchId,
    }));

    const { error: insertError } = await supabase
      .from("apply_queue")
      .insert(queueItems);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save queue items" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits
    await supabase.rpc("apply_credit_change", {
      _user_id: user.id,
      _amount: -creditCost,
      _transaction_type: "usage",
      _reference_type: "scan_jobs",
      _reference_id: batchId,
      _description: `Job scan: ${maxJobs} opportunities found`,
    });

    return new Response(JSON.stringify({
      success: true,
      count: queueItems.length,
      batchId,
      creditCost,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Scan jobs error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
