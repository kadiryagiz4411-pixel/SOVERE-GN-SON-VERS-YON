import { env, firstEnv } from './env.js';
import type { BillingPeriod, PlanTier } from './lemonsqueezy.js';

function supabaseUrl(): string {
  return firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
}

function serviceKey(): string {
  return env('SUPABASE_SERVICE_ROLE_KEY');
}

function headers(prefer?: string): Record<string, string> {
  const h: Record<string, string> = {
    apikey: serviceKey(),
    Authorization: `Bearer ${serviceKey()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (prefer) h.Prefer = prefer;
  return h;
}

async function rest(path: string, init: RequestInit): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${supabaseUrl()}${path}`, init);
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

export async function recordBillingEvent(opts: {
  provider: string;
  eventId: string;
  eventType: string;
  userId?: string | null;
  email?: string | null;
}): Promise<'inserted' | 'duplicate' | 'error'> {
  if (!opts.eventId) return 'inserted';
  const { ok, status } = await rest('/rest/v1/billing_events', {
    method: 'POST',
    headers: headers('return=minimal'),
    body: JSON.stringify({
      provider: opts.provider,
      event_id: opts.eventId,
      event_type: opts.eventType,
      user_id: opts.userId || null,
      email: opts.email ? opts.email.toLowerCase() : null,
    }),
  });
  if (ok) return 'inserted';
  if (status === 409) return 'duplicate';
  console.error('[billing] event insert failed', status);
  return 'error';
}

export async function adminUserExists(userId: string): Promise<boolean> {
  if (!userId) return false;
  const res = await fetch(`${supabaseUrl()}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}` },
  });
  return res.ok;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const qs = new URLSearchParams({
    select: 'id,user_id,email',
    email: `eq.${needle}`,
    limit: '1',
  });
  const byProfile = await rest(`/rest/v1/profiles?${qs.toString()}`, {
    method: 'GET',
    headers: headers(),
  });
  if (byProfile.ok) {
    const rows = Array.isArray(byProfile.json) ? byProfile.json : [];
    const row = rows[0] as { id?: string; user_id?: string } | undefined;
    if (row?.user_id || row?.id) return String(row.user_id || row.id);
  }
  const auth = await fetch(`${supabaseUrl()}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: { apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}` },
  });
  if (!auth.ok) return null;
  const body = await auth.json().catch(() => ({})) as { users?: Array<{ id?: string; email?: string }> };
  const match = (body.users || []).find((u) => String(u.email || '').toLowerCase() === needle);
  return match?.id || null;
}

async function rpc(name: string, payload: Record<string, unknown>): Promise<{ ok: boolean; json: unknown }> {
  return rest(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers('return=representation'),
    body: JSON.stringify(payload),
  });
}

export async function grantSinglePass(opts: {
  userId: string;
  provider: string;
  eventId: string;
  email?: string | null;
}): Promise<void> {
  const result = await rpc('grant_single_pass', {
    user_id_input: opts.userId,
    provider_input: opts.provider,
    event_id_input: opts.eventId,
    email_input: opts.email || null,
  });
  if (result.ok) return;
  await fetch(`${supabaseUrl()}/rest/v1/profiles?or=(id.eq.${opts.userId},user_id.eq.${opts.userId})`, {
    method: 'PATCH',
    headers: headers('return=minimal'),
    body: JSON.stringify({
      plan_type: 'single_pass',
      subscription_plan: 'single_pass',
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function queuePendingPass(opts: {
  email: string;
  provider: string;
  eventId: string;
}): Promise<void> {
  const email = opts.email.trim().toLowerCase();
  if (!email) return;
  await rest('/rest/v1/pending_pass_grants', {
    method: 'POST',
    headers: headers('return=minimal,resolution=ignore-duplicates'),
    body: JSON.stringify({
      email,
      event_id: opts.eventId,
      provider: opts.provider,
      credits: 1,
    }),
  });
  await rest('/rest/v1/pending_upgrades', {
    method: 'POST',
    headers: headers('return=minimal,resolution=merge-duplicates'),
    body: JSON.stringify({
      email,
      plan: 'single_pass',
      sale_id: opts.eventId,
      payment_data: { provider: opts.provider },
      processed: false,
    }),
  });
}

export async function applySubscriptionPlan(opts: {
  userId: string;
  plan: PlanTier;
  period: BillingPeriod;
  status?: string;
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<void> {
  const agency = opts.plan === 'B2B_ENTERPRISE';
  await fetch(`${supabaseUrl()}/rest/v1/profiles?or=(id.eq.${opts.userId},user_id.eq.${opts.userId})`, {
    method: 'PATCH',
    headers: headers('return=minimal'),
    body: JSON.stringify({
      plan_type: opts.plan,
      subscription_plan: opts.plan,
      subscription_status: opts.status || 'active',
      subscription_tier: agency ? 'enterprise' : opts.plan,
      billing_period: opts.period === 'once' ? null : opts.period,
      polar_customer_id: opts.customerId || undefined,
      polar_subscription_id: opts.subscriptionId || undefined,
      subscription_paused_at: null,
      ...(agency ? { b2b_access: true, b2b_subscription_status: 'active', is_trial_active: false } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function cancelSubscriptionPlan(opts: {
  userId: string;
  status: string;
  agency?: boolean;
}): Promise<void> {
  const appsumo = await rest(
    `/rest/v1/profiles?select=appsumo_tier,appsumo_plan,appsumo_codes_count,plan_type,subscription_tier&or=(id.eq.${opts.userId},user_id.eq.${opts.userId})&limit=1`,
    { method: 'GET', headers: headers() },
  );
  const row = Array.isArray(appsumo.json) ? appsumo.json[0] as Record<string, unknown> : null;
  if (row) {
    if (Number(row.appsumo_tier || 0) >= 1 || Number(row.appsumo_codes_count || 0) >= 1) return;
    const blob = `${row.appsumo_plan || ''} ${row.plan_type || ''} ${row.subscription_tier || ''}`.toLowerCase();
    if (blob.includes('appsumo')) return;
  }
  await fetch(`${supabaseUrl()}/rest/v1/profiles?or=(id.eq.${opts.userId},user_id.eq.${opts.userId})`, {
    method: 'PATCH',
    headers: headers('return=minimal'),
    body: JSON.stringify({
      subscription_status: opts.status,
      ...(opts.agency ? { b2b_access: false, b2b_subscription_status: opts.status } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function fulfillPurchase(opts: {
  provider: string;
  eventId: string;
  eventType: string;
  userId?: string | null;
  email?: string | null;
  plan: PlanTier | null;
  period: BillingPeriod | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  terminal?: boolean;
}): Promise<{ duplicate: boolean; queued: boolean; userId: string | null }> {
  const email = opts.email?.trim().toLowerCase() || null;
  let userId = opts.userId || null;
  if (userId && !(await adminUserExists(userId))) userId = null;
  if (!userId && email) userId = await findUserIdByEmail(email);

  const eventState = await recordBillingEvent({
    provider: opts.provider,
    eventId: opts.eventId,
    eventType: opts.eventType,
    userId,
    email,
  });
  if (eventState === 'duplicate') {
    return { duplicate: true, queued: false, userId };
  }

  if (opts.terminal && userId) {
    await cancelSubscriptionPlan({
      userId,
      status: opts.eventType.includes('cancel') ? 'canceled' : 'expired',
      agency: opts.plan === 'B2B_ENTERPRISE',
    });
    return { duplicate: false, queued: false, userId };
  }

  if (opts.plan === 'single_pass') {
    if (userId) {
      await grantSinglePass({
        userId,
        provider: opts.provider,
        eventId: opts.eventId,
        email,
      });
      return { duplicate: false, queued: false, userId };
    }
    if (email) {
      await queuePendingPass({ email, provider: opts.provider, eventId: opts.eventId });
      return { duplicate: false, queued: true, userId: null };
    }
    return { duplicate: false, queued: true, userId: null };
  }

  if (opts.plan && opts.plan !== 'free' && userId && opts.period) {
    await applySubscriptionPlan({
      userId,
      plan: opts.plan,
      period: opts.period,
      customerId: opts.customerId,
      subscriptionId: opts.subscriptionId,
    });
    return { duplicate: false, queued: false, userId };
  }

  if (opts.plan && opts.plan !== 'free' && email && !userId) {
    await rest('/rest/v1/pending_upgrades', {
      method: 'POST',
      headers: headers('return=minimal,resolution=merge-duplicates'),
      body: JSON.stringify({
        email,
        plan: opts.plan,
        sale_id: opts.eventId,
        payment_data: { provider: opts.provider, period: opts.period },
        processed: false,
      }),
    });
    return { duplicate: false, queued: true, userId: null };
  }

  return { duplicate: false, queued: !userId, userId };
}

export async function readEntitlements(userId: string): Promise<{
  planType: string;
  remainingCredits: number;
  singlePassCredits: number;
  subscriptionStatus: string;
} | null> {
  const qs = new URLSearchParams({
    select: 'plan_type,subscription_plan,subscription_status,remaining_credits,credits_remaining,single_pass_credits',
    or: `(id.eq.${userId},user_id.eq.${userId})`,
    limit: '1',
  });
  const { ok, json } = await rest(`/rest/v1/profiles?${qs.toString()}`, {
    method: 'GET',
    headers: headers(),
  });
  if (!ok) return null;
  const row = (Array.isArray(json) ? json[0] : json) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    planType: String(row.plan_type || row.subscription_plan || 'free'),
    remainingCredits: Number(row.remaining_credits ?? row.credits_remaining ?? 0) || 0,
    singlePassCredits: Number(row.single_pass_credits ?? 0) || 0,
    subscriptionStatus: String(row.subscription_status || 'active'),
  };
}
