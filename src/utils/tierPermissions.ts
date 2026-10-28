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

import { getCheckoutUrl } from '@/lib/lemonsqueezy';
import { APPSUMO_LTD_TIERS } from '@/config/appsumo';

// ─── Core AppSumo tier type ───────────────────────────────────────────────────

export type AppSumoTier =
  | 'free'
  | 'appsumo_tier1'   // $49 LTD — 50 credits/mo
  | 'appsumo_tier2'   // $149 LTD — 200 credits/mo
  | 'appsumo_b2b'     // $299 LTD — 1,000 credits/mo + B2B + B2C extension
  | 'appsumo_tier3'   // alias of B2B / Agency LTD
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
  appsumo_tier3:  3,
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
function planRank(profile?: TierProfile | null): number {
  if (!profile) return 0;
  return TIER_RANK[profile.subscription_tier ?? '']
    ?? TIER_RANK[profile.subscription_plan ?? '']
    ?? 0;
}

export function canAccessB2BBulkScreening(profile?: TierProfile | null): boolean {
  return planRank(profile) >= 3;
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
export function canAccessAdvancedB2C(profile?: TierProfile | null): boolean {
  return planRank(profile) >= 2;
}

/**
 * Basic CV tailoring:
 *   - ATS Gap Analysis (deterministic score)
 *   - 1-Click ATS Fix (bullet rewrite via gpt-4o)
 *
 * Requires: any paid / AppSumo tier.
 */
export function canAccessBasicTailoring(profile?: TierProfile | null): boolean {
  return planRank(profile) >= 1;
}

/**
 * Convenience: checks any tier gate by name.
 */
export function canAccess(
  feature: 'basic_tailoring' | 'advanced_b2c' | 'b2b_bulk_screening',
  profile?: TierProfile | null,
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
    label:      'Starter',
    price:      APPSUMO_LTD_TIERS[0].priceUsd,
    credits:    APPSUMO_LTD_TIERS[0].monthlyCredits,
    badge:      'Starter LTD',
    color:      'text-blue-400',
    borderColor:'border-blue-500/40',
    bgColor:    'bg-blue-500/5',
    features: APPSUMO_LTD_TIERS[0].features,
    highlighted: ['Chrome extension access (B2C Mode)', 'CV & proposal generation'],
    checkoutUrl: getCheckoutUrl('tier_1'),
  },
  {
    tier:       'appsumo_tier2',
    label:      'Pro',
    price:      APPSUMO_LTD_TIERS[1].priceUsd,
    credits:    APPSUMO_LTD_TIERS[1].monthlyCredits,
    badge:      'Pro LTD — Most Popular',
    color:      'text-violet-400',
    borderColor:'border-violet-500/60',
    bgColor:    'bg-violet-500/5',
    features: APPSUMO_LTD_TIERS[1].features,
    highlighted: ['Advanced match scoring & analytics', 'Chrome extension (B2C, priority queue)'],
    checkoutUrl: getCheckoutUrl('tier_2'),
  },
  {
    tier:       'appsumo_b2b',
    label:      'B2B / Agency',
    price:      APPSUMO_LTD_TIERS[2].priceUsd,
    credits:    APPSUMO_LTD_TIERS[2].monthlyCredits,
    badge:      'Agency LTD',
    color:      'text-amber-400',
    borderColor:'border-amber-500/50',
    bgColor:    'bg-amber-500/5',
    features: APPSUMO_LTD_TIERS[2].features,
    highlighted: [
      'Full B2B + B2C Chrome extension',
      'Agency lead extraction & bulk pitch generation',
    ],
    checkoutUrl: getCheckoutUrl('tier_3'),
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
    headline:    'AppSumo Starter Activated',
    subline:     '50 Monthly Credits & Core ATS Engine',
    badge:       'Starter LTD',
    creditsLine: '50 credits / month — resets every 30 days',
    features:    ['ATS Gap Analysis', '1-Click ATS Tailoring', 'Core Application Engine'],
  },
  appsumo_tier2: {
    headline:    'AppSumo Pro Activated',
    subline:     '200 Monthly Credits + Company DNA Decoder & 6-Sec Recruiter Hook',
    badge:       'Pro LTD',
    creditsLine: '200 credits / month — resets every 30 days',
    features:    [
      'Everything in AppSumo Starter',
      'Company DNA Decoder',
      '6-Second Recruiter Hook Generator',
      'Red-Flag Neutralizer',
    ],
  },
  appsumo_tier3: {
    headline:    'AppSumo Agency Activated',
    subline:     '1,000 Credits + B2B/B2C extension, bulk pitch & candidate ranking',
    badge:       'Agency LTD',
    creditsLine: '1,000 credits / month — refreshes every month',
    features:    [
      'Everything in Pro',
      'Full B2B + B2C Chrome extension',
      'Bulk CV Screening (up to 100 CVs at once)',
      'Agency lead extraction',
    ],
  },
  appsumo_b2b: {
    headline:    'AppSumo Agency Activated',
    subline:     '1,000 Credits + B2B/B2C extension, bulk pitch & candidate ranking',
    badge:       'Agency LTD',
    creditsLine: '1,000 credits / month — refreshes every month',
    features:    [
      'Everything in AppSumo Pro',
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
