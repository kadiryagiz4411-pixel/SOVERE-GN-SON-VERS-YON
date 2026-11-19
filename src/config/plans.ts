/**
 * Polar checkout plan mapping.
 * Dollar prices stay in src/config/pricing.ts — this file only maps checkout.
 * Hosted checkout is minted by POST /api/billing/checkout (Polar.sh).
 */

import { getBillingFallbackUrl, sanitizeCheckoutUrl } from '@/lib/checkout';

export type BillingCycle = 'monthly' | 'yearly';
export type CheckoutPlanId = 'standard' | 'pro' | 'elite' | 'enterprise' | 'single_pass';

export function normalizeBillingCycle(cycle: BillingCycle | 'annual' | boolean | undefined): BillingCycle {
  if (cycle === true || cycle === 'yearly' || cycle === 'annual') return 'yearly';
  return 'monthly';
}

export function getVariantId(
  _planId: CheckoutPlanId,
  _cycle: BillingCycle | 'annual' | boolean = 'monthly',
): string {
  return '';
}

export function resolveCheckoutUrl(
  planId: CheckoutPlanId,
  cycle: BillingCycle | 'annual' | boolean = 'monthly',
): string {
  const billing = planId === 'single_pass' ? 'once' : normalizeBillingCycle(cycle);
  return getBillingFallbackUrl(planId, billing);
}

export function describeCheckoutTarget(
  planId: CheckoutPlanId,
  cycle: BillingCycle | 'annual' | boolean = 'monthly',
) {
  const billing = planId === 'single_pass' ? 'one_time' : normalizeBillingCycle(cycle);
  return {
    planId,
    billingCycle: billing,
    variantId: '',
    checkoutUrl: resolveCheckoutUrl(planId, cycle),
  };
}

export function createCheckout(
  planId: CheckoutPlanId,
  billingCycle: BillingCycle | 'annual' | boolean = 'monthly',
): string {
  const known: CheckoutPlanId[] = ['standard', 'pro', 'elite', 'enterprise', 'single_pass'];
  if (!known.includes(planId)) return getBillingFallbackUrl();
  return sanitizeCheckoutUrl(resolveCheckoutUrl(planId, billingCycle));
}
