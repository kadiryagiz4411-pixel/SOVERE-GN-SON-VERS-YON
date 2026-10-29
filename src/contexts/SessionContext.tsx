/**
 * SessionContext — one-shot auth + credit cache for the whole app.
 * Profile/credit queries run only after getSession() resolves with a user id.
 */
import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId, PROFILE_SELECT_WITH_TIER } from '@/lib/profileQuery';
import { hasFullWorkspaceAccess, OWNER_PRIVILEGES, SUPERADMIN_PLAN_TYPE } from '@/lib/superadmin';
import { isTrialWindowOpen, resolveB2BAccess, toAppsumoPlanEnum, type TrialProfileSlice } from '@/lib/b2bTrial';
import { firstPaidPlanLabel, hasActiveAppSumoLicense, resolveDisplayTier, type DisplayTier } from '@/lib/displayTier';
import { syncPreOnboardingMemory } from '@/utils/syncOnboardingMemory';
import { resolveRemainingCredits } from '@/lib/credits';

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
  isAppsumoUser: boolean;
  subscriptionStatus: string;
  displayTier: DisplayTier;
  trialEndsAt: string | null;
  /** false only when the profiles row has onboarding_completed = false (new user) */
  onboardingCompleted: boolean;
  /** False until the first profile read (or a stored done flag) settles the gate. */
  onboardingResolved: boolean;
  /** Optimistically marks onboarding done so ProtectedRoute unlocks before DB re-fetch */
  markOnboardingComplete: () => void;
  refreshCredits: () => Promise<void>;
  setCreditsBalance: (n: number) => void;
}

function readOnboardingDoneFlag(): boolean {
  try {
    return localStorage.getItem('sovereign_onboarding_done') === 'true';
  } catch {
    return false;
  }
}

const SessionContext = createContext<SessionState>({
  user: null,
  session: null,
  sessionReady: false,
  isLoading: true,
  creditsBalance: 0,
  remainingCredits: 0,
  monthlyCreditLimit: 0,
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
  isAppsumoUser: false,
  subscriptionStatus: 'active',
  displayTier: resolveDisplayTier({}),
  trialEndsAt: null,
  onboardingCompleted: true,
  onboardingResolved: true,
  markOnboardingComplete: () => {},
  refreshCredits: async () => {},
  setCreditsBalance: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [remainingCredits, setRemainingCredits] = useState(0);
  const [monthlyCreditLimit, setMonthlyCreditLimit] = useState(0);
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [planType, setPlanType] = useState('free');
  const [appsumoTier, setAppsumoTier] = useState(0);
  const [isByokUnlimited, setIsByokUnlimited] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [b2bSubscriptionStatus, setB2bSubscriptionStatus] = useState('none');
  const [appsumoPlan, setAppsumoPlan] = useState('none');
  const [appsumoLicensed, setAppsumoLicensed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [b2bAccessFlag, setB2bAccessFlag] = useState(false);
  // Unknown until the first profile read, unless this browser already finished onboarding.
  const [onboardingCompleted, setOnboardingCompleted] = useState(readOnboardingDoneFlag);
  const [onboardingResolved, setOnboardingResolved] = useState(readOnboardingDoneFlag);
  const onboardingHydrated = useRef(readOnboardingDoneFlag());
  const profileLoadStarted = useRef(false);
  const [applyQueueAccess, setApplyQueueAccess] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const mounted = useRef(true);
  const hydrated = useRef(false);

  const loadProfileCredits = useCallback(async (userId: string | undefined | null, email?: string | null) => {
    if (!userId) return;
    profileLoadStarted.current = true;
    if (!readOnboardingDoneFlag() && !onboardingHydrated.current) {
      setOnboardingResolved(false);
    }
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
      const remaining = resolveRemainingCredits(data);
      const rawLimit = Number(data?.monthly_credit_limit);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 0;
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
        setAppsumoLicensed(true);
        setSubscriptionStatus('active');
        setTrialEndsAt(null);
        setOnboardingCompleted(true);
        onboardingHydrated.current = true;
        setOnboardingResolved(true);
      } else {
        const slice = data as TrialProfileSlice;
        const access = resolveB2BAccess({ email, user: { email }, profile: slice });
        setCreditsBalance(remaining);
        setRemainingCredits(remaining);
        setMonthlyCreditLimit(limit);
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
        setAppsumoLicensed(hasActiveAppSumoLicense({
          isAppsumo: data?.is_appsumo === true || data?.is_appsumo_user === true,
          appsumoLicenseKey: String(data?.appsumo_license_key ?? data?.appsumo_code ?? ''),
          appsumoCodesCount: Number(data?.appsumo_codes_count ?? 0),
          appsumoPlan: String(data?.appsumo_plan ?? ''),
          planType: String(data?.plan_type ?? ''),
          subscriptionPlan: String(data?.subscription_plan ?? ''),
          subscriptionTier: String(data?.subscription_tier ?? ''),
        }));
        setSubscriptionStatus(String(data?.subscription_status || 'active'));
        setTrialEndsAt(slice?.trial_ends_at ?? null);
        setB2bAccessFlag(Boolean(data?.b2b_access) || access.hasEnterpriseAccess);
        setApplyQueueAccess(Boolean(data?.apply_queue_access) || numericTier >= 2);
        // Decide the gate once. A later refresh must not flip a finished user back to onboarding.
        setOnboardingCompleted((current) => {
          if (readOnboardingDoneFlag()) return true;
          if (onboardingHydrated.current && current) return true;
          return data?.onboarding_completed !== false;
        });
        onboardingHydrated.current = true;
        setOnboardingResolved(true);
      }

      const nextTier = superAdmin ? OWNER_PRIVILEGES.appsumo_tier : numericTier;
      const nextLimit = superAdmin ? OWNER_PRIVILEGES.monthly_credit_limit : (limit || remaining);
      if (nextTier >= 1 || superAdmin) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const meta = authData.user?.user_metadata || {};
          if (
            Number(meta.appsumo_tier || 0) !== nextTier
            || Number(meta.monthly_credits || 0) !== nextLimit
            || Number(meta.monthly_credit_limit || 0) !== nextLimit
          ) {
            await supabase.auth.updateUser({
              data: {
                appsumo_tier: nextTier,
                monthly_credits: nextLimit,
                monthly_credit_limit: nextLimit,
              },
            });
          }
        } catch {
          /* session metadata is best-effort for extension inherit */
        }
      }

      console.log('[Sovereign Auth]', {
        email: email ?? null,
        tier: superAdmin ? OWNER_PRIVILEGES.appsumo_tier : numericTier,
        hasB2B: superAdmin || numericTier >= 3,
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
      if (mounted.current) {
        if (readOnboardingDoneFlag() || superAdmin || !onboardingHydrated.current) {
          setOnboardingCompleted(true);
        }
        onboardingHydrated.current = true;
        setOnboardingResolved(true);
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

    // Failsafe: if neither getSession() nor onAuthStateChange resolves within
    // 3 s, unblock the UI so the user is never stuck on the loading spinner.
    // Reduced from 4 s → 3 s for snappier perceived performance.
    const sessionTimeout = window.setTimeout(() => {
      if (!mounted.current || hydrated.current) return;
      hydrated.current = true;
      setSessionReady(true);
      if (!profileLoadStarted.current) setOnboardingResolved(true);
    }, 3000);

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
        } else {
          setOnboardingResolved(true);
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
          if (!profileLoadStarted.current) setOnboardingResolved(true);
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
        if (next?.user?.id) {
          void loadProfileCredits(next.user.id, next.user.email);
          void syncPreOnboardingMemory(next.user.id);
        }
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
        void syncPreOnboardingMemory(next.user.id);
      } else {
        setCreditsBalance(0);
        setRemainingCredits(0);
        setMonthlyCreditLimit(0);
        setSubscriptionPlan('free');
        setSubscriptionTier('free');
        setPlanType('free');
        setAppsumoTier(0);
        setIsByokUnlimited(false);
        setIsTrialActive(false);
        setHasUsedTrial(false);
        setB2bSubscriptionStatus('none');
        setAppsumoPlan('none');
        setAppsumoLicensed(false);
        setTrialEndsAt(null);
        setB2bAccessFlag(false);
        setApplyQueueAccess(false);
        onboardingHydrated.current = readOnboardingDoneFlag();
        setOnboardingCompleted(readOnboardingDoneFlag());
        setOnboardingResolved(true);
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

  const owner = hasFullWorkspaceAccess(user);

  const liveTrial = owner || isTrialWindowOpen(isTrialActive, trialEndsAt);
  const paidB2B = owner || b2bSubscriptionStatus === 'active';
  const hasB2BAccessValue = owner || paidB2B || liveTrial || b2bAccessFlag;
  const displayTier = resolveDisplayTier({
    isSuperAdmin: owner,
    hasB2BAccess: hasB2BAccessValue,
    appsumoPlan: owner ? 'tier_3' : appsumoPlan,
    appsumoTier: owner ? OWNER_PRIVILEGES.appsumo_tier : appsumoTier,
    isAppsumo: owner || appsumoLicensed,
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
        isAppsumoUser: owner || appsumoLicensed,
        subscriptionStatus: owner ? 'active' : subscriptionStatus,
        displayTier,
        trialEndsAt,
        // superadmin always passes the gate; otherwise use the resolved value
        onboardingCompleted: owner ? true : onboardingCompleted,
        onboardingResolved: owner || onboardingResolved,
        markOnboardingComplete: () => {
          onboardingHydrated.current = true;
          setOnboardingCompleted(true);
          setOnboardingResolved(true);
        },
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
