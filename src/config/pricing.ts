/**
 * Sovereign Pricing Configuration — v3
 * ─────────────────────────────────────
 * Single source of truth for all plan metadata, pricing, and checkout URLs.
 * Monthly / Annual billing toggled at component level.
 * Checkout URLs consumed from VITE_ env vars → Lemon Squeezy hosted checkouts.
 */

// ─── Plan IDs ────────────────────────────────────────────────────────────────

export type PlanId = "standard" | "pro" | "elite" | "enterprise";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PlanFeature {
  text: string;
  highlight?: boolean; // bold + colored icon
}

export interface PlanPricing {
  monthly: number;        // per-month display price when billed monthly
  annual: number;         // per-month display price when billed annually
  annualTotal: number;    // total billed annually (shown below price)
  savePct: number;        // integer 0-100, e.g. 25
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  badge?: string;
  badgeVariant?: "popular" | "enterprise" | "elite";
  pricing: PlanPricing;
  features: PlanFeature[];
  ctaMonthly: string;
  ctaAnnual: string;
  style: "standard" | "popular" | "elite" | "enterprise";
  checkoutUrls: {
    monthly: string;
    annual: string;
  };
  /** plan_type value stored in Supabase profile row */
  planType: string;
}

// ─── Checkout URLs (env-driven) ───────────────────────────────────────────────
// Set these in .env:
//   VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL=https://...
//   VITE_LEMONSQUEEZY_STANDARD_ANNUAL_URL=https://...
//   (repeat for PRO, ELITE, ENTERPRISE)
//
// Falls back to # so the page never throws if the var is missing.

const url = (key: string) =>
  (typeof import.meta !== "undefined" ? (import.meta.env as Record<string, string>)[key] : "") || "#";

// ─── Plan Definitions ─────────────────────────────────────────────────────────

export const PLANS: Plan[] = [
  // ── 1. Standard ──────────────────────────────────────────────────────────────
  {
    id: "standard",
    name: "Standard",
    tagline: "Kickstart your job search with AI",
    pricing: {
      monthly: 12,
      annual: 9,
      annualTotal: 108,
      savePct: 25,
    },
    features: [
      { text: "Basic AI CV Generation" },
      { text: "5 Job Match Scans / month" },
      { text: "Standard Resume Templates" },
      { text: "PDF & DOCX Export" },
      { text: "ATS Compatibility Check" },
    ],
    ctaMonthly: "Get Started",
    ctaAnnual: "Get Started",
    style: "standard",
    checkoutUrls: {
      monthly: url("VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL"),
      annual: url("VITE_LEMONSQUEEZY_STANDARD_ANNUAL_URL"),
    },
    planType: "standard",
  },

  // ── 2. Pro ────────────────────────────────────────────────────────────────────
  {
    id: "pro",
    name: "Pro",
    tagline: "Unlimited optimizations & real-time match scoring",
    badge: "Most Popular",
    badgeVariant: "popular",
    pricing: {
      monthly: 29,
      annual: 22,
      annualTotal: 264,
      savePct: 24,
    },
    features: [
      { text: "Unlimited AI CV Optimizations", highlight: true },
      { text: "Automated Cover Letter Generator", highlight: true },
      { text: "Real-time Match Score Analyzer", highlight: true },
      { text: "ATS Keyword Injector" },
      { text: "Acceptance Probability Score" },
      { text: "Tone & Structure Optimizer" },
      { text: "Priority Response Speed" },
    ],
    ctaMonthly: "Go Pro",
    ctaAnnual: "Go Pro — Best Value",
    style: "popular",
    checkoutUrls: {
      monthly: url("VITE_LEMONSQUEEZY_PRO_MONTHLY_URL"),
      annual: url("VITE_LEMONSQUEEZY_PRO_ANNUAL_URL"),
    },
    planType: "pro",
  },

  // ── 3. Elite ──────────────────────────────────────────────────────────────────
  {
    id: "elite",
    name: "Elite",
    tagline: "Full-spectrum career strategy & interview prep",
    badge: "Strategy Mode",
    badgeVariant: "elite",
    pricing: {
      monthly: 59,
      annual: 45,
      annualTotal: 540,
      savePct: 24,
    },
    features: [
      { text: "Everything in Pro", highlight: true },
      { text: "Interactive AI Interview Simulator", highlight: true },
      { text: "Freelance Pitch Generator" },
      { text: "Decision-Maker Identification" },
      { text: "Personalized Outreach Messages" },
      { text: "Full Application Strategy Reports" },
      { text: "Custom Branding Options" },
      { text: "Priority LLM Speed & Response" },
    ],
    ctaMonthly: "Go Elite",
    ctaAnnual: "Go Elite — Save 24%",
    style: "elite",
    checkoutUrls: {
      monthly: url("VITE_LEMONSQUEEZY_ELITE_MONTHLY_URL"),
      annual: url("VITE_LEMONSQUEEZY_ELITE_ANNUAL_URL"),
    },
    planType: "elite",
  },

  // ── 4. Enterprise B2B ─────────────────────────────────────────────────────────
  {
    id: "enterprise",
    name: "Enterprise B2B",
    tagline: "Bulk AI hiring intelligence for HR teams",
    badge: "Enterprise · HR Teams",
    badgeVariant: "enterprise",
    pricing: {
      monthly: 299,
      annual: 239,
      annualTotal: 2868,
      savePct: 20,
    },
    features: [
      { text: "Bulk CV Parsing Queue — up to 3,000/mo", highlight: true },
      { text: "5 Recruiter / HR Seats", highlight: true },
      { text: "AI Fluff & Fraud Consistency Detector", highlight: true },
      { text: "XAI & GDPR / KVKK Audit Reports", highlight: true },
      { text: "Vector Search Talent Pool (pgvector)" },
      { text: "Pay-As-You-Go Credit Top-Ups" },
      { text: "Multi-tenant RLS Data Isolation" },
      { text: "Priority Dedicated Support" },
    ],
    ctaMonthly: "Contact Sales",
    ctaAnnual: "Contact Sales — Save 20%",
    style: "enterprise",
    checkoutUrls: {
      monthly: url("VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL"),
      annual: url("VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_URL"),
    },
    planType: "B2B_ENTERPRISE",
  },
];

// ─── Single Pass (one-time, non-recurring) ────────────────────────────────────

export interface SinglePass {
  title: string;
  subtitle: string;
  price: number;
  features: string[];
  badge: string;
  checkoutUrl: string;
}

export const SINGLE_PASS: SinglePass = {
  title: "Single Pass",
  subtitle: "Try Once — No Subscription Needed",
  price: 4.99,
  features: [
    "1× Full AI CV Optimization",
    "1× Job Match & ATS Score Report",
    "Instant PDF Export",
  ],
  badge: "One-Time Purchase · No Subscription",
  checkoutUrl: url("VITE_LEMONSQUEEZY_ONETIME_PASS_URL"),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPlanById(id: PlanId): Plan {
  return PLANS.find(p => p.id === id)!;
}

export function getPlanByType(planType: string): Plan | undefined {
  return PLANS.find(p => p.planType === planType);
}

export function getCheckoutUrl(planId: PlanId, isAnnual: boolean): string {
  const plan = getPlanById(planId);
  return isAnnual ? plan.checkoutUrls.annual : plan.checkoutUrls.monthly;
}

/** Display price string, e.g. "$22" */
export function displayPrice(plan: Plan, isAnnual: boolean): string {
  return `$${isAnnual ? plan.pricing.annual : plan.pricing.monthly}`;
}

/** Annual total string, e.g. "Billed $264 annually" */
export function annualBillString(plan: Plan): string {
  return `Billed $${plan.pricing.annualTotal.toLocaleString()} annually`;
}

/**
 * Rank order for plan upgrade gates.
 * Higher is more premium.
 */
export const PLAN_RANK: Record<string, number> = {
  free: 0,
  standard: 1,
  pro: 2,
  elite: 3,
  B2B_ENTERPRISE: 4,
};

export function isHigherThan(targetPlanType: string, currentPlanType: string): boolean {
  return (PLAN_RANK[targetPlanType] ?? 0) > (PLAN_RANK[currentPlanType] ?? 0);
}
