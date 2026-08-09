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
    const body = await req.json();
    const { event, email, tags } = body;

    if (!event || !email) {
      return new Response(JSON.stringify({ error: "Missing event or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[user-sync] event=${event} email=${email} tags=${JSON.stringify(tags || [])}`);

    const CONVERTKIT_API_KEY = Deno.env.get("CONVERTKIT_API_KEY");
    const CONVERTKIT_FORM_ID = Deno.env.get("CONVERTKIT_FORM_ID");

    if (!CONVERTKIT_API_KEY || !CONVERTKIT_FORM_ID) {
      console.log("[user-sync] ConvertKit not configured, skipping sync");
      return new Response(
        JSON.stringify({ success: true, synced: false, reason: "no_provider" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Subscribe/tag in ConvertKit
    const ckResponse = await fetch(
      `https://api.convertkit.com/v3/forms/${CONVERTKIT_FORM_ID}/subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: CONVERTKIT_API_KEY,
          email,
          tags: tags || [],
        }),
      }
    );

    if (!ckResponse.ok) {
      const errText = await ckResponse.text();
      console.error(`[user-sync] ConvertKit error: ${ckResponse.status} ${errText}`);

      // Log failure
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("leads").upsert(
        { email, source: event, tag: (tags || []).join(","), sync_failed: true, sync_error: errText.slice(0, 500), gdpr_consent: true },
        { onConflict: "email" }
      );

      return new Response(
        JSON.stringify({ success: false, error: "Provider sync failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[user-sync] Successfully synced ${email} for event ${event}`);
    return new Response(
      JSON.stringify({ success: true, synced: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[user-sync] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
