import { useState } from "react";
import { Zap, Ticket, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRICING_TIERS, getSubscriptionTiers, getOneTimeTier,
} from "@/config/pricing";
import { CheckoutButton } from "@/components/checkout/CheckoutButton";
import { PricingCard } from "./PricingCard";

interface PricingTableProps {
  currentPlanType?: string;
  /** When false, hides the Enterprise card. Default: true */
  showEnterprise?: boolean;
  className?: string;
}

export function PricingTable({
  currentPlanType = "free",
  showEnterprise = true,
  className,
}: PricingTableProps) {
  const [isAnnual, setIsAnnual] = useState(true);

  const subscriptionTiers = getSubscriptionTiers().filter(
    t => showEnterprise || t.id !== "enterprise"
  );

  return (
    <div className={cn("w-full", className)}>
      {/* ── Monthly / Annual billing toggle ────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <span
          className={cn(
            "text-sm font-medium transition-colors cursor-pointer select-none",
            !isAnnual ? "text-slate-100" : "text-slate-500"
          )}
          onClick={() => setIsAnnual(false)}
        >
          Monthly
        </span>

        <button
          onClick={() => setIsAnnual(v => !v)}
          aria-label="Toggle billing period"
          className={cn(
            "relative w-14 h-7 rounded-full transition-colors duration-300",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
            isAnnual ? "bg-violet-600" : "bg-slate-700"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300",
              isAnnual ? "translate-x-7" : "translate-x-0.5"
            )}
          />
        </button>

        <span
          className={cn(
            "text-sm font-medium transition-colors cursor-pointer select-none",
            isAnnual ? "text-slate-100" : "text-slate-500"
          )}
          onClick={() => setIsAnnual(true)}
        >
          Annual
        </span>

        {isAnnual && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <Zap className="w-3 h-3" />
            Save up to 25%
          </span>
        )}
      </div>

      {/* ── Subscription plan grid ──────────────────────────────────────────── */}
      <div
        className={cn(
          "grid gap-5 items-start",
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
            currentPlanType={currentPlanType}
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
            {pass.features.map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                <Check className="w-3 h-3 text-teal-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          <CheckoutButton
            href={pass.checkoutUrls.oneTime ?? "#"}
            overlay
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold border-0 shadow-lg shadow-teal-700/30 transition-all whitespace-nowrap"
          >
            Get Single Pass
            <ArrowRight className="w-4 h-4" />
          </CheckoutButton>
        </div>
      </div>
    </div>
  );
}
