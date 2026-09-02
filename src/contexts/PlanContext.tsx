/**
 * PlanContext — Global plan state provider
 * Loads the authenticated user's subscription plan once at the app root,
 * maps it to a PlanTier, and makes it available everywhere via usePlan().
 */
import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode,
} from 'react';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { useSession } from '@/contexts/SessionContext';
import { type PlanTier, planTypeToTier } from '@/lib/entitlements';
import { isOwnerEmail, isSuperAdminUser } from '@/lib/superadmin';

const LOG = '[Sovereign Load Error]:';

// ─── Context types ─────────────────────────────────────────────────────────────

interface PlanState {
  /** Resolved PlanTier for the current user */
  tier: PlanTier;
  /** Raw plan_type string from the profiles table */
  planType: string;
  /** Whether plan data is still loading */
  isLoading: boolean;
  /** Manually refresh plan (e.g. after successful checkout) */
  refresh: () => Promise<void>;
}

const PlanContext = createContext<PlanState>({
  tier: 'free',
  planType: 'free',
  isLoading: true,
  refresh: async () => {},
});

// ─── Helper: check expiry ──────────────────────────────────────────────────────

function resolveActivePlan(planType: string, expiresAt: string | null): string {
  if ((planType === 'pro' || planType === 'elite') && expiresAt) {
    if (new Date() > new Date(expiresAt)) return 'free';
  }
  return planType;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, sessionReady } = useSession();
  const [tier, setTier] = useState<PlanTier>('free');
  const [planType, setPlanType] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  const loadPlan = useCallback(async (userId: string | undefined | null, email?: string | null) => {
    if (!userId) {
      if (mounted.current) {
        setTier('free');
        setPlanType('free');
        setIsLoading(false);
      }
      return;
    }
    if (isOwnerEmail(email)) {
      if (mounted.current) {
        setPlanType('B2B_ENTERPRISE');
        setTier('enterprise');
        setIsLoading(false);
      }
      return;
    }
    try {
      const { data: profile, error } = await fetchProfileByAuthId(
        userId,
        '*, appsumo_tier',
      );

      if (error) {
        console.error(LOG, 'plan profile fetch failed', error.message);
      }

      const appsumoTier = Number((profile as any)?.appsumo_tier ?? 0);
      const raw =
        appsumoTier >= 3
          ? 'B2B_ENTERPRISE'
          : appsumoTier >= 2
            ? 'pro'
            : (profile as any)?.plan_type ??
              (profile as any)?.subscription_tier ??
              (profile as any)?.subscription_plan ??
              'free';

      const expiresAt = (profile as any)?.subscription_expires_at ?? null;
      const active = resolveActivePlan(raw, expiresAt);

      if (mounted.current) {
        setPlanType(active);
        setTier(planTypeToTier(active));
      }
    } catch (err) {
      console.error(LOG, 'plan load threw (defaulting to free)', err);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    if (mounted.current) setIsLoading(true);
    await loadPlan(user.id, user.email);
  }, [loadPlan, user?.id, user?.email]);

  useEffect(() => {
    mounted.current = true;
    if (!sessionReady) return;
    void loadPlan(user?.id, user?.email);
    return () => {
      mounted.current = false;
    };
  }, [sessionReady, user?.id, user?.email, loadPlan]);

  const owner = isSuperAdminUser(user) || isOwnerEmail(user?.email);

  return (
    <PlanContext.Provider
      value={{
        tier: owner ? 'enterprise' : tier,
        planType: owner ? 'B2B_ENTERPRISE' : planType,
        isLoading,
        refresh,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

// ─── Consumer hook ─────────────────────────────────────────────────────────────

export function usePlan(): PlanState {
  return useContext(PlanContext);
}
