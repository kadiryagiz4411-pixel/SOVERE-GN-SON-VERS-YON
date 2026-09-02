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
import { fetchProfileByAuthId, PROFILE_SELECT_WITH_TIER } from '@/lib/profileQuery';
import { isOwnerEmail, isSuperAdminUser, OWNER_EMAIL, OWNER_PRIVILEGES, SUPERADMIN_PLAN_TYPE } from '@/lib/superadmin';

const LOG = '[Sovereign Load Error]:';

interface SessionState {
  user: User | null;
  session: Session | null;
  sessionReady: boolean;
  isLoading: boolean;
  creditsBalance: number;
  remainingCredits: number;
  monthlyCreditLimit: number;
  subscriptionPlan: string;
  subscriptionTier: string;
  planType: string;
  appsumoTier: number;
  isByokUnlimited: boolean;
  hasB2BAccess: boolean;
  hasBYOKAccess: boolean;
  refreshCredits: () => Promise<void>;
  setCreditsBalance: (n: number) => void;
}

const SessionContext = createContext<SessionState>({
  user: null,
  session: null,
  sessionReady: false,
  isLoading: true,
  creditsBalance: 0,
  remainingCredits: 0,
  monthlyCreditLimit: 400,
  subscriptionPlan: 'free',
  subscriptionTier: 'free',
  planType: 'free',
  appsumoTier: 0,
  isByokUnlimited: false,
  hasB2BAccess: false,
  hasBYOKAccess: false,
  refreshCredits: async () => {},
  setCreditsBalance: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [remainingCredits, setRemainingCredits] = useState(0);
  const [monthlyCreditLimit, setMonthlyCreditLimit] = useState(400);
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [planType, setPlanType] = useState('free');
  const [appsumoTier, setAppsumoTier] = useState(0);
  const [isByokUnlimited, setIsByokUnlimited] = useState(false);
  const mounted = useRef(true);
  const hydrated = useRef(false);

  const loadProfileCredits = useCallback(async (userId: string | undefined | null, email?: string | null) => {
    if (!userId) return;
    const superAdmin = email === OWNER_EMAIL || isOwnerEmail(email);
    try {
      const { data, error } = await fetchProfileByAuthId<Record<string, unknown>>(
        userId,
        PROFILE_SELECT_WITH_TIER,
      );
      if (!mounted.current) return;
      if (error) {
        console.error(LOG, 'session profile/credits query failed', error.message);
      }
      const numericTier = Number(data?.appsumo_tier ?? data?.appsumo_codes_count ?? 0);
      const balance = Number(data?.credits_balance ?? 0);
      const remaining = Number(data?.credits_remaining ?? data?.remaining_credits ?? balance);
      const limit = Number(data?.monthly_credit_limit ?? 400);
      const hasKey = Boolean(String(data?.encrypted_openai_key ?? data?.custom_openai_key ?? '').trim());

      if (superAdmin) {
        setCreditsBalance(OWNER_PRIVILEGES.credits_remaining);
        setRemainingCredits(OWNER_PRIVILEGES.credits_remaining);
        setMonthlyCreditLimit(OWNER_PRIVILEGES.monthly_credit_limit);
        setSubscriptionPlan('appsumo_tier3');
        setSubscriptionTier('appsumo_tier3');
        setPlanType(SUPERADMIN_PLAN_TYPE);
        setAppsumoTier(OWNER_PRIVILEGES.appsumo_tier);
        setIsByokUnlimited(true);
      } else {
        setCreditsBalance(balance);
        setRemainingCredits(remaining);
        setMonthlyCreditLimit(limit || 400);
        setSubscriptionPlan(String(data?.subscription_plan ?? 'free'));
        setSubscriptionTier(String(data?.subscription_tier ?? data?.plan_type ?? data?.subscription_plan ?? 'free'));
        setPlanType(String(data?.plan_type ?? data?.subscription_plan ?? 'free'));
        setAppsumoTier(numericTier);
        setIsByokUnlimited(numericTier >= 3 && (Boolean(data?.byok_unlocked) || hasKey));
      }

      console.log('[Sovereign Auth]', {
        email: email ?? null,
        tier: superAdmin ? OWNER_PRIVILEGES.appsumo_tier : numericTier,
        hasB2B: superAdmin || numericTier >= 2,
        dbTier: data?.appsumo_tier ?? null,
      });
    } catch (err) {
      console.error(LOG, 'session profile/credits threw', err);
      if (superAdmin && mounted.current) {
        setCreditsBalance(OWNER_PRIVILEGES.credits_remaining);
        setRemainingCredits(OWNER_PRIVILEGES.credits_remaining);
        setMonthlyCreditLimit(OWNER_PRIVILEGES.monthly_credit_limit);
        setSubscriptionPlan('appsumo_tier3');
        setSubscriptionTier('appsumo_tier3');
        setPlanType(SUPERADMIN_PLAN_TYPE);
        setAppsumoTier(OWNER_PRIVILEGES.appsumo_tier);
        setIsByokUnlimited(true);
      }
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    if (!user?.id) return;
    await loadProfileCredits(user.id, user.email);
  }, [user?.id, user?.email, loadProfileCredits]);

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession()
      .then(async ({ data: { session: next }, error }) => {
        if (!mounted.current) return;
        if (error) {
          console.error(LOG, 'getSession failed', error.message);
        }
        let authedUser = next?.user ?? null;
        if (authedUser?.id && !authedUser.email) {
          const { data } = await supabase.auth.getUser();
          authedUser = data.user ?? authedUser;
        }
        setSession(next ?? null);
        setUser(authedUser);
        if (authedUser?.id) {
          await loadProfileCredits(authedUser.id, authedUser.email);
        }
        if (!mounted.current) return;
        hydrated.current = true;
        setSessionReady(true);
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
        void loadProfileCredits(next.user.id, next.user.email);
      } else {
        setCreditsBalance(0);
        setRemainingCredits(0);
        setMonthlyCreditLimit(400);
        setSubscriptionPlan('free');
        setSubscriptionTier('free');
        setPlanType('free');
        setAppsumoTier(0);
        setIsByokUnlimited(false);
      }
    });

    const onProfileUpdated = () => {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user?.id) {
          void loadProfileCredits(data.session.user.id, data.session.user.email);
        }
      });
    };
    window.addEventListener('sovereign:profile-updated', onProfileUpdated);

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      window.removeEventListener('sovereign:profile-updated', onProfileUpdated);
    };
  }, [loadProfileCredits]);

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const owner = user?.email === OWNER_EMAIL || isSuperAdminUser(user);

  return (
    <SessionContext.Provider
      value={{
        user,
        session,
        sessionReady,
        isLoading: !sessionReady,
        creditsBalance: owner ? OWNER_PRIVILEGES.credits_remaining : creditsBalance,
        remainingCredits: owner ? OWNER_PRIVILEGES.credits_remaining : remainingCredits,
        monthlyCreditLimit: owner ? OWNER_PRIVILEGES.monthly_credit_limit : monthlyCreditLimit,
        subscriptionPlan: owner ? 'appsumo_tier3' : subscriptionPlan,
        subscriptionTier: owner ? 'appsumo_tier3' : subscriptionTier,
        planType: owner ? SUPERADMIN_PLAN_TYPE : planType,
        appsumoTier: owner ? OWNER_PRIVILEGES.appsumo_tier : appsumoTier,
        isByokUnlimited: owner || isByokUnlimited,
        hasB2BAccess: owner || appsumoTier >= 2 || planType === SUPERADMIN_PLAN_TYPE || planType === 'enterprise',
        hasBYOKAccess: owner || appsumoTier >= 3 || isByokUnlimited,
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
