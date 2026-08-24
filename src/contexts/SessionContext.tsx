/**
 * SessionContext — one-shot auth + credit cache for the whole app.
 * Profile/credit queries run only after getSession() resolves with a user id.
 */
import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId } from '@/lib/profileQuery';

const LOG = '[Sovereign Load Error]:';

interface SessionState {
  user: User | null;
  session: Session | null;
  sessionReady: boolean;
  isLoading: boolean;
  creditsBalance: number;
  subscriptionPlan: string;
  subscriptionTier: string;
  planType: string;
  refreshCredits: () => Promise<void>;
  setCreditsBalance: (n: number) => void;
}

const SessionContext = createContext<SessionState>({
  user: null,
  session: null,
  sessionReady: false,
  isLoading: true,
  creditsBalance: 0,
  subscriptionPlan: 'free',
  subscriptionTier: 'free',
  planType: 'free',
  refreshCredits: async () => {},
  setCreditsBalance: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [planType, setPlanType] = useState('free');
  const mounted = useRef(true);
  const hydrated = useRef(false);

  const loadProfileCredits = useCallback(async (userId: string | undefined | null) => {
    if (!userId) return;
    try {
      const { data, error } = await fetchProfileByAuthId<{
        credits_balance?: number;
        subscription_plan?: string;
        subscription_tier?: string;
        plan_type?: string;
      }>(userId, 'credits_balance, subscription_plan, subscription_tier, plan_type');
      if (!mounted.current) return;
      if (error) {
        console.error(LOG, 'session profile/credits query failed', error.message);
      }
      setCreditsBalance(data?.credits_balance ?? 0);
      setSubscriptionPlan(data?.subscription_plan ?? 'free');
      setSubscriptionTier(data?.subscription_tier ?? data?.plan_type ?? data?.subscription_plan ?? 'free');
      setPlanType(data?.plan_type ?? data?.subscription_plan ?? 'free');
    } catch (err) {
      console.error(LOG, 'session profile/credits threw', err);
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    if (!user?.id) return;
    await loadProfileCredits(user.id);
  }, [user?.id, loadProfileCredits]);

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession()
      .then(({ data: { session: next }, error }) => {
        if (!mounted.current) return;
        if (error) {
          console.error(LOG, 'getSession failed', error.message);
        }
        setSession(next ?? null);
        setUser(next?.user ?? null);
        hydrated.current = true;
        setSessionReady(true);
        if (next?.user?.id) {
          void loadProfileCredits(next.user.id);
        }
      })
      .catch((err) => {
        console.error(LOG, 'getSession threw', err);
        if (mounted.current) {
          hydrated.current = true;
          setSessionReady(true);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted.current) return;
      // Ignore the first INITIAL_SESSION until getSession() finishes to avoid a double fetch race.
      if (!hydrated.current && event === 'INITIAL_SESSION') return;

      setSession(next);
      setUser(next?.user ?? null);
      if (!hydrated.current) {
        hydrated.current = true;
        setSessionReady(true);
      }
      if (next?.user?.id) {
        void loadProfileCredits(next.user.id);
      } else {
        setCreditsBalance(0);
        setSubscriptionPlan('free');
        setSubscriptionTier('free');
        setPlanType('free');
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfileCredits]);

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SessionContext.Provider
      value={{
        user,
        session,
        sessionReady,
        isLoading: !sessionReady,
        creditsBalance,
        subscriptionPlan,
        subscriptionTier,
        planType,
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
