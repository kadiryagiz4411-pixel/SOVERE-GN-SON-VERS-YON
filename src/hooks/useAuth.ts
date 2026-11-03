import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { STARTUP_TIMEOUT_MS, withTimeout } from '@/lib/withTimeout';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const finish = (next: Session | null) => {
      if (cancelled) return;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    };

    // 3 s watchdog — unblocks any component still using the legacy useAuth()
    // hook so the UI never waits forever for Supabase on a slow network.
    const watchdog = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        finish(nextSession);

        if (event === 'SIGNED_IN' && nextSession?.user?.email) {
          supabase.functions.invoke('user-sync', {
            body: {
              event: 'user_registered',
              email: nextSession.user.email,
              tags: ['registered_user'],
            },
          }).catch(() => {});
        }
      }
    );

    const hydrate = async () => {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          STARTUP_TIMEOUT_MS,
          { data: { session: null }, error: null },
        );
        finish(data.session ?? null);
      } catch {
        finish(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void hydrate();

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });
      return { data, error };
    } catch (error) {
      return { data: { user: null, session: null }, error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      return { data: { user: null, session: null }, error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) navigate('/');
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
};
