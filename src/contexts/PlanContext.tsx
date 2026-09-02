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
import { isOwnerEmail, isSuperAdminUser, OWNER_EMAIL, SUPERADMIN_PLAN_LABEL, SUPERADMIN_PLAN_TYPE } from '@/lib/superadmin';
import { SUBSCRIPTION_PLANS, numericTierFromPlanType, type CatalogPlan } from '@/data/plans';

const LOG = '[Sovereign Load Error]:';

// ─── Context types ─────────────────────────────────────────────────────────────

interface PlanState {
  /** Resolved PlanTier for the current user */
  tier: PlanTier;
  /** Raw plan_type string from the profiles table */
  planType: string;
  /** UI label, e.g. Enterprise B2B (SuperAdmin) */
  planLabel: string;
  /** Numeric rank: 0=free, 1=Standard, 2=Pro, 3=Elite, 4=Enterprise B2B */
  numericTier: 0 | 1 | 2 | 3 | 4;
  /** All four paid catalog rows with id/name/price/features/tier */
  catalog: CatalogPlan[];
  isSuperAdmin: boolean;
  /** Whether plan data is still loading */
  isLoading: boolean;
  /** Manually refresh plan (e.g. after successful checkout) */
  refresh: () => Promise<void>;
}

const SAFE_CATALOG: CatalogPlan[] = SUBSCRIPTION_PLANS.filter(
  (p): p is CatalogPlan =>
    Boolean(p?.id && p?.name && p?.price && Array.isArray(p.features) && p.tier),
);

const PlanContext = createContext<PlanState>({
  tier: 'free',
  planType: 'free',
  planLabel: 'Free',
  numericTier: 0,
  catalog: SAFE_CATALOG,
  isSuperAdmin: false,
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
  const ownerInit = user?.email === OWNER_EMAIL || isSuperAdminUser(user);
  const [tier, setTier] = useState<PlanTier>(ownerInit ? 'enterprise' : 'free');
  const [planType, setPlanType] = useState<string>(ownerInit ? SUPERADMIN_PLAN_TYPE : 'free');
  const [isLoading, setIsLoading] = useState(!ownerInit);
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
    if (email === OWNER_EMAIL || isOwnerEmail(email)) {
      if (mounted.current) {
        setPlanType(SUPERADMIN_PLAN_TYPE);
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
      const active = resolveActivePlan(String(raw ?? 'free'), expiresAt);
      const resolvedTier = planTypeToTier(active) || 'free';

      if (mounted.current) {
        setPlanType(active || 'free');
        setTier(resolvedTier);
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

  const owner =
    user?.email === OWNER_EMAIL ||
    isSuperAdminUser(user) ||
    isOwnerEmail(user?.email);
  const resolvedPlanType = owner ? SUPERADMIN_PLAN_TYPE : (planType || 'free');
  const resolvedTier = owner ? 'enterprise' : (tier || 'free');
  const resolvedLabel = owner
    ? SUPERADMIN_PLAN_LABEL
    : resolvedTier === 'enterprise'
      ? 'Enterprise B2B'
      : resolvedTier === 'elite'
        ? 'Elite'
        : resolvedTier === 'pro'
          ? 'Pro'
          : resolvedTier === 'standard'
            ? 'Standard'
            : 'Free';

  return (
    <PlanContext.Provider
      value={{
        tier: resolvedTier,
        planType: resolvedPlanType,
        planLabel: resolvedLabel,
        numericTier: owner ? 4 : numericTierFromPlanType(resolvedPlanType),
        catalog: SAFE_CATALOG,
        isSuperAdmin: owner,
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
