/**
 * Core AI execution wrapper: monthly credit reset, AppSumo gates, BYOK routing.
 */
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId, resetMonthlyCreditsIfDue, profileByAuthId } from '@/lib/profileQuery';
import { APPSUMO_MONTHLY_CREDITS } from '@/config/appsumo';
import { deductCredit, COST_PER_ACTION } from '@/services/creditService';
import {
  assertFeatureAccess,
  numericAppSumoTier,
  type AppSumoFeature,
} from '@/lib/appsumoGating';
import { isOwnerEmail, OWNER_PRIVILEGES } from '@/lib/superadmin';
import { resolveOpenAIKey } from '@/lib/apiKeyResolver';

export class CreditLimitError extends Error {
  status = 402;
  constructor(message = 'Credit limit reached. Upgrade to AppSumo Agency for unlimited BYOK.') {
    super(message);
    this.name = 'CreditLimitError';
  }
}

export class FeatureForbiddenError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'FeatureForbiddenError';
  }
}

export interface EngineProfile {
  appsumoTier: number;
  remaining: number;
  monthlyLimit: number;
  byokUnlocked: boolean;
  openaiKey: string | null;
  paused: boolean;
}

export async function loadEngineProfile(userId: string): Promise<EngineProfile> {
  await resetMonthlyCreditsIfDue(userId);
  const { data } = await fetchProfileByAuthId(userId,
    'appsumo_tier, appsumo_codes_count, appsumo_plan, plan_type, plan_tier, subscription_tier, subscription_plan, is_appsumo, remaining_credits, credits_remaining, credits_limit, monthly_credit_limit, encrypted_openai_key, subscription_status',
  );
  const row = (data ?? {}) as Record<string, unknown>;
  const remaining = Number(row.credits_remaining ?? row.remaining_credits ?? 0);
  const key = String(row.encrypted_openai_key ?? '').trim() || null;
  const license = numericAppSumoTier(row);
  const storedLimit = Number(row.credits_limit ?? row.monthly_credit_limit ?? 0);
  return {
    appsumoTier: license,
    remaining,
    monthlyLimit: Number.isFinite(storedLimit) && storedLimit > 0 ? storedLimit : 0,
    byokUnlocked: license >= 3 && Boolean(key),
    openaiKey: key,
    paused: row.subscription_status === 'paused',
  };
}

export function isByokActive(profile: EngineProfile): boolean {
  return profile.appsumoTier >= 3 && Boolean(profile.openaiKey);
}

export async function prepareAiExecution(
  userId: string,
  feature: AppSumoFeature = 'ats_optimize',
): Promise<EngineProfile> {
  const { data: auth } = await supabase.auth.getUser();
  if (isOwnerEmail(auth.user?.email)) {
    const loaded = await loadEngineProfile(userId).catch(() => null);
    return {
      appsumoTier: OWNER_PRIVILEGES.appsumo_tier,
      remaining: OWNER_PRIVILEGES.credits_remaining,
      monthlyLimit: OWNER_PRIVILEGES.monthly_credit_limit,
      byokUnlocked: true,
      openaiKey: loaded?.openaiKey ?? null,
      paused: false,
    };
  }
  const profile = await loadEngineProfile(userId);
  if (profile.paused) {
    throw new FeatureForbiddenError('Account is paused. Unpause to run AI actions.');
  }
  try {
    assertFeatureAccess(profile.appsumoTier, feature);
  } catch (err) {
    throw new FeatureForbiddenError(err instanceof Error ? err.message : 'Forbidden');
  }
  if (isByokActive(profile)) return profile;
  if (profile.remaining <= 0) throw new CreditLimitError();
  return profile;
}

/**
 * Run an AI action: reset credits, enforce gates, bypass deduct for Tier 3 + key.
 * Deducts COST_PER_ACTION only after `execute` resolves successfully.
 */
export async function runAiAction<T>(options: {
  userId: string;
  feature?: AppSumoFeature;
  execute: (ctx: { apiKey: string | null; byok: boolean; profile: EngineProfile }) => Promise<T>;
  creditCost?: number;
}): Promise<{ result: T; byok: boolean; remaining: number }> {
  const { data: auth } = await supabase.auth.getUser();
  const owner = isOwnerEmail(auth.user?.email);
  const profile = await prepareAiExecution(options.userId, options.feature ?? 'ats_optimize');
  const byok = owner || isByokActive(profile);
  const apiKey = resolveOpenAIKey(profile.openaiKey);

  const result = await options.execute({ apiKey, byok, profile });

  if (owner || byok) {
    return { result, byok: true, remaining: OWNER_PRIVILEGES.credits_remaining };
  }
  const cost = options.creditCost
    ?? (profile.appsumoTier >= 1 && profile.appsumoTier < 3 ? 1 : COST_PER_ACTION);
  const deduct = await deductCredit(options.userId, cost);
  if (!deduct.success) throw new CreditLimitError();
  return { result, byok: false, remaining: deduct.remaining };
}

export async function setAccountPaused(userId: string, paused: boolean): Promise<void> {
  await profileByAuthId(
    supabase.from('profiles').update({
      subscription_status: paused ? 'paused' : 'active',
      updated_at: new Date().toISOString(),
    } as never),
    userId,
  );
}

export async function saveEncryptedOpenAiKey(userId: string, key: string | null): Promise<void> {
  const value = key?.trim() || null;
  await profileByAuthId(
    supabase.from('profiles').update({
      encrypted_openai_key: value,
      updated_at: new Date().toISOString(),
    } as never),
    userId,
  );
}

const DEV_TIER_LIMITS: Record<1 | 2 | 3, number> = {
  1: APPSUMO_MONTHLY_CREDITS[1],
  2: APPSUMO_MONTHLY_CREDITS[2],
  3: APPSUMO_MONTHLY_CREDITS[3],
};

/** Development-only: persist AppSumo numeric tier and refresh UI. */
export async function applyDevAppsumoTier(userId: string, tier: 1 | 2 | 3): Promise<void> {
  const limit = DEV_TIER_LIMITS[tier];
  const planTier = tier === 3 ? 'agency' : tier === 2 ? 'pro' : 'starter';
  const subscriptionTier = tier === 3 ? 'appsumo_b2b' : `appsumo_tier${tier}`;
  await profileByAuthId(
    supabase.from('profiles').update({
      appsumo_tier: tier,
      appsumo_codes_count: tier,
      is_appsumo: true,
      plan_tier: planTier,
      tier: planTier,
      credits_limit: limit,
      monthly_credit_limit: limit,
      remaining_credits: limit,
      credits_remaining: limit,
      credits_balance: limit,
      credits: limit,
      subscription_tier: subscriptionTier,
      plan_type: subscriptionTier,
      b2b_access: tier >= 3,
      apply_queue_access: tier >= 2,
      updated_at: new Date().toISOString(),
    } as never),
    userId,
  );
  window.dispatchEvent(new Event('sovereign:profile-updated'));
}
