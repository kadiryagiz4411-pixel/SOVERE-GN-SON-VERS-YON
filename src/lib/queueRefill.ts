import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { skillsForMatching } from '@/lib/matchScore';
import { fetchLiveOpportunities } from '@/lib/opportunities';
import { STARTUP_TIMEOUT_MS, withTimeout } from '@/lib/withTimeout';

export const QUEUE_REFILL_EVENT = 'sovereign:queue-refill';

let inflight = false;
let lastAt = 0;

export function requestQueueRefill(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(QUEUE_REFILL_EVENT));
}

export async function refillApplyQueue(opts: {
  signal?: AbortSignal;
  force?: boolean;
} = {}): Promise<{ count: number; persisted: number }> {
  const now = Date.now();
  if (!opts.force && (inflight || now - lastAt < 8000)) {
    return { count: 0, persisted: 0 };
  }
  inflight = true;
  lastAt = now;
  const controller = new AbortController();
  const kill = window.setTimeout(() => controller.abort(), STARTUP_TIMEOUT_MS + 1000);
  try {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      STARTUP_TIMEOUT_MS,
      { data: { session: null }, error: null },
    );
    const token = session?.access_token || '';
    const userId = session?.user?.id || '';
    if (!token || !userId) return { count: 0, persisted: 0 };

    const { data: profile } = await fetchProfileByAuthId<Record<string, unknown>>(userId, '*');
    const skills = skillsForMatching({
      skills: [
        ...(Array.isArray(profile?.skills) ? (profile?.skills as string[]) : []),
        String(profile?.onboarding_role || ''),
        String(profile?.onboarding_industry || ''),
      ],
      profession: String(profile?.profession_cluster || profile?.onboarding_role || ''),
    });
    const live = await withTimeout(
      fetchLiveOpportunities({
        query: skills.join(','),
        platform: 'All',
        signal: opts.signal ?? controller.signal,
        accessToken: token,
        skills,
        persist: true,
        profile: {
          skills,
          experience: String(profile?.experience || ''),
          profession: String(profile?.profession_cluster || profile?.onboarding_role || ''),
          hourlyRate: typeof profile?.hourly_rate === 'number' ? profile.hourly_rate : null,
        },
      }),
      STARTUP_TIMEOUT_MS + 1000,
      { items: [], persisted: 0, success: false },
    );
    return {
      count: live.items.length,
      persisted: Number(live.persisted || 0),
    };
  } catch (err) {
    console.warn('[Apply Queue refill]', err);
    return { count: 0, persisted: 0 };
  } finally {
    window.clearTimeout(kill);
    inflight = false;
  }
}
