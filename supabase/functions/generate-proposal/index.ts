import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeText(input: unknown, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

function validateJobDescription(jobDescription: unknown): string | null {
  const sanitized = sanitizeText(jobDescription, 10000);
  if (!sanitized || sanitized.length < 20) return null;
  return sanitized;
}

function extractJobDetails(jobDescription: string): { industry: string; roleType: string } {
  const lowerDesc = jobDescription.toLowerCase();
  
  let industry = 'general';
  if (lowerDesc.includes('tech') || lowerDesc.includes('software') || lowerDesc.includes('developer')) industry = 'technology';
  else if (lowerDesc.includes('design') || lowerDesc.includes('ux') || lowerDesc.includes('ui')) industry = 'design';
  else if (lowerDesc.includes('marketing') || lowerDesc.includes('seo') || lowerDesc.includes('content')) industry = 'marketing';
  else if (lowerDesc.includes('music') || lowerDesc.includes('beat') || lowerDesc.includes('producer')) industry = 'music';
  else if (lowerDesc.includes('video') || lowerDesc.includes('edit') || lowerDesc.includes('motion')) industry = 'video';
  else if (lowerDesc.includes('writing') || lowerDesc.includes('copywriting') || lowerDesc.includes('blog')) industry = 'writing';
  
  let roleType = 'freelance';
  if (lowerDesc.includes('full-time') || lowerDesc.includes('full time')) roleType = 'full-time';
  else if (lowerDesc.includes('part-time') || lowerDesc.includes('part time')) roleType = 'part-time';
  else if (lowerDesc.includes('contract')) roleType = 'contract';
  
  return { industry, roleType };
}

// ---- Freelance Cluster Templates ----
interface ClusterTemplate {
  hookStructure: string;
  bodyFlowTemplate: string;
  ctaLogic: string;
  toneCalibration: string;
  proofStrategy: string;
  optimalLength: string;
}

const CLUSTER_TEMPLATES: Record<string, ClusterTemplate> = {
  creative: {
    hookStructure: 'Open with a visual/creative insight that shows you understand their brand aesthetic or audience. Reference a specific detail from the brief.',
    bodyFlowTemplate: 'Portfolio highlight → Process description → Style alignment → Timeline commitment',
    ctaLogic: 'Offer a quick mock-up, mood board, or sample concept as a low-risk next step.',
    toneCalibration: 'Creative-professional: confident about your craft, enthusiastic but not gushy. Let your work speak.',
    proofStrategy: 'Portfolio links, before/after examples, client testimonials, engagement metrics from past creative work.',
    optimalLength: '200-350 words. Creatives are visual — keep text tight, let portfolio do the heavy lifting.',
  },
  technical: {
    hookStructure: 'Open with a technical observation about their project/stack. Show you understand the architecture or problem domain.',
    bodyFlowTemplate: 'Technical diagnosis → Proposed approach → Stack/tools → Timeline + deliverables',
    ctaLogic: 'Offer a brief technical audit, architecture suggestion, or small proof-of-concept.',
    toneCalibration: 'Technical-authoritative: precise, jargon-appropriate, confident. Show depth without lecturing.',
    proofStrategy: 'GitHub links, live project demos, performance metrics, tech stack expertise, certifications.',
    optimalLength: '280-400 words. Technical buyers need enough detail to assess competence.',
  },
  marketing: {
    hookStructure: 'Open with a data-driven insight about their market, competitors, or growth opportunity. Show strategic thinking.',
    bodyFlowTemplate: 'Market observation → Strategy overview → Expected outcomes → Measurement framework',
    ctaLogic: 'Offer a free audit, competitor analysis snippet, or quick-win strategy as a conversation starter.',
    toneCalibration: 'Results-driven: numbers-focused, strategic, confident about ROI. Avoid buzzwords without backing.',
    proofStrategy: 'ROI metrics, case studies with numbers, growth percentages, campaign screenshots, client revenue impact.',
    optimalLength: '250-380 words. Marketers value clarity and results — be concise and metric-heavy.',
  },
  consulting: {
    hookStructure: 'Open with a business-level observation about their company or industry challenge. Position yourself as a strategic partner.',
    bodyFlowTemplate: 'Business diagnosis → Framework/methodology → Expected impact → Engagement model',
    ctaLogic: 'Offer a discovery call, brief diagnostic session, or strategic framework document.',
    toneCalibration: 'Executive-consultative: authoritative, strategic, partnership-oriented. Speak to business outcomes.',
    proofStrategy: 'Client logos, revenue/efficiency improvements, frameworks developed, executive testimonials.',
    optimalLength: '300-450 words. Consulting requires demonstrating strategic depth and business acumen.',
  },
};

const PLATFORM_CONFIGS: Record<string, { style: string; lengthRange: string; toneDefault: string }> = {
  upwork: { style: 'Cover letter style proposals — personal, specific to the job post', lengthRange: '250-400 words', toneDefault: 'professional' },
  fiverr: { style: 'Gig-based buyer request responses — short, punchy, value-focused', lengthRange: '100-200 words', toneDefault: 'direct' },
  'direct-client': { style: 'Cold outreach pitch to potential clients — persuasive, benefit-first', lengthRange: '200-350 words', toneDefault: 'persuasive' },
  agency: { style: 'Partnership proposals to agencies — professional, capability-focused', lengthRange: '300-450 words', toneDefault: 'professional' },
};

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

const CULTURAL_TONE_DIRECTIVES: Record<string, string> = {
  formal: 'Use a formal register with polished vocabulary and proper honorifics appropriate for the target culture.',
  neutral: 'Use a balanced, universally professional tone.',
  persuasive: 'Apply culturally-appropriate persuasion techniques — testimonials in Western cultures, relationship emphasis in Asian cultures.',
  direct: 'Be concise and action-oriented. Minimize hedging.',
  'high-context': 'Use indirect, relationship-oriented language. Imply rather than state directly. Build rapport before making asks.',
  'low-context': 'Be explicit. State everything clearly. Leave nothing implied.',
};

// Variant definitions for Pro (3) and Elite (4)
const VARIANT_CONFIGS = {
  pro: [
    {
      id: 'technical',
      label: 'Technical Proposal',
      badge: '🔧 Technical Focus',
      description: 'Highlights your technical skills and methodology',
      directive: `TECHNICAL VARIANT — Write like a senior professional who naturally speaks in specifics:
- Lead with your technical understanding of their problem — show you "get it"
- Mention specific tools, frameworks, or approaches you'd use — but conversationally, not as a list
- Share a brief story of a similar technical challenge you solved
- Sound like an expert having a relaxed but knowledgeable conversation
- Avoid jargon-dumping — use technical terms where they add clarity, not to impress
- Target 280-360 words`,
    },
    {
      id: 'persuasive',
      label: 'Active Proposal',
      badge: '🎯 Gets You the Job',
      description: 'Maximizes persuasion naturally',
      directive: `PERSUASIVE VARIANT — Write like someone who's genuinely excited about the opportunity:
- Open with something that shows you really understand what they're trying to achieve
- Share a concrete result you've delivered — make it feel like a natural part of the conversation
- Create a sense of "we should talk" without being pushy or salesy
- End with a specific, easy next step — not a generic "looking forward to hearing from you"
- Sound enthusiastic but grounded — confident, not desperate
- Target 280-360 words`,
    },
    {
      id: 'standout',
      label: 'Standout Proposal',
      badge: '⭐ Makes You Stand Out',
      description: 'Unique angle that differentiates you',
      directive: `STANDOUT VARIANT — Write with personality and a fresh perspective:
- Open with an unexpected angle — something that makes them pause and think
- Share a unique insight about their industry, challenge, or opportunity
- Let your personality come through — be memorable, not generic
- Include something surprising: an unconventional approach, a contrarian insight, or a creative solution
- Sound like the kind of person they'd want on a call — interesting, smart, genuine
- Target 280-360 words`,
    },
  ],
  elite: [
    {
      id: 'technical',
      label: 'Technical Proposal',
      badge: '🔧 Technical Excellence',
      description: 'Deep technical mastery with natural voice',
      directive: `ELITE TECHNICAL — Write like a respected senior expert sharing their genuine assessment:
- Open by identifying the real technical challenge behind the job post — show deep understanding
- Describe your approach naturally, as if explaining to a smart colleague over coffee
- Reference specific architectures, tools, or methodologies — but woven into your narrative, not listed
- Share a concrete past result with real numbers — make it feel like a natural anecdote
- Include what you'd do in the first 48 hours — specific and actionable
- Sound confident and knowledgeable without being arrogant or robotic
- Target 380-480 words`,
    },
    {
      id: 'persuasive',
      label: 'Active Proposal',
      badge: '🎯 Closes the Deal',
      description: 'Maximum persuasion, human delivery',
      directive: `ELITE PERSUASIVE — Write like a trusted advisor making a compelling case:
- Open with something that proves you've done your homework on their specific situation
- Build your case with real outcomes and genuine insights — not hype or buzzwords
- Reference their specific challenges and explain how you've solved similar ones
- Include a "quick win" — something tangible you could deliver early to prove value
- Close with confidence and a clear next step — make it feel inevitable, not forced
- Sound like someone who's been here before and knows exactly how to help
- Target 380-480 words`,
    },
    {
      id: 'standout',
      label: 'Standout Proposal',
      badge: '⭐ Unforgettable',
      description: 'Unique positioning with authentic voice',
      directive: `ELITE STANDOUT — Write like a thought leader sharing a genuinely valuable perspective:
- Open with a compelling insight that shows you think differently about their challenge
- Share a mini case study that directly parallels their situation — tell it like a story
- Include a bold prediction or strategic recommendation they probably haven't considered
- Let your authentic expertise and personality shine through — be memorable
- Position yourself as someone who brings fresh thinking, not just execution
- The reader should think: "I need to talk to this person"
- Target 380-480 words`,
    },
  ],
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && i < retries - 1) {
        const wait = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.log(`Rate limited, retrying in ${Math.round(wait)}ms (attempt ${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      const wait = Math.pow(2, i) * 2000;
      console.log(`Fetch error, retrying in ${wait}ms: ${err}`);
      await new Promise(r => setTimeout(r, wait));
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
    const jobDescription = validateJobDescription(body.jobDescription);
    const userProfile = body.userProfile;
    const tone = body.tone || 'professional';
    const userSegment = body.userSegment || 'corporate';
    const platformType = body.platformType || '';
    const professionCluster = body.professionCluster || '';
    const selectedProfession = body.selectedProfession || '';
    const outputLanguage = body.outputLanguage || '';
    const culturalTone = body.culturalTone || '';

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: "Valid job description is required (minimum 20 characters)" }),
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let plan = profile?.subscription_plan || 'basic';
    
    // Check subscription expiry — downgrade if expired
    const expiresAt = profile?.subscription_expires_at;
    if ((plan === 'pro' || plan === 'elite') && expiresAt) {
      const now = new Date();
      const expiry = new Date(expiresAt);
      if (now > expiry) {
        // Auto-downgrade expired subscription
        await supabase.from("profiles").update({
          subscription_plan: "free",
          subscription_expires_at: null,
          billing_period: null,
          updated_at: now.toISOString(),
        }).eq("user_id", user.id);
        plan = 'free';
        console.log(`Subscription expired for user ${user.id}, downgraded to free`);
      }
    }

    const isProOrElite = plan === 'pro' || plan === 'elite';
    const isElite = plan === 'elite';
    const DAILY_LIMIT = isProOrElite ? 999999 : 10;
    const today = new Date().toDateString();
    const lastReset = profile?.last_usage_reset ? new Date(profile.last_usage_reset).toDateString() : null;
    
    let currentUsage = profile?.daily_proposals_used || 0;
    if (lastReset !== today) {
      currentUsage = 0;
    }

    if (currentUsage >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: "Daily limit reached",
          limit: DAILY_LIMIT,
          used: currentUsage,
          upgradeMessage: "Upgrade to Pro for unlimited proposals!"
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating proposal, plan: ${plan}, segment: ${userSegment}, usage: ${currentUsage}/${DAILY_LIMIT}`);

    const sanitizedProfile = {
      skills: Array.isArray(userProfile?.skills) 
        ? userProfile.skills.slice(0, 20).map((s: unknown) => sanitizeText(s, 100)).filter(Boolean)
        : [],
      experience: sanitizeText(userProfile?.experience, 2000),
      hourly_rate: typeof userProfile?.hourly_rate === 'number' && userProfile.hourly_rate > 0 && userProfile.hourly_rate < 10000
        ? userProfile.hourly_rate
        : null
    };

    const jobDetails = extractJobDetails(jobDescription);
    const hasTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(jobDescription);
    const defaultLangHint = hasTurkish ? 'Turkish' : 'the same language as the job posting';

    const model = "gpt-4o-mini";

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured. OPENAI_API_KEY missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toneDirectives: Record<string, string> = {
      professional: 'Write in a warm yet professional tone. Sound like a real person who is genuinely interested—not a template. Be articulate but conversational.',
      aggressive: 'Write with confidence and directness. Be bold but still sound like a real human being—not a sales robot. Show genuine urgency and passion.',
      calm: 'Write with warmth and authenticity. Be reflective and thoughtful—like a trusted colleague sharing their perspective. Natural and grounded.',
      consistent: 'Write in a steady, reliable tone. Sound dependable and genuine—like someone who delivers consistently. Professional but never stiff.',
    };
    const toneHint = toneDirectives[tone] || toneDirectives.professional;

    // ---- Build language instruction ----
    let languageInstruction = `Write in ${defaultLangHint}. Match the formality of the posting exactly.`;
    if (outputLanguage && outputLanguage !== 'en') {
      const langName = LANGUAGE_NAMES[outputLanguage] || outputLanguage;
      languageInstruction = `Write the ENTIRE output in ${langName}. Do NOT write in English. Apply culturally-appropriate communication style for ${langName}-speaking audiences.`;
      if (culturalTone && CULTURAL_TONE_DIRECTIVES[culturalTone]) {
        languageInstruction += `\n\nCULTURAL TONE: ${CULTURAL_TONE_DIRECTIVES[culturalTone]}`;
      }
    }

    // ---- Build system prompt based on segment ----
    let baseSystemPrompt: string;
    let userPromptBase: string;

    if (userSegment === 'freelancer') {
      const clusterTemplate = CLUSTER_TEMPLATES[professionCluster] || CLUSTER_TEMPLATES.technical;
      const platformConfig = PLATFORM_CONFIGS[platformType] || PLATFORM_CONFIGS.upwork;

      baseSystemPrompt = `You are a skilled freelance professional writing your own proposal. Write naturally—like a real person, not a template engine.

PLATFORM: ${platformConfig.style}
TARGET LENGTH: ${platformConfig.lengthRange}

CLUSTER-SPECIFIC TEMPLATE — FOLLOW THIS STRUCTURE:
- HOOK: ${clusterTemplate.hookStructure}
- BODY FLOW: ${clusterTemplate.bodyFlowTemplate}
- CTA: ${clusterTemplate.ctaLogic}
- TONE: ${clusterTemplate.toneCalibration}
- PROOF STRATEGY: ${clusterTemplate.proofStrategy}
- LENGTH: ${clusterTemplate.optimalLength}

TONE INSTRUCTION: ${toneHint}

CRITICAL RULES FOR NATURAL, HUMAN WRITING:
1. OUTPUT ONLY THE PROPOSAL TEXT. No explanations, no tips, no "Here's your proposal:".
2. Write as if YOU ARE the freelancer — first person, natural voice.
3. NEVER use placeholders like [Your Name], [Client], [X years].
4. Sound like a real professional talking to another professional — not an AI generating text.
5. Vary sentence length. Mix short punchy sentences with longer flowing ones.
6. Use contractions naturally (I've, I'm, you'll, we'd) — real people use them.
7. ${languageInstruction}
8. Avoid corporate buzzwords and clichés: "leverage", "synergy", "passionate about", "excited to", "I believe I would be a great fit".
9. Instead of generic praise, show genuine understanding of the client's actual problem.
10. Write like you've done this work before and you're confidently offering your help — not begging for the job.
11. NO emoji, section labels, or formatting markers unless the platform style requires it.
12. The result should sound like it was written by a thoughtful human — someone you'd want to work with.`;

      userPromptBase = `Write my freelance proposal for this client brief. Output ONLY the proposal text, nothing else.

CLIENT BRIEF / JOB POST:
${jobDescription}

MY PROFILE:
${sanitizedProfile.skills.length ? `Skills: ${sanitizedProfile.skills.join(", ")}` : "Versatile professional"}
${sanitizedProfile.experience ? `Experience: ${sanitizedProfile.experience}` : "Experienced freelancer"}
${sanitizedProfile.hourly_rate ? `Rate: $${sanitizedProfile.hourly_rate}/hour` : ""}
${selectedProfession ? `Profession: ${selectedProfession}` : ""}
Platform: ${platformType || 'upwork'} | Cluster: ${professionCluster || 'technical'}

Write the proposal now following the cluster template. No explanations — just the text I'll send.`;
    } else {
      // Corporate / Job Seeker mode — existing logic
      baseSystemPrompt = `You are a skilled professional writing your own job application. Write naturally—like a real person who genuinely wants this role, not a template engine.

TONE INSTRUCTION: ${toneHint}

CRITICAL RULES FOR NATURAL, HUMAN WRITING:
1. OUTPUT ONLY THE APPLICATION TEXT. No explanations, no meta-commentary.
2. Write as if YOU ARE the applicant — first person, authentic voice.
3. NEVER open with "Dear Hiring Manager" or cliché greetings. Start with substance.
4. NEVER use placeholders like [Your Name], [Company], [X years].
5. Sound like a real person having a professional conversation — not an AI output.
6. Vary sentence length naturally. Mix short direct statements with longer thoughts.
7. Use contractions where natural (I've, I'm, you'll, it's) — real people write this way.
8. ${languageInstruction}
9. AVOID these robotic patterns: "I am writing to express my interest", "I believe I would be a great fit", "passionate about", "leverage my skills", "excited for the opportunity", "I am confident that".
10. Instead, show genuine understanding of what the company actually needs and why you can help.

WRITING STRUCTURE (flowing paragraphs, never label sections):
- Opening: A specific first sentence that proves you read and understood the job — reference an actual detail
- Value bridge: What YOU bring — mapped to their needs, with specifics not generics
- Proof: 1-2 concrete examples with real outcomes (numbers when available)
- Close: A natural, confident ending that makes them want to respond — not a formal sign-off

THE RESULT SHOULD:
- Sound like it was written by a thoughtful human, not generated by AI
- Feel like a genuine conversation starter, not a form letter
- Make the reader think "this person actually gets what we need"`;

      userPromptBase = `Write my job application text for this posting. Output ONLY the application text, nothing else.

JOB POSTING:
${jobDescription}

MY PROFILE:
${sanitizedProfile.skills.length ? `Skills: ${sanitizedProfile.skills.join(", ")}` : "Adaptable professional"}
${sanitizedProfile.experience ? `Experience: ${sanitizedProfile.experience}` : "Experienced professional"}
${sanitizedProfile.hourly_rate ? `Rate: $${sanitizedProfile.hourly_rate}/hour` : ""}
Industry: ${jobDetails.industry} | Type: ${jobDetails.roleType}

Write the application text now. No explanations — just the text I'll send.`;
    }

    // ---- Freelance Score Calculation — Two-Layer Competitive Engine ----
    let freelanceScoreResult = null;
    if (userSegment === 'freelancer') {
      const jdLen = jobDescription.length;
      const hasSkills = sanitizedProfile.skills.length > 0;
      const hasExperience = !!sanitizedProfile.experience;
      const hasRate = !!sanitizedProfile.hourly_rate;
      const hasProfession = !!selectedProfession;

      // Layer 1: Raw factor scores (deterministic, no randomness)
      const hookStrength = Math.min(100, 35 + (jdLen > 200 ? 20 : jdLen > 100 ? 10 : 0) + (hasProfession ? 18 : 0) + (hasSkills ? 12 : 0));
      const clientPainAlignment = Math.min(100, 30 + (jdLen > 300 ? 25 : jdLen > 150 ? 15 : 8) + (hasProfession ? 15 : 0));
      const skillRelevance = Math.min(100, (hasSkills ? 45 : 15) + (hasProfession ? 22 : 0) + (hasExperience ? 10 : 0));
      const proofDensity = Math.min(100, (hasExperience ? 35 : 8) + (hasSkills ? 18 : 0) + (hasRate ? 12 : 0));
      const ctaClarity = Math.min(100, 42 + (hasProfession ? 18 : 0) + (jdLen > 100 ? 10 : 0));
      const lengthOptimization = Math.min(100, 55 + (jdLen > 200 ? 15 : 0));
      const platformCompetitiveness = platformType === 'upwork' ? 78 : platformType === 'fiverr' ? 88 : platformType === 'direct-client' ? 48 : 58;
      const clusterCalibration = Math.min(100, (professionCluster ? 60 : 25) + (hasProfession ? 18 : 0));

      const factors = {
        hookStrength: Math.round(hookStrength),
        clientPainAlignment: Math.round(clientPainAlignment),
        skillRelevance: Math.round(skillRelevance),
        proofDensity: Math.round(proofDensity),
        ctaClarity: Math.round(ctaClarity),
        lengthOptimization: Math.round(lengthOptimization),
        platformCompetitiveness: Math.round(platformCompetitiveness),
        clusterCalibration: Math.round(clusterCalibration),
      };

      // Layer 1: Raw quality score
      const rawScore =
        factors.hookStrength * 0.18 +
        factors.clientPainAlignment * 0.20 +
        factors.skillRelevance * 0.18 +
        factors.proofDensity * 0.12 +
        factors.ctaClarity * 0.10 +
        factors.lengthOptimization * 0.07 +
        (100 - factors.platformCompetitiveness) * 0.08 +
        factors.clusterCalibration * 0.07;

      const clampedRaw = Math.min(100, Math.max(0, Math.round(rawScore)));

      // Layer 2: Competitive adjustment
      const competitionPressure =
        (factors.platformCompetitiveness / 100) * 0.30 +
        (Math.min(100, factors.platformCompetitiveness * 0.9 + 10) / 100) * 0.25 +
        (Math.max(0, (100 - factors.clusterCalibration) / 100 * 0.7 + 0.15)) * 0.25 +
        (Math.max(0, Math.min(1, (100 - factors.clusterCalibration) / 100))) * 0.20;

      const adjustmentMultiplier = Math.max(0.55, Math.min(1.0, 1 - (competitionPressure * 0.42)));
      const adjustedScore = clampedRaw * adjustmentMultiplier;

      // Distribution calibration: push toward center (target avg ~63)
      const center = 63;
      const distanceFromCenter = adjustedScore - center;
      const calibratedScore = center + (distanceFromCenter * 0.72);
      const competitiveScore = Math.max(28, Math.min(92, Math.round(calibratedScore)));

      // Competition level label
      let competitionLevel = 'Moderate Competition';
      if (adjustmentMultiplier < 0.70) competitionLevel = 'High Competitive Pressure';
      else if (adjustmentMultiplier >= 0.85) competitionLevel = 'Low Competition';

      // Percentile
      let percentile = '';
      if (competitiveScore >= 80) percentile = 'Top 10%';
      else if (competitiveScore >= 70) percentile = 'Top 20%';
      else if (competitiveScore >= 60) percentile = 'Top 40%';
      else if (competitiveScore >= 50) percentile = 'Top 60%';
      else if (competitiveScore >= 40) percentile = 'Top 75%';
      else percentile = 'Bottom 30%';

      // Interpretation
      let interpretation = '';
      if (competitiveScore >= 80) interpretation = 'Strong optimization, but competition remains a factor. Your proposal stands out — maintain this quality.';
      else if (competitiveScore >= 70) interpretation = 'Well-optimized proposal. Targeted improvements could push you into the top tier.';
      else if (competitiveScore >= 55) interpretation = 'Competitive proposal that needs sharper positioning. Focus on specific proof points.';
      else interpretation = 'Optimization needed to compete effectively. Address the key gaps below.';

      // Context label
      let contextLabel = 'Competitive';
      if (competitiveScore >= 80) contextLabel = 'Highly Competitive';
      else if (competitiveScore >= 70) contextLabel = 'Strong';
      else if (competitiveScore < 55) contextLabel = 'Needs Optimization';

      // Optimized potential (Elite simulation)
      const optimizedRaw =
        Math.min(100, factors.hookStrength + 20) * 0.18 +
        Math.min(100, factors.clientPainAlignment + 15) * 0.20 +
        Math.min(100, factors.skillRelevance + 15) * 0.18 +
        Math.min(100, factors.proofDensity + 25) * 0.12 +
        Math.min(100, factors.ctaClarity + 20) * 0.10 +
        Math.min(100, factors.lengthOptimization + 15) * 0.07 +
        (100 - factors.platformCompetitiveness) * 0.08 +
        Math.min(100, factors.clusterCalibration + 10) * 0.07;
      const optimizedCal = center + ((Math.min(100, optimizedRaw) * adjustmentMultiplier - center) * 0.72);
      const optimizedPotential = Math.max(competitiveScore + 5, Math.max(28, Math.min(92, Math.round(optimizedCal))));

      const suggestions: string[] = [];
      if (factors.hookStrength < 60) suggestions.push('Strengthen your opening hook — reference a specific detail from the client\'s brief');
      if (factors.clientPainAlignment < 60) suggestions.push('Better align your proposal with the client\'s core pain points');
      if (factors.skillRelevance < 60) suggestions.push('Highlight skills that directly match the project requirements');
      if (factors.proofDensity < 50) suggestions.push('Add concrete proof: portfolio links, metrics, or testimonials');
      if (factors.ctaClarity < 60) suggestions.push('End with a clear, specific call-to-action');
      if (factors.lengthOptimization < 50) suggestions.push('Adjust proposal length for this platform');
      if (factors.platformCompetitiveness > 70) suggestions.push('High-competition platform — lead with a unique differentiator');

      freelanceScoreResult = {
        overallScore: competitiveScore,
        rawScore: clampedRaw,
        competitiveScore,
        factors,
        percentile,
        interpretation,
        competitionLevel,
        contextLabel,
        optimizedPotential,
        competitiveAdjustment: adjustmentMultiplier,
        topSuggestions: suggestions.slice(0, 5),
      };
    }

    // For free users: single high-quality proposal
    if (!isProOrElite) {
      const qualityDirective = userSegment === 'freelancer'
        ? `QUALITY STANDARD — PROFESSIONAL GRADE FREELANCE PROPOSAL:
- Write a sharp, compelling, fully customized proposal following the cluster template
- Show genuine understanding of the client's specific project needs
- Reference at least ONE specific detail from their job posting to prove you read it
- Include at least one concrete skill demonstration or past result with a number/metric
- Use confident, assertive language — write like someone who has done this successfully before
- Open with a hook that makes the client stop scrolling — no "I am interested in your project"
- Demonstrate domain expertise through specific terminology and methodology
- End with a clear, actionable next step (not just "looking forward to hearing from you")
- Target the platform-appropriate length
- The proposal should feel like it was written by a TOP 20% freelancer on this platform`
        : `QUALITY STANDARD — PROFESSIONAL GRADE:
- Write a sharp, compelling, fully customized application that stands out from 95% of applicants
- Show genuine understanding of the specific role's challenges — reference a SPECIFIC detail from the posting
- Include at least one concrete, quantified achievement (e.g., "increased conversion by 34%", "reduced latency by 60%")
- Open with a powerful first sentence that immediately demonstrates relevant expertise — NOT a generic greeting
- Use confident, assertive language — not passive or generic. Write like a top performer, not a job seeker
- Show strategic thinking: don't just list skills, explain HOW you'd apply them to THIS role
- Include a brief mention of methodology or approach that shows depth (frameworks, tools, processes)
- Close with energy and a specific, actionable next step — make them want to respond
- Target 260-340 words — tight, focused, impactful
- The application should feel like it was written by someone who genuinely understands the company's challenges`;


      const aiResponse = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `${baseSystemPrompt}\n\n${qualityDirective}` },
            { role: "user", content: userPromptBase },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI gateway error: status=${aiResponse.status}, body=${errorText}`);
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: `AI generation failed (${aiResponse.status}). Please try again.` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const generatedProposal = aiData.choices?.[0]?.message?.content;

      if (!generatedProposal) {
        return new Response(
          JSON.stringify({ error: "Failed to generate proposal content" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("profiles")
        .update({
          daily_proposals_used: currentUsage + 1,
          last_usage_reset: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          proposal: generatedProposal,
          variants: null,
          freelanceScore: freelanceScoreResult,
          usage: {
            used: currentUsage + 1,
            limit: DAILY_LIMIT,
            remaining: DAILY_LIMIT - currentUsage - 1,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For Pro/Elite: generate multiple variants in PARALLEL for speed
    const variants = isElite ? VARIANT_CONFIGS.elite : VARIANT_CONFIGS.pro;

    console.log(`Generating ${variants.length} variants in parallel...`);
    
    const variantPromises = variants.map(async (variant) => {
      try {
        console.log(`Starting variant ${variant.id}...`);
        const aiResponse = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: `${baseSystemPrompt}\n\n${variant.directive}` },
              { role: "user", content: userPromptBase },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text().catch(() => 'unknown');
          console.error(`Variant ${variant.id} failed: status=${aiResponse.status}, body=${errText}`);
          if (aiResponse.status === 402) {
            throw new Error("CREDITS_EXHAUSTED");
          }
          return { ...variant, text: null as string | null, error: true };
        }

        const aiData = await aiResponse.json();
        const text = aiData.choices?.[0]?.message?.content || null;
        if (text) console.log(`Variant ${variant.id} generated successfully`);
        else console.error(`Variant ${variant.id}: no content`);
        return { ...variant, text, error: !text };
      } catch (err) {
        if (err instanceof Error && err.message === "CREDITS_EXHAUSTED") throw err;
        console.error(`Variant ${variant.id} exception:`, err instanceof Error ? err.message : err);
        return { ...variant, text: null as string | null, error: true };
      }
    });

    let results: Array<typeof variants[0] & { text: string | null; error: boolean }>;
    try {
      results = await Promise.all(variantPromises);
    } catch (err) {
      if (err instanceof Error && err.message === "CREDITS_EXHAUSTED") {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw err;
    }
    
    const successfulVariants = results.filter(r => r.text);
    console.log(`Generated ${successfulVariants.length}/${variants.length} variants successfully`);
    
    if (successfulVariants.length === 0) {
      // Fallback: try generating a single proposal instead of failing completely
      console.log('All variants failed, attempting single fallback generation...');
      try {
        const fallbackResponse = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: baseSystemPrompt },
              { role: "user", content: userPromptBase },
            ],
          }),
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackText = fallbackData.choices?.[0]?.message?.content;
          if (fallbackText) {
            console.log('Fallback generation succeeded');
            await supabase
              .from("profiles")
              .update({
                daily_proposals_used: currentUsage + 1,
                last_usage_reset: new Date().toISOString(),
              })
              .eq("user_id", user.id);
            
            return new Response(
              JSON.stringify({
                proposal: fallbackText,
                variants: [{ id: 'fallback', label: 'Generated Proposal', badge: '📝 Proposal', description: 'AI-generated proposal', text: fallbackText }],
                freelanceScore: freelanceScoreResult,
                usage: { used: currentUsage + 1, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - currentUsage - 1 },
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          const errText = await fallbackResponse.text().catch(() => 'unknown');
          console.error(`Fallback also failed: status=${fallbackResponse.status}, body=${errText}`);
        }
      } catch (fbErr) {
        console.error('Fallback exception:', fbErr instanceof Error ? fbErr.message : fbErr);
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate proposals. The AI service may be temporarily unavailable. Please try again in a moment." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("profiles")
      .update({
        daily_proposals_used: currentUsage + 1,
        last_usage_reset: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    console.log(`Generated ${successfulVariants.length} variants for ${plan} plan, segment: ${userSegment}`);

    return new Response(
      JSON.stringify({
        proposal: successfulVariants[0].text,
        variants: successfulVariants.map(v => ({
          id: v.id,
          label: v.label,
          badge: v.badge,
          description: v.description,
          text: v.text,
        })),
        freelanceScore: freelanceScoreResult,
        usage: {
          used: currentUsage + 1,
          limit: DAILY_LIMIT,
          remaining: DAILY_LIMIT - currentUsage - 1,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
