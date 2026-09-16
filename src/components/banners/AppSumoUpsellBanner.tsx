import { Rocket, X } from 'lucide-react';
import { StartB2BTrialButton } from '@/components/trial/StartB2BTrialButton';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { enterpriseCheckoutUrl } from '@/lib/b2bTrial';
import { useB2BTrial } from '@/hooks/useB2BTrial';

export function AppSumoUpsellBanner() {
  const trial = useB2BTrial();
  if (!trial.showUpsellBanner) return null;

  return (
    <div className="relative z-40 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/80 via-slate-950 to-violet-950/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-sm text-amber-100/90 leading-snug">
          🚀 Scale your hiring: Upgrade your AppSumo LTD to Sovereign Enterprise B2B for Unlimited Workspaces, Custom Vector Search & Audit Logs.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <StartB2BTrialButton size="sm" />
          <CheckoutButton
            href={enterpriseCheckoutUrl()}
            overlay
            className="h-8 px-3 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 border-0"
          >
            <Rocket className="w-3.5 h-3.5 mr-1" />
            Unlock B2B Enterprise
          </CheckoutButton>
          <button
            type="button"
            onClick={trial.dismissBanner24h}
            className="rounded-md p-1 text-amber-200/70 hover:text-white"
            aria-label="Hide AppSumo upsell for 24 hours"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
