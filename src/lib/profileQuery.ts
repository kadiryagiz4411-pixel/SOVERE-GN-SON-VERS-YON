import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const LOG = '[Sovereign Load Error]:';

/**
 * profiles.id is the row PK; profiles.user_id is the auth id.
 * Try `id` first (requested schema), then `user_id`, so a mismatch
 * returns empty data instead of a 400/404 crash.
 */
export function profileByAuthId<T>(query: T, userId: string): T {
  const q = query as T & { or: (filter: string) => T };
  return q.or(`id.eq.${userId},user_id.eq.${userId}`);
}

export async function fetchProfileByAuthId<Row extends Record<string, unknown> = Record<string, unknown>>(
  userId: string | undefined | null,
  select = '*',
): Promise<{ data: Row | null; error: PostgrestError | null }> {
  if (!userId) {
    return { data: null, error: null };
  }

  try {
    const byId = await supabase
      .from('profiles')
      .select(select)
      .eq('id', userId)
      .maybeSingle();

    if (byId.data && !byId.error) {
      return { data: byId.data as Row, error: null };
    }

    const byUserId = await supabase
      .from('profiles')
      .select(select)
      .eq('user_id', userId)
      .maybeSingle();

    if (byUserId.data && !byUserId.error) {
      return { data: byUserId.data as Row, error: null };
    }

    if (byId.error) {
      console.error(LOG, 'profiles.id lookup failed', byId.error.message);
    }
    if (byUserId.error) {
      console.error(LOG, 'profiles.user_id lookup failed', byUserId.error.message);
    }

    return { data: null, error: byUserId.error ?? byId.error };
  } catch (err) {
    console.error(LOG, 'profiles fetch threw', err);
    return { data: null, error: null };
  }
}

/** Never throw — a missing/failed reset must not break credit UI. */
export async function resetMonthlyCreditsIfDue(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const first = await supabase.rpc('reset_monthly_credits_if_due', { user_id: userId });
    if (!first.error) return;

    const second = await supabase.rpc('reset_monthly_credits_if_due', { user_id_input: userId });
    if (second.error) {
      console.error(LOG, 'reset_monthly_credits_if_due skipped', second.error.message);
    }
  } catch (err) {
    console.error(LOG, 'reset_monthly_credits_if_due skipped', err);
  }
}
