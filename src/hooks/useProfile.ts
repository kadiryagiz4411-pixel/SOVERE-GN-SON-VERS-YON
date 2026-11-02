import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { fetchProfileByAuthId, profileByAuthId, PROFILE_SELECT_WITH_TIER } from '@/lib/profileQuery';
import { STARTUP_TIMEOUT_MS } from '@/lib/withTimeout';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  skills: string[] | null;
  experience: string | null;
  hourly_rate: number | null;
  bio: string | null;
  avatar_url: string | null;
  subscription_plan: string;
  appsumo_tier?: number | null;
  appsumo_plan?: string | null;
  plan_type?: string | null;
  subscription_tier?: string | null;
  [key: string]: unknown;
  daily_proposals_used: number;
  last_usage_reset: string;
  trial_started_at: string | null;
  trial_claimed: boolean;
  credits_balance: number;
}

export const useProfile = (user: User | null) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const watchdog = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, STARTUP_TIMEOUT_MS);

    const fetchProfile = async () => {
      try {
        const { data, error } = await fetchProfileByAuthId<Profile>(user.id, PROFILE_SELECT_WITH_TIER);
        if (cancelled) return;
        if (error) {
          console.error('[Sovereign Load Error]:', 'useProfile fetch failed', error.message);
        }
        setProfile(data);
      } catch (err) {
        console.error('[Sovereign Load Error]:', 'useProfile threw', err);
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchProfile();

    const channel = supabase
      .channel(`use-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => { void fetchProfile(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        () => { void fetchProfile(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { error: new Error('Not authenticated') };

    const { data, error } = await profileByAuthId(
      supabase.from('profiles').update(updates),
      user.id,
    )
      .select()
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  const refreshProfile = async () => {
    if (!user?.id) return;

    const { data, error } = await fetchProfileByAuthId<Profile>(user.id, PROFILE_SELECT_WITH_TIER);

    if (!error && data) {
      setProfile(data);
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refreshProfile,
  };
};
