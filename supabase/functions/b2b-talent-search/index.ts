/**
 * b2b-talent-search
 * Accepts a natural language query, converts it to an OpenAI embedding,
 * then runs pgvector cosine-similarity search across the org's talent pool.
 * Returns ranked candidate matches with similarity scores.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  org_id: string;
  match_threshold?: number;
  match_count?: number;
  min_score?: number;
  verdict_filter?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SearchRequest = await req.json();
    const {
      query,
      org_id,
      match_threshold = 0.60,
      match_count = 20,
      min_score = 0,
      verdict_filter = null,
    } = body;

    if (!query?.trim() || !org_id) {
      return new Response(JSON.stringify({ error: "query and org_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    // Enrich query for better semantic match against candidate profiles
    const enrichedQuery = `Find candidates who: ${query}. Skills, experience, seniority, role alignment.`;

    // Embed the search query
    const embedResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: enrichedQuery,
        dimensions: 1536,
      }),
    });

    if (!embedResponse.ok) {
      throw new Error(`OpenAI Embeddings error: ${await embedResponse.text()}`);
    }

    const embedData = await embedResponse.json();
    const queryEmbedding: number[] = embedData.data[0].embedding;

    // Run vector similarity search via RPC
    const { data: results, error: searchErr } = await supabase.rpc("search_talent_pool", {
      _org_id: org_id,
      _query_embedding: `[${queryEmbedding.join(",")}]`,
      _match_threshold: match_threshold,
      _match_count: match_count,
      _min_score: min_score,
      _verdict_filter: verdict_filter,
    });

    if (searchErr) throw searchErr;

    return new Response(JSON.stringify({
      success: true,
      query,
      results: results ?? [],
      count: (results ?? []).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("b2b-talent-search error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
