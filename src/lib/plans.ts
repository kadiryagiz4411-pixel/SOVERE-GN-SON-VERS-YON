// Plan System for Sovereign
// Recurring subscriptions via Lemon Squeezy
// NOTE: Canonical pricing config is now src/config/pricing.ts
// This file retains feature-gate logic used throughout the app.

export type PlanType = 'free' | 'standard' | 'pro' | 'elite' | 'B2B_ENTERPRISE';

export interface PlanLimits {
  dailyProposals: number | 'unlimited';
  dailyDownloads: number | 'unlimited';
  dailyCVGenerations: number | 'unlimited';
  canSaveHistory: boolean;
  canExport: boolean;
  // Pro features
  hasCompanyRewriting: boolean;
  hasAcceptanceScore: boolean;
  hasToneOptimization: boolean;
  // Elite features
  hasDecisionMakerIdentification: boolean;
  hasOutreachMessages: boolean;
  hasFullStrategy: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  // Standard tier — basic AI tools
  standard: {
    dailyProposals: 25,
    dailyDownloads: 10,
    dailyCVGenerations: 2,
    canSaveHistory: true,
    canExport: true,
    hasCompanyRewriting: false,
    hasAcceptanceScore: false,
    hasToneOptimization: false,
    hasDecisionMakerIdentification: false,
    hasOutreachMessages: false,
    hasFullStrategy: false,
  },
  // B2B Enterprise — HR teams
  B2B_ENTERPRISE: {
    dailyProposals: 'unlimited',
    dailyDownloads: 'unlimited',
    dailyCVGenerations: 'unlimited',
    canSaveHistory: true,
    canExport: true,
    hasCompanyRewriting: true,
    hasAcceptanceScore: true,
    hasToneOptimization: true,
    hasDecisionMakerIdentification: true,
    hasOutreachMessages: true,
    hasFullStrategy: true,
  },
  free: {
    dailyProposals: 15,
    dailyDownloads: 5,
    dailyCVGenerations: 1,
    canSaveHistory: true,
    canExport: true,
    hasCompanyRewriting: false,
    hasAcceptanceScore: false,
    hasToneOptimization: false,
    hasDecisionMakerIdentification: false,
    hasOutreachMessages: false,
    hasFullStrategy: false,
  },
  pro: {
    dailyProposals: 'unlimited',
    dailyDownloads: 'unlimited',
    dailyCVGenerations: 3,
    canSaveHistory: true,
    canExport: true,
    hasCompanyRewriting: true,
    hasAcceptanceScore: true,
    hasToneOptimization: true,
    hasDecisionMakerIdentification: false,
    hasOutreachMessages: false,
    hasFullStrategy: false,
  },
  elite: {
    dailyProposals: 'unlimited',
    dailyDownloads: 'unlimited',
    dailyCVGenerations: 'unlimited',
    canSaveHistory: true,
    canExport: true,
    hasCompanyRewriting: true,
    hasAcceptanceScore: true,
    hasToneOptimization: true,
    hasDecisionMakerIdentification: true,
    hasOutreachMessages: true,
    hasFullStrategy: true,
  },
};

export const PLAN_PRICES = {
  standard: { monthly: 12, annual: 108 },
  pro: { monthly: 29, annual: 264 },
  elite: { monthly: 59, annual: 540 },
  enterprise: { monthly: 299, annual: 2868 },
};

// Credits granted per plan on subscription
export const PLAN_CREDITS: Record<string, number> = {
  free: 100,
  standard: 500,
  pro: 2500,
  elite: 5000,
  B2B_ENTERPRISE: 10000,
};

// Cost per action in credits
export const CREDIT_COSTS = {
  proposal: 20,
  cv: 10,
  smartMatch: 20,
  optimize: 10,
};

export const getAnnualSavings = (plan: 'pro' | 'elite') => {
  const monthly = PLAN_PRICES[plan].monthly;
  const annual = PLAN_PRICES[plan].annual;
  return (monthly * 12) - annual;
};

// Lemon Squeezy checkout URLs — loaded from VITE_ env vars.
// See src/config/pricing.ts for the canonical implementation.
// These legacy exports kept for backward compatibility with existing components.
export const CHECKOUT_URLS = {
  standard: {
    monthly: import.meta.env.VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL ?? '#',
    annual: import.meta.env.VITE_LEMONSQUEEZY_STANDARD_ANNUAL_URL ?? '#',
  },
  pro: {
    monthly: import.meta.env.VITE_LEMONSQUEEZY_PRO_MONTHLY_URL
      ?? 'https://sovereignapp.lemonsqueezy.com/checkout/buy/1f8f86a3-ac49-4c41-ae25-4c8e03df1759',
    annual: import.meta.env.VITE_LEMONSQUEEZY_PRO_ANNUAL_URL
      ?? 'https://sovereignapp.lemonsqueezy.com/checkout/buy/f86e3532-79dc-4cab-9d74-ec98a443f8b9',
  },
  elite: {
    monthly: import.meta.env.VITE_LEMONSQUEEZY_ELITE_MONTHLY_URL
      ?? 'https://sovereignapp.lemonsqueezy.com/checkout/buy/ee871e14-95bd-46b3-afb8-2b73c66d54f1',
    annual: import.meta.env.VITE_LEMONSQUEEZY_ELITE_ANNUAL_URL
      ?? 'https://sovereignapp.lemonsqueezy.com/checkout/buy/eef79c14-3371-444f-a171-8fcc00ebe411',
  },
  enterprise: {
    monthly: import.meta.env.VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL ?? '#',
    annual: import.meta.env.VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_URL ?? '#',
  },
};

export const getCheckoutUrl = (plan: 'standard' | 'pro' | 'elite' | 'enterprise', isAnnual: boolean = true): string => {
  return isAnnual ? CHECKOUT_URLS[plan].annual : CHECKOUT_URLS[plan].monthly;
};


// App domain
export const APP_DOMAIN = 'https://sovereignapp.pro';

// Feature metadata for UI
export interface FeatureMeta {
  name: string;
  description: string;
  tier: 'pro' | 'elite';
  icon?: string;
}

export const FEATURE_META: Record<keyof Omit<PlanLimits, 'dailyProposals' | 'dailyDownloads' | 'dailyCVGenerations'>, FeatureMeta> = {
  canSaveHistory: {
    name: 'Save Proposal History',
    description: 'Keep all your proposals organized and accessible',
    tier: 'pro',
  },
  canExport: {
    name: 'Export Proposals',
    description: 'Download your proposals in multiple formats',
    tier: 'pro',
  },
  hasCompanyRewriting: {
    name: 'Company-Specific Rewriting',
    description: 'Tailored text optimized for specific companies and roles',
    tier: 'pro',
  },
  hasAcceptanceScore: {
    name: 'Acceptance Probability Score',
    description: 'AI-powered prediction of your application success rate',
    tier: 'pro',
  },
  hasToneOptimization: {
    name: 'Tone & Structure Optimization',
    description: 'Perfect your message clarity, tone, and structure',
    tier: 'pro',
  },
  hasDecisionMakerIdentification: {
    name: 'Decision-Maker Identification',
    description: 'Find the right people to contact at target companies',
    tier: 'elite',
  },
  hasOutreachMessages: {
    name: 'Outreach Message Generation',
    description: 'Personalized LinkedIn and email messages that get responses',
    tier: 'elite',
  },
  hasFullStrategy: {
    name: 'Full Application Strategy',
    description: 'Complete strategy with insights on why applications fail and how to fix them',
    tier: 'elite',
  },
};

export const getPlanLimits = (plan: string): PlanLimits => {
  const planKey = plan.toLowerCase() as PlanType;
  return PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
};

export const isPaidPlan = (plan: string): boolean => {
  return plan === 'standard' || plan === 'pro' || plan === 'elite' || plan === 'B2B_ENTERPRISE';
};

export const isElitePlan = (plan: string): boolean => {
  return plan === 'elite';
};

export const isProPlan = (plan: string): boolean => {
  return plan === 'pro';
};

export const canAccessFeature = (
  plan: string,
  feature: keyof PlanLimits
): boolean => {
  const limits = getPlanLimits(plan);
  const value = limits[feature];
  
  if (typeof value === 'boolean') return value;
  if (value === 'unlimited') return true;
  return value > 0;
};

export const getRequiredPlanForFeature = (feature: keyof Omit<PlanLimits, 'dailyProposals' | 'dailyDownloads' | 'dailyCVGenerations'>): 'pro' | 'elite' => {
  return FEATURE_META[feature]?.tier || 'pro';
};

export const getDailyLimit = (plan: string): number => {
  const limits = getPlanLimits(plan);
  return limits.dailyProposals === 'unlimited' ? Infinity : limits.dailyProposals;
};

export const getDownloadLimit = (plan: string): number => {
  const limits = getPlanLimits(plan);
  return limits.dailyDownloads === 'unlimited' ? Infinity : limits.dailyDownloads;
};
