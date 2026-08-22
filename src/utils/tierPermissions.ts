/**
 * tierPermissions.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * AppSumo multi-tier feature-gating for Sovereign.
 *
 * Tier hierarchy (rank):
 *   free (0) < appsumo_tier1 (1) < appsumo_tier2 (2) < appsumo_b2b (3) < enterprise (4)
 *
 * Registered subscription plans that map into AppSumo tiers:
 *   - Legacy paid plans (pro, elite, standard) map to ≥ tier2 capabilities
 *   - B2B_ENTERPRISE maps to appsumo_b2b
 */

// ─── Core AppSumo tier type ───────────────────────────────────────────────────

export type AppSumoTier =
  | 'free'
  | 'appsumo_tier1'   // $49 LTD — 50 credits/mo
  | 'appsumo_tier2'   // $99 LTD — 200 credits/mo
  | 'appsumo_b2b'     // $149 LTD — 1,000 credits/mo + B2B features
  | 'enterprise';     // Full enterprise (internal/sales)

/** All recognised subscription_tier / subscription_plan values → AppSumoTier rank */
const TIER_RANK: Record<string, number> = {
  free:           0,
  // AppSumo tiers
  appsumo_tier1:  1,
  // Legacy standard / single_pass map to tier1 capability
  standard:       1,
  single_pass:    1,
  appsumo_tier2:  2,
  // Legacy pro / elite map to tier2 capability
  pro:            2,
  elite:          2,
  // B2B tiers
  appsumo_b2b:    3,
  B2B_ENTERPRISE: 3,
  enterprise:     4,
};

/** Normalise any profile tier/plan string to an AppSumoTier. */
export function resolveAppSumoTier(
  subscriptionTier?: string | null,
  subscriptionPlan?: string | null,
): AppSumoTier {
  const raw = subscriptionTier ?? subscriptionPlan ?? 'free';
  const rank = TIER_RANK[raw] ?? 0;

  if (rank >= 4) return 'enterprise';
  if (rank >= 3) return 'appsumo_b2b';
  if (rank >= 2) return 'appsumo_tier2';
  if (rank >= 1) return 'appsumo_tier1';
  return 'free';
}

// ─── Profile shape (minimal subset needed for permission checks) ──────────────

export interface TierProfile {
  subscription_tier?: string | null;
  subscription_plan?: string | null;
}

// ─── Feature gates ────────────────────────────────────────────────────────────

/**
 * B2B Bulk Screening: 100-CV drag-and-drop uploader + ranked applicant table
 * + bulk rejection emailer.
 *
 * Requires: appsumo_b2b or enterprise.
 */
export function canAccessB2BBulkScreening(profile: TierProfile): boolean {
  const rank = TIER_RANK[profile.subscription_tier ?? '']
    ?? TIER_RANK[profile.subscription_plan ?? '']
    ?? 0;
  return rank >= 3; // appsumo_b2b or higher
}

/**
 * Advanced B2C features:
 *   - Company DNA Decoder
 *   - 6-Second Recruiter Hook
 *   - Red-Flag Neutralizer
 *   - AI ATS Narrative (gpt-4o-mini gap narrative)
 *
 * Requires: appsumo_tier2, appsumo_b2b, or enterprise.
 */
export function canAccessAdvancedB2C(profile: TierProfile): boolean {
  const rank = TIER_RANK[profile.subscription_tier ?? '']
    ?? TIER_RANK[profile.subscription_plan ?? '']
    ?? 0;
  return rank >= 2; // tier2 or higher
}

/**
 * Basic CV tailoring:
 *   - ATS Gap Analysis (deterministic score)
 *   - 1-Click ATS Fix (bullet rewrite via gpt-4o)
 *
 * Requires: any paid / AppSumo tier.
 */
export function canAccessBasicTailoring(profile: TierProfile): boolean {
  const rank = TIER_RANK[profile.subscription_tier ?? '']
    ?? TIER_RANK[profile.subscription_plan ?? '']
    ?? 0;
  return rank >= 1; // tier1 or higher
}

/**
 * Convenience: checks any tier gate by name.
 */
export function canAccess(
  feature: 'basic_tailoring' | 'advanced_b2c' | 'b2b_bulk_screening',
  profile: TierProfile,
): boolean {
  switch (feature) {
    case 'basic_tailoring':      return canAccessBasicTailoring(profile);
    case 'advanced_b2c':         return canAccessAdvancedB2C(profile);
    case 'b2b_bulk_screening':   return canAccessB2BBulkScreening(profile);
  }
}

// ─── Tier metadata (for UI display) ──────────────────────────────────────────

export interface AppSumoTierConfig {
  tier:           AppSumoTier;
  label:          string;
  price:          number;           // one-time USD
  credits:        number;           // monthly
  badge:          string;
  color:          string;           // Tailwind text colour
  borderColor:    string;           // Tailwind border colour
  bgColor:        string;           // Tailwind bg colour
  features:       string[];
  highlighted?:   string[];         // Feature labels to bold
  checkoutUrl:    string;
}

export const APPSUMO_TIER_CONFIGS: AppSumoTierConfig[] = [
  {
    tier:       'appsumo_tier1',
    label:      'Tier 1',
    price:      49,
    credits:    50,
    badge:      'Starter LTD',
    color:      'text-blue-400',
    borderColor:'border-blue-500/40',
    bgColor:    'bg-blue-500/5',
    features: [
      '50 AI credits / month (lifetime)',
      'ATS Gap Analysis & Match Score',
      '1-Click ATS Tailoring (bullet rewrite)',
      'Core Proposal & Cover Letter Engine',
      'PDF & plain-text export',
      'Credits auto-reset every 30 days',
    ],
    highlighted: ['ATS Gap Analysis & Match Score', '1-Click ATS Tailoring (bullet rewrite)'],
    checkoutUrl: import.meta.env.VITE_APPSUMO_TIER1_URL ?? '#',
  },
  {
    tier:       'appsumo_tier2',
    label:      'Tier 2',
    price:      99,
    credits:    200,
    badge:      'Pro LTD  — Most Popular',
    color:      'text-violet-400',
    borderColor:'border-violet-500/60',
    bgColor:    'bg-violet-500/5',
    features: [
      '200 AI credits / month (lifetime)',
      'Everything in Tier 1',
      'Company DNA Decoder',
      '6-Second Recruiter Hook Generator',
      'Red-Flag Neutralizer',
      'AI ATS Narrative gap analysis (GPT-4o-mini)',
      'Multi-language CV support',
      'ATS Score trend history',
    ],
    highlighted: ['Company DNA Decoder', '6-Second Recruiter Hook Generator', 'Red-Flag Neutralizer'],
    checkoutUrl: import.meta.env.VITE_APPSUMO_TIER2_URL ?? '#',
  },
  {
    tier:       'appsumo_b2b',
    label:      'B2B Tier',
    price:      149,
    credits:    1000,
    badge:      'B2B Powerhouse',
    color:      'text-amber-400',
    borderColor:'border-amber-500/50',
    bgColor:    'bg-amber-500/5',
    features: [
      '1,000 AI credits / month (lifetime)',
      'Everything in Tier 2',
      'Bulk CV Screening (up to 100 PDFs at once)',
      'Ranked Applicant Table with ATS scores',
      'Bulk Rejection Email Generator',
      'Candidate status labels: Interview / Hold / Reject',
      'CSV export of ranked results',
      'B2B Dashboard access',
    ],
    highlighted: [
      'Bulk CV Screening (up to 100 PDFs at once)',
      'Ranked Applicant Table with ATS scores',
      'Bulk Rejection Email Generator',
    ],
    checkoutUrl: import.meta.env.VITE_APPSUMO_B2B_URL ?? '#',
  },
];

/** Look up config by tier string */
export function getTierConfig(tier: string): AppSumoTierConfig | undefined {
  const resolved = resolveAppSumoTier(tier);
  return APPSUMO_TIER_CONFIGS.find(c => c.tier === resolved);
}

// ─── Tier-specific success messages (for Redeem page) ────────────────────────

export interface TierActivationMessage {
  headline:    string;
  subline:     string;
  badge:       string;
  creditsLine: string;
  features:    string[];
}

export const TIER_ACTIVATION_MESSAGES: Record<string, TierActivationMessage> = {
  appsumo_tier1: {
    headline:    'Tier 1 Activated!',
    subline:     '50 Monthly Credits & Core ATS Engine',
    badge:       'Starter LTD',
    creditsLine: '50 credits / month — resets every 30 days',
    features:    ['ATS Gap Analysis', '1-Click ATS Tailoring', 'Core Application Engine'],
  },
  appsumo_tier2: {
    headline:    'Tier 2 Activated!',
    subline:     '200 Monthly Credits + Company DNA Decoder & 6-Sec Recruiter Hook',
    badge:       'Pro LTD',
    creditsLine: '200 credits / month — resets every 30 days',
    features:    [
      'Everything in Tier 1',
      'Company DNA Decoder',
      '6-Second Recruiter Hook Generator',
      'Red-Flag Neutralizer',
    ],
  },
  appsumo_b2b: {
    headline:    'B2B $149 Tier Activated!',
    subline:     '1,000 Credits + 100-PDF Bulk Screening & Candidate Ranking Suite',
    badge:       'B2B Powerhouse',
    creditsLine: '1,000 credits / month — resets every 30 days',
    features:    [
      'Everything in Tier 2',
      'Bulk CV Screening (up to 100 CVs at once)',
      'Ranked Applicant Table',
      'Bulk Rejection Email Generator',
    ],
  },
};

/** Fallback message when tier is unknown */
export const DEFAULT_ACTIVATION_MESSAGE: TierActivationMessage = {
  headline:    'AppSumo Code Activated!',
  subline:     'Your lifetime deal is now live.',
  badge:       'LTD Active',
  creditsLine: 'Credits / month — resets every 30 days',
  features:    ['AI credits', 'Core features unlocked'],
};
