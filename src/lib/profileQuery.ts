import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * profiles.id is the row PK (random uuid).
 * profiles.user_id is the auth.users id.
 * Some RPCs / older queries treat them as the same — try both so a
 * schema mismatch returns empty data instead of a 400/404 crash.
 */
export function profileByAuthId<T>(query: T, userId: string): T {
  const q = query as T & { or: (filter: string) => T };
  return q.or(`user_id.eq.${userId},id.eq.${userId}`);
}

export async function fetchProfileByAuthId<Row extends Record<string, unknown> = Record<string, unknown>>(
  userId: string,
  select = '*',
): Promise<{ data: Row | null; error: PostgrestError | null }> {
  const byUserId = await supabase
    .from('profiles')
    .select(select)
    .eq('user_id', userId)
    .maybeSingle();

  if (byUserId.data && !byUserId.error) {
    return { data: byUserId.data as Row, error: null };
  }

  const byId = await supabase
    .from('profiles')
    .select(select)
    .eq('id', userId)
    .maybeSingle();

  if (byId.data && !byId.error) {
    return { data: byId.data as Row, error: null };
  }

  if (byUserId.error) {
    console.warn('[profiles] user_id lookup failed, tried id', byUserId.error.message);
  }
  if (byId.error) {
    console.warn('[profiles] id lookup failed', byId.error.message);
  }

  return { data: null, error: byId.error ?? byUserId.error };
}

/** Never throw — a missing/failed reset must not break credit UI. */
export async function resetMonthlyCreditsIfDue(userId: string): Promise<void> {
  try {
    const first = await supabase.rpc('reset_monthly_credits_if_due', { user_id: userId });
    if (!first.error) return;

    const second = await supabase.rpc('reset_monthly_credits_if_due', { user_id_input: userId });
    if (second.error) {
      console.warn('[credits] reset_monthly_credits_if_due skipped', second.error.message);
    }
  } catch (err) {
    console.warn('[credits] reset_monthly_credits_if_due skipped', err);
  }
}
