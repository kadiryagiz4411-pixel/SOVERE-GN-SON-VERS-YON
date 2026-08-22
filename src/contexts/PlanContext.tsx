/**
 * PlanContext — Global plan state provider
 * Loads the authenticated user's subscription plan once at the app root,
 * maps it to a PlanTier, and makes it available everywhere via usePlan().
 */
import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
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
  const mounted = useRef(true);

  const loadPlan = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan_type, subscription_plan, subscription_expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        // 400 / PGRST116 (no row) — safe to ignore, treat as free
        console.warn('PlanContext: profile fetch warning:', error.message);
      }

      // Prefer plan_type (new column), fall back to subscription_plan (legacy)
      const raw =
        (profile as any)?.plan_type ??
        (profile as any)?.subscription_plan ??
        'free';

      const expiresAt = (profile as any)?.subscription_expires_at ?? null;
      const active = resolveActivePlan(raw, expiresAt);

      if (mounted.current) {
        setPlanType(active);
        setTier(planTypeToTier(active));
      }
    } catch (err) {
      console.warn('PlanContext: loadPlan error (defaulting to free):', err);
      // Leave as free on error — fail-safe
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (mounted.current) setIsLoading(true);
        await loadPlan(user.id);
      }
    } catch {
      if (mounted.current) setIsLoading(false);
    }
  }, [loadPlan]);

  useEffect(() => {
    mounted.current = true;

    // Initial load — getSession is the single source of truth
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          loadPlan(session.user.id);
        } else {
          if (mounted.current) setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted.current) setIsLoading(false);
      });

    // React to auth state changes (login / logout) — never drives initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      if (session?.user) {
        setIsLoading(true);
        loadPlan(session.user.id);
      } else {
        setTier('free');
        setPlanType('free');
        setIsLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
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
