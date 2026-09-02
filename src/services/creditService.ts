/**
 * creditService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Monthly credit management engine for Sovereign.
 *
 * Handles:
 *  - AppSumo LTD monthly credit checks (remaining_credits / monthly_credit_limit)
 *  - Lazy credit reset when credit_reset_date has passed
 *  - Annual plans: remaining_credits + monthly_credit_limit (capped at 2× limit)
 *  - Monthly plans: unused credits expire (overwrite remaining_credits)
 *  - Paused subscriptions: remaining credits are frozen, not reset
 *  - Credit deduction before AI workflow execution
 *  - Out-of-credits state signalling
 */

import { supabase } from '@/integrations/supabase/client';
import { COST_PER_ACTION, creditUsagePercentage } from '@/lib/credits';
import { fetchProfileByAuthId, resetMonthlyCreditsIfDue } from '@/lib/profileQuery';
import { isOwnerEmail, OWNER_PRIVILEGES } from '@/lib/superadmin';

export { COST_PER_ACTION };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreditStatus {
  remainingCredits: number;
  monthlyLimit: number;
  resetDate: Date | null;
  subscriptionTier: string;
  /** True when credits are exhausted */
  isExhausted: boolean;
  /** 0–100 percentage of credits remaining */
  usagePct: number;
  /** Visual colour token for UI indicators */
  colorClass: 'text-emerald-400' | 'text-amber-400' | 'text-red-400';
  appsumoTier: number;
  isByokUnlimited: boolean;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  newTier?: string;
  monthlyLimit?: number;
  /** Raw tier string from the redeemed code ('tier1'|'tier2'|'b2b_tier') */
  codeTier?: string;
}

// ─── Fetch current credit status ──────────────────────────────────────────────

/**
 * Fetches the user's monthly credit state from Supabase,
 * triggering a lazy reset via RPC if the reset date has passed.
 */
export async function fetchCreditStatus(userId: string): Promise<CreditStatus | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (isOwnerEmail(auth.user?.email)) {
      return {
        remainingCredits: OWNER_PRIVILEGES.credits_remaining,
        monthlyLimit: OWNER_PRIVILEGES.monthly_credit_limit,
        resetDate: null,
        subscriptionTier: 'appsumo_tier3',
        isExhausted: false,
        usagePct: 100,
        colorClass: 'text-emerald-400',
        appsumoTier: OWNER_PRIVILEGES.appsumo_tier,
        isByokUnlimited: true,
      };
    }

    // Trigger lazy reset first (no-op if not due). Never fail the UI if RPC is missing.
    await resetMonthlyCreditsIfDue(userId);

    const { data, error } = await fetchProfileByAuthId<{
      remaining_credits?: number;
      credits_remaining?: number;
      monthly_credit_limit?: number;
      credit_reset_date?: string | null;
      credits_reset_at?: string | null;
      subscription_tier?: string;
      appsumo_tier?: number;
      appsumo_codes_count?: number;
      byok_unlocked?: boolean;
      encrypted_openai_key?: string;
      custom_openai_key?: string;
    }>(userId, 'remaining_credits, credits_remaining, monthly_credit_limit, credit_reset_date, credits_reset_at, subscription_tier, appsumo_tier, appsumo_codes_count, byok_unlocked, encrypted_openai_key, custom_openai_key');

    if (error || !data) return null;

    const remaining = (data as any).credits_remaining ?? (data as any).remaining_credits ?? 0;
    const limit     = (data as any).monthly_credit_limit || 400;
    const usagePct  = creditUsagePercentage(remaining, limit);
    const appsumoTier = Number((data as any).appsumo_tier ?? (data as any).appsumo_codes_count ?? 0);
    const hasKey = Boolean(String((data as any).encrypted_openai_key ?? (data as any).custom_openai_key ?? '').trim());
    const isByokUnlimited = appsumoTier >= 3 && (Boolean((data as any).byok_unlocked) || hasKey);

    return {
      remainingCredits: remaining,
      monthlyLimit:     limit,
      resetDate:        ((data as any).credits_reset_at || (data as any).credit_reset_date)
        ? new Date((data as any).credits_reset_at || (data as any).credit_reset_date)
        : null,
      subscriptionTier: (data as any).subscription_tier ?? 'free',
      isExhausted:      !isByokUnlimited && remaining <= 0,
      usagePct,
      colorClass:
        remaining <= 0          ? 'text-red-400'
        : usagePct <= 20        ? 'text-amber-400'
        : 'text-emerald-400',
      appsumoTier,
      isByokUnlimited,
    };
  } catch {
    return null;
  }
}

// ─── Credit check (read-only) ─────────────────────────────────────────────────

/**
 * Returns true when the user has at least `amount` credits available.
 * Triggers a lazy reset before checking.
 */
export async function hasEnoughCredits(userId: string, amount = COST_PER_ACTION): Promise<boolean> {
  const status = await fetchCreditStatus(userId);
  if (!status) return false;
  return status.remainingCredits >= amount;
}

// ─── Credit deduction ─────────────────────────────────────────────────────────

export interface DeductResult {
  success: boolean;
  remaining: number;
  reason?: 'insufficient' | 'db_error';
}

/**
 * Atomically deducts credits via the `deduct_monthly_credit` RPC.
 * Always call `hasEnoughCredits` first (or catch the failure here).
 */
export async function deductCredit(userId: string, amount = COST_PER_ACTION): Promise<DeductResult> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (isOwnerEmail(auth.user?.email)) {
      return { success: true, remaining: OWNER_PRIVILEGES.credits_remaining };
    }

    const { data, error } = await supabase.rpc('deduct_monthly_credit', {
      user_id_input: userId,
      amount_input:  amount,
    });

    if (error) return { success: false, remaining: 0, reason: 'db_error' };
    if (!data)  return { success: false, remaining: 0, reason: 'insufficient' };

    // Fetch updated balance
    const status = await fetchCreditStatus(userId);
    return { success: true, remaining: status?.remainingCredits ?? 0 };
  } catch {
    return { success: false, remaining: 0, reason: 'db_error' };
  }
}

// ─── BYOK & AppSumo enforcement ──────────────────────────────────────────────

export interface ByokStatus {
  /** True when credits should be bypassed entirely */
  isByokActive: boolean;
  /** The resolved OpenAI key to use (custom key or platform key) */
  apiKey: string;
  /** Where the key came from */
  source: 'custom_key' | 'byok_unlocked' | 'dev_simulate' | 'platform';
}

/**
 * Resolves BYOK status for a user.
 * Priority:
 *   1. Dev sandbox simulation (localStorage dev_byok_simulate=true)
 *   2. profile.custom_openai_key present
 *   3. profile.byok_unlocked === true (granted by 3+ AppSumo code stacking)
 *   4. Platform VITE_OPENAI_API_KEY (credits apply)
 */
export async function resolveByokStatus(userId: string): Promise<ByokStatus> {
  const { data: auth } = await supabase.auth.getUser();
  const platformKey = (import.meta.env as Record<string, string>).VITE_OPENAI_API_KEY ?? '';
  if (isOwnerEmail(auth.user?.email)) {
    return { isByokActive: true, apiKey: platformKey, source: 'byok_unlocked' };
  }

  // Dev sandbox override
  if (
    (import.meta.env.DEV || new URLSearchParams(window.location.search).get('dev_mode') === 'true')
    && localStorage.getItem('dev_byok_simulate') === 'true'
  ) {
    return { isByokActive: true, apiKey: platformKey, source: 'dev_simulate' };
  }

  try {
    const { data } = await fetchProfileByAuthId<{
      custom_openai_key?: string;
      byok_unlocked?: boolean;
    }>(userId, 'custom_openai_key, byok_unlocked');

    const customKey = (data as { custom_openai_key?: string } | null)?.custom_openai_key?.trim();
    const byokFlag  = (data as { byok_unlocked?: boolean } | null)?.byok_unlocked ?? false;

    if (customKey) {
      return { isByokActive: true, apiKey: customKey, source: 'custom_key' };
    }
    if (byokFlag) {
      // byok_unlocked but no custom key yet — still bypass credits, use platform key
      return { isByokActive: true, apiKey: platformKey, source: 'byok_unlocked' };
    }
  } catch { /* fall through */ }

  return { isByokActive: false, apiKey: platformKey, source: 'platform' };
}

/**
 * Deducts credits OR short-circuits when BYOK is active.
 * Use this instead of `deductCredit` in all AI generation flows.
 */
export async function deductCreditOrBypass(
  userId: string,
  amount = COST_PER_ACTION,
): Promise<DeductResult & { bypassedViaByok: boolean }> {
  const { data: auth } = await supabase.auth.getUser();
  if (isOwnerEmail(auth.user?.email)) {
    return { success: true, remaining: OWNER_PRIVILEGES.credits_remaining, bypassedViaByok: true };
  }
  const byok = await resolveByokStatus(userId);
  if (byok.isByokActive) {
    return { success: true, remaining: -1, bypassedViaByok: true };
  }
  const result = await deductCredit(userId, amount);
  return { ...result, bypassedViaByok: false };
}

// ─── AppSumo code redemption ──────────────────────────────────────────────────

const REDEEM_MESSAGES: Record<string, string> = {
  ok:               'AppSumo code activated! Your monthly credits are now live.',
  invalid_code:     'Invalid code. Please check for typos and try again.',
  already_redeemed: 'This code has already been used by another account.',
  already_has_plan: 'You already have an active paid plan.',
  disabled:         'This code has been disabled. Please contact AppSumo support.',
};

export async function redeemAppSumoCode(
  code: string,
  userId: string,
): Promise<RedeemResult> {
  try {
    const { data, error } = await supabase.rpc('redeem_appsumo_code', {
      code_input:      code.trim().toUpperCase(),
      user_id_input:   userId,
    });

    if (error) {
      return { success: false, message: 'Something went wrong. Please try again.' };
    }

    const status = (data as string) ?? 'invalid_code';
    const success = status === 'ok';

    if (success) {
      const creditStatus = await fetchCreditStatus(userId);
      return {
        success: true,
        message: REDEEM_MESSAGES.ok,
        newTier:     creditStatus?.subscriptionTier,
        monthlyLimit: creditStatus?.monthlyLimit,
      };
    }

    return {
      success: false,
      message: REDEEM_MESSAGES[status] ?? 'Unexpected error. Please contact support.',
    };
  } catch {
    return { success: false, message: 'Network error. Please check your connection.' };
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/** Returns human-readable days-until-reset string. */
export function daysUntilReset(resetDate: Date | null): string {
  if (!resetDate) return '30 days';
  const ms = resetDate.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return days === 1 ? '1 day' : `${days} days`;
}

/** Tier display label. */
export function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    free:           'Free',
    appsumo_tier1:  'AppSumo Tier 1 ($49 LTD)',
    appsumo_tier2:  'AppSumo Tier 2 ($99 LTD)',
    appsumo_b2b:    'AppSumo B2B Tier ($149 LTD)',
    // Legacy aliases kept for backward compat
    appsumo_tier3:  'AppSumo B2B Tier ($149 LTD)',
    pro_monthly:    'Pro Monthly',
    enterprise:     'Enterprise',
    standard:       'Standard',
    pro:            'Pro',
    elite:          'Elite',
    B2B_ENTERPRISE: 'Enterprise B2B',
  };
  return map[tier] ?? tier;
}
