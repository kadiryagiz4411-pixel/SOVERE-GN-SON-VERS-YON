import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Turkish',
  de: 'German',
  fr: 'French',
};

function sanitizeText(input: unknown, maxLength = 10000): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function sanitizeStringArray(input: unknown, minItems = 0, maxItems = 6): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => sanitizeText(item, 140))
    .filter(Boolean)
    .slice(0, maxItems)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function sanitizeObjectArray<T>(
  input: unknown,
  mapper: (item: Record<string, unknown>) => T | null,
  maxItems = 6,
): T[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (item && typeof item === 'object' ? mapper(item as Record<string, unknown>) : null))
    .filter((item): item is T => item !== null)
    .slice(0, maxItems);
}

function getLanguageInstruction(outputLanguage: string): string {
  const languageName = SUPPORTED_LANGUAGE_NAMES[outputLanguage] || 'English';
  return `Write every user-facing field entirely in ${languageName}. Never mix languages, never include placeholders, and never mention that you are an AI.`;
}

function normalizeSmartMatchResult(raw: Record<string, any>, outputLanguage: string) {
  const matchScore = clamp(raw.matchScore, 0, 100, 62);

  const breakdown = {
    skillsMatch: clamp(raw.matchBreakdown?.skillsMatch, 0, 100, matchScore),
    experienceMatch: clamp(raw.matchBreakdown?.experienceMatch, 0, 100, matchScore),
    cultureMatch: clamp(raw.matchBreakdown?.cultureMatch, 0, 100, Math.max(40, matchScore - 5)),
    technicalMatch: clamp(raw.matchBreakdown?.technicalMatch, 0, 100, matchScore),
  };

  const platformAcceptance = {
    upwork: clamp(raw.platformAcceptance?.upwork, 3, 45, Math.max(5, Math.min(35, Math.round(matchScore * 0.35)))),
    fiverr: clamp(raw.platformAcceptance?.fiverr, 5, 50, Math.max(8, Math.min(40, Math.round(matchScore * 0.4)))),
    linkedin: clamp(raw.platformAcceptance?.linkedin, 2, 30, Math.max(4, Math.min(22, Math.round(matchScore * 0.22)))),
    corporate: clamp(raw.platformAcceptance?.corporate, 3, 35, Math.max(5, Math.min(25, Math.round(matchScore * 0.26)))),
  };

  const strengths = sanitizeObjectArray(raw.gapAnalysis?.strengths, (item) => {
    const area = sanitizeText(item.area, 80);
    const detail = sanitizeText(item.detail, 240);
    return area && detail ? { area, detail } : null;
  }, 4);

  const gaps = sanitizeObjectArray(raw.gapAnalysis?.gaps, (item) => {
    const area = sanitizeText(item.area, 80);
    const detail = sanitizeText(item.detail, 240);
    const suggestion = sanitizeText(item.suggestion, 240);
    return area && detail && suggestion ? { area, detail, suggestion } : null;
  }, 4);

  const sampleJobListings = sanitizeObjectArray(raw.sampleJobListings, (item) => {
    const title = sanitizeText(item.title, 120);
    const platform = sanitizeText(item.platform, 30);
    const budget = sanitizeText(item.budget, 60);
    const matchReason = sanitizeText(item.matchReason, 200);
    return title && platform && budget && matchReason ? { title, platform, budget, matchReason } : null;
  }, 3);

  const topAlignmentPoints = sanitizeStringArray(raw.topAlignmentPoints, 0, 3);
  const applicationTips = sanitizeStringArray(raw.applicationTips, 0, 3);

  const normalized = {
    jobParsing: {
      requiredSkills: sanitizeStringArray(raw.jobParsing?.requiredSkills, 0, 8),
      yearsOfExperience: sanitizeText(raw.jobParsing?.yearsOfExperience, 40) || 'Not clearly stated',
      coreTechnologies: sanitizeStringArray(raw.jobParsing?.coreTechnologies, 0, 8),
      companyValues: sanitizeStringArray(raw.jobParsing?.companyValues, 0, 6),
      roleLevel: sanitizeText(raw.jobParsing?.roleLevel, 30) || 'Not specified',
      workType: sanitizeText(raw.jobParsing?.workType, 30) || 'Not specified',
      estimatedSalary: sanitizeText(raw.jobParsing?.estimatedSalary, 60) || 'N/A',
    },
    matchScore,
    matchBreakdown: breakdown,
    platformAcceptance,
    gapAnalysis: {
      strengths,
      gaps,
    },
    coverLetter: sanitizeText(raw.coverLetter, 4000),
    linkedInOutreach: sanitizeText(raw.linkedInOutreach, 1200),
    sampleJobListings,
    topAlignmentPoints,
    applicationTips,
    status: matchScore >= 60 ? 'analysis_complete' : 'analysis_complete',
    outputLanguage,
  };

  if (normalized.topAlignmentPoints.length === 0) {
    normalized.topAlignmentPoints.push(
      outputLanguage === 'tr' ? 'Temel teknik gereksinimlerle güçlü eşleşme' : 'Strong alignment with the core technical requirements',
      outputLanguage === 'tr' ? 'Deneyim seviyesi rol beklentisine yakın' : 'Experience level is close to the role expectations',
      outputLanguage === 'tr' ? 'Mesaj pozisyona özel net değer önerisi sunuyor' : 'The message presents a clear value proposition tailored to the role',
    );
  }

  if (normalized.applicationTips.length === 0) {
    normalized.applicationTips.push(
      outputLanguage === 'tr' ? 'Başvuruda en güçlü 2 sonucu sayısal verilerle öne çıkarın' : 'Highlight your top 2 measurable wins in the application',
      outputLanguage === 'tr' ? 'Eksik beceriler için hızlı öğrenme planını belirtin' : 'Address missing skills with a short learning plan',
      outputLanguage === 'tr' ? 'Mesajı şirketin ihtiyacına göre kısaltıp netleştirin' : 'Keep the message concise and anchored to the company need',
    );
  }

  return normalized;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 && i < retries) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('All retries failed');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const jobDescription = sanitizeText(body.jobDescription, 10000);
    const outputLanguage = body.outputLanguage || 'en';

    if (!jobDescription || jobDescription.length < 20) {
      return new Response(JSON.stringify({ error: "Job description too short (min 20 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Check plan access - allow 1 free trial per new user
    const plan = profile?.subscription_plan || 'basic';
    
    // Check if user has trial smart match uses
    const { count: smartMatchCount } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('notes', 'is', null);
    
    const hasUsedFreeTrial = (smartMatchCount || 0) >= 1;
    
    if (plan === 'basic' && hasUsedFreeTrial) {
      return new Response(JSON.stringify({ error: "Smart Match requires Pro or Elite plan. You've used your free trial." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userProfile = {
      full_name: profile?.full_name || 'Candidate',
      skills: profile?.skills || [],
      experience: profile?.experience || '',
      bio: profile?.bio || '',
      hourly_rate: profile?.hourly_rate,
      profession_cluster: profile?.profession_cluster || '',
      user_segment: profile?.user_segment || 'corporate',
    };

    const languageInstruction = getLanguageInstruction(outputLanguage);

    const systemPrompt = `Act as a Senior Tech Recruiter. Analyze the provided CV and Job Description. Find the 3 most critical alignment points and draft a message that proves the candidate is the perfect solution for the company's specific needs.

Return ONLY valid JSON matching the schema. Be precise, evidence-based, and realistic. Never mix languages. Never use generic filler, empty buzzwords, placeholders, or markdown. Every strength, gap, and message must map to explicit details from the profile and the job description.`;

    const analysisPrompt = JSON.stringify({
      instructions: {
        role: 'Senior Tech Recruiter and application strategist',
        language: SUPPORTED_LANGUAGE_NAMES[outputLanguage] || 'English',
        languageRule: languageInstruction,
        scoringRules: {
          matchScore: 'Most candidates should land between 45 and 78. Use 80+ only for unusually strong alignment.',
          platformAcceptance: {
            upwork: 'Usually 5-35 depending on proof, fit, and competition.',
            fiverr: 'Usually 8-40 depending on niche fit and packaging.',
            linkedin: 'Usually 3-22 depending on role fit and competition.',
            corporate: 'Usually 5-25 depending on ATS fit and seniority.',
          },
        },
        writingRules: [
          'Cover letter must be 220-380 words and tailored to this exact role.',
          'LinkedIn outreach must be 60-120 words and sound human.',
          'List 2-4 concrete strengths and 2-4 concrete gaps.',
          'Every gap must include a practical suggestion.',
          'Top alignment points must be short, specific, and role-relevant.',
          'Do not mention unavailable achievements or invent employers, metrics, or certifications.',
        ],
      },
      candidateProfile: {
        name: userProfile.full_name,
        skills: userProfile.skills,
        experience: userProfile.experience,
        bio: userProfile.bio,
        hourlyRate: userProfile.hourly_rate,
        segment: userProfile.user_segment,
        profession: userProfile.profession_cluster || 'Not specified',
      },
      jobDescription,
    });

    const response = await fetchWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: analysisPrompt },
          ],
          temperature: 0.2,
          max_tokens: 2600,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'smart_match_result',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  jobParsing: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      requiredSkills: { type: 'array', items: { type: 'string' } },
                      yearsOfExperience: { type: 'string' },
                      coreTechnologies: { type: 'array', items: { type: 'string' } },
                      companyValues: { type: 'array', items: { type: 'string' } },
                      roleLevel: { type: 'string' },
                      workType: { type: 'string' },
                      estimatedSalary: { type: 'string' },
                    },
                    required: ['requiredSkills', 'yearsOfExperience', 'coreTechnologies', 'companyValues', 'roleLevel', 'workType', 'estimatedSalary'],
                  },
                  matchScore: { type: 'integer', minimum: 0, maximum: 100 },
                  matchBreakdown: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      skillsMatch: { type: 'integer', minimum: 0, maximum: 100 },
                      experienceMatch: { type: 'integer', minimum: 0, maximum: 100 },
                      cultureMatch: { type: 'integer', minimum: 0, maximum: 100 },
                      technicalMatch: { type: 'integer', minimum: 0, maximum: 100 },
                    },
                    required: ['skillsMatch', 'experienceMatch', 'cultureMatch', 'technicalMatch'],
                  },
                  platformAcceptance: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      upwork: { type: 'integer', minimum: 0, maximum: 100 },
                      fiverr: { type: 'integer', minimum: 0, maximum: 100 },
                      linkedin: { type: 'integer', minimum: 0, maximum: 100 },
                      corporate: { type: 'integer', minimum: 0, maximum: 100 },
                    },
                    required: ['upwork', 'fiverr', 'linkedin', 'corporate'],
                  },
                  gapAnalysis: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      strengths: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            area: { type: 'string' },
                            detail: { type: 'string' },
                          },
                          required: ['area', 'detail'],
                        },
                      },
                      gaps: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            area: { type: 'string' },
                            detail: { type: 'string' },
                            suggestion: { type: 'string' },
                          },
                          required: ['area', 'detail', 'suggestion'],
                        },
                      },
                    },
                    required: ['strengths', 'gaps'],
                  },
                  coverLetter: { type: 'string' },
                  linkedInOutreach: { type: 'string' },
                  sampleJobListings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        title: { type: 'string' },
                        platform: { type: 'string' },
                        budget: { type: 'string' },
                        matchReason: { type: 'string' },
                      },
                      required: ['title', 'platform', 'budget', 'matchReason'],
                    },
                  },
                  topAlignmentPoints: { type: 'array', items: { type: 'string' } },
                  applicationTips: { type: 'array', items: { type: 'string' } },
                  status: { type: 'string', enum: ['analysis_complete'] },
                },
                required: ['jobParsing', 'matchScore', 'matchBreakdown', 'platformAcceptance', 'gapAnalysis', 'coverLetter', 'linkedInOutreach', 'sampleJobListings', 'topAlignmentPoints', 'applicationTips', 'status'],
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch {
      // Try regex extraction
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    analysisResult = normalizeSmartMatchResult(analysisResult, outputLanguage);

    // Save to applications table (Career CRM)
    const jobTitle = analysisResult.jobParsing?.coreTechnologies?.[0] 
      ? `${analysisResult.jobParsing.roleLevel || ''} ${analysisResult.jobParsing.coreTechnologies[0]}`.trim()
      : 'Smart Match Analysis';

    // Extract company name from job description
    const companyPatterns = [
      /(?:at|for|with)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/,
      /company:\s*([A-Za-z0-9\s]+)/i,
      /([A-Z][a-zA-Z0-9]+)\s+is\s+(?:looking|hiring|seeking)/i,
    ];
    let companyName = '';
    for (const pattern of companyPatterns) {
      const match = jobDescription.match(pattern);
      if (match) { companyName = match[1].trim(); break; }
    }

    await supabase.from('applications').insert({
      user_id: user.id,
      job_title: jobTitle || 'Smart Match Analysis',
      company: companyName || 'Unknown',
      job_description: jobDescription,
      generated_proposal: analysisResult.coverLetter || '',
      acceptance_score: Math.round(analysisResult.matchScore || 0),
      status: analysisResult.matchScore >= 60 ? 'ready_to_apply' : 'analysis_complete',
      notes: JSON.stringify({
        smartMatch: true,
        gapAnalysis: analysisResult.gapAnalysis,
        linkedInOutreach: analysisResult.linkedInOutreach,
        topAlignmentPoints: analysisResult.topAlignmentPoints,
        platformAcceptance: analysisResult.platformAcceptance,
        sampleJobListings: analysisResult.sampleJobListings,
      }),
    });

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Smart Match error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
