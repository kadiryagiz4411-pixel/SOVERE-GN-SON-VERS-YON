/**
 * Sovereign Pricing Configuration — v4
 * ──────────────────────────────────────
 * Single source of truth for all pricing tiers, feature lists, and
 * Lemon Squeezy checkout URLs (env-driven, overlay-ready).
 *
 * Checkout URL env vars required in .env:
 *   VITE_LEMONSQUEEZY_ONETIME_PASS_URL
 *   VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL / _ANNUAL_URL
 *   VITE_LEMONSQUEEZY_PRO_MONTHLY_URL      / _ANNUAL_URL
 *   VITE_LEMONSQUEEZY_ELITE_MONTHLY_URL    / _ANNUAL_URL
 *   VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL / _ANNUAL_URL
 */

// ─── URL helper (safe env read) ───────────────────────────────────────────────

const url = (key: string): string =>
  (typeof import.meta !== "undefined"
    ? (import.meta.env as Record<string, string>)[key]
    : "") || "#";

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
  // ── 0. Single Pass (one-time) ─────────────────────────────────────────────
  {
    id: "single_pass",
    name: "Single Pass",
    description: "1-time instant AI CV optimization with zero recurring subscription fees.",
    priceMonthly: 4.99,
    priceAnnual: 4.99,
    annualTotal: 4.99,
    discountPercentage: 0,
    isOneTime: true,
    features: [
      "1-Time Full AI CV Optimization",
      "1-Time Job Match & ATS Score Report",
      "Instant PDF Export",
    ],
    checkoutUrls: {
      oneTime: url("VITE_LEMONSQUEEZY_ONETIME_PASS_URL"),
    },
  },

  // ── 1. Standard ───────────────────────────────────────────────────────────
  {
    id: "standard",
    name: "Standard",
    description: "Essential AI optimization suite for active job seekers.",
    priceMonthly: 12,
    priceAnnual: 9,
    annualTotal: 108,
    discountPercentage: 25,
    features: [
      "Up to 5 AI CV Optimizations per month",
      "Up to 3 Automated Cover Letters per month",
      "Standard Resume Templates Catalog",
      "ATS Score & Match Analysis",
    ],
    checkoutUrls: {
      monthly: url("VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL"),
      annual: url("VITE_LEMONSQUEEZY_STANDARD_ANNUAL_URL"),
    },
  },

  // ── 2. Pro (Most Popular) ─────────────────────────────────────────────────
  {
    id: "pro",
    name: "Pro",
    description: "Comprehensive career toolkit designed for maximum interview callbacks.",
    priceMonthly: 29,
    priceAnnual: 22,
    annualTotal: 264,
    discountPercentage: 24,
    badge: "Most Popular",
    isPopular: true,
    features: [
      "Includes ALL Standard Plan capabilities",
      "UNLIMITED AI CV Optimizations",
      "UNLIMITED Automated Cover Letters",
      "Full Access to Premium Resume Templates",
      "ATS Keyword Injector & Keyword Density Tool",
      "Multi-Language Support (EN, DE, TR, ES, FR)",
    ],
    checkoutUrls: {
      monthly: url("VITE_LEMONSQUEEZY_PRO_MONTHLY_URL"),
      annual: url("VITE_LEMONSQUEEZY_PRO_ANNUAL_URL"),
    },
  },

  // ── 3. Elite ──────────────────────────────────────────────────────────────
  {
    id: "elite",
    name: "Elite",
    description: "For ambitious professionals seeking high-paying remote & executive roles.",
    priceMonthly: 59,
    priceAnnual: 45,
    annualTotal: 540,
    discountPercentage: 24,
    badge: "Strategy Mode",
    features: [
      "Includes ALL Pro Plan capabilities",
      "Interactive AI Voice/Text Interview Practice Simulator",
      "Freelance Pitch & Client Proposal Generator",
      "Priority High-Speed LLM Execution Queue",
      "Personal Portfolio Website Builder & HTML Export",
    ],
    checkoutUrls: {
      monthly: url("VITE_LEMONSQUEEZY_ELITE_MONTHLY_URL"),
      annual: url("VITE_LEMONSQUEEZY_ELITE_ANNUAL_URL"),
    },
  },

  // ── 4. Enterprise B2B ────────────────────────────────────────────────────
  {
    id: "enterprise",
    name: "Enterprise B2B",
    description: "High-volume talent acquisition platform for agencies, HR teams & SMEs.",
    priceMonthly: 299,
    priceAnnual: 239,
    annualTotal: 2868,
    discountPercentage: 20,
    badge: "Enterprise / HR Teams",
    isEnterprise: true,
    features: [
      "Includes ALL Elite Plan capabilities",
      "Batch Upload & Rank up to 3,000 CVs/month",
      "Organization Team Workspace (1 Owner + 5 HR Seats)",
      "AI Fraud, Fluff & Resume Contradiction Detector",
      "Explainable AI Audit & GDPR/KVKK Compliance Exports",
      "Sub-3-second Vector Search Candidate Talent Pool",
      "Single-click Leaderboard CSV/Excel Export",
    ],
    checkoutUrls: {
      monthly: url("VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL"),
      annual: url("VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_URL"),
    },
  },
];

// ─── Derived subsets ──────────────────────────────────────────────────────────

/** Recurring subscription plans only (excludes single_pass) */
export const getSubscriptionTiers = (): PricingTier[] =>
  PRICING_TIERS.filter(t => !t.isOneTime);

/** The one-time pass product */
export const getOneTimeTier = (): PricingTier =>
  PRICING_TIERS.find(t => t.isOneTime)!;

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
  B2B_ENTERPRISE:"enterprise",
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
export function getCheckoutUrlFor(tier: PricingTier, isAnnual: boolean): string {
  if (tier.isOneTime) return tier.checkoutUrls.oneTime ?? "#";
  return (isAnnual ? tier.checkoutUrls.annual : tier.checkoutUrls.monthly) ?? "#";
}

/** Display price string, e.g. "$22" */
export function displayPrice(tier: PricingTier, isAnnual: boolean): string {
  return `$${isAnnual ? tier.priceAnnual : tier.priceMonthly}`;
}

/** Annual billed string, e.g. "Billed $264 annually" */
export function annualBillString(tier: PricingTier): string {
  return `Billed $${tier.annualTotal.toLocaleString()} annually`;
}

/** Returns true if feature text should be visually highlighted.
 *  Detects "Includes ALL …", all-caps words (e.g. "UNLIMITED"), or "Sub-3-second" */
export function isHighlightedFeature(text: string): boolean {
  return (
    text.startsWith("Includes ALL") ||
    /\bUNLIMITED\b/.test(text) ||
    text.startsWith("Batch Upload") ||
    text.startsWith("Organization Team")
  );
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
  subtitle: "Try Once — No Subscription Needed",
  price: 4.99,
  features: getOneTimeTier().features,
  badge: "One-Time Purchase · No Subscription",
  checkoutUrl: getOneTimeTier().checkoutUrls.oneTime ?? "#",
};

/** @deprecated Use getTierById(). */
export function getPlanById(id: PlanId): PricingTier {
  return getTierById(id)!;
}

/** @deprecated Use getTierByPlanType(). */
export function getPlanByType(planType: string): PricingTier | undefined {
  return getTierByPlanType(planType);
}

/** @deprecated Use getCheckoutUrlFor(). */
export function getCheckoutUrl(planId: PlanId, isAnnual = true): string {
  const tier = getTierById(planId);
  return tier ? getCheckoutUrlFor(tier, isAnnual) : "#";
}
