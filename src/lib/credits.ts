/**
 * Unified AI action credit rules.
 * Prices / Lemon Squeezy IDs are intentionally untouched here.
 */
export const COST_PER_ACTION = 20;
export const DEFAULT_MONTHLY_CREDIT_LIMIT = 400;

export const INSUFFICIENT_CREDITS_MESSAGE =
  `Insufficient credits. Required: ${COST_PER_ACTION}`;

export function hasActionCredits(balance: number | null | undefined): boolean {
  return (balance ?? 0) >= COST_PER_ACTION;
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
