import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STARTUP_TIMEOUT_MS, withTimeout } from '@/lib/withTimeout';

export const APPLY_QUEUE_QUERY_KEY = 'applyQueue';

export interface ApplyQueueItem {
  id: string;
  job_title: string;
  company: string;
  platform: string;
  budget: string;
  job_url: string;
  job_description: string;
  match_score: number;
  acceptance_probability: number;
  match_reasoning: string[];
  rejection_reason: string | null;
  generated_proposal: string;
  status: string;
  user_notes: string;
  skills_matched: string[];
  competition_level: string;
  client_quality_score: number;
  urgency: string;
  batch_id: string;
  scanned_at: string;
  created_at: string;
}

function queueMatchScore(item: ApplyQueueItem): number {
  const row = item as ApplyQueueItem & { matchScore?: number; matchPercentage?: number };
  const raw = Number(row.match_score ?? row.matchScore ?? row.matchPercentage ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

function sortQueue(rows: ApplyQueueItem[]): ApplyQueueItem[] {
  return [...rows].sort((a, b) => {
    const delta = queueMatchScore(b) - queueMatchScore(a);
    if (delta !== 0) return delta;
    return Date.parse(b.created_at || '') - Date.parse(a.created_at || '');
  });
}

async function fetchApplyQueue(userId: string): Promise<ApplyQueueItem[] | null> {
  try {
    const ranked = await withTimeout(
      supabase
        .from('apply_queue')
        .select('*')
        .eq('user_id', userId)
        .order('match_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(80),
      STARTUP_TIMEOUT_MS,
      { data: null, error: { message: 'timeout' } },
    );

    if (!ranked.error && Array.isArray(ranked.data)) {
      return sortQueue(ranked.data as unknown as ApplyQueueItem[]);
    }
    console.warn('[Apply Queue] ranked fetch skipped', ranked.error?.message);

    const plain = await withTimeout(
      supabase
        .from('apply_queue')
        .select('*')
        .eq('user_id', userId)
        .limit(80),
      STARTUP_TIMEOUT_MS,
      { data: null, error: { message: 'timeout' } },
    );

    if (plain.error) {
      console.warn('[Apply Queue] fallback fetch skipped', plain.error.message);
      return null;
    }
    return sortQueue((plain.data ?? []) as unknown as ApplyQueueItem[]);
  } catch (err) {
    console.warn('[Apply Queue] fetch failed', err);
    return null;
  }
}

export function useApplyQueue(userId: string | undefined | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => [APPLY_QUEUE_QUERY_KEY, userId || 'anon'] as const,
    [userId],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const next = await fetchApplyQueue(String(userId));
        if (next) return next;
        const cached = queryClient.getQueryData<ApplyQueueItem[]>(queryKey);
        return Array.isArray(cached) ? cached : [];
      } catch (err) {
        console.warn('[Apply Queue] refresh skipped', err);
        const cached = queryClient.getQueryData<ApplyQueueItem[]>(queryKey);
        return Array.isArray(cached) ? cached : [];
      }
    },
    enabled: Boolean(userId),
    staleTime: 15_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 15_000,
    retry: false,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`apply-queue-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apply_queue',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    const onFocus = () => {
      void queryClient.invalidateQueries({ queryKey });
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient, queryKey]);

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching,
    error: query.error,
    refresh: () => query.refetch(),
    invalidate: () => queryClient.invalidateQueries({ queryKey }),
  };
}
