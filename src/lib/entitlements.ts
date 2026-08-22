/**
 * Sovereign Entitlement Engine — v1
 * ──────────────────────────────────
 * Strict, hierarchical feature gating.
 * Every higher tier includes 100% of all lower-tier features.
 *
 * Tier hierarchy (rank = enforcement level):
 *   free (0) < single_pass (1) < standard (2) < pro (3) < elite (4) < enterprise (5)
 */

// ─── Plan Tier type ────────────────────────────────────────────────────────────

export const PLAN_TIERS = [
  'free', 'single_pass', 'standard', 'pro', 'elite', 'enterprise',
] as const;

export type PlanTier = typeof PLAN_TIERS[number];

// ─── Tier rank for comparison ──────────────────────────────────────────────────

export const TIER_RANK: Record<PlanTier, number> = {
  free:        0,
  single_pass: 1,
  standard:    2,
  pro:         3,
  elite:       4,
  enterprise:  5,
};

// ─── Map from Supabase profile.plan_type / subscription_tier → PlanTier ───────

export const PLAN_TYPE_TO_TIER: Record<string, PlanTier> = {
  // Subscription plans
  free:           'free',
  single_pass:    'single_pass',
  standard:       'standard',
  pro:            'pro',
  elite:          'elite',
  B2B_ENTERPRISE: 'enterprise',

  // AppSumo lifetime tiers — mapped to equivalent Sovereign plan tiers
  appsumo_tier1:  'standard',   // 50 credits/mo — same capability as Standard
  appsumo_tier2:  'pro',        // 200 credits/mo — same capability as Pro
  appsumo_b2b:    'enterprise', // 1000 credits/mo — full B2B capability
  // Legacy alias (from v1 migration)
  appsumo_tier3:  'enterprise',
};

export function planTypeToTier(planType: string | null | undefined): PlanTier {
  if (!planType) return 'free';
  return PLAN_TYPE_TO_TIER[planType] ?? 'free';
}

// ─── Feature key constants ─────────────────────────────────────────────────────

export const FEATURES = {
  // ── Tier 0 — free (these should never block, just documenting) ──────────────
  // (free tier has no gated features — basic UI only)

  // ── Tier 1 — single_pass ────────────────────────────────────────────────────
  SINGLE_CV_OPTIMIZE:      'SINGLE_CV_OPTIMIZE',
  SINGLE_JOB_MATCH:        'SINGLE_JOB_MATCH',
  BASIC_PDF_EXPORT:        'BASIC_PDF_EXPORT',

  // ── Tier 2 — standard ────────────────────────────────────────────────────────
  MONTHLY_CV_OPTIMIZE:     'MONTHLY_CV_OPTIMIZE',
  MONTHLY_COVER_LETTER:    'MONTHLY_COVER_LETTER',
  STANDARD_TEMPLATES:      'STANDARD_TEMPLATES',

  // ── Tier 3 — pro ─────────────────────────────────────────────────────────────
  UNLIMITED_CV_OPTIMIZE:   'UNLIMITED_CV_OPTIMIZE',
  UNLIMITED_COVER_LETTER:  'UNLIMITED_COVER_LETTER',
  PREMIUM_TEMPLATES:       'PREMIUM_TEMPLATES',
  ATS_KEYWORD_INJECTOR:    'ATS_KEYWORD_INJECTOR',
  MULTI_LANGUAGE_SUPPORT:  'MULTI_LANGUAGE_SUPPORT',

  // ── Tier 4 — elite ───────────────────────────────────────────────────────────
  AI_INTERVIEW_SIMULATOR:  'AI_INTERVIEW_SIMULATOR',
  FREELANCE_PITCH_GEN:     'FREELANCE_PITCH_GEN',
  PRIORITY_LLM_SPEED:      'PRIORITY_LLM_SPEED',
  PORTFOLIO_WEB_EXPORT:    'PORTFOLIO_WEB_EXPORT',

  // ── Tier 5 — enterprise ──────────────────────────────────────────────────────
  BULK_CV_PARSER:           'BULK_CV_PARSER',
  MULTI_SEAT_ACCESS:        'MULTI_SEAT_ACCESS',
  AI_FRAUD_DETECTOR:        'AI_FRAUD_DETECTOR',
  XAI_COMPLIANCE_REPORTS:   'XAI_COMPLIANCE_REPORTS',
  TALENT_POOL_VECTOR_SEARCH:'TALENT_POOL_VECTOR_SEARCH',
  BATCH_EXPORT_CSV:         'BATCH_EXPORT_CSV',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

// ─── FeatureGate descriptor ────────────────────────────────────────────────────

export interface FeatureGate {
  featureKey:  FeatureKey;
  minTier:     PlanTier;
  title:       string;
  description: string;
  upgradeHint: string;
}

// ─── Feature gate registry ─────────────────────────────────────────────────────

export const FEATURE_GATES: Record<FeatureKey, FeatureGate> = {
  // single_pass ────────────────────────────────────────────────────────────────
  SINGLE_CV_OPTIMIZE: {
    featureKey:  'SINGLE_CV_OPTIMIZE',
    minTier:     'single_pass',
    title:       '1× AI CV Optimization',
    description: 'One-time full AI-powered CV optimization against a job description.',
    upgradeHint: 'Get a Single Pass ($4.99) or subscribe to Standard.',
  },
  SINGLE_JOB_MATCH: {
    featureKey:  'SINGLE_JOB_MATCH',
    minTier:     'single_pass',
    title:       '1× Job Match & ATS Score',
    description: 'One-time ATS job match scan with keyword gap analysis.',
    upgradeHint: 'Get a Single Pass ($4.99) or subscribe to Standard.',
  },
  BASIC_PDF_EXPORT: {
    featureKey:  'BASIC_PDF_EXPORT',
    minTier:     'single_pass',
    title:       'PDF Export',
    description: 'Download your CV or proposal as a PDF.',
    upgradeHint: 'Get a Single Pass ($4.99) or subscribe to Standard.',
  },

  // standard ───────────────────────────────────────────────────────────────────
  MONTHLY_CV_OPTIMIZE: {
    featureKey:  'MONTHLY_CV_OPTIMIZE',
    minTier:     'standard',
    title:       'Monthly CV Optimizations',
    description: 'Up to 5 AI CV optimizations included every month.',
    upgradeHint: 'Upgrade to Standard — $12/month.',
  },
  MONTHLY_COVER_LETTER: {
    featureKey:  'MONTHLY_COVER_LETTER',
    minTier:     'standard',
    title:       'Monthly Cover Letters',
    description: 'Up to 3 AI-generated cover letters per month.',
    upgradeHint: 'Upgrade to Standard — $12/month.',
  },
  STANDARD_TEMPLATES: {
    featureKey:  'STANDARD_TEMPLATES',
    minTier:     'standard',
    title:       'Standard Template Library',
    description: 'Access to our curated library of Standard resume templates.',
    upgradeHint: 'Upgrade to Standard — $12/month.',
  },

  // pro ────────────────────────────────────────────────────────────────────────
  UNLIMITED_CV_OPTIMIZE: {
    featureKey:  'UNLIMITED_CV_OPTIMIZE',
    minTier:     'pro',
    title:       'Unlimited CV Optimizations',
    description: 'Unlimited AI CV optimizations with no monthly cap.',
    upgradeHint: 'Upgrade to Pro — $29/month.',
  },
  UNLIMITED_COVER_LETTER: {
    featureKey:  'UNLIMITED_COVER_LETTER',
    minTier:     'pro',
    title:       'Unlimited Cover Letters',
    description: 'Generate as many automated cover letters as you need.',
    upgradeHint: 'Upgrade to Pro — $29/month.',
  },
  PREMIUM_TEMPLATES: {
    featureKey:  'PREMIUM_TEMPLATES',
    minTier:     'pro',
    title:       'Premium Resume Templates',
    description: 'Full access to all premium and modern resume template designs.',
    upgradeHint: 'Upgrade to Pro — $29/month.',
  },
  ATS_KEYWORD_INJECTOR: {
    featureKey:  'ATS_KEYWORD_INJECTOR',
    minTier:     'pro',
    title:       'ATS Keyword Injector',
    description: 'Automatically inject ATS-optimized keywords from job descriptions into your CV.',
    upgradeHint: 'Upgrade to Pro — $29/month.',
  },
  MULTI_LANGUAGE_SUPPORT: {
    featureKey:  'MULTI_LANGUAGE_SUPPORT',
    minTier:     'pro',
    title:       'Multi-Language CV Generation',
    description: 'Generate and export CVs in English, German, Turkish, Spanish, and French.',
    upgradeHint: 'Upgrade to Pro — $29/month.',
  },

  // elite ──────────────────────────────────────────────────────────────────────
  AI_INTERVIEW_SIMULATOR: {
    featureKey:  'AI_INTERVIEW_SIMULATOR',
    minTier:     'elite',
    title:       'AI Interview Simulator',
    description: 'Interactive text and voice AI interview practice — technical and behavioral.',
    upgradeHint: 'Upgrade to Elite — $59/month.',
  },
  FREELANCE_PITCH_GEN: {
    featureKey:  'FREELANCE_PITCH_GEN',
    minTier:     'elite',
    title:       'Freelance Pitch Generator',
    description: 'Automated client pitch and proposal generation for freelancers.',
    upgradeHint: 'Upgrade to Elite — $59/month.',
  },
  PRIORITY_LLM_SPEED: {
    featureKey:  'PRIORITY_LLM_SPEED',
    minTier:     'elite',
    title:       'Priority AI Speed',
    description: 'High-priority API execution queue — fastest response times guaranteed.',
    upgradeHint: 'Upgrade to Elite — $59/month.',
  },
  PORTFOLIO_WEB_EXPORT: {
    featureKey:  'PORTFOLIO_WEB_EXPORT',
    minTier:     'elite',
    title:       'Portfolio Web Export',
    description: 'Export your CV as a personal portfolio website (HTML/hosted).',
    upgradeHint: 'Upgrade to Elite — $59/month.',
  },

  // enterprise ─────────────────────────────────────────────────────────────────
  BULK_CV_PARSER: {
    featureKey:  'BULK_CV_PARSER',
    minTier:     'enterprise',
    title:       'Bulk CV Parser',
    description: 'Batch upload and AI-rank up to 3,000 CVs per month for your team.',
    upgradeHint: 'Upgrade to Enterprise B2B — $299/month.',
  },
  MULTI_SEAT_ACCESS: {
    featureKey:  'MULTI_SEAT_ACCESS',
    minTier:     'enterprise',
    title:       'Multi-Seat Team Workspace',
    description: 'Organization workspace with 1 Owner + 5 Recruiter seats.',
    upgradeHint: 'Upgrade to Enterprise B2B — $299/month.',
  },
  AI_FRAUD_DETECTOR: {
    featureKey:  'AI_FRAUD_DETECTOR',
    minTier:     'enterprise',
    title:       'AI Fraud & Fluff Detector',
    description: 'Detect AI-generated fluff, resume inconsistencies, and authenticity risks.',
    upgradeHint: 'Upgrade to Enterprise B2B — $299/month.',
  },
  XAI_COMPLIANCE_REPORTS: {
    featureKey:  'XAI_COMPLIANCE_REPORTS',
    minTier:     'enterprise',
    title:       'XAI & GDPR/KVKK Compliance Reports',
    description: 'Explainable AI audit logs and GDPR/KVKK compliant PDF export reports.',
    upgradeHint: 'Upgrade to Enterprise B2B — $299/month.',
  },
  TALENT_POOL_VECTOR_SEARCH: {
    featureKey:  'TALENT_POOL_VECTOR_SEARCH',
    minTier:     'enterprise',
    title:       'Talent Pool Vector Search',
    description: 'Sub-3-second semantic natural language search across your entire candidate pool.',
    upgradeHint: 'Upgrade to Enterprise B2B — $299/month.',
  },
  BATCH_EXPORT_CSV: {
    featureKey:  'BATCH_EXPORT_CSV',
    minTier:     'enterprise',
    title:       'Batch Candidate CSV Export',
    description: 'One-click export of the full candidate leaderboard to CSV/Excel format.',
    upgradeHint: 'Upgrade to Enterprise B2B — $299/month.',
  },
};

// ─── Core access check ─────────────────────────────────────────────────────────

/**
 * Returns true if `userTier` is at or above the feature's minimum required tier.
 */
export function canAccess(userTier: PlanTier, featureKey: FeatureKey): boolean {
  const gate = FEATURE_GATES[featureKey];
  if (!gate) return false;
  return TIER_RANK[userTier] >= TIER_RANK[gate.minTier];
}

/**
 * Returns true if the user's plan_type string gives access to `featureKey`.
 */
export function canAccessByPlanType(planType: string | null | undefined, featureKey: FeatureKey): boolean {
  return canAccess(planTypeToTier(planType), featureKey);
}

export function getRequiredTierFor(featureKey: FeatureKey): PlanTier {
  return FEATURE_GATES[featureKey]?.minTier ?? 'enterprise';
}

export function getGate(featureKey: FeatureKey): FeatureGate | undefined {
  return FEATURE_GATES[featureKey];
}

// ─── Tier display metadata (for UpgradeModal) ──────────────────────────────────

export interface TierMeta {
  label:        string;
  priceMonthly: number;
  priceAnnual:  number;
  accentClass:  string;       // Tailwind text color for this tier
  borderClass:  string;       // Tailwind border color
  bgClass:      string;       // Tailwind bg gradient
  badgeClass:   string;       // Tailwind badge styling
  topFeatures:  string[];     // 4-5 bullet points shown in the modal
}

export const TIER_META: Record<PlanTier, TierMeta> = {
  free: {
    label: 'Free', priceMonthly: 0, priceAnnual: 0,
    accentClass: 'text-slate-400',
    borderClass: 'border-slate-600',
    bgClass: 'from-slate-800/40 to-slate-900',
    badgeClass: 'bg-slate-700 text-slate-300',
    topFeatures: ['Basic CV generation', '15 daily proposals'],
  },
  single_pass: {
    label: 'Single Pass', priceMonthly: 4.99, priceAnnual: 4.99,
    accentClass: 'text-teal-400',
    borderClass: 'border-teal-500/40',
    bgClass: 'from-teal-900/30 to-slate-900',
    badgeClass: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    topFeatures: [
      '1× Full AI CV Optimization',
      '1× ATS Job Match Scan',
      'Instant PDF Export',
    ],
  },
  standard: {
    label: 'Standard', priceMonthly: 12, priceAnnual: 9,
    accentClass: 'text-slate-200',
    borderClass: 'border-slate-500/50',
    bgClass: 'from-slate-800/60 to-slate-900',
    badgeClass: 'bg-slate-600/30 text-slate-200 border border-slate-500/40',
    topFeatures: [
      '5 AI CV Optimizations / month',
      '3 Cover Letters / month',
      'Standard Resume Templates',
      'PDF & DOCX Export',
    ],
  },
  pro: {
    label: 'Pro', priceMonthly: 29, priceAnnual: 22,
    accentClass: 'text-violet-400',
    borderClass: 'border-violet-500/60',
    bgClass: 'from-violet-900/30 to-slate-900',
    badgeClass: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    topFeatures: [
      'Unlimited AI CV Optimizations',
      'Automated Cover Letter Generator',
      'Real-time Match Score Analyzer',
      'ATS Keyword Injector',
      'Multi-Language CV Generation',
    ],
  },
  elite: {
    label: 'Elite', priceMonthly: 59, priceAnnual: 45,
    accentClass: 'text-amber-400',
    borderClass: 'border-amber-500/50',
    bgClass: 'from-amber-900/25 to-slate-900',
    badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    topFeatures: [
      'Everything in Pro',
      'AI Interview Simulator (Text + Voice)',
      'Freelance Pitch Generator',
      'Portfolio Web Export',
      'Priority LLM Speed',
    ],
  },
  enterprise: {
    label: 'Enterprise B2B', priceMonthly: 299, priceAnnual: 239,
    accentClass: 'text-yellow-400',
    borderClass: 'border-yellow-600/50',
    bgClass: 'from-yellow-900/20 to-slate-900',
    badgeClass: 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/30',
    topFeatures: [
      'Bulk CV Parsing — up to 3,000/month',
      '5 Recruiter / HR Seats',
      'AI Fraud & Fluff Detector',
      'XAI & GDPR/KVKK Audit Reports',
      'Talent Pool Semantic Vector Search',
    ],
  },
};
