import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type OptimizationType = 
  | "company-rewrite" 
  | "acceptance-score" 
  | "tone-optimization"
  | "decision-maker"
  | "outreach-messages"
  | "full-strategy";

const validOptimizationTypes: OptimizationType[] = [
  "company-rewrite",
  "acceptance-score", 
  "tone-optimization",
  "decision-maker",
  "outreach-messages",
  "full-strategy"
];

// Validate and sanitize input
function sanitizeText(input: unknown, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

function validateProposal(proposal: unknown): string | null {
  const sanitized = sanitizeText(proposal, 15000);
  if (!sanitized || sanitized.length < 10) return null;
  return sanitized;
}

function validateOptimizationType(type: unknown): OptimizationType | null {
  if (typeof type !== 'string') return null;
  if (validOptimizationTypes.includes(type as OptimizationType)) {
    return type as OptimizationType;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const proposal = validateProposal(body.proposal);
    const optimizationType = validateOptimizationType(body.optimizationType);
    const jobDescription = sanitizeText(body.jobDescription, 15000);
    const companyInfo = sanitizeText(body.companyInfo, 2000);

    if (!proposal) {
      return new Response(
        JSON.stringify({ error: "Valid proposal is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!optimizationType) {
      return new Response(
        JSON.stringify({ error: "Valid optimization type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user token and check plan
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has Pro or Elite plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const plan = profile?.subscription_plan || "free";
    
    // Elite features require Elite plan
    const eliteFeatures: OptimizationType[] = ["decision-maker", "outreach-messages", "full-strategy"];
    if (eliteFeatures.includes(optimizationType)) {
      if (plan !== "elite") {
        return new Response(
          JSON.stringify({ error: "Elite plan required for this feature" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Pro features require Pro or Elite
      if (plan !== "pro" && plan !== "elite") {
        return new Response(
          JSON.stringify({ error: "Pro or Elite plan required for optimization features" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured. OPENAI_API_KEY missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";
    let useToolCalling = false;
    let toolConfig: any = null;

    const model = eliteFeatures.includes(optimizationType) 
      ? "gpt-4o" 
      : "gpt-4o-mini";

    switch (optimizationType) {
      case "company-rewrite":
        systemPrompt = `You are a professional writer who excels at tailoring applications to specific companies. You write like a real person — warm, specific, and genuine. Never robotic or template-like.`;
        userPrompt = `Rewrite this proposal to feel genuinely tailored for this specific company and role. Make it sound like it was written by a real person who actually researched and understands this company.

ORIGINAL PROPOSAL:
${proposal}

JOB POSTING:
${jobDescription}

${companyInfo ? `ADDITIONAL COMPANY INFO: ${companyInfo}` : ""}

Instructions:
1. Pick up on the company's values and culture from how they wrote the job post
2. Use their terminology naturally — not forced
3. Match the tone of their posting (formal, casual, energetic, etc.)
4. Highlight skills that directly address what they're actually looking for
5. Show genuine understanding of their specific challenges — not generic statements
6. Use contractions and natural language — sound human, not corporate
7. Avoid clichés like "passionate about", "leverage", "excited for the opportunity"

Return ONLY the rewritten proposal, nothing else.`;
        break;

      case "acceptance-score":
        systemPrompt = `You are an expert hiring analyst who evaluates job applications. You provide accurate assessments of proposal quality and likelihood of success.`;
        userPrompt = `Analyze this proposal against the job description and provide a detailed acceptance probability assessment.

PROPOSAL:
${proposal}

JOB DESCRIPTION:
${jobDescription}

Analyze and return a structured assessment.`;
        useToolCalling = true;
        toolConfig = {
          tools: [
            {
              type: "function",
              function: {
                name: "analyze_proposal",
                description: "Analyze a job proposal and return a structured assessment",
                parameters: {
                  type: "object",
                  properties: {
                    score: {
                      type: "number",
                      description: "Acceptance probability score from 0-100"
                    },
                    strengths: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of 3-5 strong points in the proposal"
                    },
                    weaknesses: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of 2-4 areas for improvement"
                    },
                    suggestions: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of 2-3 specific improvement suggestions"
                    },
                    summary: {
                      type: "string",
                      description: "Brief 2-sentence summary of the assessment"
                    }
                  },
                  required: ["score", "strengths", "weaknesses", "suggestions", "summary"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "analyze_proposal" } }
        };
        break;

      case "tone-optimization":
        systemPrompt = `You are a professional editor who makes business writing sound more human, clear, and compelling. Your goal is to make text sound like it was written by a thoughtful person — not generated by AI.`;
        userPrompt = `Improve this proposal to sound more natural, human, and compelling. Remove anything that sounds robotic, template-like, or generic.

ORIGINAL PROPOSAL:
${proposal}

JOB DESCRIPTION (for context):
${jobDescription}

Optimize by:
1. Making sentences flow naturally — vary length, use contractions
2. Removing corporate jargon and AI-sounding phrases ("leverage", "passionate about", "I believe I would be")
3. Strengthening specific claims with concrete details
4. Making it sound like a real person wrote it — someone you'd want to work with
5. Keeping the right length — tight and impactful, not padded

Return ONLY the optimized proposal, nothing else.`;
        break;

      case "decision-maker":
        systemPrompt = `You are an expert at organizational analysis and identifying decision-makers in hiring processes. You understand corporate hierarchies, job titles, and who typically makes hiring decisions for different types of roles.`;
        userPrompt = `Based on this job description, identify the likely decision-makers and key stakeholders involved in the hiring process.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE PROPOSAL (for context):
${proposal}

Analyze and return structured information about the decision-makers.`;
        useToolCalling = true;
        toolConfig = {
          tools: [
            {
              type: "function",
              function: {
                name: "identify_decision_makers",
                description: "Identify decision-makers and stakeholders for a job opening",
                parameters: {
                  type: "object",
                  properties: {
                    primaryDecisionMaker: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Likely job title (e.g., 'Engineering Manager')" },
                        department: { type: "string", description: "Department they work in" },
                        influence: { type: "string", description: "Their role in the decision (e.g., 'Final hiring decision')" },
                        linkedInSearchTip: { type: "string", description: "How to find them on LinkedIn" }
                      },
                      required: ["title", "department", "influence", "linkedInSearchTip"]
                    },
                    secondaryStakeholders: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          role: { type: "string", description: "Their role in the process" }
                        },
                        required: ["title", "role"]
                      },
                      description: "Other people who influence the decision"
                    },
                    companyInsights: {
                      type: "object",
                      properties: {
                        companyType: { type: "string", description: "Type of company (startup, enterprise, agency, etc.)" },
                        hiringStyle: { type: "string", description: "Likely hiring approach" },
                        redFlags: { type: "array", items: { type: "string" }, description: "Potential concerns to watch for" },
                        greenFlags: { type: "array", items: { type: "string" }, description: "Positive signs about the opportunity" }
                      },
                      required: ["companyType", "hiringStyle", "redFlags", "greenFlags"]
                    },
                    outreachStrategy: {
                      type: "string",
                      description: "Recommended approach to reach these decision-makers"
                    }
                  },
                  required: ["primaryDecisionMaker", "secondaryStakeholders", "companyInsights", "outreachStrategy"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "identify_decision_makers" } }
        };
        break;

      case "outreach-messages":
        systemPrompt = `You are an expert at professional networking and outreach. You craft personalized, compelling messages that get responses from busy professionals. You understand what makes messages stand out in crowded inboxes and LinkedIn DMs.`;
        userPrompt = `Create personalized outreach messages for this job opportunity.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE PROPOSAL/BACKGROUND:
${proposal}

Generate compelling outreach messages that the candidate can use.`;
        useToolCalling = true;
        toolConfig = {
          tools: [
            {
              type: "function",
              function: {
                name: "generate_outreach_messages",
                description: "Generate personalized outreach messages",
                parameters: {
                  type: "object",
                  properties: {
                    linkedInConnectionRequest: {
                      type: "string",
                      description: "Short connection request message (max 300 chars)"
                    },
                    linkedInFollowUp: {
                      type: "string",
                      description: "Follow-up message after connection is accepted"
                    },
                    coldEmail: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        body: { type: "string" }
                      },
                      required: ["subject", "body"]
                    },
                    followUpEmail: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        body: { type: "string" }
                      },
                      required: ["subject", "body"]
                    },
                    twitterDM: {
                      type: "string",
                      description: "Short Twitter/X DM (max 280 chars)"
                    },
                    tips: {
                      type: "array",
                      items: { type: "string" },
                      description: "3-5 tips for effective outreach"
                    }
                  },
                  required: ["linkedInConnectionRequest", "linkedInFollowUp", "coldEmail", "followUpEmail", "tips"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "generate_outreach_messages" } }
        };
        break;

      case "full-strategy":
        systemPrompt = `You are a senior career strategist and job application coach with deep expertise in hiring processes. You analyze opportunities holistically and create comprehensive strategies that maximize success probability. You're known for honest, actionable advice.`;
        userPrompt = `Create a comprehensive application strategy for this opportunity.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE PROPOSAL/BACKGROUND:
${proposal}

Analyze every aspect and provide a complete strategy.`;
        useToolCalling = true;
        toolConfig = {
          tools: [
            {
              type: "function",
              function: {
                name: "create_full_strategy",
                description: "Create a comprehensive job application strategy",
                parameters: {
                  type: "object",
                  properties: {
                    overallAssessment: {
                      type: "object",
                      properties: {
                        fitScore: { type: "number", description: "Overall fit score 0-100" },
                        summary: { type: "string", description: "2-3 sentence assessment" },
                        verdict: { type: "string", enum: ["Strong Match", "Good Match", "Moderate Match", "Weak Match", "Not Recommended"] }
                      },
                      required: ["fitScore", "summary", "verdict"]
                    },
                    whyApplicationsFail: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          reason: { type: "string" },
                          howToAvoid: { type: "string" }
                        },
                        required: ["reason", "howToAvoid"]
                      },
                      description: "Common reasons similar applications fail and how to avoid them"
                    },
                    differentiators: {
                      type: "array",
                      items: { type: "string" },
                      description: "What could make this candidate stand out"
                    },
                    riskFactors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          risk: { type: "string" },
                          mitigation: { type: "string" }
                        },
                        required: ["risk", "mitigation"]
                      }
                    },
                    actionPlan: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          step: { type: "number" },
                          action: { type: "string" },
                          timing: { type: "string" },
                          priority: { type: "string", enum: ["Critical", "High", "Medium", "Low"] }
                        },
                        required: ["step", "action", "timing", "priority"]
                      },
                      description: "Step-by-step action plan"
                    },
                    interviewPrep: {
                      type: "object",
                      properties: {
                        likelyQuestions: { type: "array", items: { type: "string" } },
                        questionsToAsk: { type: "array", items: { type: "string" } },
                        keyTalkingPoints: { type: "array", items: { type: "string" } }
                      },
                      required: ["likelyQuestions", "questionsToAsk", "keyTalkingPoints"]
                    },
                    salaryInsight: {
                      type: "object",
                      properties: {
                        estimatedRange: { type: "string" },
                        negotiationTips: { type: "array", items: { type: "string" } }
                      },
                      required: ["estimatedRange", "negotiationTips"]
                    },
                    finalAdvice: {
                      type: "string",
                      description: "One powerful piece of advice for this specific application"
                    }
                  },
                  required: ["overallAssessment", "whyApplicationsFail", "differentiators", "riskFactors", "actionPlan", "interviewPrep", "finalAdvice"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "create_full_strategy" } }
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid optimization type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const requestBody: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    if (useToolCalling && toolConfig) {
      requestBody.tools = toolConfig.tools;
      requestBody.tool_choice = toolConfig.tool_choice;
    }

    console.log(`Starting ${optimizationType} with model ${model}`);

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      console.error("AI Gateway error:", aiResponse.status);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to process request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    
    let result: any;
    
    if (useToolCalling) {
      // Extract tool call result
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          result = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse tool call arguments");
          return new Response(
            JSON.stringify({ error: "Failed to parse analysis result" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "No analysis result returned" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      result = aiData.choices?.[0]?.message?.content;
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Failed to get result" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${optimizationType} completed successfully`);

    return new Response(
      JSON.stringify({
        type: optimizationType,
        result,
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
