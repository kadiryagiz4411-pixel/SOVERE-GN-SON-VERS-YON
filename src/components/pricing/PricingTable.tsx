import { useState } from "react";
import { Zap, Ticket, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSubscriptionTiers, getOneTimeTier, getCheckoutUrlFor,
} from "@/config/pricing";
import { type BillingCycle, createCheckout } from "@/config/plans";
import { CheckoutButton } from "@/components/checkout/CheckoutButton";
import { PricingCard } from "./PricingCard";
import { usePlan } from "@/contexts/PlanContext";
import { useSession } from "@/contexts/SessionContext";
import { isOwnerEmail, isSuperAdminUser } from "@/lib/superadmin";

interface PricingTableProps {
  currentPlanType?: string;
  /** When false, hides the Enterprise card. Default: true */
  showEnterprise?: boolean;
  isLoggedIn?: boolean;
  className?: string;
}

export function PricingTable({
  currentPlanType,
  showEnterprise = true,
  className,
}: PricingTableProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const isAnnual = billingCycle === "yearly";
  const { user } = useSession();
  const plan = usePlan();
  const isSuperAdmin =
    plan.isSuperAdmin ||
    isSuperAdminUser(user) ||
    isOwnerEmail(user?.email) ||
    user?.email === "kadiryagiz4411@gmail.com";
  const resolvedPlanType = currentPlanType ?? plan.planType ?? "free";
  const userTier = plan.tier ?? resolvedPlanType;

  const subscriptionTiers = getSubscriptionTiers().filter(
    t => t && (showEnterprise || t.id !== "enterprise")
  );

  return (
    <div className={cn("w-full max-w-full overflow-hidden box-border", className)}>
      {isSuperAdmin && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
          Signed in as <span className="font-semibold">kadiryagiz4411@gmail.com</span>
          {" "}— all pricing tiers are already unlocked via SuperAdmin.
        </div>
      )}
      {/* ── Monthly / Annual billing toggle ────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 my-8 relative z-10">
        <span
          className={`text-sm font-medium transition-colors cursor-pointer select-none ${!isAnnual ? 'text-white font-semibold' : 'text-zinc-400'}`}
          onClick={() => setBillingCycle("monthly")}
        >
          Monthly
        </span>

        <button
          type="button"
          onClick={() => setBillingCycle(cycle => cycle === "yearly" ? "monthly" : "yearly")}
          aria-label="Toggle billing period"
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full bg-purple-600 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out mt-1 ${
              isAnnual ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium transition-colors cursor-pointer select-none ${isAnnual ? 'text-white font-semibold' : 'text-zinc-400'}`}
            onClick={() => setBillingCycle("yearly")}
          >
            Annual
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Zap className="w-3 h-3" /> Save up to 25%
          </span>
        </div>
      </div>

      {/* ── Subscription plan grid ──────────────────────────────────────────── */}
      <div
        className={cn(
          "grid gap-5 items-stretch w-full max-w-full min-w-0 overflow-hidden box-border",
          subscriptionTiers.length >= 4
            ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {subscriptionTiers.map(tier => (
          <PricingCard
            key={tier.id}
            tier={tier}
            isAnnual={isAnnual}
            currentPlanType={resolvedPlanType}
            userTier={userTier}
            isSuperAdmin={isSuperAdmin}
          />
        ))}
      </div>

      {/* ── Single Pass one-time callout ────────────────────────────────────── */}
      <SinglePassBanner />

      {/* ── Trust footer ────────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-slate-600 mt-6">
        All plans include a 7-day money-back guarantee · Secure checkout by{" "}
        <span className="text-slate-500">Lemon Squeezy</span>
      </p>
    </div>
  );
}

// ─── Single Pass banner ───────────────────────────────────────────────────────

export function SinglePassBanner() {
  const pass = getOneTimeTier();
  const features = Array.isArray(pass?.features) ? pass.features.filter(Boolean) : [];
  const { user } = useSession();
  const plan = usePlan();
  const isSuperAdmin =
    plan.isSuperAdmin ||
    isSuperAdminUser(user) ||
    isOwnerEmail(user?.email) ||
    user?.email === "kadiryagiz4411@gmail.com";

  const logSelection = () => {
    console.log("[Pricing Diagnostic]", {
      selectedPlan: pass?.id ?? "single_pass",
      userTier: plan.tier,
    });
  };

  if (!pass) return null;

  return (
    <div className="mt-8 mx-auto max-w-3xl">
      <div className="relative flex flex-col sm:flex-row items-center gap-5 px-6 py-5 rounded-2xl border border-dashed border-slate-600 bg-slate-900/60 hover:border-slate-500 transition-colors">

        {/* Pill badge */}
        <div className="absolute -top-3 left-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-xs font-semibold text-slate-400">
            <Ticket className="w-3 h-3 text-teal-400" />
            One-Time Purchase · No Subscription Needed
          </span>
        </div>

        {/* Price bubble */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/10 border border-teal-500/30 mt-2 sm:mt-0">
          <span className="text-2xl font-black text-teal-400 leading-none">
            ${pass.priceMonthly}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">one-time</span>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-base font-bold text-slate-100">
            No subscription? Try a{" "}
            <span className="text-teal-400">Single Pass for ${pass.priceMonthly}</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5 mb-2">{pass.description}</p>
          <ul className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                <Check className="w-3 h-3 text-teal-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={logSelection}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-200 text-sm font-semibold border border-emerald-500/30 whitespace-nowrap"
            >
              Unlocked (SuperAdmin)
            </button>
          ) : (
            <CheckoutButton
              href={getCheckoutUrlFor(pass, false) || createCheckout("single_pass")}
              overlay
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold border-0 shadow-lg shadow-teal-700/30 transition-all whitespace-nowrap"
              onClick={logSelection}
            >
              Get Single Pass
              <ArrowRight className="w-4 h-4" />
            </CheckoutButton>
          )}
        </div>
      </div>
    </div>
  );
}
