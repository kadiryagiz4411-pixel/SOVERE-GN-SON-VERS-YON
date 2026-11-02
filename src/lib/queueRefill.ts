import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { skillsForMatching } from '@/lib/matchScore';
import { fetchLiveOpportunities } from '@/lib/opportunities';

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
  try {
    const { data: { session } } = await supabase.auth.getSession();
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
    const live = await fetchLiveOpportunities({
      query: skills.join(','),
      platform: 'All',
      signal: opts.signal,
      accessToken: token,
      skills,
      persist: true,
      profile: {
        skills,
        experience: String(profile?.experience || ''),
        profession: String(profile?.profession_cluster || profile?.onboarding_role || ''),
        hourlyRate: typeof profile?.hourly_rate === 'number' ? profile.hourly_rate : null,
      },
    });
    return {
      count: live.items.length,
      persisted: Number(live.persisted || 0),
    };
  } catch (err) {
    console.error('[Apply Queue refill]', err);
    return { count: 0, persisted: 0 };
  } finally {
    inflight = false;
  }
}
