/**
 * Unified AI action credit rules.
 * Prices / Lemon Squeezy IDs are intentionally untouched here.
 */
export const COST_PER_ACTION = 20;

export const INSUFFICIENT_CREDITS_MESSAGE =
  `Insufficient credits. Required: ${COST_PER_ACTION}`;

export function hasActionCredits(balance: number | null | undefined): boolean {
  return (balance ?? 0) >= COST_PER_ACTION;
}
