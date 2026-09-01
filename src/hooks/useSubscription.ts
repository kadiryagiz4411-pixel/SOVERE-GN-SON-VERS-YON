/**
 * useSubscription — pause / resume / portal for Lemon Squeezy subscriptions.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileByAuthId } from "@/lib/profileQuery";
import { invokeEdgeJson } from "@/lib/edgeFunctions";
import { useSession } from "@/contexts/SessionContext";

export type SubscriptionStatus = "active" | "paused" | "canceled";
export type PauseAudience = "b2c" | "b2b";

export const B2C_PAUSE_MONTHS = 6;
export const B2B_PAUSE_MONTHS = 3;

export const LEMON_SQUEEZY_CUSTOMER_PORTAL =
  (typeof import.meta !== "undefined"
    ? (import.meta.env as Record<string, string>).VITE_LEMONSQUEEZY_CUSTOMER_PORTAL_URL
    : "") || "https://app.lemonsqueezy.com/my-orders";

export interface SubscriptionState {
  status: SubscriptionStatus;
  planType: string;
  billingPeriod: "monthly" | "yearly" | null;
  pausedAt: string | null;
  pauseUntil: string | null;
  pauseReason: string | null;
  remainingCredits: number;
  audience: PauseAudience;
  maxPauseMonths: number;
  isPaid: boolean;
}

const PAID_PLANS = new Set([
  "standard", "pro", "elite", "enterprise", "B2B_ENTERPRISE",
  "pro_monthly", "appsumo_tier1", "appsumo_tier2", "appsumo_b2b",
]);

function normalizeStatus(raw: string | null | undefined): SubscriptionStatus {
  if (raw === "paused" || raw === "canceled") return raw;
  return "active";
}

function isB2BPlan(planType: string): boolean {
  const p = planType.toLowerCase();
  return p.includes("b2b") || p === "enterprise";
}

export function useSubscription() {
  const { user } = useSession();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await fetchProfileByAuthId(user.id,
      "plan_type, subscription_plan, subscription_status, billing_period, subscription_paused_at, subscription_pause_until, subscription_pause_reason, remaining_credits, credits_balance",
    );
    const planType = String((data as any)?.plan_type ?? (data as any)?.subscription_plan ?? "free");
    const audience: PauseAudience = isB2BPlan(planType) ? "b2b" : "b2c";
    const periodRaw = String((data as any)?.billing_period ?? "");
    setState({
      status: normalizeStatus((data as any)?.subscription_status),
      planType,
      billingPeriod: periodRaw.includes("year") || periodRaw === "annual" ? "yearly" : periodRaw === "monthly" ? "monthly" : null,
      pausedAt: (data as any)?.subscription_paused_at ?? null,
      pauseUntil: (data as any)?.subscription_pause_until ?? null,
      pauseReason: (data as any)?.subscription_pause_reason ?? null,
      remainingCredits: Number((data as any)?.remaining_credits ?? (data as any)?.credits_balance ?? 0),
      audience,
      maxPauseMonths: audience === "b2b" ? B2B_PAUSE_MONTHS : B2C_PAUSE_MONTHS,
      isPaid: PAID_PLANS.has(planType) && planType !== "free",
    });
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const invoke = useCallback(async (action: "pause" | "unpause" | "portal", reason?: string) => {
    setBusy(true);
    setError(null);
    const result = await invokeEdgeJson<{
      success?: boolean;
      status?: SubscriptionStatus;
      error?: string;
      portalUrl?: string;
      lemonSqueezy?: { url?: string };
      pauseUntil?: string;
      remainingCredits?: number;
      message?: string;
    }>("manage-subscription", { action, reason });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return result;
    }
    await load();
    return result;
  }, [load]);

  const pause = useCallback((reason: string) => invoke("pause", reason), [invoke]);
  const unpause = useCallback(() => invoke("unpause"), [invoke]);
  const openPortal = useCallback(async () => {
    const result = await invoke("portal");
    const url = result.data?.portalUrl || result.data?.lemonSqueezy?.url || LEMON_SQUEEZY_CUSTOMER_PORTAL;
    window.open(url, "_blank", "noopener,noreferrer");
    return url;
  }, [invoke]);

  const isPaused = state?.status === "paused";

  return useMemo(() => ({
    ...state,
    status: state?.status ?? "active" as SubscriptionStatus,
    loading,
    busy,
    error,
    isPaused,
    refresh: load,
    pause,
    unpause,
    openPortal,
  }), [state, loading, busy, error, isPaused, load, pause, unpause, openPortal]);
}
