/**
 * Sovereign Health Check Edge Function
 * GET/POST /functions/v1/health
 *
 * Returns: { status: "healthy", db: true, openai: true, ts: "ISO-string" }
 * Used by Vercel uptime monitors, AppSumo launch health probes, and CI smoke tests.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ts = new Date().toISOString();

  // ── Database ping ─────────────────────────────────────────────────────────
  let dbOk = false;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (supabaseUrl && serviceKey) {
      const client = createClient(supabaseUrl, serviceKey);
      // Lightweight query: just check the DB is reachable.
      const { error } = await client.from('profiles').select('user_id').limit(1);
      dbOk = !error;
    }
  } catch {
    dbOk = false;
  }

  // ── OpenAI key presence check ─────────────────────────────────────────────
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
  const openaiOk  = openaiKey.startsWith('sk-');

  const allHealthy = dbOk && openaiOk;

  const body = JSON.stringify({
    status:  allHealthy ? 'healthy' : 'degraded',
    db:      dbOk,
    openai:  openaiOk,
    version: Deno.env.get('APP_VERSION') ?? '1.0.0',
    ts,
  });

  return new Response(body, {
    status:  allHealthy ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
