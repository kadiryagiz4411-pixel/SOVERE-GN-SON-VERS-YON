/**
 * manage-subscription
 * Pause / unpause Lemon Squeezy billing and return the customer portal URL.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsPreflight, jsonResponse } from "../_shared/cors.ts";

const LS_API = "https://api.lemonsqueezy.com/v1";

type Action = "pause" | "unpause" | "portal";

function isB2B(planType: string | null | undefined): boolean {
  const p = (planType ?? "").toLowerCase();
  return p === "b2b_enterprise" || p === "enterprise" || p.includes("b2b");
}

function maxPauseMonths(planType: string | null | undefined): number {
  return isB2B(planType) ? 3 : 6;
}

async function lsFetch(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY is not configured");
  const res = await fetch(`${LS_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.errors?.[0]?.detail || body?.error || `Lemon Squeezy HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

async function patchSubscription(subscriptionId: string, attributes: Record<string, unknown>) {
  return lsFetch(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: {
        type: "subscriptions",
        id: String(subscriptionId),
        attributes,
      },
    }),
  });
}

function portalFromPayload(payload: any): string | null {
  return (
    payload?.data?.attributes?.urls?.customer_portal ||
    payload?.data?.attributes?.urls?.customer_portal_update_subscription ||
    null
  );
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
      .select("plan_type, subscription_plan, subscription_status, ls_subscription_id, ls_customer_id, remaining_credits, credits_balance")
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    if (profileErr || !profile) {
      return jsonResponse({ error: "Profile not found" }, 404);
    }

    const subscriptionId = profile.ls_subscription_id as string | null;
    const customerId = profile.ls_customer_id as string | null;
    const planType = (profile.plan_type || profile.subscription_plan || "free") as string;
    const storePortal =
      Deno.env.get("LEMONSQUEEZY_CUSTOMER_PORTAL_URL") ||
      "https://app.lemonsqueezy.com/my-orders";

    if (action === "portal") {
      let portalUrl = storePortal;
      try {
        if (subscriptionId) {
          const sub = await lsFetch(`/subscriptions/${subscriptionId}`);
          portalUrl = portalFromPayload(sub) || portalUrl;
        } else if (customerId) {
          const customer = await lsFetch(`/customers/${customerId}`);
          portalUrl = customer?.data?.attributes?.urls?.customer_portal || portalUrl;
        }
      } catch (err) {
        console.warn("[manage-subscription] portal lookup failed", err);
      }
      return jsonResponse({
        success: true,
        portalUrl,
        lemonSqueezy: { url: portalUrl },
      });
    }

    if (!subscriptionId) {
      return jsonResponse({
        error: "No Lemon Squeezy subscription is linked to this account. Use the customer portal if you purchased with a different email.",
        portalUrl: storePortal,
      }, 400);
    }

    if (action === "pause") {
      if (profile.subscription_status === "paused") {
        return jsonResponse({ error: "Subscription is already paused." }, 409);
      }
      const months = maxPauseMonths(planType);
      const resumesAt = new Date();
      resumesAt.setMonth(resumesAt.getMonth() + months);

      await patchSubscription(subscriptionId, {
        pause: {
          mode: "void",
          resumes_at: resumesAt.toISOString(),
        },
      });

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
      });
    }

    // unpause
    await patchSubscription(subscriptionId, { pause: null });

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
    });
  } catch (err) {
    console.error("[manage-subscription]", err);
    return jsonResponse({
      error: err instanceof Error ? err.message : "Subscription update failed",
    }, 500);
  }
});
