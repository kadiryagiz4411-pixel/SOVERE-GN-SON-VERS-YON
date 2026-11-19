/**
 * manage-subscription
 * Pause / unpause billing in Supabase and return the Polar customer portal URL.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsPreflight, jsonResponse } from "../_shared/cors.ts";

type Action = "pause" | "unpause" | "portal";

function isB2B(planType: string | null | undefined): boolean {
  const p = (planType ?? "").toLowerCase();
  return p === "b2b_enterprise" || p === "enterprise" || p.includes("b2b");
}

function maxPauseMonths(planType: string | null | undefined): number {
  return isB2B(planType) ? 3 : 6;
}

function portalUrl(): string {
  return Deno.env.get("POLAR_CUSTOMER_PORTAL_URL")
    || Deno.env.get("VITE_POLAR_CUSTOMER_PORTAL_URL")
    || "https://sovereignapp.pro/settings/billing";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "") as Action;
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 240) : null;

    if (!["pause", "unpause", "portal"].includes(action)) {
      return jsonResponse({ error: "Invalid action" }, 400);
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("plan_type, subscription_plan, subscription_status, remaining_credits, credits_balance")
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    if (profileErr || !profile) {
      return jsonResponse({ error: "Profile not found" }, 404);
    }

    const planType = (profile.plan_type || profile.subscription_plan || "free") as string;
    const billingPortal = portalUrl();

    if (action === "portal") {
      return jsonResponse({
        success: true,
        portalUrl: billingPortal,
      });
    }

    if (action === "pause") {
      if (profile.subscription_status === "paused") {
        return jsonResponse({ error: "Subscription is already paused." }, 409);
      }
      const months = maxPauseMonths(planType);
      const resumesAt = new Date();
      resumesAt.setMonth(resumesAt.getMonth() + months);

      await admin.from("profiles").update({
        subscription_status: "paused",
        subscription_paused_at: new Date().toISOString(),
        subscription_pause_until: resumesAt.toISOString(),
        subscription_pause_reason: reason,
        updated_at: new Date().toISOString(),
      }).or(`user_id.eq.${userId},id.eq.${userId}`);

      return jsonResponse({
        success: true,
        status: "paused",
        pauseUntil: resumesAt.toISOString(),
        remainingCredits: profile.remaining_credits ?? profile.credits_balance ?? 0,
        message: `Billing frozen for up to ${months} months. Remaining credits are kept.`,
        portalUrl: billingPortal,
      });
    }

    await admin.from("profiles").update({
      subscription_status: "active",
      subscription_paused_at: null,
      subscription_pause_until: null,
      subscription_pause_reason: null,
      updated_at: new Date().toISOString(),
    }).or(`user_id.eq.${userId},id.eq.${userId}`);

    return jsonResponse({
      success: true,
      status: "active",
      remainingCredits: profile.remaining_credits ?? profile.credits_balance ?? 0,
      message: "Subscription resumed. Recurring billing is active again.",
      portalUrl: billingPortal,
    });
  } catch (err) {
    console.error("[manage-subscription]", err);
    return jsonResponse({
      error: err instanceof Error ? err.message : "Subscription update failed",
    }, 500);
  }
});
