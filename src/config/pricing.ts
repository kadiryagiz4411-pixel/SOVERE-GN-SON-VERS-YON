/**
 * Sovereign Pricing Configuration — v4
 * Single source of truth for pricing tiers and feature lists.
 * Checkout is minted by Polar.sh via POST /api/billing/checkout.
 */

import { createCheckout, type CheckoutPlanId } from "./plans";
import { getBillingFallbackUrl, sanitizeCheckoutUrl } from "@/lib/checkout";
import {
  ANNUAL_DISCOUNT_PERCENT,
  PLAN_PRICES_CENTS,
  PLAN_PRICES_USD,
  SINGLE_PASS_USD,
  annualPerMonthUsd,
  formatUsd as formatUsdFromMoney,
} from "./money";
export { ANNUAL_DISCOUNT_PERCENT, PLAN_PRICES_USD, SINGLE_PASS_USD, formatUsdFromMoney as formatMoney };

const CHECKOUT_PLACEHOLDER = getBillingFallbackUrl();

// ─── Core interface (v4 canonical schema) ─────────────────────────────────────

export interface PricingTier {
  /** Stable identifier used in routing, gates, and DB plan_type mapping */
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  /** Per-month price when billed annually */
  priceAnnual: number;
  /** Total charge per year when on annual plan */
  annualTotal: number;
  discountPercentage: number;
  badge?: string;
  isPopular?: boolean;
  isEnterprise?: boolean;
  /** True for non-recurring one-time products (Single Pass) */
  isOneTime?: boolean;
  /** Plain-string feature list; items starting with "Includes ALL" or all-caps
   *  are automatically highlighted in the PricingCard UI. */
  features: string[];
  checkoutUrls: {
    monthly?: string;
    annual?: string;
    oneTime?: string;
  };
}

// ─── PRICING_TIERS — canonical array ─────────────────────────────────────────

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "single_pass",
    name: "Single Pass",
    description: "Try once, get hired. One tailored application, no subscription.",
    priceMonthly: PLAN_PRICES_USD.single_pass.oneTime,
    priceAnnual: PLAN_PRICES_USD.single_pass.oneTime,
    annualTotal: PLAN_PRICES_USD.single_pass.oneTime,
    discountPercentage: 0,
    isOneTime: true,
    features: [
      "One tailored resume optimization",
      "One job match and compatibility report",
      "Instant PDF export",
    ],
    checkoutUrls: {
      oneTime: CHECKOUT_PLACEHOLDER,
    },
  },

  {
    id: "standard",
    name: "Standard",
    description: "Essential tailoring for active job seekers.",
    priceMonthly: PLAN_PRICES_USD.standard.monthly,
    priceAnnual: annualPerMonthUsd(PLAN_PRICES_CENTS.standard.annual),
    annualTotal: PLAN_PRICES_USD.standard.annual,
    discountPercentage: ANNUAL_DISCOUNT_PERCENT,
    features: [
      "Specific number of smart resume optimizations per month",
      "Automated cover letter generation support",
      "Access to standard resume templates",
      "Basic system compatibility matching analysis",
      "Unused credits rollover to the next month",
      "Pause subscription guarantee anytime upon finding a job or facing low workload",
    ],
    checkoutUrls: {
      monthly: CHECKOUT_PLACEHOLDER,
      annual: CHECKOUT_PLACEHOLDER,
    },
  },

  {
    id: "pro",
    name: "Pro",
    description: "Full toolkit for interview callbacks.",
    priceMonthly: PLAN_PRICES_USD.pro.monthly,
    priceAnnual: annualPerMonthUsd(PLAN_PRICES_CENTS.pro.annual),
    annualTotal: PLAN_PRICES_USD.pro.annual,
    discountPercentage: ANNUAL_DISCOUNT_PERCENT,
    badge: "Most Popular",
    isPopular: true,
    features: [
      "Includes all features from the Standard plan",
      "Basic system compatibility matching analysis",
      "Unlimited smart resume optimizations",
      "Unlimited automated cover letters",
      "Full access to premium resume templates",
      "Multi language support (English, German, Turkish, Spanish, French)",
      "Unused credits rollover to the next month",
      "Pause subscription guarantee anytime upon finding a job or facing low workload",
    ],
    checkoutUrls: {
      monthly: CHECKOUT_PLACEHOLDER,
      annual: CHECKOUT_PLACEHOLDER,
    },
  },

  {
    id: "elite",
    name: "Elite",
    description: "Pitches, interviews, and multi file matching.",
    priceMonthly: PLAN_PRICES_USD.elite.monthly,
    priceAnnual: annualPerMonthUsd(PLAN_PRICES_CENTS.elite.annual),
    annualTotal: PLAN_PRICES_USD.elite.annual,
    discountPercentage: ANNUAL_DISCOUNT_PERCENT,
    badge: "Strategy Mode",
    features: [
      "Includes all features from the Pro plan",
      "Basic system compatibility matching analysis",
      "Unlimited smart resume optimizations",
      "Unlimited automated cover letters",
      "Full access to premium resume templates",
      "Multi language support (English, German, Turkish, Spanish, French)",
      "Multi job proposal and cover letter engine",
      "Interactive interview simulator",
      "Single file multi resume evaluator",
      "Single file multi resume and job description matching engine",
      "Priority high speed execution queue",
      "Unused credits rollover to the next month",
      "Pause subscription guarantee anytime upon finding a job or facing low workload",
    ],
    checkoutUrls: {
      monthly: CHECKOUT_PLACEHOLDER,
      annual: CHECKOUT_PLACEHOLDER,
    },
  },

  {
    id: "enterprise",
    name: "Enterprise / Agency",
    description: "High volume hiring for agencies and HR teams.",
    priceMonthly: PLAN_PRICES_USD.enterprise.monthly,
    priceAnnual: annualPerMonthUsd(PLAN_PRICES_CENTS.enterprise.annual),
    annualTotal: PLAN_PRICES_USD.enterprise.annual,
    discountPercentage: ANNUAL_DISCOUNT_PERCENT,
    badge: "Enterprise / HR Teams",
    isEnterprise: true,
    features: [
      "Includes all features from the Elite plan",
      "Basic system compatibility matching analysis",
      "Unlimited smart resume optimizations",
      "Unlimited automated cover letters",
      "Full access to premium resume templates",
      "Multi language support (English, German, Turkish, Spanish, French)",
      "Multi job proposal and cover letter engine",
      "Interactive interview simulator",
      "Single file multi resume evaluator",
      "Single file multi resume and job description matching engine",
      "Priority high speed execution queue",
      "Capacity to upload and rank up to 3,000 resumes per month",
      "Corporate command center and persistent memory bank",
      "Live client sharing link and instant approval portal",
      "Corporate team workspace (1 manager and 5 human resources seats)",
      "Fraud, fluff, and contradiction detection system",
      "Unused credits rollover to the next month",
      "Pause subscription guarantee anytime upon finding a job or facing low workload",
    ],
    checkoutUrls: {
      monthly: CHECKOUT_PLACEHOLDER,
      annual: CHECKOUT_PLACEHOLDER,
    },
  },
];

// ─── Derived subsets ──────────────────────────────────────────────────────────

function isValidPricingTier(t: PricingTier | undefined | null): t is PricingTier {
  return Boolean(t?.id && t?.name && Array.isArray(t.features));
}

/** Recurring subscription plans only (excludes single_pass) */
export const getSubscriptionTiers = (): PricingTier[] =>
  PRICING_TIERS.filter((t) => !t.isOneTime && isValidPricingTier(t));

const FALLBACK_ONE_TIME: PricingTier = {
  id: "single_pass",
  name: "Single Pass",
  description: "Try once, get hired. One tailored application, no subscription.",
  priceMonthly: PLAN_PRICES_USD.single_pass.oneTime,
  priceAnnual: PLAN_PRICES_USD.single_pass.oneTime,
  annualTotal: PLAN_PRICES_USD.single_pass.oneTime,
  discountPercentage: 0,
  isOneTime: true,
  features: [
    "One tailored resume optimization",
    "One job match and compatibility report",
    "Instant PDF export",
  ],
  checkoutUrls: { oneTime: CHECKOUT_PLACEHOLDER },
};

/** The one-time pass product */
export const getOneTimeTier = (): PricingTier =>
  PRICING_TIERS.find((t) => t.isOneTime && isValidPricingTier(t)) ?? FALLBACK_ONE_TIME;

// ─── Supabase plan_type ↔ PricingTier.id mapping ──────────────────────────────

export const TIER_ID_TO_PLAN_TYPE: Record<string, string> = {
  single_pass: "single_pass",
  standard:    "standard",
  pro:         "pro",
  elite:       "elite",
  enterprise:  "B2B_ENTERPRISE",
};

export const PLAN_TYPE_TO_TIER_ID: Record<string, string> = {
  free:          "free",
  single_pass:   "single_pass",
  standard:      "standard",
  pro:           "pro",
  elite:         "elite",
  enterprise:    "enterprise",
  B2B_ENTERPRISE:"enterprise",
  enterprise_b2b:"enterprise",
  appsumo_tier1: "standard",
  appsumo_tier2: "pro",
  appsumo_tier3: "enterprise",
  appsumo_b2b:   "enterprise",
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getTierById(id: string): PricingTier | undefined {
  return PRICING_TIERS.find(t => t.id === id);
}

export function getTierByPlanType(planType: string): PricingTier | undefined {
  const id = PLAN_TYPE_TO_TIER_ID[planType];
  return id ? getTierById(id) : undefined;
}

/** Active checkout URL for the given tier and billing period */
export function getCheckoutUrlFor(tier: PricingTier | undefined | null, isAnnual: boolean): string {
  if (!tier?.id) return getBillingFallbackUrl();
  try {
    if (tier.isOneTime) return sanitizeCheckoutUrl(createCheckout("single_pass"));
    return sanitizeCheckoutUrl(createCheckout(tier.id as CheckoutPlanId, isAnnual ? "yearly" : "monthly"));
  } catch (err) {
    console.error("[Pricing Diagnostic] checkout URL failed", err);
    return getBillingFallbackUrl();
  }
}

export function formatUsd(n: number): string {
  return formatUsdFromMoney(n);
}

/** Hero price: monthly sticker. Annual billing is shown via annualBillString. */
export function displayPrice(tier: PricingTier | undefined | null, _isAnnual: boolean): string {
  return formatUsd(Number(tier?.priceMonthly ?? 0));
}

/** Annual billed string, e.g. "Billed $197.99/year" */
export function annualBillString(tier: PricingTier | undefined | null): string {
  return `Billed ${formatUsd(Number(tier?.annualTotal ?? 0))}/year`;
}

/** Returns true if feature text should be visually highlighted.
 *  Detects "Includes ALL …", all-caps words (e.g. "UNLIMITED"), or "Sub-3-second" */
export function isHighlightedFeature(text: string | undefined | null): boolean {
  if (typeof text !== "string") return false;
  return (
    /^includes all\b/i.test(text) ||
    /\bunlimited\b/i.test(text) ||
    /priority high speed/i.test(text) ||
    /corporate command center/i.test(text) ||
    /corporate team workspace/i.test(text) ||
    /live client sharing/i.test(text) ||
    /3,000 resumes/i.test(text) ||
    /pause subscription guarantee/i.test(text) ||
    /unused credits rollover/i.test(text)
  );
}

/** Pricing cards render the canonical feature list on each tier as written. */
export function resolveInheritedFeatures(tier: PricingTier): string[] {
  return [...(tier.features ?? [])];
}

// ─── Upgrade rank (for gate checks) ──────────────────────────────────────────

export const PLAN_RANK: Record<string, number> = {
  free:          0,
  single_pass:   1,
  standard:      2,
  pro:           3,
  elite:         4,
  B2B_ENTERPRISE:5,
};

export function isHigherThan(targetPlanType: string, currentPlanType: string): boolean {
  return (PLAN_RANK[targetPlanType] ?? 0) > (PLAN_RANK[currentPlanType] ?? 0);
}

// ─── Backward-compatibility exports ──────────────────────────────────────────
// These keep existing imports in PricingSection, Billing, plans.ts, etc. working.

/** @deprecated Use PRICING_TIERS. Kept for backward compat. */
export type PlanId = "standard" | "pro" | "elite" | "enterprise";

/** @deprecated Use PricingTier. Kept for backward compat. */
export type Plan = PricingTier;

/** @deprecated Use getSubscriptionTiers(). Kept for backward compat. */
export const PLANS: PricingTier[] = getSubscriptionTiers();

/** @deprecated Use getOneTimeTier(). Kept for backward compat. */
export const SINGLE_PASS = {
  title: "Single Pass",
  subtitle: "Try once, get hired",
  price: PLAN_PRICES_USD.single_pass.oneTime,
  features: getOneTimeTier().features,
  badge: "One-Time Purchase · No Subscription",
  checkoutUrl: getOneTimeTier().checkoutUrls.oneTime ?? getBillingFallbackUrl(),
};

/** @deprecated Use getTierById(). */
export function getPlanById(id: PlanId): PricingTier {
  return getTierById(id) ?? getSubscriptionTiers()[0] ?? FALLBACK_ONE_TIME;
}

/** @deprecated Use getTierByPlanType(). */
export function getPlanByType(planType: string): PricingTier | undefined {
  return getTierByPlanType(planType);
}

/** @deprecated Use getCheckoutUrlFor() or createCheckout() from src/config/plans.ts. */
export function getCheckoutUrl(planId: PlanId, isAnnual = false): string {
  const tier = getTierById(planId);
  return tier ? getCheckoutUrlFor(tier, isAnnual) : getBillingFallbackUrl();
}
