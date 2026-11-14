export interface BillingStatus {
  activating: boolean;
  ready: boolean;
  signedIn?: boolean;
  planType?: string;
  remainingCredits?: number;
  singlePassCredits?: number;
  message?: string;
}

export async function fetchBillingStatus(opts: {
  accessToken?: string | null;
  checkoutId?: string | null;
}): Promise<BillingStatus> {
  const params = new URLSearchParams();
  if (opts.checkoutId) params.set('checkout_id', opts.checkoutId);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;
  const qs = params.toString();
  const res = await fetch(`/api/billing/status${qs ? `?${qs}` : ''}`, { headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({})) as BillingStatus;
  return {
    activating: data.activating !== false && !data.ready,
    ready: Boolean(data.ready),
    signedIn: data.signedIn,
    planType: data.planType,
    remainingCredits: data.remainingCredits,
    singlePassCredits: data.singlePassCredits,
    message: data.message || 'Activating your pass...',
  };
}

export async function pollBillingActivation(opts: {
  accessToken?: string | null;
  checkoutId?: string | null;
  onTick?: (status: BillingStatus) => void;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<BillingStatus> {
  const timeoutMs = opts.timeoutMs ?? 28000;
  const intervalMs = opts.intervalMs ?? 1500;
  const started = Date.now();
  let last: BillingStatus = { activating: true, ready: false, message: 'Activating your pass...' };
  while (Date.now() - started < timeoutMs) {
    try {
      last = await fetchBillingStatus({ accessToken: opts.accessToken, checkoutId: opts.checkoutId });
      opts.onTick?.(last);
      if (last.ready) return last;
    } catch {
      opts.onTick?.(last);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
}
