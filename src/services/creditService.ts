/**
 * creditService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Monthly credit management engine for Sovereign.
 *
 * Handles:
 *  - AppSumo LTD monthly credit checks (remaining_credits / monthly_credit_limit)
 *  - Lazy credit reset when credit_reset_date has passed
 *  - Credit deduction before AI workflow execution
 *  - Out-of-credits state signalling
 */

import { supabase } from '@/integrations/supabase/client';

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
    // Trigger lazy reset first (no-op if not due)
    await supabase.rpc('reset_monthly_credits_if_due', { user_id_input: userId });

    const { data, error } = await supabase
      .from('profiles')
      .select('remaining_credits, monthly_credit_limit, credit_reset_date, subscription_tier')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    const remaining = (data as any).remaining_credits ?? 50;
    const limit     = (data as any).monthly_credit_limit ?? 50;
    const usagePct  = limit > 0 ? Math.round((remaining / limit) * 100) : 0;

    return {
      remainingCredits: remaining,
      monthlyLimit:     limit,
      resetDate:        (data as any).credit_reset_date ? new Date((data as any).credit_reset_date) : null,
      subscriptionTier: (data as any).subscription_tier ?? 'free',
      isExhausted:      remaining <= 0,
      usagePct,
      colorClass:
        remaining <= 0          ? 'text-red-400'
        : usagePct <= 20        ? 'text-amber-400'
        : 'text-emerald-400',
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
export async function hasEnoughCredits(userId: string, amount = 1): Promise<boolean> {
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
export async function deductCredit(userId: string, amount = 1): Promise<DeductResult> {
  try {
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
