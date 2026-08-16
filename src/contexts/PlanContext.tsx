/**
 * PlanContext — Global plan state provider
 * Loads the authenticated user's subscription plan once at the app root,
 * maps it to a PlanTier, and makes it available everywhere via usePlan().
 */
import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type PlanTier, planTypeToTier } from '@/lib/entitlements';

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
  const [tier, setTier] = useState<PlanTier>('free');
  const [planType, setPlanType] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(true);

  const loadPlan = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, subscription_plan, subscription_expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      // Prefer plan_type (new column), fall back to subscription_plan (legacy)
      const raw =
        (profile as any)?.plan_type ??
        (profile as any)?.subscription_plan ??
        'free';

      const expiresAt = (profile as any)?.subscription_expires_at ?? null;
      const active = resolveActivePlan(raw, expiresAt);

      setPlanType(active);
      setTier(planTypeToTier(active));
    } catch {
      // Leave as free on error — fail-safe
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setIsLoading(true);
      await loadPlan(user.id);
    }
  }, [loadPlan]);

  useEffect(() => {
    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadPlan(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // React to auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoading(true);
        loadPlan(session.user.id);
      } else {
        setTier('free');
        setPlanType('free');
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadPlan]);

  return (
    <PlanContext.Provider value={{ tier, planType, isLoading, refresh }}>
      {children}
    </PlanContext.Provider>
  );
}

// ─── Consumer hook ─────────────────────────────────────────────────────────────

export function usePlan(): PlanState {
  return useContext(PlanContext);
}
