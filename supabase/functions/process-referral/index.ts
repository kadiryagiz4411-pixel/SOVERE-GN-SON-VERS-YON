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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { referral_code, new_user_id } = await req.json();

    if (!referral_code || !new_user_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find referrer by code
    const { data: referrerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, bonus_credits")
      .eq("referral_code", referral_code)
      .maybeSingle();

    if (profileErr || !referrerProfile) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't self-refer
    if (referrerProfile.user_id === new_user_id) {
      return new Response(JSON.stringify({ error: "Self-referral not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already referred
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", new_user_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already referred" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create referral record
    await supabase.from("referrals").insert({
      referrer_user_id: referrerProfile.user_id,
      referred_user_id: new_user_id,
      credits_awarded: 10,
    });

    // Award 10 Pro proposal bonus credits to referrer
    await supabase
      .from("profiles")
      .update({ bonus_credits: (referrerProfile.bonus_credits || 0) + 10 })
      .eq("user_id", referrerProfile.user_id);

    return new Response(JSON.stringify({ success: true, credits_awarded: 10 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
