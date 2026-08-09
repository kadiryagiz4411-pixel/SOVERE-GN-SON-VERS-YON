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
    const { event, email, tag, source, tags } = body;

    if (!event || !email) {
      return new Response(JSON.stringify({ error: "Missing event or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the event for internal analytics
    console.log(`[email-webhook] event=${event} email=${email} tag=${tag || ""} source=${source || ""}`);

    // ============================================================
    // PROVIDER INTEGRATION POINT
    // Replace this section with your email provider's API call.
    // Currently structured for ConvertKit-compatible APIs.
    // ============================================================
    const CONVERTKIT_API_KEY = Deno.env.get("CONVERTKIT_API_KEY");
    const CONVERTKIT_FORM_ID = Deno.env.get("CONVERTKIT_FORM_ID");

    if (CONVERTKIT_API_KEY && CONVERTKIT_FORM_ID) {
      try {
        // Subscribe to form
        const ckResponse = await fetch(
          `https://api.convertkit.com/v3/forms/${CONVERTKIT_FORM_ID}/subscribe`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: CONVERTKIT_API_KEY,
              email,
              tags: tags || (tag ? [tag] : []),
            }),
          }
        );

        if (!ckResponse.ok) {
          const errText = await ckResponse.text();
          console.error(`[email-webhook] Provider error: ${ckResponse.status} ${errText}`);

          // Log failure to DB
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase
            .from("leads")
            .update({ sync_failed: true, sync_error: errText.slice(0, 500) })
            .eq("email", email);
        } else {
          // Mark as synced
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase
            .from("leads")
            .update({ synced_at: new Date().toISOString(), sync_failed: false })
            .eq("email", email);
        }
      } catch (providerErr) {
        console.error(`[email-webhook] Provider call failed:`, providerErr);
      }
    } else {
      console.log("[email-webhook] No email provider configured. Event logged only.");
    }

    return new Response(
      JSON.stringify({ success: true, event, email }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[email-webhook] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
