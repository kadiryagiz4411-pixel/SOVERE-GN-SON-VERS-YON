/**
 * Ask the server to mint a Lemon Squeezy hosted checkout that carries user_id.
 */
export async function createHostedCheckout(opts: {
  variantId: string;
  userId?: string | null;
  email?: string | null;
  planId?: string;
  billingCycle?: string;
  accessToken?: string | null;
}): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      variantId: opts.variantId,
      userId: opts.userId || undefined,
      email: opts.email || undefined,
      planId: opts.planId,
      billingCycle: opts.billingCycle,
    }),
  });

  const data = await res.json().catch(() => ({})) as { checkoutUrl?: string; error?: string };
  if (!res.ok || !data.checkoutUrl) {
    throw new Error(data.error || 'Could not create checkout');
  }
  return data.checkoutUrl;
}
