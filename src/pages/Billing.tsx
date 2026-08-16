/**
 * /settings/billing — In-app billing & subscription management page.
 * Shows current plan, usage stats, and a full PricingTable to upgrade/downgrade.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard, ArrowLeft, Zap, Calendar, ShieldCheck,
  ExternalLink, Loader2, Crown, Building2, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PricingTable, SinglePassBanner } from "@/components/pricing/PricingTable";
import { getTierByPlanType } from "@/config/pricing";
import { toast } from "sonner";

interface UserBilling {
  planType: string;
  creditsBalance: number;
  creditsUsed: number;
  memberSince: string;
  email: string;
  orgName?: string;
}

const PLAN_ICON: Record<string, React.ReactNode> = {
  free: <Zap className="w-5 h-5 text-slate-400" />,
  standard: <Star className="w-5 h-5 text-slate-300" />,
  pro: <Crown className="w-5 h-5 text-violet-400" />,
  elite: <Crown className="w-5 h-5 text-amber-400" />,
  B2B_ENTERPRISE: <Building2 className="w-5 h-5 text-yellow-400" />,
};

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  standard: "Standard",
  pro: "Pro",
  elite: "Elite",
  B2B_ENTERPRISE: "Enterprise B2B",
};

export default function Billing() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<UserBilling | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_type, credits_balance, credits_used, created_at, org_id")
        .eq("user_id", user.id)
        .single();

      let orgName: string | undefined;
      if ((profile as any)?.org_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", (profile as any).org_id)
          .single();
        orgName = org?.name;
      }

      setBilling({
        planType: (profile as any)?.plan_type ?? "free",
        creditsBalance: (profile as any)?.credits_balance ?? 0,
        creditsUsed: (profile as any)?.credits_used ?? 0,
        memberSince: (profile as any)?.created_at ?? new Date().toISOString(),
        email: user.email ?? "",
        orgName,
      });
    } catch (err) {
      toast.error("Failed to load billing info");
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlan = billing ? getTierByPlanType(billing.planType) : undefined;
  const planLabel = billing ? (PLAN_LABEL[billing.planType] ?? billing.planType) : "Free";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-200 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="w-px h-5 bg-slate-700" />
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-slate-200">Billing & Subscription</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Current plan card */}
        {isLoading ? (
          <div className="flex items-center gap-3 py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading billing information...
          </div>
        ) : billing && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Plan summary */}
            <div className={cn(
              "col-span-full sm:col-span-1 lg:col-span-1 p-5 rounded-2xl border",
              billing.planType === "B2B_ENTERPRISE"
                ? "border-yellow-600/40 bg-yellow-950/20"
                : billing.planType === "elite"
                ? "border-amber-500/30 bg-amber-950/20"
                : billing.planType === "pro"
                ? "border-violet-500/30 bg-violet-950/20"
                : "border-slate-700 bg-slate-900"
            )}>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Current Plan</p>
              <div className="flex items-center gap-2 mb-2">
                {PLAN_ICON[billing.planType] ?? <Zap className="w-5 h-5 text-slate-400" />}
                <span className="text-xl font-black text-slate-100">{planLabel}</span>
              </div>
              {currentPlan && (
                <p className="text-sm text-slate-400">{currentPlan.description}</p>
              )}
              {billing.orgName && (
                <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />{billing.orgName}
                </p>
              )}
            </div>

            {/* Credits */}
            <div className="p-5 rounded-2xl border border-slate-700 bg-slate-900">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">AI Credits</p>
              <p className="text-3xl font-black font-mono text-violet-400">
                {billing.creditsBalance.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {billing.creditsUsed.toLocaleString()} used · balance remaining
              </p>
            </div>

            {/* Account */}
            <div className="p-5 rounded-2xl border border-slate-700 bg-slate-900">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Account</p>
              <p className="text-sm text-slate-300 font-medium truncate">{billing.email}</p>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Member since {new Date(billing.memberSince).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">Payments secured by Lemon Squeezy</span>
              </div>
            </div>
          </div>
        )}

        {/* Manage subscription link */}
        {billing?.planType && billing.planType !== "free" && (
          <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-700 bg-slate-900">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-300">Manage Subscription</p>
              <p className="text-xs text-slate-500 mt-0.5">Update payment method, view invoices, or cancel your plan.</p>
            </div>
            <a
              href="https://app.lemonsqueezy.com/my-orders"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
            >
              Customer Portal
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Upgrade / plan comparison */}
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-100">
              {billing?.planType === "free" ? "Upgrade Your Plan" : "Switch Plan"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              All plans are billed by Lemon Squeezy · 7-day money-back guarantee
            </p>
          </div>

          <PricingTable
            currentPlanType={billing?.planType ?? "free"}
            isLoggedIn={!!billing}
            showEnterprise
          />
        </div>
      </div>
    </div>
  );
}
