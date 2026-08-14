import { Check, Sparkles, Crown, Building2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/checkout/CheckoutButton";
import { Plan, displayPrice, annualBillString } from "@/config/pricing";

interface PricingCardProps {
  plan: Plan;
  isAnnual: boolean;
  currentPlanType?: string;
  isLoggedIn?: boolean;
}

const BADGE_STYLES: Record<string, string> = {
  popular: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white",
  elite: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
  enterprise: "bg-gradient-to-r from-yellow-700 via-amber-600 to-yellow-500 text-white",
};

const BADGE_ICONS: Record<string, React.ReactNode> = {
  popular: <Sparkles className="w-3 h-3" />,
  elite: <Crown className="w-3 h-3" />,
  enterprise: <Building2 className="w-3 h-3" />,
};

const CARD_BORDER: Record<string, string> = {
  standard: "border-slate-700 bg-slate-900 hover:border-slate-500",
  popular:
    "border-violet-500/70 bg-slate-900 shadow-[0_0_40px_-8px_rgba(139,92,246,0.5)] ring-1 ring-violet-500/30",
  elite:
    "border-amber-500/40 bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-900 hover:border-amber-500/70",
  enterprise:
    "border-yellow-600/60 bg-gradient-to-b from-yellow-950/30 via-slate-900 to-slate-900 shadow-[0_0_40px_-8px_rgba(202,138,4,0.35)] ring-1 ring-yellow-600/20",
};

const PRICE_COLOR: Record<string, string> = {
  standard: "text-slate-100",
  popular: "text-violet-300",
  elite: "text-amber-400",
  enterprise: "text-yellow-400",
};

const CHECK_COLOR: Record<string, string> = {
  standard: "text-slate-400",
  popular: "text-violet-400",
  elite: "text-amber-400",
  enterprise: "text-yellow-400",
};

const CTA_CLASS: Record<string, string> = {
  standard:
    "w-full bg-slate-700 hover:bg-slate-600 text-slate-100 border-0 font-semibold",
  popular:
    "w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 font-semibold shadow-lg shadow-violet-600/30",
  elite:
    "w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-0 font-semibold shadow-lg shadow-amber-600/25",
  enterprise:
    "w-full bg-gradient-to-r from-yellow-700 via-amber-600 to-yellow-500 hover:from-yellow-600 hover:to-amber-500 text-slate-950 border-0 font-bold shadow-lg shadow-yellow-600/25",
};

export function PricingCard({
  plan, isAnnual, currentPlanType = "free", isLoggedIn = false,
}: PricingCardProps) {
  const isCurrent = plan.planType === currentPlanType;
  const checkoutUrl = isAnnual ? plan.checkoutUrls.annual : plan.checkoutUrls.monthly;
  const cta = isCurrent ? "Current Plan" : isAnnual ? plan.ctaAnnual : plan.ctaMonthly;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-7 transition-all duration-300",
        CARD_BORDER[plan.style],
        plan.style === "popular" ? "scale-[1.03] z-10" : ""
      )}
    >
      {/* Badge */}
      {plan.badge && plan.badgeVariant && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
              BADGE_STYLES[plan.badgeVariant]
            )}
          >
            {BADGE_ICONS[plan.badgeVariant]}
            {plan.badge}
          </span>
        </div>
      )}

      {/* Plan name + tagline */}
      <div className="mb-5 pt-1">
        <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
        <p className="text-sm text-slate-400 mt-0.5 leading-snug">{plan.tagline}</p>
      </div>

      {/* Price */}
      <div className="mb-1">
        <div className="flex items-end gap-1">
          <span className={cn("text-5xl font-black tracking-tight", PRICE_COLOR[plan.style])}>
            {displayPrice(plan, isAnnual)}
          </span>
          <span className="text-slate-500 text-sm mb-1.5">/mo</span>
        </div>
        {isAnnual ? (
          <p className="text-xs text-slate-500 mt-1">
            {annualBillString(plan)}{" "}
            <span className="text-emerald-400 font-semibold">— Save {plan.pricing.savePct}%</span>
          </p>
        ) : (
          <p className="text-xs text-slate-600 mt-1">Billed monthly · cancel anytime</p>
        )}
      </div>

      {/* Divider */}
      <div className={cn("my-5 h-px", plan.style === "popular" ? "bg-violet-500/20" : "bg-slate-800")} />

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-7">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Check
              className={cn(
                "w-4 h-4 mt-0.5 shrink-0",
                f.highlight ? CHECK_COLOR[plan.style] : "text-slate-600"
              )}
            />
            <span
              className={cn(
                "text-sm leading-snug",
                f.highlight ? "text-slate-200 font-medium" : "text-slate-500"
              )}
            >
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <button
          disabled
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold bg-slate-800 text-slate-500 border border-slate-700 cursor-default"
        >
          ✓ Current Plan
        </button>
      ) : (
        <CheckoutButton href={checkoutUrl} className={CTA_CLASS[plan.style]} overlay>
          {cta}
        </CheckoutButton>
      )}
    </div>
  );
}
