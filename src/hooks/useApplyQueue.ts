import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

async function fetchApplyQueue(userId: string): Promise<ApplyQueueItem[]> {
  const { data, error } = await supabase
    .from('apply_queue')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message || 'Could not load Apply Queue');
  }
  return (data ?? []) as unknown as ApplyQueueItem[];
}

export function useApplyQueue(userId: string | undefined | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => [APPLY_QUEUE_QUERY_KEY, userId || 'anon'] as const,
    [userId],
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchApplyQueue(String(userId)),
    enabled: Boolean(userId),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 20_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.isError && query.error) {
      toast.error('Apply Queue could not refresh. Try Refresh Queue.');
    }
  }, [query.isError, query.error]);

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
