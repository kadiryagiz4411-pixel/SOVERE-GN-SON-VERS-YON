import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { useSession } from '@/contexts/SessionContext';
import { usePlan } from '@/contexts/PlanContext';
import {
  type AppsumoPlanEnum,
  type B2BSubscriptionStatus,
  type TrialProfileSlice,
  APPSUMO_UPSELL_DISMISS_KEY,
  isAppsumoLtdUser,
  resolveB2BAccess,
} from '@/lib/b2bTrial';

export function useB2BTrial() {
  const { user, refreshCredits } = useSession();
  const { refresh, isSuperAdmin } = usePlan();
  const [profile, setProfile] = useState<TrialProfileSlice | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      const until = Number(localStorage.getItem(APPSUMO_UPSELL_DISMISS_KEY) ?? 0);
      return until > Date.now();
    } catch {
      return false;
    }
  });

  const load = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await fetchProfileByAuthId<TrialProfileSlice>(
        user.id,
        'trial_started_at, trial_ends_at, is_trial_active, has_used_trial, trial_claimed, b2b_subscription_status, appsumo_plan, appsumo_tier, plan_type, subscription_plan',
      );
      let next = data;
      const access = resolveB2BAccess({ email: user.email, user, profile: data });
      if (
        data?.is_trial_active &&
        data.trial_ends_at &&
        Date.now() > new Date(data.trial_ends_at).getTime() &&
        data.b2b_subscription_status !== 'active' &&
        user.email !== 'kadiryagiz4411@gmail.com'
      ) {
        await supabase.rpc('expire_stale_b2b_trials');
        await supabase
          .from('profiles')
          .update({
            is_trial_active: false,
            b2b_subscription_status: data.b2b_subscription_status === 'active' ? 'active' : 'canceled',
          } as never)
          .or(`id.eq.${user.id},user_id.eq.${user.id}`);
        next = {
          ...data,
          is_trial_active: false,
          b2b_subscription_status: 'canceled',
        };
        console.log('[B2B Trial Engine]', {
          userId: user.id,
          status: 'canceled',
          daysRemaining: 0,
        });
      } else {
        console.log('[B2B Trial Engine]', {
          userId: user.id,
          status: access.b2bStatus,
          daysRemaining: access.daysRemaining,
        });
      }
      setProfile(next);
    } catch (err) {
      console.error('[B2B Trial Engine] load failed', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  const access = useMemo(
    () => resolveB2BAccess({ email: user?.email, user, profile }),
    [user, profile],
  );

  const startTrial = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    if (access.hasUsedTrial && !access.isSuperAdmin) {
      toast.error('This account already used the 14-day B2B trial.');
      return false;
    }
    setStarting(true);
    try {
      const rpc = await supabase.rpc('start_b2b_cardless_trial');
      if (rpc.error) {
        const now = new Date();
        const ends = new Date(now.getTime() + 14 * 86_400_000);
        const { error } = await supabase
          .from('profiles')
          .update({
            trial_started_at: now.toISOString(),
            trial_ends_at: ends.toISOString(),
            is_trial_active: true,
            has_used_trial: true,
            trial_claimed: true,
            b2b_subscription_status: 'trialing',
          } as never)
          .or(`id.eq.${user.id},user_id.eq.${user.id}`);
        if (error) {
          toast.error('Could not start the B2B trial. Please try again.');
          console.error('[B2B Trial Engine] start failed', rpc.error, error);
          return false;
        }
      }
      toast.success('Your 14-Day Enterprise B2B Trial is active. No credit card required!');
      await load();
      await refresh();
      await refreshCredits();
      return true;
    } finally {
      setStarting(false);
    }
  }, [user?.id, access.hasUsedTrial, access.isSuperAdmin, load, refresh, refreshCredits]);

  const dismissBanner24h = useCallback(() => {
    try {
      localStorage.setItem(APPSUMO_UPSELL_DISMISS_KEY, String(Date.now() + 86_400_000));
    } catch { /* ignore */ }
    setBannerDismissed(true);
  }, []);

  const showUpsellBanner =
    !isSuperAdmin &&
    !access.hasEnterpriseAccess &&
    isAppsumoLtdUser(access.appsumoPlan) &&
    !bannerDismissed;

  const showSidebarUpsellBadge =
    !isSuperAdmin &&
    !access.hasEnterpriseAccess &&
    isAppsumoLtdUser(access.appsumoPlan);

  return {
    loading,
    starting,
    profile,
    ...access,
    appsumoPlan: access.appsumoPlan as AppsumoPlanEnum,
    b2bStatus: access.b2bStatus as B2BSubscriptionStatus,
    startTrial,
    reload: load,
    dismissBanner24h,
    showUpsellBanner,
    showSidebarUpsellBadge,
    bannerDismissed,
  };
}
