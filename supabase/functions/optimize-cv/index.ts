import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Detect company tone from JD text */
function detectTone(jd: string): "corporate" | "startup" | "agency" | "neutral" {
  const text = jd.toLowerCase();
  const startupSignals = /move fast|ship|iterate|scrappy|hustle|wear many hats|growth|scale|early.stage|seed|series [ab]/;
  const agencySignals = /client.facing|agency|account manager|pitch|campaigns|retainer/;
  const corporateSignals = /fortune|enterprise|compliance|governance|stakeholder|cross-functional|fiscal|quarterly|kpi/;
  if (startupSignals.test(text)) return "startup";
  if (agencySignals.test(text)) return "agency";
  if (corporateSignals.test(text)) return "corporate";
  return "neutral";
}

/** Count lines that match a STAR/metric pattern */
function countQuantifiedBullets(text: string): number {
  const lines = text.split("\n").filter(l => l.trim().startsWith("-") || l.trim().startsWith("•"));
  return lines.filter(l =>
    /\d+%|increased|decreased|reduced|grew|generated|\$\d|x\d|\d+k|\d+x|by \d/i.test(l)
  ).length;
}

/** Extract injected keywords: words in optimized not present in original */
function extractInjectedKeywords(original: string, optimized: string): string[] {
  const STOP_WORDS = new Set([
    "the", "and", "or", "of", "in", "to", "a", "an", "is", "was", "for", "on",
    "at", "by", "with", "as", "from", "that", "this", "it", "be", "are", "were",
    "have", "has", "had", "will", "would", "could", "should", "my", "your",
    "our", "their", "its", "i", "we", "you", "he", "she", "they",
  ]);
  const origWords = new Set(
    original.toLowerCase().match(/\b[a-z][a-z0-9\-]+\b/g)?.filter(w => !STOP_WORDS.has(w)) ?? []
  );
  const newWords = optimized.toLowerCase().match(/\b[a-z][a-z0-9\-]+\b/g) ?? [];
  const added = new Set<string>();
  for (const w of newWords) {
    if (w.length > 3 && !STOP_WORDS.has(w) && !origWords.has(w)) added.add(w);
  }
  // Return top meaningful keywords (prefer longer, technical-sounding words)
  return [...added]
    .sort((a, b) => b.length - a.length)
    .slice(0, 15);
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText, outputLanguage, targetRole, jobDescription, consumeCredit } = await req.json();

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

    // ── Check org membership for unlimited access ────────────────────────────
    let isOrgMember = false;
    if (consumeCredit === true) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_type, org_id, subscription_plan")
        .eq("user_id", user.id)
        .maybeSingle();

      isOrgMember = !!(profile?.org_id) || profile?.plan_type === "B2B_ENTERPRISE";
      const isPaid = profile?.subscription_plan === "pro" || profile?.subscription_plan === "elite";

      // Only deduct credit if free solo user (not org member, not paid)
      if (!isOrgMember && !isPaid) {
        const { data: creditOk, error: creditErr } = await supabase.rpc("consume_credit", {
          _user_id: user.id,
          _amount: 1,
          _reason: "cv_optimization",
        });
        if (creditErr || !creditOk) {
          return new Response(
            JSON.stringify({ error: "Insufficient credits. Please purchase more credits or upgrade your plan." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured. OPENAI_API_KEY missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langName = outputLanguage || "English";
    const jdText = jobDescription?.trim() ?? "";
    const tone = jdText ? detectTone(jdText) : "neutral";

    const toneGuide: Record<string, string> = {
      startup: "Use energetic, direct language. Show impact and speed. Emphasize growth, experimentation, and ownership.",
      agency: "Use client-outcome language. Highlight campaigns, results, and stakeholder management.",
      corporate: "Use formal professional language. Emphasize governance, cross-functional collaboration, and strategic impact.",
      neutral: "Use clean, confident professional language. Balance formality with readability.",
    };

    const roleHint = targetRole
      ? `The candidate is targeting: "${targetRole}". Tailor all experience framing and keywords for this role.`
      : "";
    const jdSection = jdText
      ? `\n\n## TARGET JOB DESCRIPTION (for keyword and tone matching):\n${jdText.slice(0, 2000)}`
      : "";

    const systemPrompt = `You are a senior professional CV writer and ATS specialist. Your rewrites are used by top-tier recruiters. Follow every rule below without exception.

## FORMATTING — STRICT SINGLE-COLUMN LAYOUT
- Output plain text only. No tables, no multi-column layouts, no HTML, no markdown headers with #.
- Use CAPS for section headers: CONTACT, PROFESSIONAL SUMMARY, EXPERIENCE, SKILLS, EDUCATION, CERTIFICATIONS.
- Separate sections with a blank line.
- Each job entry: Company Name | Job Title | Date Range
- Each bullet starts with "- " (dash space).

## EXPERIENCE BULLETS — STAR FORMAT MANDATORY
Every experience bullet MUST follow this exact structure:
  [Strong Action Verb] + [what you did / built / changed] + [measurable result or context]
Examples of correct bullets:
  - Reduced customer churn by 23% by rebuilding the onboarding email sequence
  - Built and launched a React dashboard used by 4,000+ monthly active users
  - Grew organic traffic from 8k to 45k sessions/month in 6 months via technical SEO

## BANNED AI CLICHÉS — NEVER USE THESE WORDS
You are STRICTLY PROHIBITED from using: "delve", "spearheaded", "testament", "passionate",
"dynamic", "synergy", "realm", "leverage" (as a verb), "utilize", "streamline", "cutting-edge",
"results-driven", "detail-oriented", "team player", "hardworking", "go-getter", "proactive",
"innovative", "thought leader", "disruptive", "visionary", "guru", "ninja", "rockstar".
Replace these with specific, direct verbs and concrete facts.

## TONE
${toneGuide[tone]}

## LANGUAGE
Write the entire CV in ${langName}.

## ATS OPTIMIZATION
- Include all likely keywords from the job description naturally in context.
- Do not keyword-stuff; every keyword must fit grammatically.
- Use both spelled-out and abbreviated forms for technical terms (e.g., "SEO / Search Engine Optimization").

## OTHER RULES
- Do NOT invent achievements, degrees, jobs, or skills not present in the original.
- Quantify existing achievements using numbers already implied in the text (e.g., if "managed a team" → "managed a 4-person engineering team" only if team size is inferable).
- Remove the professional summary clichés; replace with a 2–3 sentence confident first-person intro.
- Keep the total CV between 400–700 words.
${roleHint}

## OUTPUT
Return ONLY the optimized CV text. No commentary, no "Here is your CV:", no explanations.`;

    const userPrompt = `Here is the original CV to rewrite:\n\n${cvText.trim().slice(0, 8000)}${jdSection}`;

    console.log(`[optimize-cv] user=${user.id} lang=${langName} tone=${tone} jd=${jdText.length > 0}`);

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
        temperature: 0.4,
        max_tokens: 1800,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "unknown");
      console.error(`AI error: status=${aiResponse.status}, body=${errText}`);
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI optimization failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const optimizedCV = aiData.choices?.[0]?.message?.content?.trim();

    if (!optimizedCV) {
      return new Response(
        JSON.stringify({ error: "Failed to generate optimized CV" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Quality scoring ───────────────────────────────────────────────────────
    const hasMetrics = /\d+%|\$\d|increased|reduced|improved|achieved|delivered|generated|grew|by \d/i.test(optimizedCV);
    const hasActionVerbs = /\b(led|built|grew|designed|launched|created|delivered|reduced|improved|established|developed|drove|managed|executed)\b/i.test(optimizedCV);
    const hasStructure = optimizedCV.includes("\n\n");
    const wordCount = optimizedCV.split(/\s+/).length;
    const lengthScore = wordCount >= 350 && wordCount <= 750 ? 22 : 10;
    const noBuzzwords = !/spearheaded|delve|synergy|passionate|dynamic|results-driven/i.test(optimizedCV);

    const score = Math.min(98,
      38 +
      (hasMetrics ? 20 : 0) +
      (hasActionVerbs ? 15 : 0) +
      (hasStructure ? 8 : 0) +
      lengthScore +
      (noBuzzwords ? 5 : 0)
    );

    const improvements: string[] = [];
    if (hasMetrics) improvements.push("Quantified achievements added");
    if (hasActionVerbs) improvements.push("Strong action verbs throughout");
    if (hasStructure) improvements.push("Clear ATS-friendly structure");
    if (noBuzzwords) improvements.push("AI clichés removed");
    improvements.push("Keywords injected for target role");
    improvements.push(`Tone matched to ${tone} style`);

    // ── Compute diff metadata ─────────────────────────────────────────────────
    const injectedKeywords = extractInjectedKeywords(cvText, optimizedCV);
    const quantifiedBullets = countQuantifiedBullets(optimizedCV);

    console.log(`[optimize-cv] score=${score} keywords=${injectedKeywords.length} starBullets=${quantifiedBullets}`);

    return new Response(
      JSON.stringify({
        optimizedCV,
        score,
        improvements,
        wordCount,
        injectedKeywords,
        quantifiedBullets,
        tone,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("optimize-cv error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
