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
import { hasFullWorkspaceAccess, OWNER_PRIVILEGES, SUPERADMIN_PLAN_TYPE } from '@/lib/superadmin';
import { isTrialWindowOpen, resolveB2BAccess, toAppsumoPlanEnum, type TrialProfileSlice } from '@/lib/b2bTrial';
import { firstPaidPlanLabel, resolveDisplayTier, type DisplayTier } from '@/lib/displayTier';

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
  hasApplyQueueAccess: boolean;
  hasBYOKAccess: boolean;
  isTrialActive: boolean;
  hasUsedTrial: boolean;
  b2bSubscriptionStatus: string;
  appsumoPlan: string;
  displayTier: DisplayTier;
  trialEndsAt: string | null;
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
  hasApplyQueueAccess: false,
  hasBYOKAccess: false,
  isTrialActive: false,
  hasUsedTrial: false,
  b2bSubscriptionStatus: 'none',
  appsumoPlan: 'none',
  displayTier: resolveDisplayTier({}),
  trialEndsAt: null,
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
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [b2bSubscriptionStatus, setB2bSubscriptionStatus] = useState('none');
  const [appsumoPlan, setAppsumoPlan] = useState('none');
  const [b2bAccessFlag, setB2bAccessFlag] = useState(false);
  const [applyQueueAccess, setApplyQueueAccess] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const mounted = useRef(true);
  const hydrated = useRef(false);

  const loadProfileCredits = useCallback(async (userId: string | undefined | null, email?: string | null) => {
    if (!userId) return;
    const superAdmin = hasFullWorkspaceAccess({ email });
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
        setIsTrialActive(true);
        setHasUsedTrial(false);
        setB2bSubscriptionStatus('active');
        setAppsumoPlan('tier_3');
        setTrialEndsAt(null);
      } else {
        const slice = data as TrialProfileSlice;
        const access = resolveB2BAccess({ email, user: { email }, profile: slice });
        setCreditsBalance(balance);
        setRemainingCredits(remaining);
        setMonthlyCreditLimit(limit || 400);
        const paidLabel = firstPaidPlanLabel(
          data?.plan_type,
          data?.subscription_plan,
          data?.subscription_tier,
          data?.appsumo_plan,
        );
        setSubscriptionPlan(paidLabel);
        setSubscriptionTier(paidLabel);
        setPlanType(access.hasEnterpriseAccess ? SUPERADMIN_PLAN_TYPE : paidLabel);
        setAppsumoTier(numericTier);
        setIsByokUnlimited(numericTier >= 3 && (Boolean(data?.byok_unlocked) || hasKey));
        setIsTrialActive(access.isTrialActive);
        setHasUsedTrial(access.hasUsedTrial);
        setB2bSubscriptionStatus(access.b2bStatus);
        setAppsumoPlan(toAppsumoPlanEnum(slice?.appsumo_plan, numericTier));
        setTrialEndsAt(slice?.trial_ends_at ?? null);
        setB2bAccessFlag(Boolean(data?.b2b_access) || access.hasEnterpriseAccess);
        setApplyQueueAccess(Boolean(data?.apply_queue_access) || numericTier >= 2);
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
        setIsTrialActive(true);
        setB2bAccessFlag(true);
        setApplyQueueAccess(true);
      }
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    if (!user?.id) return;
    await loadProfileCredits(user.id, user.email);
  }, [user?.id, user?.email, loadProfileCredits]);

  useEffect(() => {
    mounted.current = true;

    const recoverCachedSession = (): Session | null => {
      try {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith('sb-') || !key.includes('auth-token')) continue;
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as { currentSession?: Session } & Session;
          const cached = (parsed as { currentSession?: Session }).currentSession ?? parsed;
          if (cached?.access_token && cached?.user) return cached as Session;
        }
      } catch {
        /* ignore corrupt cache */
      }
      return null;
    };

    const cached = recoverCachedSession();
    if (cached) {
      setSession(cached);
      setUser(cached.user ?? null);
      hydrated.current = true;
      setSessionReady(true);
      if (cached.user?.id) {
        void loadProfileCredits(cached.user.id, cached.user.email);
      }
    }

    const sessionTimeout = window.setTimeout(() => {
      if (!mounted.current || hydrated.current) return;
      hydrated.current = true;
      setSessionReady(true);
    }, 4000);

    supabase.auth.getSession()
      .then(async ({ data: { session: next }, error }) => {
        if (!mounted.current) return;
        if (error) {
          console.error(LOG, 'getSession failed', error.message);
        }
        let authedUser = next?.user ?? cached?.user ?? null;
        if (authedUser?.id && !authedUser.email) {
          try {
            const { data } = await supabase.auth.getUser();
            authedUser = data.user ?? authedUser;
          } catch { /* keep cached user */ }
        }
        setSession(next ?? cached ?? null);
        setUser(authedUser);
        if (authedUser?.id) {
          void loadProfileCredits(authedUser.id, authedUser.email);
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
      if (!hydrated.current && event === 'INITIAL_SESSION') {
        if (next?.user) {
          setSession(next);
          setUser(next.user);
        }
        hydrated.current = true;
        setSessionReady(true);
        if (next?.user?.id) void loadProfileCredits(next.user.id, next.user.email);
        return;
      }

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
        setIsTrialActive(false);
        setHasUsedTrial(false);
        setB2bSubscriptionStatus('none');
        setAppsumoPlan('none');
        setTrialEndsAt(null);
        setB2bAccessFlag(false);
        setApplyQueueAccess(false);
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
      window.clearTimeout(sessionTimeout);
      subscription.unsubscribe();
      window.removeEventListener('sovereign:profile-updated', onProfileUpdated);
    };
  }, [loadProfileCredits]);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const email = user.email;
    const channel = supabase
      .channel(`profiles-tier-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        () => { void loadProfileCredits(uid, email); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${uid}` },
        () => { void loadProfileCredits(uid, email); },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, loadProfileCredits]);

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const owner = hasFullWorkspaceAccess(user);

  const liveTrial = owner || isTrialWindowOpen(isTrialActive, trialEndsAt);
  const paidB2B = owner || b2bSubscriptionStatus === 'active';
  const hasB2BAccessValue = owner || paidB2B || liveTrial || b2bAccessFlag;
  const displayTier = resolveDisplayTier({
    isSuperAdmin: owner,
    hasB2BAccess: hasB2BAccessValue,
    appsumoPlan: owner ? 'tier_3' : appsumoPlan,
    appsumoTier: owner ? OWNER_PRIVILEGES.appsumo_tier : appsumoTier,
    planType: owner || paidB2B || liveTrial ? SUPERADMIN_PLAN_TYPE : planType,
    subscriptionPlan,
    subscriptionTier,
  });

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
        planType: owner || paidB2B || liveTrial ? SUPERADMIN_PLAN_TYPE : planType,
        appsumoTier: owner ? OWNER_PRIVILEGES.appsumo_tier : appsumoTier,
        isByokUnlimited: owner || isByokUnlimited,
        hasB2BAccess: hasB2BAccessValue,
        hasApplyQueueAccess: owner || applyQueueAccess || appsumoTier >= 2 || paidB2B || liveTrial || b2bAccessFlag,
        hasBYOKAccess: owner || appsumoTier >= 3 || isByokUnlimited,
        isTrialActive: liveTrial,
        hasUsedTrial: owner ? false : hasUsedTrial,
        b2bSubscriptionStatus: owner ? 'active' : b2bSubscriptionStatus,
        appsumoPlan: owner ? 'tier_3' : appsumoPlan,
        displayTier,
        trialEndsAt,
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
