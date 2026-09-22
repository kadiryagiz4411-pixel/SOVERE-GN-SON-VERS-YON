/**
 * src/lib/tierPermissions.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all tier limits, feature gating, and bypass rules.
 *
 * Rule: a user has UNLIMITED ACCESS and MUST BYPASS ALL CREDIT CHECKS if ANY of:
 *   1. Email is kadiryagiz4411@gmail.com (owner / superadmin).
 *   2. profile.is_superadmin === true.
 *   3. profile.tier is 'unlimited' | 'superadmin' | 'enterprise' | 'appsumo_tier3' | 'B2B_ENTERPRISE'.
 *   4. isBYOKActive === true (user is providing their own OpenAI API key).
 *   5. SessionContext reports isByokUnlimited or hasBYOKAccess (Tier-3 AppSumo).
 *
 * HOW TO USE:
 *   const unlimited = isUnlimitedUser(user?.email, profile, isByokUnlimited || hasBYOKAccess);
 *   if (!unlimited && !hasActionCredits(balance)) { showCreditsModal(); return; }
 */

import { OWNER_EMAIL } from '@/lib/superadmin';
import { hasByokKey } from '@/services/aiService';

// ─── Unlimited tier identifiers ────────────────────────────────────────────────

const UNLIMITED_TIERS: ReadonlySet<string> = new Set([
  'unlimited',
  'superadmin',
  'enterprise',
  'appsumo_tier3',
  'b2b_enterprise',
  'appsumo_b2b',
]);

// ─── Core bypass predicate ────────────────────────────────────────────────────

/**
 * Returns `true` when the user must bypass ALL credit checks.
 *
 * @param email          User's email address (from Supabase auth or profile).
 * @param profile        Optional profile row — checked for is_superadmin / tier flags.
 * @param sessionBypass  True when SessionContext reports isByokUnlimited or hasBYOKAccess.
 */
export function isUnlimitedUser(
  email: string | null | undefined,
  profile?: {
    is_superadmin?: boolean | null;
    tier?: string | null;
    subscription_plan?: string | null;
    subscription_tier?: string | null;
    plan_type?: string | null;
    appsumo_tier?: number | null;
  } | null,
  sessionBypass = false,
): boolean {
  // 1. Owner email
  if ((email ?? '').trim().toLowerCase() === OWNER_EMAIL) return true;

  // 2. Browser-stored BYOK key (Profile → BYOK Settings)
  if (hasByokKey()) return true;

  // 3. Session-level bypass flags (isByokUnlimited || hasBYOKAccess from SessionContext)
  if (sessionBypass) return true;

  if (!profile) return false;

  // 4. is_superadmin DB flag
  if (Boolean(profile.is_superadmin)) return true;

  // 5. Unlimited tier strings (any plan/tier field)
  const tierFields = [
    profile.tier,
    profile.subscription_plan,
    profile.subscription_tier,
    profile.plan_type,
  ];
  for (const field of tierFields) {
    if (field && UNLIMITED_TIERS.has(field.toLowerCase())) return true;
  }

  // 6. AppSumo Tier 3 (numeric tier >= 3)
  if (Number(profile.appsumo_tier ?? 0) >= 3) return true;

  return false;
}

// ─── Credit check with bypass ─────────────────────────────────────────────────

import { COST_PER_ACTION } from '@/lib/credits';

/**
 * Returns `true` when the user can proceed with an AI action.
 *
 * For unlimited users this always returns true, completely skipping the balance
 * check. For everyone else it checks that `balance >= requiredCredits`.
 *
 * Replace all bare `hasActionCredits(balance)` calls with this function to get
 * the automatic unlimited bypass everywhere.
 *
 * @example
 *   if (!canPerformAction(currentCredits, user?.email, profile, isByokUnlimited)) {
 *     setShowCreditsModal(true);
 *     return;
 *   }
 */
export function canPerformAction(
  balance: number,
  email: string | null | undefined,
  profile?: Parameters<typeof isUnlimitedUser>[1],
  sessionBypass = false,
  requiredCredits = COST_PER_ACTION,
): boolean {
  if (isUnlimitedUser(email, profile, sessionBypass)) return true;
  return balance >= requiredCredits;
}

// ─── 402 backend bypass ───────────────────────────────────────────────────────

/**
 * When the edge function returns HTTP 402 (Insufficient Credits), call this to
 * decide whether to show the credits modal or fall through to client-side
 * generation for unlimited / BYOK users.
 *
 * Returns `true` when the 402 should be IGNORED and the client should proceed
 * with the BYOK / client-side OpenAI fallback instead.
 */
export function should402BypassForUnlimited(
  email: string | null | undefined,
  profile?: Parameters<typeof isUnlimitedUser>[1],
  sessionBypass = false,
): boolean {
  return isUnlimitedUser(email, profile, sessionBypass);
}
