import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getOpenAIApiKey, missingOpenAIKeyResponse } from "../_shared/openaiKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function textOf(value: unknown, max = 4000): string {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (Array.isArray(value)) return value.map((item) => textOf(item, max)).filter(Boolean).join("\n").slice(0, max);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return textOf(rec.text ?? rec.content ?? rec.body ?? rec.message ?? rec.proposal ?? rec.jobDescription, max);
  }
  return "";
}

function firstText(values: unknown[], max = 4000): string {
  for (const value of values) {
    const text = textOf(value, max);
    if (text) return text;
  }
  return "";
}

function titleFrom(text: string): string {
  const line = String(text || "").split(/\n/)[0].replace(/[#*_`-]/g, " ").replace(/\s+/g, " ").trim();
  return line.slice(0, 80) || "this role";
}

function fallbackFollowUps(job: string, proposal: string, clientName: string) {
  const role = titleFrom(job || proposal);
  const name = clientName || "there";
  return {
    followUp3: `Hi ${name} — circling back on ${role}. If useful, I can walk through a first pass this week.`,
    followUp7: `Wanted to add one practical next step for ${role}: a short diagnostic, then the first milestone without a long ramp. If timing is better later, I can hold a slot next week.`,
  };
}

function fallbackQuestions(job: string, proposal: string) {
  const role = titleFrom(job || proposal);
  return {
    questions: [
      {
        question: `What would a strong first 30 days look like for ${role}?`,
        suggestedAnswer: "Map the current workflow, pick one bottleneck to fix in week one, and agree on a measurable result before expanding scope.",
        tip: "Name a concrete first deliverable.",
      },
      {
        question: "How have you handled similar work before?",
        suggestedAnswer: proposal
          ? "Point to the same pattern in the note already sent: start small, ship a visible win, then scale what moved the needle."
          : "Pick one comparable project, state the constraint, and show the result in numbers.",
        tip: "Keep the story to one project.",
      },
      {
        question: "What would you need from us to start?",
        suggestedAnswer: "The live brief, one decision-maker, and a sample of the current output. That is enough to start.",
        tip: "Ask for access, not a committee.",
      },
    ],
  };
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const match = String(raw || "").match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const type = String(body.type || body.mode || "followup").toLowerCase();
  const language = firstText([body.language, body.outputLanguage], 12) || "en";
  const jobDescription = firstText([body.jobDescription, body.jobContext, body.job_context, body.job, body.pageText]);
  const proposal = firstText([body.proposal, body.proposalHistory, body.proposal_history, body.previousMessages, body.previous_messages, body.messages]);
  const clientName = firstText([body.clientName, body.client_name, body.client], 80);
  const fallback = type === "interview"
    ? fallbackQuestions(jobDescription, proposal)
    : fallbackFollowUps(jobDescription, proposal, clientName);

  try {
    const OPENAI_API_KEY = getOpenAIApiKey();
    if (!OPENAI_API_KEY) {
      const missing = missingOpenAIKeyResponse(corsHeaders);
      if (missing.status >= 500) return json({ success: true, fallback: true, ...fallback });
      return missing;
    }

    const langLine = language === "tr" ? "Respond in Turkish." : language === "de" ? "Respond in German." : language === "fr" ? "Respond in French." : "Respond in English.";
    const context = [
      jobDescription ? `JOB:\n${jobDescription.slice(0, 1500)}` : "",
      proposal ? `PREVIOUS NOTE:\n${proposal.slice(0, 1500)}` : "",
      clientName ? `CLIENT: ${clientName}` : "",
    ].filter(Boolean).join("\n\n") || "The candidate already applied. Write from that fact alone.";

    const systemPrompt = type === "interview"
      ? `You write interview prep. Return ONLY JSON {"questions":[{"question":"...","suggestedAnswer":"...","tip":"..."}]} with exactly 3 items. No markdown. ${langLine}`
      : `You write short follow-up messages. Return ONLY JSON {"followUp3":"...","followUp7":"..."}. No markdown, no robotic phrasing. ${langLine}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return json({ error: "Rate limited", ...fallback }, 429);
      if (status === 402) return json({ error: "Credits exhausted", ...fallback }, 402);
      return json({ success: true, fallback: true, ...fallback });
    }

    const result = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = parseJsonObject(result.choices?.[0]?.message?.content || "");
    if (type === "interview") {
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      if (!questions.length) return json({ success: true, fallback: true, ...fallbackQuestions(jobDescription, proposal) });
      return json({ success: true, questions });
    }
    const followUp3 = textOf(parsed.followUp3, 800);
    const followUp7 = textOf(parsed.followUp7, 800);
    if (!followUp3 || !followUp7) return json({ success: true, fallback: true, ...fallbackFollowUps(jobDescription, proposal, clientName) });
    return json({ success: true, followUp3, followUp7 });
  } catch (e) {
    console.error("generate-followup error:", e);
    return json({ success: true, fallback: true, ...fallback });
  }
});
