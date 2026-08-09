import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Verify Lemon Squeezy webhook signature using HMAC SHA-256
async function verifySignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === expectedSignature;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function detectPlan(productName: string, variantName: string): "pro" | "elite" | null {
  const combined = `${productName} ${variantName}`.toLowerCase();
  if (combined.includes("elite")) return "elite";
  if (combined.includes("pro")) return "pro";
  return null;
}

function detectBillingPeriod(variantName: string, billingAnchor?: number): "monthly" | "yearly" {
  const lower = variantName.toLowerCase();
  if (lower.includes("annual") || lower.includes("yearly") || lower.includes("year")) return "yearly";
  return "monthly";
}

function calculateExpiryDate(billingPeriod: "monthly" | "yearly"): string {
  const now = new Date();
  if (billingPeriod === "yearly") {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    const signature = req.headers.get("x-signature");

    // If webhook secret is configured, verify signature
    if (webhookSecret) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid Lemon Squeezy webhook signature");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.warn("LEMONSQUEEZY_WEBHOOK_SECRET not configured — skipping signature verification");
    }

    const event = JSON.parse(rawBody);
    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data || {};
    const attrs = event.data?.attributes || {};

    console.log("Lemon Squeezy webhook received:", {
      event: eventName,
      email: attrs.user_email,
      productName: attrs.product_name,
      variantName: attrs.variant_name,
      status: attrs.status,
      timestamp: new Date().toISOString(),
    });

    const email = (attrs.user_email || customData.email || "").toLowerCase().trim();
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productName = attrs.product_name || "";
    const variantName = attrs.variant_name || "";
    const plan = detectPlan(productName, variantName);
    const isRefund = eventName === "order_refunded" || attrs.status === "refunded";

    if (!plan && !isRefund) {
      return new Response(
        JSON.stringify({ error: "Could not determine plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const billingPeriod = detectBillingPeriod(variantName);
    const expiresAt = calculateExpiryDate(billingPeriod);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email);

    // Handle subscription events
    // Credit amounts per plan
    const PLAN_CREDITS: Record<string, number> = { pro: 2500, elite: 5000 };

    if (eventName === "subscription_created" || eventName === "subscription_updated" || eventName === "subscription_renewed" || eventName === "order_created") {
      if (!user) {
        // Store pending upgrade
        if (plan) {
          await supabase.from("pending_upgrades").insert({
            email,
            plan,
            sale_id: String(event.data?.id || ""),
            payment_data: {
              source: "lemonsqueezy",
              product_name: productName,
              variant_name: variantName,
              billing_period: billingPeriod,
              expires_at: expiresAt,
              event_name: eventName,
              timestamp: new Date().toISOString(),
            },
            processed: false,
          });
        }
        return new Response(
          JSON.stringify({ success: true, message: "Pending upgrade stored" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update user plan
      const { error: updateError } = await supabase.from("profiles").update({
        subscription_plan: plan,
        subscription_expires_at: expiresAt,
        billing_period: billingPeriod,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      if (updateError) {
        console.error("Profile update error:", updateError.message);
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Grant credits on subscription create/renew
      const creditsToGrant = PLAN_CREDITS[plan!] || 0;
      if (creditsToGrant > 0) {
        try {
          await supabase.rpc("apply_credit_change", {
            _user_id: user.id,
            _amount: creditsToGrant,
            _transaction_type: "subscription",
            _reference_type: "lemonsqueezy",
            _reference_id: String(event.data?.id || ""),
            _description: `${plan!.toUpperCase()} subscription – ${creditsToGrant} credits granted`,
          });
          console.log(`Granted ${creditsToGrant} credits to user ${user.id} for ${plan} plan`);
        } catch (creditErr) {
          console.error("Credit grant error:", creditErr);
        }
      }

      console.log(`User upgraded: ${plan}, billing: ${billingPeriod}, expires: ${expiresAt}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle refund / subscription cancelled / expired
    if (isRefund || eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      if (user) {
        await supabase.from("profiles").update({
          subscription_plan: "free",
          subscription_expires_at: null,
          billing_period: null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        console.log("User downgraded to free");
      }
      return new Response(
        JSON.stringify({ success: true, downgraded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For other events, just acknowledge
    return new Response(
      JSON.stringify({ success: true, message: "Event acknowledged" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
