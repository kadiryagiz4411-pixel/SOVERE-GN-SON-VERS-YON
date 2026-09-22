/**
 * Unified AI action credit rules.
 * Prices / Lemon Squeezy IDs are intentionally untouched here.
 */
export const COST_PER_ACTION = 20;
export const DEFAULT_MONTHLY_CREDIT_LIMIT = 400;

export const INSUFFICIENT_CREDITS_MESSAGE =
  `Insufficient credits. Required: ${COST_PER_ACTION}`;

/** Pure balance check — does NOT account for unlimited/BYOK users. */
export function hasActionCredits(balance: number | null | undefined): boolean {
  return (balance ?? 0) >= COST_PER_ACTION;
}

/**
 * Bypass-aware credit check.
 *
 * Returns `true` (allow action) when EITHER:
 *   a) `isUnlimited` is true (superadmin / BYOK / enterprise), OR
 *   b) `balance >= requiredCredits`.
 *
 * Use this instead of bare `hasActionCredits()` in all generation handlers so
 * unlimited users are never falsely blocked by a low DB balance.
 *
 * @param balance          Credit balance from local state / DB profile.
 * @param isUnlimited      Pass `true` when the user is superadmin, BYOK, or enterprise.
 * @param requiredCredits  Defaults to COST_PER_ACTION (20).
 */
export function hasCreditsOrUnlimited(
  balance: number | null | undefined,
  isUnlimited: boolean,
  requiredCredits = COST_PER_ACTION,
): boolean {
  if (isUnlimited) return true;
  return (balance ?? 0) >= requiredCredits;
}

/** Integer 0–100 fill for credit progress bars. */
export function creditUsagePercentage(
  currentCredits: number | null | undefined,
  maxCredits: number | null | undefined,
): number {
  const current = currentCredits ?? 0;
  const max = maxCredits || DEFAULT_MONTHLY_CREDIT_LIMIT;
  return Math.min(100, Math.max(0, Math.round((current / max) * 100)));
}
