// Plan System for Sovereign
// Recurring subscriptions via Lemon Squeezy
// NOTE: Canonical pricing config is now src/config/pricing.ts
// This file retains feature-gate logic used throughout the app.

import { createCheckout } from '@/config/plans';

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

// Cost per action in credits (dollar prices / LS IDs are unchanged)
export const CREDIT_COSTS = {
  proposal: 20,
  cv: 20,
  smartMatch: 20,
  optimize: 20,
};

export const getAnnualSavings = (plan: 'pro' | 'elite') => {
  const monthly = PLAN_PRICES[plan].monthly;
  const annual = PLAN_PRICES[plan].annual;
  return (monthly * 12) - annual;
};

// Lemon Squeezy checkout URLs — resolved from src/config/plans.ts
// (variant IDs + env URLs). Default billing cycle is monthly so callers
// that omit the second arg never silently open the yearly checkout.
export const CHECKOUT_URLS = {
  standard: {
    monthly: createCheckout('standard', 'monthly'),
    annual: createCheckout('standard', 'yearly'),
  },
  pro: {
    monthly: createCheckout('pro', 'monthly'),
    annual: createCheckout('pro', 'yearly'),
  },
  elite: {
    monthly: createCheckout('elite', 'monthly'),
    annual: createCheckout('elite', 'yearly'),
  },
  enterprise: {
    monthly: createCheckout('enterprise', 'monthly'),
    annual: createCheckout('enterprise', 'yearly'),
  },
};

export const getCheckoutUrl = (
  plan: 'standard' | 'pro' | 'elite' | 'enterprise',
  isAnnual: boolean = false,
): string => {
  return createCheckout(plan, isAnnual ? 'yearly' : 'monthly');
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
