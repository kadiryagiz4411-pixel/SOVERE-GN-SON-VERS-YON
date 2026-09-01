/**
 * Core AI execution wrapper: monthly credit reset, AppSumo gates, BYOK routing.
 */
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId, resetMonthlyCreditsIfDue, profileByAuthId } from '@/lib/profileQuery';
import { deductCredit, COST_PER_ACTION } from '@/services/creditService';
import {
  assertFeatureAccess,
  numericAppSumoTier,
  type AppSumoFeature,
} from '@/lib/appsumoGating';

export class CreditLimitError extends Error {
  status = 402;
  constructor(message = 'Credit limit reached. Upgrade to Tier 3 for Unlimited BYOK mode') {
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
    'appsumo_tier, appsumo_codes_count, remaining_credits, credits_remaining, monthly_credit_limit, byok_unlocked, custom_openai_key, encrypted_openai_key, is_account_paused, subscription_status, subscription_tier',
  );
  const row = (data ?? {}) as Record<string, unknown>;
  const remaining = Number(row.credits_remaining ?? row.remaining_credits ?? 0);
  const key = String(row.encrypted_openai_key ?? row.custom_openai_key ?? '').trim() || null;
  return {
    appsumoTier: numericAppSumoTier(row),
    remaining,
    monthlyLimit: Number(row.monthly_credit_limit ?? 100),
    byokUnlocked: Boolean(row.byok_unlocked) || Number(row.appsumo_tier ?? 0) >= 3,
    openaiKey: key,
    paused: Boolean(row.is_account_paused) || row.subscription_status === 'paused',
  };
}

export function isByokActive(profile: EngineProfile): boolean {
  return profile.appsumoTier >= 3 && Boolean(profile.openaiKey);
}

export async function prepareAiExecution(
  userId: string,
  feature: AppSumoFeature = 'ats_optimize',
): Promise<EngineProfile> {
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
  const profile = await prepareAiExecution(options.userId, options.feature ?? 'ats_optimize');
  const byok = isByokActive(profile);
  const platformKey =
    (typeof import.meta !== 'undefined'
      ? (import.meta.env as Record<string, string>).VITE_OPENAI_API_KEY
      : '') || '';
  const apiKey = byok ? profile.openaiKey : (profile.openaiKey || platformKey);

  const result = await options.execute({ apiKey, byok, profile });

  if (!byok) {
    const cost = options.creditCost ?? COST_PER_ACTION;
    const deduct = await deductCredit(options.userId, cost);
    if (!deduct.success) throw new CreditLimitError();
    return { result, byok: false, remaining: deduct.remaining };
  }
  return { result, byok: true, remaining: profile.remaining };
}

export async function setAccountPaused(userId: string, paused: boolean): Promise<void> {
  await profileByAuthId(
    supabase.from('profiles').update({
      is_account_paused: paused,
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
      custom_openai_key: value,
      updated_at: new Date().toISOString(),
    } as never),
    userId,
  );
}
