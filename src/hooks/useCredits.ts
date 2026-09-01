/**
 * useCredits — monthly vs annual reset/rollover surface for the UI.
 *
 * Annual plans: unused credits roll over (capped at 2× monthly limit)
 * via `reset_monthly_credits_if_due`. Monthly plans expire unused credits.
 * Paused subscriptions freeze the balance (no deduction, no reset overwrite).
 */
import { useCallback, useEffect, useState } from "react";
import {
  fetchCreditStatus,
  type CreditStatus,
  daysUntilReset,
} from "@/services/creditService";
import { resetMonthlyCreditsIfDue, fetchProfileByAuthId } from "@/lib/profileQuery";
import { useSession } from "@/contexts/SessionContext";

export interface CreditsState extends CreditStatus {
  isAnnual: boolean;
  rolloverCap: number;
  daysUntilResetLabel: string;
}

export function useCredits() {
  const { user, planType } = useSession();
  const [credits, setCredits] = useState<CreditsState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCredits(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    await resetMonthlyCreditsIfDue(user.id);
    const { data: profile } = await fetchProfileByAuthId(user.id, 'billing_period');
    const status = await fetchCreditStatus(user.id);
    if (!status) {
      setCredits(null);
      setLoading(false);
      return;
    }
    const period = String((profile as { billing_period?: string } | null)?.billing_period ?? '');
    const isAnnual = period.includes('year') || period === 'annual' || period === 'annually';
    setCredits({
      ...status,
      isAnnual,
      rolloverCap: status.monthlyLimit * 2,
      daysUntilResetLabel: daysUntilReset(status.resetDate),
    });
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh, planType]);

  return { credits, loading, refresh };
}

/** Pure helper used by tests / docs — annual rollover math. */
export function nextAnnualBalance(remaining: number, monthlyLimit: number): number {
  return Math.min(remaining + monthlyLimit, monthlyLimit * 2);
}

export function nextMonthlyBalance(_remaining: number, monthlyLimit: number): number {
  return monthlyLimit;
}
