import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitize(input: unknown, max = 5000): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, max);
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', tr: 'Turkish', de: 'German', fr: 'French', es: 'Spanish',
  pt: 'Portuguese', it: 'Italian', nl: 'Dutch', pl: 'Polish', ru: 'Russian',
  zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi',
  sv: 'Swedish', da: 'Danish', no: 'Norwegian', fi: 'Finnish', th: 'Thai',
  vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay', uk: 'Ukrainian',
  cs: 'Czech', ro: 'Romanian', el: 'Greek', hu: 'Hungarian', bg: 'Bulgarian',
  hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian', et: 'Estonian', lv: 'Latvian',
  lt: 'Lithuanian', he: 'Hebrew', fa: 'Persian', bn: 'Bengali', ta: 'Tamil',
  te: 'Telugu', mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
  sw: 'Swahili', am: 'Amharic', my: 'Burmese', km: 'Khmer', lo: 'Lao', fil: 'Filipino',
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && i < retries - 1) {
        const wait = Math.pow(2, i) * 2000 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 2000));
    }
  }
  throw new Error("All retries failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode = body.mode; // 'generate' | 'optimize' | 'generate-from-text'
    const targetRole = sanitize(body.targetRole, 200);
    const targetCompany = sanitize(body.targetCompany, 200);
    const jobDescription = sanitize(body.jobDescription, 5000);
    const outputLanguage = body.outputLanguage || 'en';
    const existingCvText = sanitize(body.existingCvText, 10000);

    // Form data for 'generate' mode
    const formData = body.formData || {};

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle();

    let plan = profile?.subscription_plan || 'basic';
    if ((plan === 'pro' || plan === 'elite') && profile?.subscription_expires_at) {
      if (new Date() > new Date(profile.subscription_expires_at)) {
        plan = 'free';
      }
    }

    const isPro = plan === 'pro' || plan === 'elite';
    const isElite = plan === 'elite';
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured. OPENAI_API_KEY missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const langName = LANGUAGE_NAMES[outputLanguage] || 'English';
    const langInstruction = outputLanguage !== 'en'
      ? `Write the ENTIRE CV in ${langName}. Do NOT write in English. Use culturally appropriate formatting for ${langName}-speaking regions.`
      : 'Write in English.';

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'optimize' && existingCvText) {
      // Optimize existing CV
      const qualityLevel = isElite ? 'ELITE TOP 1%' : isPro ? 'PRO TOP 10%' : 'STANDARD';
      systemPrompt = `You are an ${qualityLevel} CV/Resume optimization expert. You analyze and rewrite CVs to maximize acceptance rates.

RULES:
- Return ONLY the optimized CV content in structured sections
- Use ATS-friendly formatting with clear section headers
- Quantify achievements wherever possible
- Remove fluff and weak language
- Optimize keyword density for the target role
- ${langInstruction}
${isElite ? '- Apply advanced persuasion techniques and executive-level positioning\n- Include strategic keyword placement for ATS systems\n- Add power verbs and impact statements' : ''}
${isPro ? '- Tailor specifically to the target role and company\n- Optimize structure for maximum readability' : ''}

Return the CV in this exact format with section headers:
PROFESSIONAL SUMMARY
---
[summary]

EXPERIENCE
---
[experience entries]

EDUCATION
---
[education]

SKILLS
---
[skills]

${isElite ? 'CERTIFICATIONS & ACHIEVEMENTS\n---\n[if applicable]' : ''}`;

      userPrompt = `Optimize this CV${targetRole ? ` for the role: ${targetRole}` : ''}${targetCompany ? ` at ${targetCompany}` : ''}${jobDescription ? `\n\nTarget job description:\n${jobDescription}` : ''}

EXISTING CV:
${existingCvText}`;
    } else if (mode === 'generate-from-text') {
      // Generate from free text description
      const qualityLevel = isElite ? 'ELITE TOP 1%' : isPro ? 'PRO TOP 10%' : 'PROFESSIONAL';
      systemPrompt = `You are a ${qualityLevel} CV/Resume writer. Create a complete, polished CV from the user's description.

RULES:
- Create a complete, professional CV with proper sections
- Use ATS-friendly formatting
- Quantify achievements and use strong action verbs
- ${langInstruction}
${isElite ? '- Position the candidate as a top-tier professional\n- Use executive-level language and strategic positioning\n- Include industry-specific keywords for ATS optimization' : ''}
${isPro ? '- Tailor specifically for the target role\n- Emphasize most relevant experience and skills' : ''}

Return the CV in this exact format:
PROFESSIONAL SUMMARY
---
[summary]

EXPERIENCE
---
[experience entries with dates]

EDUCATION
---
[education]

SKILLS
---
[skills]`;

      userPrompt = `Create a professional CV from this information${targetRole ? ` for the role: ${targetRole}` : ''}${targetCompany ? ` at ${targetCompany}` : ''}:

${existingCvText}`;
    } else {
      // Generate from form data
      const qualityLevel = isElite ? 'ELITE TOP 1%' : isPro ? 'PRO TOP 10%' : 'PROFESSIONAL';
      systemPrompt = `You are a ${qualityLevel} CV/Resume writer. Create a complete, polished, ATS-optimized CV.

RULES:
- Create a professional CV with clear section headers
- Use strong action verbs and quantified achievements
- Optimize for ATS scanning
- ${langInstruction}
${isElite ? '- Position as an elite professional with strategic keyword placement\n- Use executive-level impact statements' : ''}
${isPro ? '- Tailor for maximum relevance to the target role' : ''}

Return the CV in this exact format:
PROFESSIONAL SUMMARY
---
[compelling 3-4 sentence summary]

EXPERIENCE
---
[formatted experience entries]

EDUCATION
---
[education]

SKILLS
---
[categorized skills]`;

      const parts = [];
      if (formData.fullName) parts.push(`Full Name: ${formData.fullName}`);
      if (formData.email) parts.push(`Email: ${formData.email}`);
      if (formData.phone) parts.push(`Phone: ${formData.phone}`);
      if (formData.location) parts.push(`Location: ${formData.location}`);
      if (formData.summary) parts.push(`Professional Summary: ${formData.summary}`);
      if (formData.experience) parts.push(`Experience:\n${formData.experience}`);
      if (formData.education) parts.push(`Education:\n${formData.education}`);
      if (formData.skills) parts.push(`Skills: ${formData.skills}`);
      if (formData.certifications) parts.push(`Certifications: ${formData.certifications}`);

      userPrompt = `Create a CV from this information${targetRole ? ` targeting the role: ${targetRole}` : ''}${targetCompany ? ` at ${targetCompany}` : ''}${jobDescription ? `\n\nJob Description:\n${jobDescription}` : ''}:

${parts.join('\n\n')}`;
    }

    console.log(`CV generation: mode=${mode}, plan=${plan}, lang=${outputLanguage}`);

    const aiResponse = await fetchWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Failed to generate CV" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await aiResponse.json();
    const cvContent = aiResult.choices?.[0]?.message?.content;

    if (!cvContent) {
      return new Response(JSON.stringify({ error: "No CV content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // For Elite: generate acceptance score
    let acceptanceScore = null;
    if (isElite && (jobDescription || targetRole)) {
      try {
        const scoreResponse = await fetchWithRetry(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You analyze CVs and return a JSON acceptance score. Return ONLY valid JSON: {"score": number 0-100, "strengths": [str,str,str], "weaknesses": [str,str,str], "suggestions": [str,str,str]}`
                },
                {
                  role: "user",
                  content: `Rate this CV for ${targetRole || 'the target role'}${targetCompany ? ` at ${targetCompany}` : ''}${jobDescription ? `\n\nJob: ${jobDescription.slice(0, 1000)}` : ''}:\n\n${cvContent.slice(0, 2000)}`
                }
              ],
              temperature: 0.3,
              max_tokens: 500,
            }),
          }
        );

        if (scoreResponse.ok) {
          const scoreResult = await scoreResponse.json();
          const scoreText = scoreResult.choices?.[0]?.message?.content || '';
          try {
            const jsonMatch = scoreText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              acceptanceScore = JSON.parse(jsonMatch[0]);
            }
          } catch { /* ignore parse errors */ }
        }
      } catch (e) {
        console.error("Score generation failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        cv: cvContent,
        acceptanceScore,
        plan,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("CV generation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
