/**
 * Lemon Squeezy Webhook Handler — Sovereign
 * ──────────────────────────────────────────
 * Listens for payment / subscription lifecycle events and updates the
 * user's plan in Supabase accordingly.
 *
 * Required Supabase secrets (set via Dashboard → Edge Functions → Secrets):
 *   LEMONSQUEEZY_WEBHOOK_SECRET   – signing secret from LS dashboard
 *   LEMONSQUEEZY_API_KEY          – API key for optional LS API calls
 *   LS_VARIANT_SINGLE_PASS        – variant ID (number) for the $4.99 pass
 *   LS_VARIANT_STANDARD_MONTHLY   – variant ID for Standard monthly
 *   LS_VARIANT_STANDARD_ANNUAL    – variant ID for Standard annual
 *   LS_VARIANT_PRO_MONTHLY        – variant ID for Pro monthly
 *   LS_VARIANT_PRO_ANNUAL         – variant ID for Pro annual
 *   LS_VARIANT_ELITE_MONTHLY      – variant ID for Elite monthly
 *   LS_VARIANT_ELITE_ANNUAL       – variant ID for Elite annual
 *   LS_VARIANT_ENTERPRISE_MONTHLY – variant ID for Enterprise monthly
 *   LS_VARIANT_ENTERPRISE_ANNUAL  – variant ID for Enterprise annual
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanTier =
  | "single_pass"
  | "standard"
  | "pro"
  | "elite"
  | "B2B_ENTERPRISE"
  | "free";

type BillingPeriod = "monthly" | "yearly" | "once";

interface TierConfig {
  tier: PlanTier;
  period: BillingPeriod;
  /** AI credits granted on subscription_created / subscription_renewed */
  credits: number;
  /** B2B credits provisioned in b2b_credit_ledger (enterprise only) */
  b2bCredits: number;
}

// ─── Variant ID → Tier mapping (env-driven) ──────────────────────────────────

function buildVariantMap(): Map<number, TierConfig> {
  const env = (key: string) => Deno.env.get(key);
  const num = (key: string) => {
    const v = env(key);
    return v ? parseInt(v, 10) : null;
  };

  const map = new Map<number, TierConfig>();

  const entries: Array<[string, TierConfig]> = [
    ["LS_VARIANT_SINGLE_PASS",        { tier: "single_pass",   period: "once",    credits: 0,    b2bCredits: 0     }],
    ["LS_VARIANT_STANDARD_MONTHLY",   { tier: "standard",      period: "monthly", credits: 500,  b2bCredits: 0     }],
    ["LS_VARIANT_STANDARD_ANNUAL",    { tier: "standard",      period: "yearly",  credits: 500,  b2bCredits: 0     }],
    ["LS_VARIANT_PRO_MONTHLY",        { tier: "pro",           period: "monthly", credits: 2500, b2bCredits: 0     }],
    ["LS_VARIANT_PRO_ANNUAL",         { tier: "pro",           period: "yearly",  credits: 2500, b2bCredits: 0     }],
    ["LS_VARIANT_ELITE_MONTHLY",      { tier: "elite",         period: "monthly", credits: 5000, b2bCredits: 0     }],
    ["LS_VARIANT_ELITE_ANNUAL",       { tier: "elite",         period: "yearly",  credits: 5000, b2bCredits: 0     }],
    ["LS_VARIANT_ENTERPRISE_MONTHLY", { tier: "B2B_ENTERPRISE",period: "monthly", credits: 0,    b2bCredits: 3000  }],
    ["LS_VARIANT_ENTERPRISE_ANNUAL",  { tier: "B2B_ENTERPRISE",period: "yearly",  credits: 0,    b2bCredits: 3000  }],
  ];

  for (const [key, config] of entries) {
    const id = num(key);
    if (id) map.set(id, config);
  }
  return map;
}

// ─── Name-based fallback (when variant IDs are not yet configured) ────────────

function tierFromNames(productName: string, variantName: string): TierConfig | null {
  const s = `${productName} ${variantName}`.toLowerCase();
  const period: BillingPeriod =
    s.includes("annual") || s.includes("yearly") || s.includes("year") ? "yearly" : "monthly";

  if (s.includes("enterprise") || s.includes("b2b")) {
    return { tier: "B2B_ENTERPRISE", period, credits: 0, b2bCredits: 3000 };
  }
  if (s.includes("elite"))    return { tier: "elite",    period, credits: 5000, b2bCredits: 0 };
  if (s.includes("pro"))      return { tier: "pro",      period, credits: 2500, b2bCredits: 0 };
  if (s.includes("standard")) return { tier: "standard", period, credits: 500,  b2bCredits: 0 };
  if (s.includes("single") || s.includes("pass") || s.includes("one")) {
    return { tier: "single_pass", period: "once", credits: 0, b2bCredits: 0 };
  }
  return null;
}

// ─── Subscription expiry ──────────────────────────────────────────────────────

function expiryDate(period: BillingPeriod): string | null {
  if (period === "once") return null; // one-time — no expiry
  const d = new Date();
  period === "yearly" ? d.setFullYear(d.getFullYear() + 1) : d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// ─── HMAC-SHA256 signature verification ──────────────────────────────────────

async function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature;
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

function makeAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Resolve Supabase user ID from custom_data.user_id or email. */
async function resolveUserId(
  db: ReturnType<typeof makeAdminClient>,
  customUserId: string | undefined,
  email: string,
): Promise<string | null> {
  // Primary: trust custom_data.user_id passed from checkout
  if (customUserId) {
    const { data } = await db.auth.admin.getUserById(customUserId);
    if (data.user) return data.user.id;
  }

  // Fallback: lookup by email
  if (email) {
    const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
    const match = (data?.users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
  }
  return null;
}

/** Upgrade: set plan_type + subscription_plan + expiry on profiles row. */
async function upgradePlan(
  db: ReturnType<typeof makeAdminClient>,
  userId: string,
  cfg: TierConfig,
  lsSubscriptionId: string,
) {
  const expires = expiryDate(cfg.period);

  const { error } = await db.from("profiles").update({
    plan_type: cfg.tier,
    subscription_plan: cfg.tier,
    subscription_expires_at: expires,
    billing_period: cfg.period === "once" ? null : cfg.period,
    ls_subscription_id: lsSubscriptionId,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  if (error) throw new Error(`profiles update failed: ${error.message}`);

  // Grant regular AI credits (for Standard / Pro / Elite)
  if (cfg.credits > 0) {
    await db.rpc("apply_credit_change", {
      _user_id: userId,
      _amount: cfg.credits,
      _transaction_type: "subscription",
      _reference_type: "lemonsqueezy",
      _reference_id: lsSubscriptionId,
      _description: `${cfg.tier} plan — ${cfg.credits} AI credits granted`,
    }).maybeSingle();
  }

  // Provision B2B credits in ledger (Enterprise)
  if (cfg.b2bCredits > 0) {
    const { data: existing } = await db
      .from("b2b_credit_ledger")
      .select("id, balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Top-up existing ledger
      await db.from("b2b_credit_ledger")
        .update({ balance: existing.balance + cfg.b2bCredits, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      // Create new ledger row
      await db.from("b2b_credit_ledger").insert({
        user_id: userId,
        balance: cfg.b2bCredits,
        total_purchased: cfg.b2bCredits,
      });
    }

    // Append ledger transaction
    await db.from("b2b_credit_transactions").insert({
      user_id: userId,
      amount: cfg.b2bCredits,
      transaction_type: "purchase",
      description: `Enterprise B2B plan — ${cfg.b2bCredits} credits provisioned`,
      reference_id: lsSubscriptionId,
    });
  }
}

/** Downgrade: revert to free (on cancellation / expiry / payment failure). */
async function downgradePlan(
  db: ReturnType<typeof makeAdminClient>,
  userId: string,
) {
  await db.from("profiles").update({
    plan_type: "free",
    subscription_plan: "free",
    subscription_expires_at: null,
    billing_period: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();

  // ── Signature verification ────────────────────────────────────────────────
  const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
  if (secret) {
    const sig = req.headers.get("x-signature");
    const valid = await verifySignature(rawBody, sig, secret);
    if (!valid) {
      console.error("[LS webhook] Signature mismatch — rejecting");
      return json({ error: "Unauthorized" }, 401);
    }
  } else {
    console.warn("[LS webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set — skipping verification");
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const eventName  = (event.meta as any)?.event_name as string | undefined;
  const customData = (event.meta as any)?.custom_data ?? {};
  const attrs      = (event.data as any)?.attributes ?? {};
  const lsId       = String((event.data as any)?.id ?? "");

  console.log("[LS webhook]", { event: eventName, lsId, ts: new Date().toISOString() });

  const db = makeAdminClient();
  const VARIANTS = buildVariantMap();

  // ── Resolve tier from variant ID (primary) or product name (fallback) ────
  const variantId: number | undefined = attrs.first_order_item?.variant_id
    ?? attrs.variant_id
    ?? undefined;

  let tierCfg: TierConfig | null = VARIANTS.get(variantId) ?? null;
  if (!tierCfg) {
    tierCfg = tierFromNames(
      attrs.product_name ?? attrs.first_order_item?.product_name ?? "",
      attrs.variant_name ?? attrs.first_order_item?.variant_name ?? "",
    );
  }

  // ── Resolve user ──────────────────────────────────────────────────────────
  const email = (
    attrs.user_email ?? attrs.customer_email ?? customData.email ?? ""
  ).toLowerCase().trim() as string;

  const userId = await resolveUserId(db, customData.user_id as string | undefined, email);

  // ── Route by event name ───────────────────────────────────────────────────
  switch (eventName) {
    // ── New purchase / subscription created ──────────────────────────────
    case "order_created":
    case "subscription_created":
    case "subscription_renewed":
    case "subscription_updated": {
      if (!tierCfg) {
        console.warn("[LS webhook] Could not resolve tier for event", eventName, { variantId });
        return json({ success: true, warning: "Tier not resolved — no action taken" });
      }

      if (!userId) {
        // Queue for later processing when user registers
        await db.from("pending_upgrades").upsert({
          email,
          plan: tierCfg.tier,
          sale_id: lsId,
          payment_data: {
            source: "lemonsqueezy",
            event_name: eventName,
            tier: tierCfg.tier,
            period: tierCfg.period,
            variant_id: variantId,
            ts: new Date().toISOString(),
          },
          processed: false,
        }, { onConflict: "email" });

        console.log("[LS webhook] User not found — pending upgrade queued for", email);
        return json({ success: true, queued: true });
      }

      await upgradePlan(db, userId, tierCfg, lsId);
      console.log(`[LS webhook] Upgraded user ${userId} to ${tierCfg.tier} (${tierCfg.period})`);
      return json({ success: true, tier: tierCfg.tier });
    }

    // ── Cancellation (user cancelled but still active until period end) ───
    case "subscription_cancelled": {
      // Mark cancelled in LS; keep plan active — expiry date will handle downgrade.
      // Optionally log for analytics; do not immediately downgrade.
      if (userId) {
        await db.from("profiles").update({
          ls_subscription_id: lsId,
          subscription_cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }
      console.log(`[LS webhook] Subscription cancelled for user ${userId ?? email}`);
      return json({ success: true, status: "cancelled_marked" });
    }

    // ── Expired / payment failed — hard downgrade ─────────────────────────
    case "subscription_expired":
    case "subscription_payment_failed": {
      if (userId) {
        await downgradePlan(db, userId);
        console.log(`[LS webhook] Downgraded user ${userId} to free (${eventName})`);
      }
      return json({ success: true, status: "downgraded" });
    }

    // ── Refund ────────────────────────────────────────────────────────────
    case "order_refunded": {
      if (userId) {
        await downgradePlan(db, userId);
        console.log(`[LS webhook] Downgraded user ${userId} to free (refund)`);
      }
      return json({ success: true, status: "refunded_downgraded" });
    }

    default:
      console.log(`[LS webhook] Unhandled event: ${eventName}`);
      return json({ success: true, message: `Event "${eventName}" acknowledged` });
  }
});

// ─── Utility ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
