/**
 * creditMath.ts
 * Centralised helpers for credit percentage calculation.
 * Single source of truth — import from here in all UI components.
 */

/**
 * Returns an integer 0–100 representing how much of `totalCredits`
 * has been consumed / remains, clamped so it can drive a progress bar directly.
 *
 * @param currentCredits  Credits remaining (or used, depending on caller context).
 * @param totalCredits    The user's credit cap for the period.
 */
export const calculateCreditPercentage = (
  currentCredits: number,
  totalCredits: number,
): number => {
  if (!totalCredits || totalCredits <= 0) return 0;
  const percentage = (currentCredits / totalCredits) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage)));
};

/**
 * Alias kept for backwards-compat with any future callers that import
 * the name used in src/lib/credits.ts.
 */
export const creditUsagePercentage = calculateCreditPercentage;
