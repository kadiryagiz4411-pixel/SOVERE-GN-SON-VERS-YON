/**
 * SessionContext — one-shot auth + credit cache for the whole app.
 * Route changes must not re-fetch getSession() or profiles.
 */
import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId } from '@/lib/profileQuery';

interface SessionState {
  user: User | null;
  session: Session | null;
  sessionReady: boolean;
  creditsBalance: number;
  subscriptionPlan: string;
  refreshCredits: () => Promise<void>;
  setCreditsBalance: (n: number) => void;
}

const SessionContext = createContext<SessionState>({
  user: null,
  session: null,
  sessionReady: false,
  creditsBalance: 0,
  subscriptionPlan: 'free',
  refreshCredits: async () => {},
  setCreditsBalance: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const mounted = useRef(true);

  const loadProfileCredits = useCallback(async (userId: string) => {
    try {
      const { data } = await fetchProfileByAuthId<{
        credits_balance?: number;
        subscription_plan?: string;
      }>(userId, 'credits_balance, subscription_plan');
      if (!mounted.current) return;
      setCreditsBalance((data as any)?.credits_balance ?? 0);
      setSubscriptionPlan((data as any)?.subscription_plan ?? 'free');
    } catch (err) {
      console.warn('[SessionContext] profile credit load failed', err);
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    if (user?.id) await loadProfileCredits(user.id);
  }, [user?.id, loadProfileCredits]);

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession()
      .then(({ data: { session: next } }) => {
        if (!mounted.current) return;
        setSession(next);
        setUser(next?.user ?? null);
        setSessionReady(true);
        if (next?.user?.id) loadProfileCredits(next.user.id);
      })
      .catch((err) => {
        console.warn('[SessionContext] getSession failed', err);
        if (mounted.current) setSessionReady(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted.current) return;
      setSession(next);
      setUser(next?.user ?? null);
      if (next?.user?.id) {
        loadProfileCredits(next.user.id);
      } else {
        setCreditsBalance(0);
        setSubscriptionPlan('free');
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfileCredits]);

  return (
    <SessionContext.Provider
      value={{
        user,
        session,
        sessionReady,
        creditsBalance,
        subscriptionPlan,
        refreshCredits,
        setCreditsBalance,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
