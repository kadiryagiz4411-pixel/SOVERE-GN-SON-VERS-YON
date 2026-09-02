/**
 * Unified plan → feature-flag authorization.
 * Superadmin `kadiryagiz4411@gmail.com` receives every flag.
 */
import { isOwnerEmail, isSuperAdminUser, OWNER_EMAIL } from '@/lib/superadmin';
import { planTypeToTier, TIER_RANK, type PlanTier, type FeatureKey, canAccess } from '@/lib/entitlements';

export const SUPERADMIN_EMAIL = OWNER_EMAIL;

export type PermissionTier = 'standard' | 'pro' | 'elite' | 'enterprise';

export type GuardFeature =
  | 'standard_templates'
  | 'basic_ats_score'
  | 'premium_templates'
  | 'ats_keyword_injector'
  | 'multi_language'
  | 'unlimited_cv'
  | 'unlimited_cover_letters'
  | 'interview_simulator'
  | 'freelance_pitch'
  | 'priority_llm'
  | 'portfolio_builder'
  | 'batch_cv_upload'
  | 'team_workspace'
  | 'fraud_detector'
  | 'gdpr_export'
  | 'talent_pool'
  | 'leaderboard_export';

export interface FeatureFlags {
  standardTemplates: boolean;
  basicAtsScore: boolean;
  premiumTemplates: boolean;
  atsKeywordInjector: boolean;
  multiLanguage: boolean;
  unlimitedCv: boolean;
  unlimitedCoverLetters: boolean;
  interviewSimulator: boolean;
  freelancePitch: boolean;
  priorityLlm: boolean;
  portfolioBuilder: boolean;
  batchCvUpload: boolean;
  teamWorkspace: boolean;
  fraudDetector: boolean;
  gdprExport: boolean;
  talentPool: boolean;
  leaderboardExport: boolean;
}

export const STANDARD_MONTHLY_LIMITS = {
  cvOptimizations: 5,
  coverLetters: 3,
} as const;

const GUARD_TO_FEATURE: Record<GuardFeature, FeatureKey> = {
  standard_templates: 'STANDARD_TEMPLATES',
  basic_ats_score: 'SINGLE_JOB_MATCH',
  premium_templates: 'PREMIUM_TEMPLATES',
  ats_keyword_injector: 'ATS_KEYWORD_INJECTOR',
  multi_language: 'MULTI_LANGUAGE_SUPPORT',
  unlimited_cv: 'UNLIMITED_CV_OPTIMIZE',
  unlimited_cover_letters: 'UNLIMITED_COVER_LETTER',
  interview_simulator: 'AI_INTERVIEW_SIMULATOR',
  freelance_pitch: 'FREELANCE_PITCH_GEN',
  priority_llm: 'PRIORITY_LLM_SPEED',
  portfolio_builder: 'PORTFOLIO_WEB_EXPORT',
  batch_cv_upload: 'BULK_CV_PARSER',
  team_workspace: 'MULTI_SEAT_ACCESS',
  fraud_detector: 'AI_FRAUD_DETECTOR',
  gdpr_export: 'GDPR_COMPLIANCE_EXPORT',
  talent_pool: 'TALENT_POOL_VECTOR_SEARCH',
  leaderboard_export: 'BATCH_EXPORT_CSV',
};

const ALL_FLAGS: FeatureFlags = {
  standardTemplates: true,
  basicAtsScore: true,
  premiumTemplates: true,
  atsKeywordInjector: true,
  multiLanguage: true,
  unlimitedCv: true,
  unlimitedCoverLetters: true,
  interviewSimulator: true,
  freelancePitch: true,
  priorityLlm: true,
  portfolioBuilder: true,
  batchCvUpload: true,
  teamWorkspace: true,
  fraudDetector: true,
  gdprExport: true,
  talentPool: true,
  leaderboardExport: true,
};

export function resolvePermissionTier(input: {
  email?: string | null;
  planType?: string | null;
  subscriptionTier?: string | null;
  appsumoTier?: number | null;
}): PermissionTier {
  if (isOwnerEmail(input.email)) return 'enterprise';
  const appsumo = Number(input.appsumoTier ?? 0);
  const plan = planTypeToTier(input.planType || input.subscriptionTier);
  if (plan === 'enterprise' || TIER_RANK[plan] >= TIER_RANK.enterprise) return 'enterprise';
  if (plan === 'elite' || appsumo >= 3) return 'elite';
  if (plan === 'pro' || appsumo >= 2) return 'pro';
  return 'standard';
}

export function flagsForTier(tier: PermissionTier, isSuperAdmin = false): FeatureFlags {
  if (isSuperAdmin) return { ...ALL_FLAGS };
  const elite = tier === 'elite' || tier === 'enterprise';
  const enterprise = tier === 'enterprise';
  const pro = tier === 'pro' || elite;
  return {
    standardTemplates: true,
    basicAtsScore: true,
    premiumTemplates: pro,
    atsKeywordInjector: pro,
    multiLanguage: pro,
    unlimitedCv: pro,
    unlimitedCoverLetters: pro,
    interviewSimulator: elite,
    freelancePitch: elite,
    priorityLlm: elite,
    portfolioBuilder: elite,
    batchCvUpload: enterprise,
    teamWorkspace: enterprise,
    fraudDetector: enterprise,
    gdprExport: enterprise,
    talentPool: enterprise,
    leaderboardExport: enterprise || elite,
  };
}

export function getFeatureFlags(input: {
  email?: string | null;
  user?: { email?: string | null } | null;
  planType?: string | null;
  subscriptionTier?: string | null;
  appsumoTier?: number | null;
}): FeatureFlags {
  const email = input.email ?? input.user?.email;
  const admin = isOwnerEmail(email) || isSuperAdminUser(input.user) || email === SUPERADMIN_EMAIL;
  return flagsForTier(resolvePermissionTier({ ...input, email }), admin);
}

export function canUseGuardFeature(feature: GuardFeature, flags: FeatureFlags): boolean {
  const map: Record<GuardFeature, keyof FeatureFlags> = {
    standard_templates: 'standardTemplates',
    basic_ats_score: 'basicAtsScore',
    premium_templates: 'premiumTemplates',
    ats_keyword_injector: 'atsKeywordInjector',
    multi_language: 'multiLanguage',
    unlimited_cv: 'unlimitedCv',
    unlimited_cover_letters: 'unlimitedCoverLetters',
    interview_simulator: 'interviewSimulator',
    freelance_pitch: 'freelancePitch',
    priority_llm: 'priorityLlm',
    portfolio_builder: 'portfolioBuilder',
    batch_cv_upload: 'batchCvUpload',
    team_workspace: 'teamWorkspace',
    fraud_detector: 'fraudDetector',
    gdpr_export: 'gdprExport',
    talent_pool: 'talentPool',
    leaderboard_export: 'leaderboardExport',
  };
  return flags[map[feature]];
}

export function guardFeatureToKey(feature: GuardFeature): FeatureKey {
  return GUARD_TO_FEATURE[feature];
}

export function canAccessFeatureKey(
  featureKey: FeatureKey,
  input: { email?: string | null; user?: { email?: string | null } | null; planTier?: PlanTier; appsumoTier?: number | null; planType?: string | null },
): boolean {
  if (isOwnerEmail(input.email) || isSuperAdminUser(input.user) || input.user?.email === SUPERADMIN_EMAIL) {
    return true;
  }
  const flags = getFeatureFlags(input);
  const entry = (Object.entries(GUARD_TO_FEATURE) as Array<[GuardFeature, FeatureKey]>).find(([, key]) => key === featureKey);
  if (entry) return canUseGuardFeature(entry[0], flags);
  const tier = resolvePermissionTier(input);
  const planTier: PlanTier = tier === 'enterprise' ? 'enterprise' : tier === 'elite' ? 'elite' : tier === 'pro' ? 'pro' : 'standard';
  return canAccess(planTier, featureKey);
}

export function monthlyUsageKey(userId: string, kind: 'cv' | 'cover'): string {
  const ym = new Date().toISOString().slice(0, 7);
  return `sovereign:usage:${userId}:${kind}:${ym}`;
}

export function readMonthlyUsage(userId: string, kind: 'cv' | 'cover'): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(monthlyUsageKey(userId, kind)) ?? 0);
}

export function bumpMonthlyUsage(userId: string, kind: 'cv' | 'cover'): number {
  const next = readMonthlyUsage(userId, kind) + 1;
  localStorage.setItem(monthlyUsageKey(userId, kind), String(next));
  return next;
}

export function canConsumeStandardQuota(input: {
  userId: string;
  email?: string | null;
  kind: 'cv' | 'cover';
  flags: FeatureFlags;
}): { ok: boolean; used: number; limit: number } {
  if (input.flags.unlimitedCv && input.kind === 'cv') {
    return { ok: true, used: 0, limit: Number.POSITIVE_INFINITY };
  }
  if (input.flags.unlimitedCoverLetters && input.kind === 'cover') {
    return { ok: true, used: 0, limit: Number.POSITIVE_INFINITY };
  }
  if (isOwnerEmail(input.email)) {
    return { ok: true, used: 0, limit: Number.POSITIVE_INFINITY };
  }
  const limit = input.kind === 'cv' ? STANDARD_MONTHLY_LIMITS.cvOptimizations : STANDARD_MONTHLY_LIMITS.coverLetters;
  const used = readMonthlyUsage(input.userId, input.kind);
  return { ok: used < limit, used, limit };
}
